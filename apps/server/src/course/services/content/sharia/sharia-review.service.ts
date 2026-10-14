import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShariaErrors, ShariaStatus } from '@darnozom/shared-types';
import { CourseContent } from '../../../entities/course-content.entity';
import { CourseContentService } from '../course-content.service';
import { CourseContentNotificationService } from '../notification/course-content-notification.service';
import { ContentVersionLean, ContentVersionService } from './content-version.service';
import { ShariaFileCleanupService } from './sharia-file-cleanup.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface ShariaQueueItem {
  contentId: string;
  contentTitle: string;
  courseId: string;
  version: number;
  createdAt: Date | null;
  createdBy: string | null;
  /** True when the live content is already approved and this version is a held-back edit. */
  isEdit: boolean;
}

interface ContentForReview {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  title: string;
  shariaStatus: ShariaStatus;
  currentVersion: number;
  pendingVersion: number | null;
}

@Injectable()
export class ShariaReviewService {
  constructor(
    @InjectModel(CourseContent.name) private readonly contentModel: Model<CourseContent>,
    private readonly versionService: ContentVersionService,
    private readonly contentService: CourseContentService,
    private readonly notifications: CourseContentNotificationService,
    private readonly cleanup: ShariaFileCleanupService
  ) {}

  /** Everything waiting for a reviewer in this organization, oldest first. */
  async queue(organizationId: string): Promise<ShariaQueueItem[]> {
    const rows = await this.contentModel.aggregate<{
      _id: Types.ObjectId;
      version: number;
      createdAt: Date | null;
      createdBy: Types.ObjectId | null;
      title: string;
      courseId: Types.ObjectId;
      contentShariaStatus: ShariaStatus;
    }>([
      { $match: { organizationId: oid(organizationId), deletedAt: null } },
      {
        $lookup: {
          from: 'contentversions',
          let: { contentId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$contentId', '$$contentId'] }, shariaStatus: ShariaStatus.PENDING } },
            { $sort: { version: -1 } },
            { $limit: 1 },
          ],
          as: 'pending',
        },
      },
      { $unwind: '$pending' },
      {
        $project: {
          _id: 1,
          title: 1,
          courseId: 1,
          contentShariaStatus: '$shariaStatus',
          version: '$pending.version',
          createdAt: '$pending.createdAt',
          createdBy: '$pending.createdBy',
        },
      },
      { $sort: { createdAt: 1 } },
    ]);

    return rows.map((row) => ({
      contentId: String(row._id),
      contentTitle: row.title,
      courseId: String(row.courseId),
      version: row.version,
      createdAt: row.createdAt ?? null,
      createdBy: row.createdBy ? String(row.createdBy) : null,
      isEdit: row.contentShariaStatus === ShariaStatus.APPROVED,
    }));
  }

  async versions(organizationId: string, contentId: string): Promise<ContentVersionLean[]> {
    return this.versionService.listForContent(organizationId, contentId);
  }

  /**
   * Approves a version. For a held-back edit the stored change-set is replayed through
   * `CourseContentService.update`, so the platform `applyUpdateWithApproval` path, the storage
   * accounting, the file cleanup and the transcription re-enqueue all behave exactly as they do
   * for a normal edit. Nothing here writes `approvalStatus` itself.
   */
  async approve(reviewerId: string, organizationId: string, contentId: string, version: number): Promise<void> {
    const { versionDoc, content } = await this.loadPending(organizationId, contentId, version);

    const isHeldEdit = content.shariaStatus === ShariaStatus.APPROVED;
    // A held edit is only approvable while it is still the one the content points at. If a newer
    // edit arrived, this one was superseded and approving it would overwrite the newer values.
    if (isHeldEdit && content.pendingVersion !== versionDoc.version) {
      throw new ConflictException(ShariaErrors.VERSION_NOT_PENDING);
    }

    // Claim the review before touching the content, so a lost race changes nothing.
    const won = await this.versionService.markReviewed(versionDoc._id, ShariaStatus.APPROVED, reviewerId, null);
    if (!won) throw new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED);

    if (isHeldEdit) {
      await this.contentService.update(String(content._id), versionDoc.changes as never, { shariaBypass: true });
    }

    await this.contentModel
      .updateOne({ _id: content._id }, { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: versionDoc.version, pendingVersion: null } })
      .exec();

    if (!isHeldEdit) {
      // The replay already fires this from inside update; for a first approval nothing else would.
      await this.notifications.notifyStudentsIfVisible(String(content._id));
    }
  }

  /** Rejects a version. A comment is required: the author needs to know what to change. */
  async reject(reviewerId: string, organizationId: string, contentId: string, version: number, comment: string): Promise<void> {
    const trimmed = comment?.trim();
    if (!trimmed) throw new BadRequestException(ShariaErrors.REJECT_COMMENT_REQUIRED);

    const { versionDoc, content } = await this.loadPending(organizationId, contentId, version);

    const won = await this.versionService.markReviewed(versionDoc._id, ShariaStatus.REJECTED, reviewerId, trimmed);
    if (!won) throw new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED);

    // A held-back edit leaves the live content exactly as it was; only the pointer is cleared, so
    // students keep seeing the approved values and the author can edit again straight away.
    const set: Record<string, unknown> =
      content.shariaStatus === ShariaStatus.APPROVED ? { pendingVersion: null } : { shariaStatus: ShariaStatus.REJECTED, pendingVersion: null };
    await this.contentModel.updateOne({ _id: content._id }, { $set: set }).exec();

    await this.cleanup.onVersionClosed(content._id, versionDoc.changes);
  }

  /** Shared load-and-validate for approve and reject. */
  protected async loadPending(
    organizationId: string,
    contentId: string,
    version: number
  ): Promise<{ versionDoc: ContentVersionLean; content: ContentForReview }> {
    const versionDoc = await this.versionService.findVersion(organizationId, contentId, version);
    if (!versionDoc) throw new NotFoundException(ShariaErrors.VERSION_NOT_FOUND);
    if (versionDoc.shariaStatus !== ShariaStatus.PENDING) throw new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED);

    const content = await this.contentModel
      .findOne({ _id: oid(contentId), organizationId: oid(organizationId) })
      .lean<ContentForReview | null>()
      .exec();
    if (!content) throw new NotFoundException(ShariaErrors.CONTENT_NOT_FOUND);

    return { versionDoc, content };
  }
}
