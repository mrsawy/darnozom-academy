'use server';

import { Paginated, PaginationOptions, withDefaults } from '@/lib/types/Paginated';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { ActiveStatus, PublishStatus } from '@darnozom/shared-types';
import type {
  IDashboardStats,
  IReviewableCategory,
  IReviewableCourse,
  IReviewableModule,
  IReviewableContent,
  IAdminOrganization,
  IAdminOrganizationDetails,
  IAdminUser,
  IAdminCourse,
  IAdminModule,
  IAdminContent,
  IAdminEnrollment,
  IReviewAction,
  IBulkActionResult,
  IBulkReviewAction,
  ISuspendAction,
} from '@/lib/types/admin-review/admin-review.interface';

// ─── Dashboard Stats ────────────────────────────────────────────────

export async function getDashboardStats() {
  return createAuthorizedNatsRequest<IDashboardStats>('adminReview.getDashboardStats', {});
}

// ─── Categories ─────────────────────────────────────────────────────

export async function getPendingCategories(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IReviewableCategory>>(
    'adminReview.getPendingCategories',
    { options: payload }
  );
}

export async function approveCategory(itemId: string) {
  return createAuthorizedNatsRequest<IReviewableCategory, IReviewAction>(
    'adminReview.approveCategory',
    { itemId }
  );
}

export async function rejectCategory(itemId: string, comment: string, deleteFiles = false) {
  return createAuthorizedNatsRequest<IReviewableCategory, IReviewAction>(
    'adminReview.rejectCategory',
    { itemId, comment, deleteFiles }
  );
}

// ─── Courses ────────────────────────────────────────────────────────

export async function getPendingCourses(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IReviewableCourse>>(
    'adminReview.getPendingCourses',
    { options: payload }
  );
}

export async function approveCourse(itemId: string) {
  return createAuthorizedNatsRequest<IReviewableCourse, IReviewAction>(
    'adminReview.approveCourse',
    { itemId }
  );
}

export async function rejectCourse(itemId: string, comment: string, deleteFiles = false) {
  return createAuthorizedNatsRequest<IReviewableCourse, IReviewAction>('adminReview.rejectCourse', {
    itemId,
    comment,
    deleteFiles,
  });
}

// ─── Modules ────────────────────────────────────────────────────────

export async function getPendingModules(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IReviewableModule>>(
    'adminReview.getPendingModules',
    { options: payload }
  );
}

export async function approveModule(itemId: string) {
  return createAuthorizedNatsRequest<IReviewableModule, IReviewAction>(
    'adminReview.approveModule',
    { itemId }
  );
}

export async function rejectModule(itemId: string, comment: string, deleteFiles = false) {
  return createAuthorizedNatsRequest<IReviewableModule, IReviewAction>('adminReview.rejectModule', {
    itemId,
    comment,
    deleteFiles,
  });
}

// ─── Content ────────────────────────────────────────────────────────

export async function getPendingContents(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IReviewableContent>>(
    'adminReview.getPendingContents',
    { options: payload }
  );
}

export async function approveContent(itemId: string) {
  return createAuthorizedNatsRequest<IReviewableContent, IReviewAction>(
    'adminReview.approveContent',
    { itemId }
  );
}

export async function rejectContent(itemId: string, comment: string, deleteFiles = false) {
  return createAuthorizedNatsRequest<IReviewableContent, IReviewAction>(
    'adminReview.rejectContent',
    { itemId, comment, deleteFiles }
  );
}

// ─── Organizations ──────────────────────────────────────────────────

export async function getOrganizations(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IAdminOrganization>>(
    'adminReview.getOrganizations',
    { options: payload }
  );
}

export async function getOrganizationDetails(orgId: string) {
  return createAuthorizedNatsRequest<IAdminOrganizationDetails>(
    'adminReview.getOrganizationDetails',
    { orgId }
  );
}

export async function setOrganizationPlan(payload: {
  orgId: string;
  planId: string;
  billingCycle: string;
  endsAt?: string | null;
}) {
  return createAuthorizedNatsRequest('adminReview.setOrganizationPlan', payload);
}

export async function updateOrganizationSubscription(payload: {
  orgId: string;
  billingCycle?: string;
  endsAt?: string | null;
  nextBillingAt?: string | null;
}) {
  return createAuthorizedNatsRequest('adminReview.updateOrganizationSubscription', payload);
}

export async function suspendOrganizationSubscription(orgId: string) {
  return createAuthorizedNatsRequest('adminReview.suspendOrganizationSubscription', { orgId });
}

export async function cancelOrganizationSubscription(orgId: string) {
  return createAuthorizedNatsRequest('adminReview.cancelOrganizationSubscription', { orgId });
}

export async function getOrganizationUsers(orgId: string, options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IAdminUser>>('adminReview.getOrganizationUsers', {
    orgId,
    options: payload,
  });
}

export async function getOrganizationCourses(orgId: string, options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IAdminCourse>>(
    'adminReview.getOrganizationCourses',
    { orgId, options: payload }
  );
}

export async function getOrganizationContents(orgId: string, options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IAdminContent>>(
    'adminReview.getOrganizationContents',
    { orgId, options: payload }
  );
}

export async function getOrganizationEnrollments(orgId: string, options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IAdminEnrollment>>(
    'adminReview.getOrganizationEnrollments',
    { orgId, options: payload }
  );
}

export async function deleteOrganizationUser(orgId: string, userId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }>('adminReview.deleteOrganizationUser', {
    orgId,
    userId,
  });
}

export async function deleteOrganizationCourse(orgId: string, courseId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }>('adminReview.deleteOrganizationCourse', {
    orgId,
    courseId,
  });
}

export async function deleteOrganizationContent(orgId: string, contentId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }>(
    'adminReview.deleteOrganizationContent',
    { orgId, contentId }
  );
}

export async function deleteOrganizationEnrollment(orgId: string, enrollmentId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }>(
    'adminReview.deleteOrganizationEnrollment',
    { orgId, enrollmentId }
  );
}

export async function getActiveCategories(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IReviewableCategory>>(
    'adminReview.getActiveCategories',
    { options: payload }
  );
}

export async function adminUpdateCategory(
  categoryId: string,
  data: { name?: string; description?: string }
) {
  return createAuthorizedNatsRequest<IReviewableCategory>('adminReview.adminUpdateCategory', {
    categoryId,
    data,
  });
}

export async function adminDeleteCategory(categoryId: string) {
  return createAuthorizedNatsRequest<{ success: boolean; deletedId: string }>(
    'adminReview.adminDeleteCategory',
    { categoryId }
  );
}

export async function adminSetCategoryPublishStatus(
  categoryId: string,
  publishStatus: PublishStatus
) {
  return createAuthorizedNatsRequest<IReviewableCategory>('adminReview.setCategoryPublishStatus', {
    categoryId,
    publishStatus,
  });
}

export async function adminSetCategoryActiveStatus(categoryId: string, activeStatus: ActiveStatus) {
  return createAuthorizedNatsRequest<IReviewableCategory>('adminReview.setCategoryActiveStatus', {
    categoryId,
    activeStatus,
  });
}

// ─── Admin Courses ────────────────────────────────────────────────────

export async function getAdminCourses(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IReviewableCourse>>('adminReview.getAdminCourses', {
    options: payload,
  });
}

export async function adminUpdateCourse(
  courseId: string,
  data: { name?: string; description?: string; shortDescription?: string }
) {
  return createAuthorizedNatsRequest<IReviewableCourse>('adminReview.adminUpdateCourse', {
    courseId,
    data,
  });
}

export async function adminDeleteCourse(courseId: string) {
  return createAuthorizedNatsRequest<{ success: boolean; deletedId: string }>(
    'adminReview.adminDeleteCourse',
    { courseId }
  );
}

export async function adminSetCoursePublishStatus(courseId: string, publishStatus: PublishStatus) {
  return createAuthorizedNatsRequest<IReviewableCourse>('adminReview.setCoursePublishStatus', {
    courseId,
    publishStatus,
  });
}

export async function adminSetCourseActiveStatus(courseId: string, activeStatus: ActiveStatus) {
  return createAuthorizedNatsRequest<IReviewableCourse>('adminReview.setCourseActiveStatus', {
    courseId,
    activeStatus,
  });
}

export async function adminSetModuleActiveStatus(moduleId: string, activeStatus: ActiveStatus) {
  return createAuthorizedNatsRequest<IReviewableModule>('adminReview.setModuleActiveStatus', {
    moduleId,
    activeStatus,
  });
}

export async function adminSetContentActiveStatus(contentId: string, activeStatus: ActiveStatus) {
  return createAuthorizedNatsRequest<IReviewableContent>('adminReview.setContentActiveStatus', {
    contentId,
    activeStatus,
  });
}

// ─── Bulk Categories ─────────────────────────────────────────────────

export async function bulkApproveCategories(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkApproveCategories',
    { itemIds }
  );
}

export async function bulkRejectCategories(
  itemIds: string[],
  comment: string,
  deleteFiles = false
) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkRejectCategories',
    { itemIds, comment, deleteFiles }
  );
}

export async function bulkDeleteCategories(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkDeleteCategories',
    { itemIds }
  );
}

// ─── Bulk Courses ────────────────────────────────────────────────────

export async function bulkApproveCourses(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkApproveCourses',
    { itemIds }
  );
}

export async function bulkRejectCourses(itemIds: string[], comment: string, deleteFiles = false) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkRejectCourses',
    { itemIds, comment, deleteFiles }
  );
}

export async function bulkDeleteCourses(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkDeleteCourses',
    { itemIds }
  );
}

// ─── Bulk Modules ────────────────────────────────────────────────────

export async function bulkApproveModules(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkApproveModules',
    { itemIds }
  );
}

export async function bulkRejectModules(itemIds: string[], comment: string, deleteFiles = false) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkRejectModules',
    { itemIds, comment, deleteFiles }
  );
}

export async function bulkDeleteModules(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkDeleteModules',
    { itemIds }
  );
}

// ─── Bulk Content ────────────────────────────────────────────────────

export async function bulkApproveContents(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkApproveContents',
    { itemIds }
  );
}

export async function bulkRejectContents(itemIds: string[], comment: string, deleteFiles = false) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkRejectContents',
    { itemIds, comment, deleteFiles }
  );
}

export async function bulkDeleteContents(itemIds: string[]) {
  return createAuthorizedNatsRequest<IBulkActionResult, IBulkReviewAction>(
    'adminReview.bulkDeleteContents',
    { itemIds }
  );
}

// ─── Suspend / Unsuspend ─────────────────────────────────────────────

export async function suspendOrganization(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.suspendOrganization',
    { entityId }
  );
}

export async function unsuspendOrganization(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.unsuspendOrganization',
    { entityId }
  );
}

export async function suspendCourse(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.suspendCourse',
    { entityId }
  );
}

export async function unsuspendCourse(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.unsuspendCourse',
    { entityId }
  );
}

export async function suspendModule(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.suspendModule',
    { entityId }
  );
}

export async function unsuspendModule(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.unsuspendModule',
    { entityId }
  );
}

export async function suspendContent(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.suspendContent',
    { entityId }
  );
}

export async function unsuspendContent(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.unsuspendContent',
    { entityId }
  );
}

export async function suspendUser(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.suspendUser',
    { entityId }
  );
}

export async function unsuspendUser(entityId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }, ISuspendAction>(
    'adminReview.unsuspendUser',
    { entityId }
  );
}

// ─── Module / Content Browsing ───────────────────────────────────────

export async function getOrganizationCourseModules(
  orgId: string,
  courseId: string,
  options: PaginationOptions
) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IAdminModule>>(
    'adminReview.getOrganizationCourseModules',
    { orgId, courseId, options: payload }
  );
}

export async function getOrganizationModuleContents(
  orgId: string,
  moduleId: string,
  options: PaginationOptions
) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IAdminContent>>(
    'adminReview.getOrganizationModuleContents',
    { orgId, moduleId, options: payload }
  );
}
