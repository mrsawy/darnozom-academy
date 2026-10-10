import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Course } from '../../entities/course.entity';
import mongoose, { ClientSession, Model, Connection, PaginateModel } from 'mongoose';
import { ApprovalStatus, MeetingProvider, Platform, PublishStatus } from '@lms-organization/shared-types';
import { FileService } from 'src/file/file.service';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { applyUpdateWithApproval } from 'src/utils/approval.utils';
import { assertOrgApproved, isOrgApproved } from 'src/utils/verification.utils';
import { Organization } from 'src/organization/entities/organization.entity';
import { CourseContent } from '../../entities/course-content.entity';
import { CreateCourseContentDto } from '../../dto/create-course-content.dto';
import { ContentType } from '../../enum/contentType.enum';
import { VideoType } from '../../enum/videoType.enum';
import { CourseModuleEntity } from '../../entities/course-module.entity';
import { mergeModuleContentSettingsPatch } from '../../utils/merge-settings-partial.util';
import { TranscriptionService } from 'src/transcription/transcription.service';
import { buildSoftDeleteSet } from 'src/utils/soft-delete';
import { CourseContentStorageService } from './course-content-storage.service';
import { bytesToGB, hasFileStorage } from './course-content-storage.util';
import { CourseContentNotificationService } from './notification/course-content-notification.service';

/** Create / update / delete of course content. Reads live in CourseContentQueryService. */
@Injectable()
export class CourseContentService {
  private readonly logger = new Logger(CourseContentService.name);

  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: PaginateModel<CourseContent>,
    @InjectModel('CourseModule')
    private readonly courseModuleModel: Model<CourseModuleEntity>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>,
    @InjectConnection() private readonly connection: Connection,
    private readonly fileService: FileService,
    private readonly subscriptionService: SubscriptionService,
    private readonly transcriptionService: TranscriptionService,
    private readonly storageService: CourseContentStorageService,
    private readonly notificationService: CourseContentNotificationService
  ) {}

  async createCourseContent(createCourseContentDto: CreateCourseContentDto) {
    const organizationId = createCourseContentDto.organizationId;
    if (!organizationId) throw new NotFoundException('Organization ID is required');

    if (createCourseContentDto.type === ContentType.LIVE_SESSION) {
      await this.subscriptionService.assertWithinLimit(organizationId, 'liveSessionsPerMonth', 1);
    }
    if (createCourseContentDto.type === ContentType.ASSIGNMENT) {
      await this.subscriptionService.assertWithinLimit(organizationId, 'assignmentsPerMonth', 1);
    }

    if (hasFileStorage(createCourseContentDto)) {
      const fileSizeBytes = createCourseContentDto.fileSizeBytes ?? 0;
      if (fileSizeBytes <= 0) throw new ForbiddenException('File size is required for uploaded file content.');
      await this.storageService.checkAndReserveStorage(organizationId, fileSizeBytes);
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { courseId, moduleId } = createCourseContentDto;

      const course = await this.courseModel.findById(courseId).session(session);
      if (!course) throw new NotFoundException('Course not found');

      const module = await this.courseModuleModel.findById(moduleId).session(session);
      if (!module) throw new NotFoundException('Module not found');

      const org = await this.organizationModel.findById(organizationId).session(session);
      assertOrgApproved(org);

      // Pre-generate _id so the Agora channel name (derived from it) can be included in the
      // initial create — the pre-validate hook requires agoraChannelName when provider is AGORA.
      const newId = new mongoose.Types.ObjectId();
      const isAgora = createCourseContentDto.type === ContentType.LIVE_SESSION && createCourseContentDto.provider === MeetingProvider.AGORA;

      const publishStatus = createCourseContentDto.publishStatus ?? PublishStatus.PUBLISHED;
      const [createdContent] = await this.courseContentModel.create(
        [
          {
            ...createCourseContentDto,
            _id: newId,
            publishStatus,
            publishedAt: publishStatus === PublishStatus.PUBLISHED ? new Date() : null,
            approvalStatus: isOrgApproved(org) ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
            ...(isAgora
              ? {
                  agoraChannelName: `live-${newId.toString()}`,
                  platform: Platform.AGORA,
                }
              : {}),
          },
        ],
        { session }
      );
      await this.courseModuleModel.findByIdAndUpdate(moduleId, { $push: { contentsIds: createdContent._id } }, { session, new: true });

      if (hasFileStorage(createCourseContentDto) && (createCourseContentDto.fileSizeBytes ?? 0) > 0) {
        await this.subscriptionService.incrementUsage(organizationId, 'storageUsedGB', bytesToGB(createCourseContentDto.fileSizeBytes!), session);
      }
      if (createCourseContentDto.type === ContentType.LIVE_SESSION) {
        await this.subscriptionService.incrementUsage(organizationId, 'liveSessionsUsed', 1, session);
      }
      if (createCourseContentDto.type === ContentType.ASSIGNMENT) {
        await this.subscriptionService.incrementUsage(organizationId, 'assignmentsUsed', 1, session);
      }

      await session.commitTransaction();

      void this.notificationService
        .notifyStudentsIfVisible(createdContent._id.toString(), createCourseContentDto.createdBy?.toString())
        .catch((err: unknown) => {
          this.logger.error('[Notification] Failed to emit content published event:', err);
        });

      if (createCourseContentDto.type === ContentType.VIDEO || createCourseContentDto.type === ContentType.ATTACHMENT) {
        void this.transcriptionService.enqueue(createdContent._id.toString()).catch((err: unknown) => {
          this.logger.error('[Transcription] Failed to enqueue job:', err);
        });
      }

      return createdContent;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateCourseContent(createCourseContentDto: CreateCourseContentDto & { contentId: string }) {
    const { contentId, type: discriminatorKey, ...updateData } = createCourseContentDto;

    const existingDoc = await this.courseContentModel.findById(contentId);
    if (!existingDoc) throw new NotFoundException('Content not found');

    const existing = existingDoc.toObject() as {
      organizationId?: mongoose.Types.ObjectId;
      type?: string;
      videoType?: string;
      fileKey?: string;
      fileSizeBytes?: number;
      approvalStatus?: ApprovalStatus;
    };

    const organizationId = existing.organizationId?.toString();
    if (!organizationId) throw new NotFoundException('Organization not found for this content');

    const isFileContent =
      (existing.type === ContentType.VIDEO && (existing.videoType === VideoType.UPLOAD || updateData.videoType === VideoType.UPLOAD)) ||
      (existing.type === ContentType.ASSIGNMENT && !!(existing.fileKey ?? updateData.fileKey)) ||
      existing.type === ContentType.ATTACHMENT;
    const newFileSizeBytes = updateData.fileSizeBytes ?? 0;
    const oldFileSizeBytes = existing.fileSizeBytes ?? 0;
    const deltaBytes = newFileSizeBytes - oldFileSizeBytes;
    if (deltaBytes > 0 && isFileContent) {
      await this.storageService.checkAndReserveStorage(organizationId, deltaBytes);
    }

    const { authorization, organizationId: _orgId, courseId: _cId, moduleId: _mId, createdBy: _cb, ...changes } = updateData;

    const raw = changes as Record<string, unknown>;
    if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) {
      const existing = (existingDoc.toObject() as unknown as { settings?: Record<string, unknown> }).settings;
      raw.settings = mergeModuleContentSettingsPatch(existing, raw.settings);
    }
    if ('publishStatus' in raw) {
      raw.publishedAt = raw.publishStatus === PublishStatus.PUBLISHED ? new Date() : null;
    }

    // Handle file key changes for non-live path (only when the client sends an explicit fileKey)
    const isLive = existingDoc.approvalStatus === ApprovalStatus.APPROVED || existingDoc.approvalStatus === ApprovalStatus.PENDING_UPDATE;

    if (!isLive && 'fileKey' in updateData && updateData.fileKey !== existing.fileKey && existing.fileKey) {
      await this.fileService.deleteFile(existing.fileKey);
    }

    if (existingDoc.approvalStatus === ApprovalStatus.PENDING_UPDATE && existingDoc.pendingUpdate) {
      const oldPendingFileKey = existingDoc.pendingUpdate.fileKey as string | undefined;
      const newFileKey = (changes as Record<string, unknown>).fileKey as string | undefined;
      if (oldPendingFileKey && typeof oldPendingFileKey === 'string' && oldPendingFileKey !== newFileKey) {
        await this.fileService.deleteFile(oldPendingFileKey);
      }
    }

    const org = await this.organizationModel.findById(organizationId);
    applyUpdateWithApproval(existingDoc, changes as Record<string, unknown>, isOrgApproved(org));
    await existingDoc.save();

    void this.notificationService.notifyStudentsIfVisible(contentId, createCourseContentDto.createdBy?.toString()).catch((err: unknown) => {
      this.logger.error('[Notification] Failed to emit content published event:', err);
    });

    const existingVideoUrl = (existing as Record<string, unknown>).videoUrl;
    if (
      existing.type === ContentType.VIDEO &&
      (('fileKey' in updateData && updateData.fileKey !== existing.fileKey) || ('videoUrl' in updateData && updateData.videoUrl !== existingVideoUrl))
    ) {
      void this.transcriptionService.enqueue(contentId).catch((err: unknown) => {
        this.logger.error('[Transcription] Failed to re-enqueue job on update:', err);
      });
    }

    if (existing.type === ContentType.ATTACHMENT && 'fileKey' in updateData && updateData.fileKey !== existing.fileKey) {
      void this.transcriptionService.enqueue(contentId).catch((err: unknown) => {
        this.logger.error('[Transcription] Failed to re-enqueue attachment job on update:', err);
      });
    }

    if (!isLive && deltaBytes !== 0 && isFileContent) {
      const deltaGB = bytesToGB(Math.abs(deltaBytes));
      await (deltaBytes > 0
        ? this.subscriptionService.incrementUsage(organizationId, 'storageUsedGB', deltaGB)
        : this.subscriptionService.decrementUsage(organizationId, 'storageUsedGB', deltaGB));
    }

    return existingDoc;
  }

  async deleteContents(
    contentIds: (string | mongoose.Types.ObjectId)[],
    session: ClientSession | null = null,
    deletedById?: string | mongoose.Types.ObjectId | null
  ) {
    let localSession = false;
    if (!session) {
      session = await this.connection.startSession();
      session.startTransaction();
      localSession = true;
    }

    try {
      const objectIds = contentIds.map((id) => new mongoose.Types.ObjectId(id));
      const contents = await this.courseContentModel
        .find({ _id: { $in: objectIds } })
        .session(session)
        .lean();
      if (contents.length !== contentIds.length) {
        throw new NotFoundException('Contents not found');
      }

      // Keep parent module.contentsIds links so soft-delete stays reversible.
      // Learner/org trees already hide soft-deleted rows via NOT_DELETED filters / $lookup.
      const result = await this.courseContentModel
        .updateMany({ _id: { $in: objectIds } }, { $set: buildSoftDeleteSet(deletedById) })
        .session(session);

      if (localSession) {
        await session.commitTransaction();
      }

      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (localSession) {
        await session.endSession();
      }
    }
  }
}
