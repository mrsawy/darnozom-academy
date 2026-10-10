import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, Types } from 'mongoose';
import { ActiveStatus, ApprovalStatus, PublishStatus } from '@lms-organization/shared-types';
import { Category } from 'src/category/entities/category.entity';
import { buildPendingReviewFilter, applyUpdateWithApproval } from 'src/utils/approval.utils';
import { buildSoftDeleteSet, withDeletedQueryOptions, withNotDeletedFilter } from 'src/utils/soft-delete';
import type { AdminPaginateDto } from '../dto/admin-paginate.dto';
import type { IBulkActionResult } from './admin-review.types';
import { AdminReviewSupport } from './admin-review.support';

@Injectable()
export class AdminReviewCategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: PaginateModel<Category>,
    private readonly support: AdminReviewSupport
  ) {}

  async getPendingCategories(dto: AdminPaginateDto) {
    const filter: FilterQuery<Category> = {
      ...buildPendingReviewFilter(),
      ...this.support.buildSearchFilter<Category>(dto.search, ['name']),
    };
    return this.categoryModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      ...withDeletedQueryOptions(),
      populate: ['organization'],
      sort: { createdAt: -1 },
    });
  }

  async approveCategory(categoryId: string, adminId: string) {
    const { saved } = await this.support.approveEntity(this.categoryModel, categoryId, adminId, 'Category');
    return saved;
  }

  async rejectCategory(categoryId: string, adminId: string, comment: string, deleteFiles = false) {
    const { saved } = await this.support.rejectEntity(this.categoryModel, categoryId, adminId, comment, 'Category', deleteFiles);
    return saved;
  }

  async getActiveCategories(dto: AdminPaginateDto) {
    const filter: FilterQuery<Category> = {
      approvalStatus: { $in: [ApprovalStatus.APPROVED, ApprovalStatus.PENDING_UPDATE] },
      ...this.support.buildSearchFilter<Category>(dto.search, ['name', 'description']),
    };
    return this.categoryModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      ...withDeletedQueryOptions(),
      populate: ['organization'],
      sort: { createdAt: -1 },
    });
  }

  async adminUpdateCategory(categoryId: string, data: { name?: string; description?: string }) {
    const category = await this.categoryModel.findById(categoryId).setOptions(withDeletedQueryOptions());
    if (!category) throw new NotFoundException('Category not found');
    applyUpdateWithApproval(category, data as Record<string, unknown>, true);
    return category.save();
  }

  async adminDeleteCategory(categoryId: string, deletedById?: string | Types.ObjectId | null) {
    const result = await this.categoryModel.updateOne(withNotDeletedFilter({ _id: categoryId }), {
      $set: buildSoftDeleteSet(deletedById),
    });
    if (result.matchedCount === 0) throw new NotFoundException('Category not found');
    return { success: true, deletedId: categoryId };
  }

  async setCategoryPublishStatus(categoryId: string, publishStatus: PublishStatus) {
    const category = await this.categoryModel.findById(categoryId).setOptions(withDeletedQueryOptions());
    if (!category) throw new NotFoundException('Category not found');
    category.publishStatus = publishStatus;
    category.publishedAt = publishStatus === PublishStatus.PUBLISHED ? new Date() : null;
    return category.save();
  }

  async setCategoryActiveStatus(categoryId: string, activeStatus: ActiveStatus) {
    const category = await this.categoryModel.findById(categoryId).setOptions(withDeletedQueryOptions());
    if (!category) throw new NotFoundException('Category not found');
    category.activeStatus = activeStatus;
    return category.save();
  }

  async bulkApproveCategories(itemIds: string[], adminId: string): Promise<IBulkActionResult> {
    return this.support.bulkApproveEntities(this.categoryModel, itemIds, adminId, 'Category');
  }

  async bulkRejectCategories(itemIds: string[], adminId: string, comment: string, deleteFiles = false): Promise<IBulkActionResult> {
    return this.support.bulkRejectEntities(this.categoryModel, itemIds, adminId, comment, 'Category', deleteFiles);
  }

  async bulkDeleteCategories(itemIds: string[], deletedById?: string | Types.ObjectId | null): Promise<IBulkActionResult> {
    const results = await Promise.allSettled(
      itemIds.map(async (id) => {
        const result = await this.categoryModel.updateOne(withNotDeletedFilter({ _id: id }), {
          $set: buildSoftDeleteSet(deletedById),
        });
        if (result.matchedCount === 0) throw new NotFoundException(`Category ${id} not found`);
      })
    );
    return this.support.summariseBulkResults(itemIds, results);
  }
}
