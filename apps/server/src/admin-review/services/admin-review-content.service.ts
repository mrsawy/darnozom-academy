import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, Types } from 'mongoose';
import { ActiveStatus, ApprovalStatus } from '@darnozom/shared-types';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { CourseContentService } from 'src/course/services/content/course-content.service';
import { CourseContentNotificationService } from 'src/course/services/content/notification/course-content-notification.service';
import { buildPendingReviewFilter } from 'src/utils/approval.utils';
import { withDeletedQueryOptions } from 'src/utils/soft-delete';
import type { AdminPaginateDto } from '../dto/admin-paginate.dto';
import type { IBulkActionResult } from './admin-review.types';
import { AdminReviewSupport, stripLearnerFieldsFromContentPlain } from './admin-review.support';

@Injectable()
export class AdminReviewContentService {
  constructor(
    @InjectModel(CourseContent.name)
    private readonly contentModel: PaginateModel<CourseContent>,
    private readonly courseContentService: CourseContentService,
    private readonly courseContentNotificationService: CourseContentNotificationService,
    private readonly support: AdminReviewSupport
  ) {}

  async getPendingContents(dto: AdminPaginateDto) {
    const filter: FilterQuery<CourseContent> = {
      ...buildPendingReviewFilter(),
      ...this.support.buildSearchFilter<CourseContent>(dto.search, ['title']),
    };
    const result = await this.contentModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      ...withDeletedQueryOptions(),
      populate: ['organization', 'course', 'module'],
      sort: { createdAt: -1 },
    });
    return {
      ...result,
      docs: result.docs.map((doc) => stripLearnerFieldsFromContentPlain(doc.toObject() as unknown as Record<string, unknown>)),
    };
  }

  async approveContent(contentId: string, adminId: string) {
    const { saved, snapshot } = await this.support.approveEntity(this.contentModel, contentId, adminId, 'Content');

    const pendingUpdate = snapshot.pendingUpdate as Record<string, unknown> | null;
    if (pendingUpdate) {
      const oldSizeBytes = (snapshot.fileSizeBytes as number) ?? 0;
      const pendingSizeBytes = (pendingUpdate.fileSizeBytes as number) ?? 0;
      if (oldSizeBytes !== pendingSizeBytes) {
        await this.support.adjustContentStorage(snapshot, oldSizeBytes, pendingSizeBytes);
      }
    }

    await this.courseContentNotificationService.notifyStudentsIfVisible(contentId, adminId);

    return saved;
  }

  async rejectContent(contentId: string, adminId: string, comment: string, deleteFiles = false) {
    const { saved, snapshot } = await this.support.rejectEntity(this.contentModel, contentId, adminId, comment, 'Content', deleteFiles);

    if (deleteFiles) {
      const pendingUpdate = snapshot.pendingUpdate as Record<string, unknown> | null;
      if (pendingUpdate) {
        const pendingSizeBytes = (pendingUpdate.fileSizeBytes as number) ?? 0;
        if (pendingSizeBytes > 0) {
          await this.support.adjustContentStorage(snapshot, pendingSizeBytes, 0);
        }
      } else if (snapshot.approvalStatus === ApprovalStatus.PENDING) {
        const mainSizeBytes = (snapshot.fileSizeBytes as number) ?? 0;
        if (mainSizeBytes > 0) {
          await this.support.adjustContentStorage(snapshot, mainSizeBytes, 0);
        }
      }
    }

    return saved;
  }

  async setContentActiveStatus(contentId: string, activeStatus: ActiveStatus) {
    const content = await this.contentModel.findById(contentId).setOptions(withDeletedQueryOptions());
    if (!content) throw new NotFoundException('Content not found');
    content.activeStatus = activeStatus;
    const saved = await content.save();
    if (activeStatus === ActiveStatus.ACTIVE) {
      await this.courseContentNotificationService.notifyStudentsIfVisible(contentId);
    }
    return saved;
  }

  async bulkApproveContents(itemIds: string[], adminId: string): Promise<IBulkActionResult> {
    const results = await Promise.allSettled(itemIds.map((id) => this.approveContent(id, adminId)));
    return this.support.summariseBulkResults(itemIds, results);
  }

  async bulkRejectContents(itemIds: string[], adminId: string, comment: string, deleteFiles = false): Promise<IBulkActionResult> {
    const results = await Promise.allSettled(itemIds.map((id) => this.rejectContent(id, adminId, comment, deleteFiles)));
    return this.support.summariseBulkResults(itemIds, results);
  }

  async bulkDeleteContents(itemIds: string[], deletedBy?: string): Promise<IBulkActionResult> {
    // Group by moduleId because deleteContents assumes same-module items
    const contents = await this.contentModel
      .find({
        _id: { $in: itemIds.map((id) => new Types.ObjectId(id)) },
      })
      .setOptions(withDeletedQueryOptions())
      .lean();

    const byModule = new Map<string, string[]>();
    for (const c of contents) {
      const mid = (c as unknown as { moduleId: { toString(): string } }).moduleId.toString();
      if (!byModule.has(mid)) byModule.set(mid, []);
      byModule.get(mid)!.push((c._id as { toString(): string }).toString());
    }

    const foundIds = new Set(contents.map((c) => (c._id as { toString(): string }).toString()));
    const notFoundIds = itemIds.filter((id) => !foundIds.has(id));

    const groupResults = await Promise.allSettled(
      [...byModule.values()].map((ids) => this.courseContentService.deleteContents(ids, null, deletedBy))
    );

    let succeeded = 0;
    const failed: { itemId: string; error: string }[] = notFoundIds.map((id) => ({ itemId: id, error: 'Content not found' }));

    const groupIds = [...byModule.values()];
    for (const [i, result] of groupResults.entries()) {
      if (result.status === 'fulfilled') {
        succeeded += groupIds[i].length;
      } else {
        const message =
          result.reason && typeof result.reason === 'object' && 'message' in result.reason
            ? String((result.reason as { message: string }).message)
            : String(result.reason);
        for (const id of groupIds[i]) {
          failed.push({ itemId: id, error: message });
        }
      }
    }

    return { succeeded, failed };
  }
}
