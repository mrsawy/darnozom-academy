import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import { ActiveStatus } from '@darnozom/shared-types';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { CourseModulesService } from 'src/course/services/module/course-modules.service';
import { buildPendingReviewFilter } from 'src/utils/approval.utils';
import { withDeletedQueryOptions } from 'src/utils/soft-delete';
import type { AdminPaginateDto } from '../dto/admin-paginate.dto';
import type { IBulkActionResult } from './admin-review.types';
import { AdminReviewSupport } from './admin-review.support';

@Injectable()
export class AdminReviewModuleService {
  constructor(
    @InjectModel('CourseModule')
    private readonly moduleModel: PaginateModel<CourseModuleEntity>,
    private readonly courseModulesService: CourseModulesService,
    private readonly support: AdminReviewSupport
  ) {}

  async getPendingModules(dto: AdminPaginateDto) {
    const filter: FilterQuery<CourseModuleEntity> = {
      ...buildPendingReviewFilter(),
      ...this.support.buildSearchFilter<CourseModuleEntity>(dto.search, ['title']),
    };
    return this.moduleModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      ...withDeletedQueryOptions(),
      populate: ['organization', 'course'],
      sort: { createdAt: -1 },
    });
  }

  async approveModule(moduleId: string, adminId: string) {
    const { saved } = await this.support.approveEntity(this.moduleModel, moduleId, adminId, 'Module');
    return saved;
  }

  async rejectModule(moduleId: string, adminId: string, comment: string, deleteFiles = false) {
    const { saved } = await this.support.rejectEntity(this.moduleModel, moduleId, adminId, comment, 'Module', deleteFiles);
    return saved;
  }

  async setModuleActiveStatus(moduleId: string, activeStatus: ActiveStatus) {
    const courseModule = await this.moduleModel.findById(moduleId).setOptions(withDeletedQueryOptions());
    if (!courseModule) throw new NotFoundException('Module not found');
    courseModule.activeStatus = activeStatus;
    return courseModule.save();
  }

  async bulkApproveModules(itemIds: string[], adminId: string): Promise<IBulkActionResult> {
    return this.support.bulkApproveEntities(this.moduleModel, itemIds, adminId, 'Module');
  }

  async bulkRejectModules(itemIds: string[], adminId: string, comment: string, deleteFiles = false): Promise<IBulkActionResult> {
    return this.support.bulkRejectEntities(this.moduleModel, itemIds, adminId, comment, 'Module', deleteFiles);
  }

  async bulkDeleteModules(itemIds: string[], deletedBy?: string): Promise<IBulkActionResult> {
    try {
      await this.courseModulesService.deleteModules(itemIds, undefined, deletedBy);
      return { succeeded: itemIds.length, failed: [] };
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : String(error);
      return { succeeded: 0, failed: itemIds.map((id) => ({ itemId: id, error: message })) };
    }
  }
}
