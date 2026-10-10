import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, PaginateModel, Schema as MongooseSchema } from 'mongoose';
import { CourseMessages, Roles } from '@lms-organization/shared-types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Discussion } from './entities/discussion.entity';
import { CourseDiscussion } from './entities/course-discussion.entity';
import { ModuleDiscussion } from './entities/module-discussion.entity';
import { ContentDiscussion } from './entities/content-discussion.entity';
import { Course } from '../course/entities/course.entity';
import { CourseModuleEntity } from '../course/entities/course-module.entity';
import { CourseContent } from '../course/entities/course-content.entity';
import { isDiscussionEnabled } from '../course/entities/module-content-settings.embed';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { GetDiscussionsDto } from './dto/get-discussions.dto';
import { DiscussionType } from './enum/discussion-type.enum';
import { DISCUSSION_CREATED_EVENT, DiscussionCreatedEvent } from './events/discussion-created.event';
import { lookupNotDeleted } from 'src/utils/soft-delete';

const ORG_ROLES = new Set<string>([Roles.SUPER_ADMIN, Roles.ADMIN, Roles.INSTRUCTOR, Roles.SECRETARY]);

/** Minimal fields to validate hierarchical discussion flags (create, list, update, etc.). */
interface DiscussionScopeRef {
  type: DiscussionType;
  courseId: string;
  moduleId?: string;
  contentId?: string;
}

@Injectable()
export class DiscussionService {
  constructor(
    @InjectModel(Discussion.name)
    private discussionModel: Model<Discussion> & PaginateModel<Discussion>,
    @InjectModel(CourseDiscussion.name)
    private courseDiscussionModel: Model<CourseDiscussion> & PaginateModel<CourseDiscussion>,
    @InjectModel(ModuleDiscussion.name)
    private moduleDiscussionModel: Model<ModuleDiscussion> & PaginateModel<ModuleDiscussion>,
    @InjectModel(ContentDiscussion.name)
    private contentDiscussionModel: Model<ContentDiscussion> & PaginateModel<ContentDiscussion>,
    @InjectModel(Course.name)
    private courseModel: Model<Course>,
    @InjectModel('CourseModule')
    private courseModuleModel: Model<CourseModuleEntity>,
    @InjectModel(CourseContent.name)
    private courseContentModel: Model<CourseContent>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /** Course, module, and content must all allow discussion (missing settings or field ⇒ enabled). */
  private async assertDiscussionScopeAllowed(scope: DiscussionScopeRef): Promise<void> {
    const { type, courseId, moduleId, contentId } = scope;
    if (!courseId) {
      throw new BadRequestException('courseId is required');
    }

    const courseDoc = await this.courseModel.findById(courseId).select('settings').lean();
    if (!courseDoc) {
      throw new NotFoundException('Course not found');
    }
    const courseSettings = (courseDoc as { settings?: { discussionEnabled?: boolean } }).settings;
    if (!isDiscussionEnabled(courseSettings)) {
      throw new ForbiddenException(CourseMessages.DISCUSSION_DISABLED);
    }

    if (type === DiscussionType.COURSE) {
      return;
    }

    if (!moduleId) {
      throw new BadRequestException('moduleId is required');
    }

    const moduleDoc = await this.courseModuleModel.findById(moduleId).select('courseId settings').lean();
    if (!moduleDoc) {
      throw new NotFoundException('Module not found');
    }
    if (moduleDoc.courseId.toString() !== courseId) {
      throw new BadRequestException('moduleId does not belong to courseId');
    }
    const moduleSettings = (moduleDoc as { settings?: { discussionEnabled?: boolean } }).settings;
    if (!isDiscussionEnabled(moduleSettings)) {
      throw new ForbiddenException(CourseMessages.DISCUSSION_DISABLED);
    }

    if (type === DiscussionType.MODULE) {
      return;
    }

    if (!contentId) {
      throw new BadRequestException('contentId is required');
    }

    const contentDoc = await this.courseContentModel.findById(contentId).select('courseId moduleId settings').lean();
    if (!contentDoc) {
      throw new NotFoundException('Content not found');
    }
    if (contentDoc.courseId.toString() !== courseId || contentDoc.moduleId.toString() !== moduleId) {
      throw new BadRequestException('contentId does not match courseId/moduleId');
    }
    const contentSettings = (contentDoc as { settings?: { discussionEnabled?: boolean } }).settings;
    if (!isDiscussionEnabled(contentSettings)) {
      throw new ForbiddenException(CourseMessages.DISCUSSION_DISABLED);
    }
  }

  private async assertDiscussionScopeAllowedFromDocument(discussion: Discussion): Promise<void> {
    const plain = discussion.toObject() as Discussion & {
      courseId?: Types.ObjectId;
      moduleId?: Types.ObjectId;
      contentId?: Types.ObjectId;
    };
    await this.assertDiscussionScopeAllowed({
      type: discussion.type,
      courseId: plain.courseId?.toString() ?? '',
      moduleId: plain.moduleId?.toString(),
      contentId: plain.contentId?.toString(),
    });
  }

  private async resolveOrganizationId(courseId?: string): Promise<Types.ObjectId | undefined> {
    if (!courseId) return undefined;
    const course = await this.courseModel.findById(courseId).select('organizationId').lean();
    return course?.organizationId ? new Types.ObjectId(course.organizationId.toString()) : undefined;
  }

  async create(createDiscussionDto: CreateDiscussionDto, userId: string): Promise<Discussion> {
    const { type, parentId, ...rest } = createDiscussionDto;

    if (parentId) {
      const parentDiscussion = await this.discussionModel.findById(parentId);
      if (!parentDiscussion) {
        throw new NotFoundException('Parent discussion not found');
      }
    }

    await this.assertDiscussionScopeAllowed({
      type: createDiscussionDto.type,
      courseId: createDiscussionDto.courseId,
      moduleId: createDiscussionDto.moduleId,
      contentId: createDiscussionDto.contentId,
    });

    const organizationId = await this.resolveOrganizationId(createDiscussionDto.courseId);

    let discussion: Discussion;

    switch (type) {
      case DiscussionType.COURSE: {
        if (!createDiscussionDto.courseId) {
          throw new BadRequestException('courseId is required for course discussion');
        }
        discussion = await this.courseDiscussionModel.create({
          userId: new Types.ObjectId(userId),
          content: rest.content,
          courseId: new Types.ObjectId(createDiscussionDto.courseId),
          organizationId,
          parentId: parentId ? new Types.ObjectId(parentId) : null,
        });
        break;
      }

      case DiscussionType.MODULE: {
        if (!createDiscussionDto.courseId || !createDiscussionDto.moduleId) {
          throw new BadRequestException('courseId and moduleId are required for module discussion');
        }
        discussion = await this.moduleDiscussionModel.create({
          userId: new Types.ObjectId(userId),
          content: rest.content,
          courseId: new Types.ObjectId(createDiscussionDto.courseId),
          moduleId: new Types.ObjectId(createDiscussionDto.moduleId),
          organizationId,
          parentId: parentId ? new Types.ObjectId(parentId) : null,
        });
        break;
      }

      case DiscussionType.CONTENT: {
        if (!createDiscussionDto.courseId || !createDiscussionDto.moduleId || !createDiscussionDto.contentId) {
          throw new BadRequestException('courseId, moduleId, and contentId are required for content discussion');
        }
        discussion = await this.contentDiscussionModel.create({
          userId: new Types.ObjectId(userId),
          content: rest.content,
          courseId: new Types.ObjectId(createDiscussionDto.courseId),
          moduleId: new Types.ObjectId(createDiscussionDto.moduleId),
          contentId: new Types.ObjectId(createDiscussionDto.contentId),
          organizationId,
          parentId: parentId ? new Types.ObjectId(parentId) : null,
        });
        break;
      }

      default: {
        throw new BadRequestException('Invalid discussion type');
      }
    }

    // Update parent repliesCount and resolve parent author for reply notifications
    let parentAuthorId: string | undefined;
    if (parentId) {
      const parent = await this.discussionModel
        .findByIdAndUpdate(parentId, { $inc: { repliesCount: 1 } }, { new: false })
        .select('userId')
        .lean();
      parentAuthorId = parent?.userId?.toString();
    }

    // Resolve course instructor for top-level discussion notifications
    let courseInstructorId: string | undefined;
    if (createDiscussionDto.courseId) {
      const course = await this.courseModel.findById(createDiscussionDto.courseId).select('instructorId').lean();
      courseInstructorId = course?.instructorId?.toString();
    }

    this.eventEmitter.emit(
      DISCUSSION_CREATED_EVENT,
      new DiscussionCreatedEvent(
        (discussion._id as Types.ObjectId).toString(),
        userId,
        type,
        createDiscussionDto.courseId,
        createDiscussionDto.moduleId,
        createDiscussionDto.contentId,
        parentAuthorId,
        courseInstructorId
      )
    );

    return discussion;
  }

  async findAll(getDiscussionsDto: GetDiscussionsDto) {
    const { type, entityId, moduleId, contentId, parentId = null, page = 1, limit = 20 } = getDiscussionsDto;

    await this.assertDiscussionScopeAllowed({
      type,
      courseId: entityId,
      moduleId,
      contentId,
    });

    const matchCondition: FilterQuery<Discussion> = {
      type,
      isDeleted: false,
      parentId,
    };

    // Build match condition based on type
    switch (type) {
      case DiscussionType.COURSE: {
        (matchCondition as FilterQuery<Discussion> & { courseId: Types.ObjectId }).courseId = new Types.ObjectId(entityId);
        break;
      }
      case DiscussionType.MODULE: {
        (matchCondition as FilterQuery<Discussion> & { courseId: Types.ObjectId; moduleId: Types.ObjectId }).courseId = new Types.ObjectId(entityId);
        (matchCondition as FilterQuery<Discussion> & { courseId: Types.ObjectId; moduleId: Types.ObjectId }).moduleId = new Types.ObjectId(moduleId!);
        break;
      }
      case DiscussionType.CONTENT: {
        (matchCondition as FilterQuery<Discussion> & { courseId: Types.ObjectId; moduleId: Types.ObjectId; contentId: Types.ObjectId }).courseId =
          new Types.ObjectId(entityId);
        (matchCondition as FilterQuery<Discussion> & { courseId: Types.ObjectId; moduleId: Types.ObjectId; contentId: Types.ObjectId }).moduleId =
          new Types.ObjectId(moduleId!);
        (matchCondition as FilterQuery<Discussion> & { courseId: Types.ObjectId; moduleId: Types.ObjectId; contentId: Types.ObjectId }).contentId =
          new Types.ObjectId(contentId!);
        break;
      }
    }
    const discussions = await this.discussionModel.paginate(matchCondition, {
      page,
      limit,
      populate: 'user',
    });

    return discussions;
  }

  async findOne(id: string): Promise<Discussion> {
    const discussion = await this.discussionModel.findById(id).populate('userId', '-password -refreshToken').exec();

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    await this.assertDiscussionScopeAllowedFromDocument(discussion);

    return discussion;
  }

  async update(id: string, updateDiscussionDto: UpdateDiscussionDto, userId: string): Promise<Discussion> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    await this.assertDiscussionScopeAllowedFromDocument(discussion);

    if (!(discussion.userId instanceof Types.ObjectId)) {
      throw new BadRequestException('Invalid discussion userId');
    }
    const discussionUserId = discussion.userId.toString();
    if (discussionUserId !== userId) {
      throw new ForbiddenException('You can only update your own discussions');
    }

    discussion.content = updateDiscussionDto.content;
    discussion.isEdited = true;

    await discussion.save();

    return discussion;
  }

  async remove(id: string, userId: string, userRole?: string, userOrgId?: string): Promise<void> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    await this.assertDiscussionScopeAllowedFromDocument(discussion);

    const isPlatformAdmin = userRole === Roles.PLATFORM_ADMIN;
    const isOrgRole = !!userRole && ORG_ROLES.has(userRole);
    const isOwner = discussion.userId instanceof Types.ObjectId && discussion.userId.toString() === userId;
    const isSameOrg = isOrgRole && !!userOrgId && discussion.organizationId?.toString() === userOrgId;

    if (!isPlatformAdmin && !isSameOrg && !isOwner) {
      throw new ForbiddenException('You do not have permission to delete this discussion');
    }

    discussion.isDeleted = true;
    await discussion.save();

    if (discussion.parentId) {
      await this.discussionModel.findByIdAndUpdate(discussion.parentId, {
        $inc: { repliesCount: -1 },
      });
    }
  }

  async toggleLike(id: string, userId: string): Promise<Discussion> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    await this.assertDiscussionScopeAllowedFromDocument(discussion);

    const userObjectId = new Types.ObjectId(userId);
    const hasLiked = discussion.likedBy.some((id) => {
      if (!(id instanceof Types.ObjectId)) {
        return false;
      }
      return id.toString() === userId;
    });

    if (hasLiked) {
      // Unlike
      discussion.likedBy = discussion.likedBy.filter((id) => {
        if (!(id instanceof Types.ObjectId)) {
          return true; // Keep non-ObjectId entries
        }
        return id.toString() !== userId;
      });
      discussion.likesCount = Math.max(0, discussion.likesCount - 1);
    } else {
      // Like
      discussion.likedBy.push(userObjectId as unknown as MongooseSchema.Types.ObjectId);
      discussion.likesCount += 1;
    }

    await discussion.save();

    return discussion;
  }

  async getUserDiscussions(userId: string, page = 1, limit = 20): Promise<{ data: Discussion[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const result = await this.discussionModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            lookupNotDeleted('users', 'userId', 'user'),
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                'user.password': 0,
                'user.refreshToken': 0,
              },
            },
          ],
        },
      },
      {
        $project: {
          data: 1,
          total: { $arrayElemAt: ['$metadata.total', 0] },
          page: { $literal: page },
          limit: { $literal: limit },
        },
      },
    ]);

    return (result[0] as { data: Discussion[]; total: number; page: number; limit: number }) ?? { data: [], total: 0, page, limit };
  }
}
