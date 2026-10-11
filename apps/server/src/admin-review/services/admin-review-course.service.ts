import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import { ActiveStatus, PublishStatus } from '@darnozom/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { CourseService } from 'src/course/services/course/course.service';
import { buildPendingReviewFilter, applyUpdateWithApproval } from 'src/utils/approval.utils';
import { withDeletedQueryOptions } from 'src/utils/soft-delete';
import type { AdminPaginateDto } from '../dto/admin-paginate.dto';
import type { IBulkActionResult } from './admin-review.types';
import { AdminReviewSupport } from './admin-review.support';

@Injectable()
export class AdminReviewCourseService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>,
    private readonly courseService: CourseService,
    private readonly support: AdminReviewSupport
  ) {}

  async getPendingCourses(dto: AdminPaginateDto) {
    const filter: FilterQuery<Course> = {
      ...buildPendingReviewFilter(),
      ...this.support.buildSearchFilter<Course>(dto.search, ['name']),
    };
    const result = await this.courseModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      ...withDeletedQueryOptions(),
      populate: ['organization', 'instructor', 'coInstructors', 'categories', 'grade', 'schoolTypes'],
      sort: { createdAt: -1 },
      lean: true,
    });
    await this.support.enrichPendingUpdateRefs(result.docs);
    return result;
  }

  async approveCourse(courseId: string, adminId: string) {
    const { saved } = await this.support.approveEntity(this.courseModel, courseId, adminId, 'Course');
    return saved;
  }

  async rejectCourse(courseId: string, adminId: string, comment: string, deleteFiles = false) {
    const { saved } = await this.support.rejectEntity(this.courseModel, courseId, adminId, comment, 'Course', deleteFiles);
    return saved;
  }

  async getAdminCourses(dto: AdminPaginateDto) {
    const filter: FilterQuery<Course> = {
      ...this.support.buildSearchFilter<Course>(dto.search, ['name']),
    };
    const result = await this.courseModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      ...withDeletedQueryOptions(),
      populate: ['organization', 'instructor', 'coInstructors', 'categories', 'grade', 'schoolTypes'],
      sort: { createdAt: -1 },
      lean: true,
    });
    return result;
  }

  async adminUpdateCourse(courseId: string, data: { name?: string; description?: string; shortDescription?: string }) {
    const course = await this.courseModel.findById(courseId).setOptions(withDeletedQueryOptions());
    if (!course) throw new NotFoundException('Course not found');
    applyUpdateWithApproval(course, data as Record<string, unknown>, true);
    return course.save();
  }

  async adminDeleteCourse(courseId: string, deletedById?: string) {
    const course = await this.courseModel.findById(courseId).setOptions(withDeletedQueryOptions());
    if (!course) throw new NotFoundException('Course not found');
    await this.courseService.deleteCourses([courseId], deletedById);
    return { success: true, deletedId: courseId };
  }

  async setCoursePublishStatus(courseId: string, publishStatus: PublishStatus) {
    const course = await this.courseModel.findById(courseId).setOptions(withDeletedQueryOptions());
    if (!course) throw new NotFoundException('Course not found');
    course.publishStatus = publishStatus;
    course.publishedAt = publishStatus === PublishStatus.PUBLISHED ? new Date() : null;
    return course.save();
  }

  async setCourseActiveStatus(courseId: string, activeStatus: ActiveStatus) {
    const course = await this.courseModel.findById(courseId).setOptions(withDeletedQueryOptions());
    if (!course) throw new NotFoundException('Course not found');
    course.activeStatus = activeStatus;
    return course.save();
  }

  async bulkApproveCourses(itemIds: string[], adminId: string): Promise<IBulkActionResult> {
    return this.support.bulkApproveEntities(this.courseModel, itemIds, adminId, 'Course');
  }

  async bulkRejectCourses(itemIds: string[], adminId: string, comment: string, deleteFiles = false): Promise<IBulkActionResult> {
    return this.support.bulkRejectEntities(this.courseModel, itemIds, adminId, comment, 'Course', deleteFiles);
  }

  async bulkDeleteCourses(itemIds: string[], deletedById?: string): Promise<IBulkActionResult> {
    try {
      await this.courseService.deleteCourses(itemIds, deletedById);
      return { succeeded: itemIds.length, failed: [] };
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : String(error);
      return { succeeded: 0, failed: itemIds.map((id) => ({ itemId: id, error: message })) };
    }
  }
}
