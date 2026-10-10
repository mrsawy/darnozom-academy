import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';
import { AdminReviewStatsService } from '../../services/admin-review-stats.service';
import { AdminReviewCategoryService } from '../../services/admin-review-category.service';
import { AdminReviewCourseService } from '../../services/admin-review-course.service';
import { AdminReviewModuleService } from '../../services/admin-review-module.service';
import { AdminReviewContentService } from '../../services/admin-review-content.service';
import { AdminReviewOrganizationService } from '../../services/admin-review-organization.service';
import { AdminReviewVerificationService } from '../../services/admin-review-verification.service';
import { AdminReviewSuspendService } from '../../services/admin-review-suspend.service';
import { AdminReviewActionDto } from '../../dto/admin-review-action.dto';
import { AdminPaginateDto } from '../../dto/admin-paginate.dto';
import { BulkAdminReviewActionDto } from '../../dto/bulk-admin-review-action.dto';
import { AdminSuspendActionDto } from '../../dto/admin-suspend-action.dto';
import { AdminUpdateCategoryDto } from '../../dto/admin-update-category.dto';
import { SetOrganizationPlanDto } from '../../dto/set-organization-plan.dto';
import { UpdateOrganizationSubscriptionDto } from '../../dto/update-organization-subscription.dto';
import { ActiveStatus, PublishStatus } from '@lms-organization/shared-types';

@ApplyRpcErrorHandling
@Controller()
export class AdminReviewControllerMessage {
  constructor(
    private readonly statsService: AdminReviewStatsService,
    private readonly categoryService: AdminReviewCategoryService,
    private readonly courseService: AdminReviewCourseService,
    private readonly moduleService: AdminReviewModuleService,
    private readonly contentService: AdminReviewContentService,
    private readonly organizationService: AdminReviewOrganizationService,
    private readonly verificationService: AdminReviewVerificationService,
    private readonly suspendService: AdminReviewSuspendService
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getDashboardStats')
  async getDashboardStats() {
    return this.statsService.getDashboardStats();
  }

  // ─── Categories ───────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getPendingCategories')
  async getPendingCategories(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.categoryService.getPendingCategories(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.approveCategory')
  async approveCategory(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.categoryService.approveCategory(payload.itemId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.rejectCategory')
  async rejectCategory(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.categoryService.rejectCategory(
      payload.itemId,
      context.userPayload._id.toString(),
      payload.comment ?? '',
      payload.deleteFiles ?? false
    );
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getActiveCategories')
  async getActiveCategories(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.categoryService.getActiveCategories(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.adminUpdateCategory')
  async adminUpdateCategory(@Payload(new RpcValidationPipe()) payload: AdminUpdateCategoryDto) {
    return this.categoryService.adminUpdateCategory(payload.categoryId, payload.data);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.adminDeleteCategory')
  async adminDeleteCategory(@Payload(new RpcValidationPipe()) payload: { categoryId: string }, @Ctx() context: IUserContext) {
    return this.categoryService.adminDeleteCategory(payload.categoryId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.setCategoryPublishStatus')
  async setCategoryPublishStatus(@Payload(new RpcValidationPipe()) payload: { categoryId: string; publishStatus: PublishStatus }) {
    return this.categoryService.setCategoryPublishStatus(payload.categoryId, payload.publishStatus);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.setCategoryActiveStatus')
  async setCategoryActiveStatus(@Payload(new RpcValidationPipe()) payload: { categoryId: string; activeStatus: ActiveStatus }) {
    return this.categoryService.setCategoryActiveStatus(payload.categoryId, payload.activeStatus);
  }

  // ─── Courses ──────────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getPendingCourses')
  async getPendingCourses(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.courseService.getPendingCourses(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.approveCourse')
  async approveCourse(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.courseService.approveCourse(payload.itemId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.rejectCourse')
  async rejectCourse(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.courseService.rejectCourse(payload.itemId, context.userPayload._id.toString(), payload.comment ?? '', payload.deleteFiles ?? false);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getAdminCourses')
  async getAdminCourses(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.courseService.getAdminCourses(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.adminUpdateCourse')
  async adminUpdateCourse(
    @Payload(new RpcValidationPipe()) payload: { courseId: string; data: { name?: string; description?: string; shortDescription?: string } }
  ) {
    return this.courseService.adminUpdateCourse(payload.courseId, payload.data);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.adminDeleteCourse')
  async adminDeleteCourse(@Payload(new RpcValidationPipe()) payload: { courseId: string }, @Ctx() context: IUserContext) {
    return this.courseService.adminDeleteCourse(payload.courseId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.setCoursePublishStatus')
  async setCoursePublishStatus(@Payload(new RpcValidationPipe()) payload: { courseId: string; publishStatus: PublishStatus }) {
    return this.courseService.setCoursePublishStatus(payload.courseId, payload.publishStatus);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.setCourseActiveStatus')
  async setCourseActiveStatus(@Payload(new RpcValidationPipe()) payload: { courseId: string; activeStatus: ActiveStatus }) {
    return this.courseService.setCourseActiveStatus(payload.courseId, payload.activeStatus);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.setModuleActiveStatus')
  async setModuleActiveStatus(@Payload(new RpcValidationPipe()) payload: { moduleId: string; activeStatus: ActiveStatus }) {
    return this.moduleService.setModuleActiveStatus(payload.moduleId, payload.activeStatus);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.setContentActiveStatus')
  async setContentActiveStatus(@Payload(new RpcValidationPipe()) payload: { contentId: string; activeStatus: ActiveStatus }) {
    return this.contentService.setContentActiveStatus(payload.contentId, payload.activeStatus);
  }

  // ─── Modules ──────────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getPendingModules')
  async getPendingModules(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.moduleService.getPendingModules(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.approveModule')
  async approveModule(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.moduleService.approveModule(payload.itemId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.rejectModule')
  async rejectModule(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.moduleService.rejectModule(payload.itemId, context.userPayload._id.toString(), payload.comment ?? '', payload.deleteFiles ?? false);
  }

  // ─── Content ──────────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getPendingContents')
  async getPendingContents(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.contentService.getPendingContents(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.approveContent')
  async approveContent(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.contentService.approveContent(payload.itemId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.rejectContent')
  async rejectContent(@Payload(new RpcValidationPipe()) payload: AdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.contentService.rejectContent(payload.itemId, context.userPayload._id.toString(), payload.comment ?? '', payload.deleteFiles ?? false);
  }

  // ─── Organizations ────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizations')
  async getOrganizations(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.organizationService.getOrganizations(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizationDetails')
  async getOrganizationDetails(@Payload(new RpcValidationPipe()) payload: { orgId: string }) {
    return this.organizationService.getOrganizationDetails(payload.orgId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.setOrganizationPlan')
  async setOrganizationPlan(@Payload(new RpcValidationPipe()) payload: SetOrganizationPlanDto) {
    return this.organizationService.setOrganizationPlan(payload);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.updateOrganizationSubscription')
  async updateOrganizationSubscription(@Payload(new RpcValidationPipe()) payload: UpdateOrganizationSubscriptionDto) {
    return this.organizationService.updateOrganizationSubscription(payload);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.suspendOrganizationSubscription')
  async suspendOrganizationSubscription(@Payload(new RpcValidationPipe()) payload: { orgId: string }) {
    return this.organizationService.suspendOrganizationSubscription(payload.orgId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.cancelOrganizationSubscription')
  async cancelOrganizationSubscription(@Payload(new RpcValidationPipe()) payload: { orgId: string }) {
    return this.organizationService.cancelOrganizationSubscription(payload.orgId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizationUsers')
  async getOrganizationUsers(@Payload(new RpcValidationPipe()) payload: { orgId: string; options?: AdminPaginateDto }) {
    return this.organizationService.getOrganizationUsers(payload.orgId, payload.options ?? {});
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizationCourses')
  async getOrganizationCourses(@Payload(new RpcValidationPipe()) payload: { orgId: string; options?: AdminPaginateDto }) {
    return this.organizationService.getOrganizationCourses(payload.orgId, payload.options ?? {});
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizationContents')
  async getOrganizationContents(@Payload(new RpcValidationPipe()) payload: { orgId: string; options?: AdminPaginateDto }) {
    return this.organizationService.getOrganizationContents(payload.orgId, payload.options ?? {});
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizationEnrollments')
  async getOrganizationEnrollments(@Payload(new RpcValidationPipe()) payload: { orgId: string; options?: AdminPaginateDto }) {
    return this.organizationService.getOrganizationEnrollments(payload.orgId, payload.options ?? {});
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.deleteOrganizationUser')
  async deleteOrganizationUser(@Payload(new RpcValidationPipe()) payload: { orgId: string; userId: string }, @Ctx() context: IUserContext) {
    return this.organizationService.deleteOrganizationUser(payload.orgId, payload.userId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.deleteOrganizationCourse')
  async deleteOrganizationCourse(@Payload(new RpcValidationPipe()) payload: { orgId: string; courseId: string }, @Ctx() context: IUserContext) {
    return this.organizationService.deleteOrganizationCourse(payload.orgId, payload.courseId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.deleteOrganizationContent')
  async deleteOrganizationContent(@Payload(new RpcValidationPipe()) payload: { orgId: string; contentId: string }, @Ctx() context: IUserContext) {
    return this.organizationService.deleteOrganizationContent(payload.orgId, payload.contentId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.deleteOrganizationEnrollment')
  async deleteOrganizationEnrollment(
    @Payload(new RpcValidationPipe()) payload: { orgId: string; enrollmentId: string },
    @Ctx() context: IUserContext
  ) {
    return this.organizationService.deleteOrganizationEnrollment(payload.orgId, payload.enrollmentId, context.userPayload._id.toString());
  }

  // ─── Bulk Categories ──────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkApproveCategories')
  async bulkApproveCategories(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.categoryService.bulkApproveCategories(payload.itemIds, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkRejectCategories')
  async bulkRejectCategories(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.categoryService.bulkRejectCategories(
      payload.itemIds,
      context.userPayload._id.toString(),
      payload.comment ?? '',
      payload.deleteFiles ?? false
    );
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkDeleteCategories')
  async bulkDeleteCategories(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.categoryService.bulkDeleteCategories(payload.itemIds, context.userPayload._id.toString());
  }

  // ─── Bulk Courses ─────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkApproveCourses')
  async bulkApproveCourses(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.courseService.bulkApproveCourses(payload.itemIds, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkRejectCourses')
  async bulkRejectCourses(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.courseService.bulkRejectCourses(
      payload.itemIds,
      context.userPayload._id.toString(),
      payload.comment ?? '',
      payload.deleteFiles ?? false
    );
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkDeleteCourses')
  async bulkDeleteCourses(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.courseService.bulkDeleteCourses(payload.itemIds, context.userPayload._id.toString());
  }

  // ─── Bulk Modules ─────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkApproveModules')
  async bulkApproveModules(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.moduleService.bulkApproveModules(payload.itemIds, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkRejectModules')
  async bulkRejectModules(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.moduleService.bulkRejectModules(
      payload.itemIds,
      context.userPayload._id.toString(),
      payload.comment ?? '',
      payload.deleteFiles ?? false
    );
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkDeleteModules')
  async bulkDeleteModules(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.moduleService.bulkDeleteModules(payload.itemIds, context.userPayload._id.toString());
  }

  // ─── Bulk Content ─────────────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkApproveContents')
  async bulkApproveContents(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.contentService.bulkApproveContents(payload.itemIds, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkRejectContents')
  async bulkRejectContents(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.contentService.bulkRejectContents(
      payload.itemIds,
      context.userPayload._id.toString(),
      payload.comment ?? '',
      payload.deleteFiles ?? false
    );
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.bulkDeleteContents')
  async bulkDeleteContents(@Payload(new RpcValidationPipe()) payload: BulkAdminReviewActionDto, @Ctx() context: IUserContext) {
    return this.contentService.bulkDeleteContents(payload.itemIds, context.userPayload._id.toString());
  }

  // ─── Identity Verification ──────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getPendingVerifications')
  async getPendingVerifications(@Payload(new RpcValidationPipe()) payload: { options: AdminPaginateDto }) {
    return this.verificationService.getPendingIdentityVerifications(payload.options);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getVerificationDetail')
  async getVerificationDetail(@Payload(new RpcValidationPipe()) payload: { orgId: string }) {
    return this.verificationService.getVerificationDetail(payload.orgId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.approveIdentityVerification')
  async approveIdentityVerification(@Payload(new RpcValidationPipe()) payload: { orgId: string }, @Ctx() context: IUserContext) {
    return this.verificationService.approveIdentityVerification(payload.orgId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.rejectIdentityVerification')
  async rejectIdentityVerification(@Payload(new RpcValidationPipe()) payload: { orgId: string; comment?: string }, @Ctx() context: IUserContext) {
    return this.verificationService.rejectIdentityVerification(payload.orgId, context.userPayload._id.toString(), payload.comment ?? '');
  }

  // ─── Suspend / Unsuspend ──────────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.suspendOrganization')
  async suspendOrganization(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.suspendOrganization(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.unsuspendOrganization')
  async unsuspendOrganization(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.unsuspendOrganization(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.suspendCourse')
  async suspendCourse(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.suspendCourse(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.unsuspendCourse')
  async unsuspendCourse(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.unsuspendCourse(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.suspendModule')
  async suspendModule(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.suspendModule(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.unsuspendModule')
  async unsuspendModule(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.unsuspendModule(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.suspendContent')
  async suspendContent(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.suspendContent(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.unsuspendContent')
  async unsuspendContent(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.unsuspendContent(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.suspendUser')
  async suspendUser(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.suspendUser(payload.entityId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.unsuspendUser')
  async unsuspendUser(@Payload(new RpcValidationPipe()) payload: AdminSuspendActionDto) {
    return this.suspendService.unsuspendUser(payload.entityId);
  }

  // ─── Module / Content Browsing ────────────────────────────────────

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizationCourseModules')
  async getOrganizationCourseModules(@Payload(new RpcValidationPipe()) payload: { orgId: string; courseId: string; options?: AdminPaginateDto }) {
    return this.organizationService.getOrganizationCourseModules(payload.orgId, payload.courseId, payload.options ?? {});
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('adminReview.getOrganizationModuleContents')
  async getOrganizationModuleContents(@Payload(new RpcValidationPipe()) payload: { orgId: string; moduleId: string; options?: AdminPaginateDto }) {
    return this.organizationService.getOrganizationModuleContents(payload.orgId, payload.moduleId, payload.options ?? {});
  }
}
