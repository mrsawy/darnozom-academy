import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, PaginateOptions, Types } from 'mongoose';
import { ApprovalStatus } from '@darnozom/shared-types';
import { Category } from 'src/category/entities/category.entity';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { FileService } from 'src/file/file.service';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { IApprovableDocument, mergeApproval, rejectApproval, escapeRegex } from 'src/utils/approval.utils';
import type { AdminPaginateDto } from '../dto/admin-paginate.dto';
import type { IBulkActionResult } from './admin-review.types';

const FILE_KEY_FIELDS = new Set(['fileKey', 'thumbnailKey', 'trailerKey']);
const BYTES_PER_GB = 1024 ** 3;

/** Remove learner attempt arrays from admin list/detail payloads for course content. */
export function stripLearnerFieldsFromContentPlain(plain: Record<string, unknown>): Record<string, unknown> {
  const next = { ...plain };
  delete next.quizSubmissions;
  delete next.submissions;
  const pu = next.pendingUpdate;
  if (pu && typeof pu === 'object' && !Array.isArray(pu)) {
    const patch = { ...(pu as Record<string, unknown>) };
    delete patch.quizSubmissions;
    delete patch.submissions;
    next.pendingUpdate = patch;
  }
  return next;
}

@Injectable()
export class AdminReviewSupport {
  private readonly logger = new Logger(AdminReviewSupport.name);

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: PaginateModel<Category>,
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<User>,
    private readonly fileService: FileService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  extractPaginateOptions(dto: AdminPaginateDto | undefined): PaginateOptions {
    const safe = dto ?? {};
    const { search: _ignored, ...rest } = safe;
    return rest;
  }

  /** Match users/courses whether organizationId was stored as ObjectId or string (legacy / mixed data). */
  organizationIdMatch(orgId: string): { organizationId: { $in: (Types.ObjectId | string)[] } } {
    if (!Types.ObjectId.isValid(orgId)) {
      throw new BadRequestException('Invalid organization id');
    }
    const oid = new Types.ObjectId(orgId);
    return { organizationId: { $in: [oid, orgId] } };
  }

  buildSearchFilter<T>(search: string | undefined, fields: string[]): FilterQuery<T> {
    if (!search?.trim()) return {};
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    return { $or: fields.map((f) => ({ [f]: regex })) } as FilterQuery<T>;
  }

  extractFileKeys(obj: Record<string, unknown> | null | undefined): string[] {
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([key, val]) => FILE_KEY_FIELDS.has(key) && typeof val === 'string' && val.length > 0)
      .map(([, val]) => val as string);
  }

  async deleteFiles(keys: string[]): Promise<void> {
    const results = await Promise.allSettled(keys.map((k) => this.fileService.deleteFile(k)));
    for (const [i, result] of results.entries()) {
      if (result.status === 'rejected') {
        this.logger.warn(`Failed to delete file "${keys[i]}": ${result.reason}`);
      }
    }
  }

  async adjustContentStorage(doc: Record<string, unknown>, oldSizeBytes: number, newSizeBytes: number): Promise<void> {
    const orgId = doc.organizationId?.toString?.() ?? (doc.organizationId as string);
    if (!orgId) return;
    const deltaBytes = newSizeBytes - oldSizeBytes;
    if (deltaBytes === 0) return;
    const deltaGB = Math.abs(deltaBytes) / BYTES_PER_GB;
    await (deltaBytes > 0
      ? this.subscriptionService.incrementUsage(orgId, 'storageUsedGB', deltaGB)
      : this.subscriptionService.decrementUsage(orgId, 'storageUsedGB', deltaGB));
  }

  async approveEntity<T extends IApprovableDocument>(
    model: PaginateModel<T>,
    entityId: string,
    adminId: string,
    entityName: string
  ): Promise<{ saved: T; snapshot: Record<string, unknown> }> {
    const doc = await model.findById(entityId);
    if (!doc) throw new NotFoundException(`${entityName} not found`);

    const snapshot = doc.toObject() as unknown as Record<string, unknown>;

    if (doc.approvalStatus === ApprovalStatus.APPROVED) {
      throw new BadRequestException(`${entityName} is already approved`);
    }
    if (doc.approvalStatus === ApprovalStatus.REJECTED) {
      throw new BadRequestException(`${entityName} has been rejected — it must be resubmitted before approval`);
    }

    if (doc.pendingUpdate) {
      const oldFileKeys: string[] = [];

      for (const field of FILE_KEY_FIELDS) {
        const newVal = doc.pendingUpdate[field];
        const oldVal = snapshot[field];
        if (typeof newVal === 'string' && typeof oldVal === 'string' && newVal !== oldVal) {
          oldFileKeys.push(oldVal);
        }
        if (newVal === null && typeof oldVal === 'string') {
          oldFileKeys.push(oldVal);
        }
      }

      if (oldFileKeys.length > 0) {
        await this.deleteFiles(oldFileKeys);
      }
    }

    mergeApproval(doc, adminId);
    const saved = await doc.save();
    return { saved: saved as T, snapshot };
  }

  async rejectEntity<T extends IApprovableDocument>(
    model: PaginateModel<T>,
    entityId: string,
    adminId: string,
    comment: string,
    entityName: string,
    deleteFiles = false
  ): Promise<{ saved: T; snapshot: Record<string, unknown> }> {
    const doc = await model.findById(entityId);
    if (!doc) throw new NotFoundException(`${entityName} not found`);

    const snapshot = doc.toObject() as unknown as Record<string, unknown>;

    if (doc.approvalStatus === ApprovalStatus.REJECTED) {
      throw new BadRequestException(`${entityName} is already rejected`);
    }
    if (doc.approvalStatus === ApprovalStatus.APPROVED && !doc.pendingUpdate) {
      throw new BadRequestException(`${entityName} is approved with no pending changes to reject`);
    }

    if (deleteFiles) {
      if (doc.pendingUpdate) {
        const pendingFileKeys = this.extractFileKeys(doc.pendingUpdate);
        if (pendingFileKeys.length > 0) {
          await this.deleteFiles(pendingFileKeys);
        }
      } else if (doc.approvalStatus === ApprovalStatus.PENDING) {
        const mainFileKeys = this.extractFileKeys(snapshot);
        if (mainFileKeys.length > 0) {
          await this.deleteFiles(mainFileKeys);
          for (const field of FILE_KEY_FIELDS) {
            if (typeof snapshot[field] === 'string') {
              (doc as unknown as Record<string, unknown>)[field] = null;
            }
          }
        }
      }
    }

    rejectApproval(doc, adminId, comment);
    const saved = await doc.save();
    return { saved: saved as T, snapshot };
  }

  /**
   * Resolve raw ObjectId references inside pendingUpdate (categoriesIds,
   * instructorId, coInstructorsIds) to human-readable {_id, name/firstName/…}
   * objects so the frontend can display names instead of IDs.
   */
  async enrichPendingUpdateRefs(docs: Course[]): Promise<void> {
    const allCategoryIds = new Set<string>();
    const allUserIds = new Set<string>();

    for (const doc of docs) {
      const snapshot: Pick<Course, 'pendingUpdate'> =
        'toObject' in doc && typeof doc.toObject === 'function'
          ? (doc.toObject() as Pick<Course, 'pendingUpdate'>)
          : (doc as Pick<Course, 'pendingUpdate'>);
      const pending = snapshot.pendingUpdate;
      if (!pending) continue;
      if (Array.isArray(pending.categoriesIds)) {
        for (const id of pending.categoriesIds) allCategoryIds.add(String(id));
      }
      if (pending.instructorId) allUserIds.add(String(pending.instructorId));
      if (Array.isArray(pending.coInstructorsIds)) {
        for (const id of pending.coInstructorsIds) allUserIds.add(String(id));
      }
    }

    const [categoryMap, userMap] = await Promise.all([this.resolveCategoryNames(allCategoryIds), this.resolveUserNames(allUserIds)]);

    for (const doc of docs) {
      const pending = doc.pendingUpdate;
      if (!pending) continue;

      if (Array.isArray(pending.categoriesIds)) {
        pending.categories = (pending.categoriesIds as unknown[]).map((id) => ({
          _id: String(id),
          name: categoryMap.get(String(id)) ?? String(id),
        }));
        delete pending.categoriesIds;
      }

      if (pending.instructorId) {
        const u = userMap.get(String(pending.instructorId));
        pending.instructor = u
          ? { _id: String(pending.instructorId), firstName: u.firstName, lastName: u.lastName, username: u.username }
          : { _id: String(pending.instructorId), name: String(pending.instructorId) };
        delete pending.instructorId;
      }

      if (Array.isArray(pending.coInstructorsIds)) {
        pending.coInstructors = (pending.coInstructorsIds as unknown[]).map((id) => {
          const u = userMap.get(String(id));
          return u ? { _id: String(id), firstName: u.firstName, lastName: u.lastName, username: u.username } : { _id: String(id), name: String(id) };
        });
        delete pending.coInstructorsIds;
      }
    }
  }

  async resolveCategoryNames(ids: Set<string>): Promise<Map<string, string>> {
    if (ids.size === 0) return new Map();
    const cats = await this.categoryModel.find({ _id: { $in: [...ids].map((id) => new Types.ObjectId(id)) } }, { _id: 1, name: 1 }).lean();
    return new Map(cats.map((c) => [c._id.toString(), c.name]));
  }

  async resolveUserNames(ids: Set<string>): Promise<Map<string, { firstName: string; lastName: string; username: string }>> {
    if (ids.size === 0) return new Map();
    const users = await this.userModel
      .find({ _id: { $in: [...ids].map((id) => new Types.ObjectId(id)) } }, { _id: 1, firstName: 1, lastName: 1, username: 1 })
      .lean();
    return new Map(users.map((u) => [u._id.toString(), { firstName: u.firstName, lastName: u.lastName, username: u.username }]));
  }

  async bulkApproveEntities<T extends IApprovableDocument>(
    model: PaginateModel<T>,
    itemIds: string[],
    adminId: string,
    entityName: string
  ): Promise<IBulkActionResult> {
    const results = await Promise.allSettled(itemIds.map((id) => this.approveEntity(model, id, adminId, entityName)));
    return this.summariseBulkResults(itemIds, results);
  }

  async bulkRejectEntities<T extends IApprovableDocument>(
    model: PaginateModel<T>,
    itemIds: string[],
    adminId: string,
    comment: string,
    entityName: string,
    deleteFiles = false
  ): Promise<IBulkActionResult> {
    const results = await Promise.allSettled(itemIds.map((id) => this.rejectEntity(model, id, adminId, comment, entityName, deleteFiles)));
    return this.summariseBulkResults(itemIds, results);
  }

  summariseBulkResults(itemIds: string[], results: PromiseSettledResult<unknown>[]): IBulkActionResult {
    const failed: { itemId: string; error: string }[] = [];
    let succeeded = 0;
    for (const [i, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        succeeded++;
      } else {
        const reason = result.reason as unknown;
        const message =
          reason && typeof reason === 'object' && 'message' in reason ? String((reason as { message: string }).message) : String(reason);
        failed.push({ itemId: itemIds[i], error: message });
      }
    }
    return { succeeded, failed };
  }
}
