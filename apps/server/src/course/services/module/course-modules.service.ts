import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { CourseModuleEntity } from '../../entities/course-module.entity';
import mongoose, { Model, Connection, ClientSession, PaginateModel } from 'mongoose';
import { ApprovalStatus, PublishStatus } from '@darnozom/shared-types';
import { applyUpdateWithApproval } from 'src/utils/approval.utils';
import { assertOrgApproved, isOrgApproved } from 'src/utils/verification.utils';
import { Organization } from 'src/organization/entities/organization.entity';
import { CreateCourseModuleDto } from '../../dto/create-course-module.dto';
import { CourseService } from '../course/course.service';
import { CourseContentService } from '../content/course-content.service';
import { CourseContent } from '../../entities/course-content.entity';
import { mergeModuleContentSettingsPatch } from '../../utils/merge-settings-partial.util';
import { sanitizeContentsForStudent } from '../../utils/content-sanitizer.util';
import { NOT_DELETED_CONTENT_FILTER } from '../../utils/not-deleted-content.filter';
import { buildSoftDeleteSet } from 'src/utils/soft-delete';

@Injectable()
export class CourseModulesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('CourseModule')
    private readonly courseModuleModel: Model<CourseModuleEntity>,
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @Inject(forwardRef(() => CourseService))
    private readonly courseService: CourseService,
    @Inject(forwardRef(() => CourseContentService))
    private readonly courseContentService: CourseContentService
  ) {}

  async create(createCourseModuleDto: CreateCourseModuleDto) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const org = await this.organizationModel.findById(createCourseModuleDto.organizationId).session(session);
      assertOrgApproved(org);
      const publishStatus = createCourseModuleDto.publishStatus ?? PublishStatus.PUBLISHED;
      const courseModule = new this.courseModuleModel({
        ...createCourseModuleDto,
        publishStatus,
        publishedAt: publishStatus === PublishStatus.PUBLISHED ? new Date() : null,
        approvalStatus: isOrgApproved(org) ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
      });
      await courseModule.save({ session });

      // Add the module to the course (pass the same session)
      await this.courseService.addModuleToCourse(createCourseModuleDto.courseId, courseModule._id.toString(), session);

      await session.commitTransaction();
      return courseModule;
    } catch (error) {
      await session.abortTransaction();
      throw error; // rethrow to handle at a higher level
    } finally {
      await session.endSession();
    }
  }

  async findAll(courseId: string) {
    const courseModules = await this.courseModuleModel.find({ courseId }).exec();
    return courseModules;
  }

  async findOne(id: string) {
    const courseModule = await this.courseModuleModel.findById(id).exec();
    return courseModule;
  }

  async findModuleWithOrderedContents(moduleId: string) {
    const result = await this.courseModuleModel.aggregate<CourseModuleEntity & { contents: (CourseContent & { _id: mongoose.Types.ObjectId })[] }>([
      { $match: { _id: new mongoose.Types.ObjectId(moduleId) } },
      {
        $lookup: {
          from: 'course_contents',
          let: { contentIds: '$contentsIds' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$_id', '$$contentIds'] },
                ...NOT_DELETED_CONTENT_FILTER,
              },
            },
          ],
          as: 'contents',
        },
      },
      {
        $addFields: {
          contents: {
            $map: {
              input: '$contentsIds',
              as: 'contentId',
              in: {
                $arrayElemAt: [
                  '$contents',
                  {
                    $indexOfArray: ['$contents._id', '$$contentId'],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          contents: {
            $filter: {
              input: '$contents',
              as: 'c',
              cond: { $ne: ['$$c', null] },
            },
          },
        },
      },
    ]);
    // Strip quiz answer keys and every student's submissions/attendance. Only
    // elevated roles reach this (students lack READ MODULE), but a module
    // content listing never needs the answer key or peers' submissions.
    const moduleDoc = result[0];
    sanitizeContentsForStudent(moduleDoc?.contents);
    return moduleDoc;
  }

  async reorderContents(moduleId: string, newOrder: string[]) {
    try {
      // First, get the current module to validate
      const module = await this.courseModuleModel.findById(moduleId);
      if (!module) {
        throw new NotFoundException('Course module not found');
      }

      // Get current content IDs as strings for comparison
      const currentContentIds = module.contentsIds.map((id) => id.toString());

      // Validate that all new IDs exist in current contents
      const invalidIds = newOrder.filter((id) => !currentContentIds.includes(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(`Invalid content IDs: ${invalidIds.join(', ')}`);
      }

      // Validate that all current contents are included in new order
      const missingIds = currentContentIds.filter((id) => !newOrder.includes(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(`Missing content IDs: ${missingIds.join(', ')}`);
      }

      // Convert to ObjectIds and update
      const validIds = newOrder.map((id) => new mongoose.Types.ObjectId(id));

      await this.courseModuleModel.updateOne({ _id: moduleId }, { $set: { contentsIds: validIds } });

      return {
        message: 'Content order updated successfully',
        updated: true,
        newOrder: validIds,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error);
    }
  }

  async addContentToModule(moduleId: string, contentId: string) {
    try {
      const foundedCourseContent = await this.findOne(contentId);
      if (!foundedCourseContent) throw new NotFoundException('Course content not found');
      const result = await this.courseModuleModel.updateOne(
        { _id: moduleId },
        { $addToSet: { contentsIds: new mongoose.Types.ObjectId(contentId) } }
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException('Course module not found');
      }

      return {
        message: 'Content added to module successfully',
        updated: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async removeContentFromModule(moduleId: string, contentIds: (string | mongoose.Types.ObjectId)[], session: ClientSession | null = null) {
    try {
      const objectIds = contentIds.map((id) => new mongoose.Types.ObjectId(id));
      const result = await this.courseModuleModel.updateOne({ _id: moduleId }, { $pull: { contentsIds: { $in: objectIds } } }).session(session);
      if (result.matchedCount === 0) {
        throw new NotFoundException('Course module not found');
      }
      return {
        message: 'Contents removed from module successfully',
        updated: true,
        result,
      };
    } catch {
      throw new InternalServerErrorException('Failed to remove contents');
    }
  }

  async update(moduleId: string, updateData: Partial<CreateCourseModuleDto>) {
    try {
      const module = await this.courseModuleModel.findById(moduleId);
      if (!module) {
        throw new NotFoundException('Course module not found');
      }

      const { authorization, organizationId, courseId, createdBy, ...changes } = updateData;

      const raw = changes as Record<string, unknown>;
      if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) {
        const existing = (module.toObject() as unknown as { settings?: Record<string, unknown> }).settings;
        raw.settings = mergeModuleContentSettingsPatch(existing, raw.settings);
      }
      if ('publishStatus' in raw) {
        raw.publishedAt = raw.publishStatus === PublishStatus.PUBLISHED ? new Date() : null;
      }

      const org = await this.organizationModel.findById(module.organizationId);
      applyUpdateWithApproval(module, changes as Record<string, unknown>, isOrgApproved(org));

      return module.save();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error);
    }
  }

  async deleteModules(moduleIds: string[], session?: ClientSession, deletedBy?: string | mongoose.Types.ObjectId | null) {
    const ownsSession = !session;
    if (!session) {
      session = await this.connection.startSession();
      session.startTransaction();
    }

    try {
      // Validate that all modules exist
      const modules = await this.courseModuleModel
        .find({
          _id: { $in: moduleIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
        .session(session);

      if (modules.length !== moduleIds.length) {
        const foundIds = new Set(modules.map((m) => m._id.toString()));
        const missingIds = moduleIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(`Modules not found: ${missingIds.join(', ')}`);
      }

      // Soft-delete nested contents first, then modules. Keep course.modulesIds links
      // so soft-delete stays reversible (trees filter deleted docs on read).
      for (const module of modules) {
        if (module.contentsIds && module.contentsIds.length > 0) {
          await this.courseContentService.deleteContents(module.contentsIds, session, deletedBy);
        }
      }

      await this.courseModuleModel
        .updateMany({ _id: { $in: moduleIds.map((id) => new mongoose.Types.ObjectId(id)) } }, { $set: buildSoftDeleteSet(deletedBy) })
        .session(session);

      if (ownsSession) {
        await session.commitTransaction();
      }

      return {
        message: `Successfully deleted ${moduleIds.length} module(s)`,
        deletedCount: moduleIds.length,
        deletedModuleIds: moduleIds,
      };
    } catch (error) {
      if (ownsSession && session.inTransaction()) {
        await session.abortTransaction();
      }

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete modules');
    } finally {
      if (ownsSession) {
        await session.endSession();
      }
    }
  }

  async deleteModule(moduleId: string, deletedBy?: string | mongoose.Types.ObjectId | null) {
    return this.deleteModules([moduleId], undefined, deletedBy);
  }
}
