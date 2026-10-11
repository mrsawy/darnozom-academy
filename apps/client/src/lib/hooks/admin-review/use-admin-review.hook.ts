'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { PaginationOptions, Paginated } from '@/lib/types/Paginated';
import {
  getDashboardStats,
  getPendingCategories,
  approveCategory,
  rejectCategory,
  getPendingCourses,
  approveCourse,
  rejectCourse,
  getPendingModules,
  approveModule,
  rejectModule,
  getPendingContents,
  approveContent,
  rejectContent,
  getOrganizations,
  getOrganizationDetails,
  getOrganizationUsers,
  getOrganizationCourses,
  getOrganizationContents,
  getOrganizationEnrollments,
  deleteOrganizationUser,
  deleteOrganizationCourse,
  deleteOrganizationContent,
  deleteOrganizationEnrollment,
  getActiveCategories,
  adminUpdateCategory,
  adminDeleteCategory,
  adminSetCategoryPublishStatus,
  adminSetCategoryActiveStatus,
  getAdminCourses,
  adminUpdateCourse,
  adminDeleteCourse,
  adminSetCoursePublishStatus,
  adminSetCourseActiveStatus,
  adminSetModuleActiveStatus,
  adminSetContentActiveStatus,
  bulkApproveCategories,
  bulkRejectCategories,
  bulkDeleteCategories,
  bulkApproveCourses,
  bulkRejectCourses,
  bulkDeleteCourses,
  bulkApproveModules,
  bulkRejectModules,
  bulkDeleteModules,
  bulkApproveContents,
  bulkRejectContents,
  bulkDeleteContents,
  suspendOrganization,
  unsuspendOrganization,
  suspendCourse,
  unsuspendCourse,
  suspendModule,
  unsuspendModule,
  suspendContent,
  unsuspendContent,
  suspendUser,
  unsuspendUser,
  setOrganizationPlan,
  updateOrganizationSubscription,
  suspendOrganizationSubscription,
  cancelOrganizationSubscription,
  getOrganizationCourseModules,
  getOrganizationModuleContents,
} from '@/lib/actions/admin-review/admin-review.action';
import { ActiveStatus, PublishStatus } from '@darnozom/shared-types';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
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
  IBulkActionResult,
} from '@/lib/types/admin-review/admin-review.interface';

// ─── Query Keys ─────────────────────────────────────────────────────

export const adminReviewKeys = {
  stats: ['admin-review', 'stats'] as const,
  pendingCategories: (opts: PaginationOptions) =>
    ['admin-review', 'categories', 'pending', opts] as const,
  activeCategories: (opts: PaginationOptions) =>
    ['admin-review', 'categories', 'active', opts] as const,
  pendingCourses: (opts: PaginationOptions) =>
    ['admin-review', 'courses', 'pending', opts] as const,
  adminCourses: (opts: PaginationOptions) => ['admin-review', 'courses', 'all', opts] as const,
  pendingModules: (opts: PaginationOptions) => ['admin-review', 'modules', opts] as const,
  pendingContents: (opts: PaginationOptions) => ['admin-review', 'contents', opts] as const,
  organizations: (opts: PaginationOptions) => ['admin-review', 'organizations', opts] as const,
  organizationDetail: (orgId: string) => ['admin-review', 'organization', orgId] as const,
  organizationUsers: (orgId: string, opts: PaginationOptions) =>
    ['admin-review', 'organization', orgId, 'users', opts] as const,
  organizationCourses: (orgId: string, opts: PaginationOptions) =>
    ['admin-review', 'organization', orgId, 'courses', opts] as const,
  organizationContents: (orgId: string, opts: PaginationOptions) =>
    ['admin-review', 'organization', orgId, 'contents', opts] as const,
  organizationEnrollments: (orgId: string, opts: PaginationOptions) =>
    ['admin-review', 'organization', orgId, 'enrollments', opts] as const,
  courseModules: (orgId: string, courseId: string, opts: PaginationOptions) =>
    ['admin-review', 'organization', orgId, 'course', courseId, 'modules', opts] as const,
  moduleContents: (orgId: string, moduleId: string, opts: PaginationOptions) =>
    ['admin-review', 'organization', orgId, 'module', moduleId, 'contents', opts] as const,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'An unexpected error occurred';
}

// ─── Dashboard Stats ────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery<IDashboardStats>({
    queryKey: adminReviewKeys.stats,
    queryFn: getDashboardStats,
    staleTime: 30 * 1000,
  });
}

// ─── Pending Categories ─────────────────────────────────────────────

export function usePendingCategories(options: PaginationOptions) {
  return useQuery<Paginated<IReviewableCategory>>({
    queryKey: adminReviewKeys.pendingCategories(options),
    queryFn: () => getPendingCategories(options),
    staleTime: 30 * 1000,
  });
}

export function useApproveCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemId: string) => approveCategory(itemId),
    onSuccess: () => {
      toast.success(t('categoryApproved'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRejectCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemId,
      comment,
      deleteFiles,
    }: {
      itemId: string;
      comment: string;
      deleteFiles?: boolean;
    }) => rejectCategory(itemId, comment, deleteFiles),
    onSuccess: () => {
      toast.success(t('categoryRejected'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useActiveCategories(options: PaginationOptions) {
  return useQuery<Paginated<IReviewableCategory>>({
    queryKey: adminReviewKeys.activeCategories(options),
    queryFn: () => getActiveCategories(options),
    staleTime: 30 * 1000,
  });
}

export function useAdminUpdateCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: { name?: string; description?: string };
    }) => adminUpdateCategory(categoryId, data),
    onSuccess: () => {
      toast.success(t('categoryUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'categories'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminDeleteCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (categoryId: string) => adminDeleteCategory(categoryId),
    onSuccess: () => {
      toast.success(t('categoryDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'categories'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminSetCategoryPublishStatus() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      categoryId,
      publishStatus,
    }: {
      categoryId: string;
      publishStatus: PublishStatus;
    }) => adminSetCategoryPublishStatus(categoryId, publishStatus),
    onSuccess: (_, variables) => {
      const isPublished = variables.publishStatus === PublishStatus.PUBLISHED;
      toast.success(isPublished ? t('categoryPublished') : t('categoryUnpublished'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'categories'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminSetCategoryActiveStatus() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      categoryId,
      activeStatus,
    }: {
      categoryId: string;
      activeStatus: ActiveStatus;
    }) => adminSetCategoryActiveStatus(categoryId, activeStatus),
    onSuccess: (_, variables) => {
      const isActive = variables.activeStatus === ActiveStatus.ACTIVE;
      toast.success(isActive ? t('categoryActivated') : t('categoryDeactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'categories'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Admin All Courses ───────────────────────────────────────────────

export function useAdminCourses(options: PaginationOptions) {
  return useQuery<Paginated<IReviewableCourse>>({
    queryKey: adminReviewKeys.adminCourses(options),
    queryFn: () => getAdminCourses(options),
    staleTime: 30 * 1000,
  });
}

export function useAdminUpdateCourse() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      courseId,
      data,
    }: {
      courseId: string;
      data: { name?: string; description?: string; shortDescription?: string };
    }) => adminUpdateCourse(courseId, data),
    onSuccess: () => {
      toast.success(t('courseUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'courses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminDeleteCourse() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (courseId: string) => adminDeleteCourse(courseId),
    onSuccess: () => {
      toast.success(t('courseDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'courses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminSetCoursePublishStatus() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({ courseId, publishStatus }: { courseId: string; publishStatus: PublishStatus }) =>
      adminSetCoursePublishStatus(courseId, publishStatus),
    onSuccess: (_, variables) => {
      const isPublished = variables.publishStatus === PublishStatus.PUBLISHED;
      toast.success(isPublished ? t('coursePublished') : t('courseUnpublished'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'courses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminSetCourseActiveStatus() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({ courseId, activeStatus }: { courseId: string; activeStatus: ActiveStatus }) =>
      adminSetCourseActiveStatus(courseId, activeStatus),
    onSuccess: (_, variables) => {
      const isActive = variables.activeStatus === ActiveStatus.ACTIVE;
      toast.success(isActive ? t('courseActivated') : t('courseDeactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'courses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminSetModuleActiveStatus(context?: { orgId: string; courseId: string }) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({ moduleId, activeStatus }: { moduleId: string; activeStatus: ActiveStatus }) =>
      adminSetModuleActiveStatus(moduleId, activeStatus),
    onSuccess: (_, variables) => {
      const isActive = variables.activeStatus === ActiveStatus.ACTIVE;
      toast.success(isActive ? t('moduleActivated') : t('moduleDeactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'modules'] });
      if (context?.orgId && context?.courseId) {
        void queryClient.invalidateQueries({
          queryKey: [
            'admin-review',
            'organization',
            context.orgId,
            'course',
            context.courseId,
            'modules',
          ],
        });
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminSetContentActiveStatus(context?: { orgId: string; moduleId: string }) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({ contentId, activeStatus }: { contentId: string; activeStatus: ActiveStatus }) =>
      adminSetContentActiveStatus(contentId, activeStatus),
    onSuccess: (_, variables) => {
      const isActive = variables.activeStatus === ActiveStatus.ACTIVE;
      toast.success(isActive ? t('contentActivated') : t('contentDeactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'contents'] });
      if (context?.orgId && context?.moduleId) {
        void queryClient.invalidateQueries({
          queryKey: [
            'admin-review',
            'organization',
            context.orgId,
            'module',
            context.moduleId,
            'contents',
          ],
        });
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Pending Courses ────────────────────────────────────────────────

export function usePendingCourses(options: PaginationOptions) {
  return useQuery<Paginated<IReviewableCourse>>({
    queryKey: adminReviewKeys.pendingCourses(options),
    queryFn: () => getPendingCourses(options),
    staleTime: 30 * 1000,
  });
}

export function useApproveCourse() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemId: string) => approveCourse(itemId),
    onSuccess: () => {
      toast.success(t('courseApproved'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRejectCourse() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemId,
      comment,
      deleteFiles,
    }: {
      itemId: string;
      comment: string;
      deleteFiles?: boolean;
    }) => rejectCourse(itemId, comment, deleteFiles),
    onSuccess: () => {
      toast.success(t('courseRejected'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Pending Modules ────────────────────────────────────────────────

export function usePendingModules(options: PaginationOptions) {
  return useQuery<Paginated<IReviewableModule>>({
    queryKey: adminReviewKeys.pendingModules(options),
    queryFn: () => getPendingModules(options),
    staleTime: 30 * 1000,
  });
}

export function useApproveModule() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemId: string) => approveModule(itemId),
    onSuccess: () => {
      toast.success(t('moduleApproved'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRejectModule() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemId,
      comment,
      deleteFiles,
    }: {
      itemId: string;
      comment: string;
      deleteFiles?: boolean;
    }) => rejectModule(itemId, comment, deleteFiles),
    onSuccess: () => {
      toast.success(t('moduleRejected'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Pending Content ────────────────────────────────────────────────

export function usePendingContents(options: PaginationOptions) {
  return useQuery<Paginated<IReviewableContent>>({
    queryKey: adminReviewKeys.pendingContents(options),
    queryFn: () => getPendingContents(options),
    staleTime: 30 * 1000,
  });
}

export function useApproveContent() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemId: string) => approveContent(itemId),
    onSuccess: () => {
      toast.success(t('contentApproved'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRejectContent() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemId,
      comment,
      deleteFiles,
    }: {
      itemId: string;
      comment: string;
      deleteFiles?: boolean;
    }) => rejectContent(itemId, comment, deleteFiles),
    onSuccess: () => {
      toast.success(t('contentRejected'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Organizations ──────────────────────────────────────────────────

export function useAdminOrganizations(options: PaginationOptions) {
  return useQuery<Paginated<IAdminOrganization>>({
    queryKey: adminReviewKeys.organizations(options),
    queryFn: () => getOrganizations(options),
    staleTime: 60 * 1000,
  });
}

export function useOrganizationDetails(orgId: string) {
  return useQuery<IAdminOrganizationDetails>({
    queryKey: adminReviewKeys.organizationDetail(orgId),
    queryFn: () => getOrganizationDetails(orgId),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useOrganizationUsers(orgId: string, options: PaginationOptions) {
  return useQuery<Paginated<IAdminUser>>({
    queryKey: adminReviewKeys.organizationUsers(orgId, options),
    queryFn: () => getOrganizationUsers(orgId, options),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useOrganizationCourses(orgId: string, options: PaginationOptions) {
  return useQuery<Paginated<IAdminCourse>>({
    queryKey: adminReviewKeys.organizationCourses(orgId, options),
    queryFn: () => getOrganizationCourses(orgId, options),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useOrganizationContents(orgId: string, options: PaginationOptions) {
  return useQuery<Paginated<IAdminContent>>({
    queryKey: adminReviewKeys.organizationContents(orgId, options),
    queryFn: () => getOrganizationContents(orgId, options),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useOrganizationEnrollments(orgId: string, options: PaginationOptions) {
  return useQuery<Paginated<IAdminEnrollment>>({
    queryKey: adminReviewKeys.organizationEnrollments(orgId, options),
    queryFn: () => getOrganizationEnrollments(orgId, options),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

// ─── Org Delete Mutations ───────────────────────────────────────────

export function useDeleteOrganizationUser(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (userId: string) => deleteOrganizationUser(orgId, userId),
    onSuccess: () => {
      toast.success(t('userDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteOrganizationCourse(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (courseId: string) => deleteOrganizationCourse(orgId, courseId),
    onSuccess: () => {
      toast.success(t('courseDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteOrganizationContent(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (contentId: string) => deleteOrganizationContent(orgId, contentId),
    onSuccess: () => {
      toast.success(t('contentDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteOrganizationEnrollment(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (enrollmentId: string) => deleteOrganizationEnrollment(orgId, enrollmentId),
    onSuccess: () => {
      toast.success(t('enrollmentDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Bulk Mutations ──────────────────────────────────────────────────

function showBulkToast(
  result: IBulkActionResult,
  successKey: string,
  t: ReturnType<typeof useTranslations<'AdminDashboard.toasts'>>
) {
  if (result.failed.length === 0) {
    toast.success(t(successKey, { succeeded: result.succeeded }));
  } else {
    toast.warning(
      t('bulkPartialFailure' as Parameters<typeof t>[0], {
        succeeded: result.succeeded,
        failed: result.failed.length,
      })
    );
  }
}

// ─── Bulk Categories ─────────────────────────────────────────────────

export function useBulkApproveCategories() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkApproveCategories(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkApproveSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkRejectCategories() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemIds,
      comment,
      deleteFiles,
    }: {
      itemIds: string[];
      comment: string;
      deleteFiles?: boolean;
    }) => bulkRejectCategories(itemIds, comment, deleteFiles),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkRejectSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkDeleteCategories() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkDeleteCategories(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkDeleteSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Bulk Courses ─────────────────────────────────────────────────────

export function useBulkApproveCourses() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkApproveCourses(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkApproveSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkRejectCourses() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemIds,
      comment,
      deleteFiles,
    }: {
      itemIds: string[];
      comment: string;
      deleteFiles?: boolean;
    }) => bulkRejectCourses(itemIds, comment, deleteFiles),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkRejectSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkDeleteCourses() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkDeleteCourses(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkDeleteSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Bulk Modules ─────────────────────────────────────────────────────

export function useBulkApproveModules() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkApproveModules(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkApproveSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkRejectModules() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemIds,
      comment,
      deleteFiles,
    }: {
      itemIds: string[];
      comment: string;
      deleteFiles?: boolean;
    }) => bulkRejectModules(itemIds, comment, deleteFiles),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkRejectSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkDeleteModules() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkDeleteModules(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkDeleteSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Bulk Content ──────────────────────────────────────────────────────

export function useBulkApproveContents() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkApproveContents(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkApproveSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkRejectContents() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: ({
      itemIds,
      comment,
      deleteFiles,
    }: {
      itemIds: string[];
      comment: string;
      deleteFiles?: boolean;
    }) => bulkRejectContents(itemIds, comment, deleteFiles),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkRejectSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkDeleteContents() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (itemIds: string[]) => bulkDeleteContents(itemIds),
    onSuccess: (result) => {
      showBulkToast(result, 'bulkDeleteSuccess', t);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Suspend / Unsuspend ──────────────────────────────────────────────

export function useSuspendOrganization() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => suspendOrganization(entityId),
    onSuccess: () => {
      toast.success(t('entitySuspended'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUnsuspendOrganization() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => unsuspendOrganization(entityId),
    onSuccess: () => {
      toast.success(t('entityReactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

function invalidateOrgSubscriptionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string
) {
  void queryClient.invalidateQueries({ queryKey: adminReviewKeys.organizationDetail(orgId) });
  void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organizations'] });
}

export function useSetOrganizationPlan(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: (payload: { planId: string; billingCycle: string; endsAt?: string | null }) =>
      setOrganizationPlan({ orgId, ...payload }),
    onSuccess: () => {
      toast.success(t('organizationPlanSet'));
      invalidateOrgSubscriptionQueries(queryClient, orgId);
    },
    onError: (error) => {
      const msg =
        error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : getErrorMessage(error));
    },
  });
}

export function useUpdateOrganizationSubscription(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: (payload: {
      billingCycle?: string;
      endsAt?: string | null;
      nextBillingAt?: string | null;
    }) => updateOrganizationSubscription({ orgId, ...payload }),
    onSuccess: () => {
      toast.success(t('organizationSubscriptionUpdated'));
      invalidateOrgSubscriptionQueries(queryClient, orgId);
    },
    onError: (error) => {
      const msg =
        error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : getErrorMessage(error));
    },
  });
}

export function useSuspendOrganizationSubscription(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: () => suspendOrganizationSubscription(orgId),
    onSuccess: () => {
      toast.success(t('organizationSubscriptionSuspended'));
      invalidateOrgSubscriptionQueries(queryClient, orgId);
    },
    onError: (error) => {
      const msg =
        error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : getErrorMessage(error));
    },
  });
}

export function useCancelOrganizationSubscription(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: () => cancelOrganizationSubscription(orgId),
    onSuccess: () => {
      toast.success(t('organizationSubscriptionCancelled'));
      invalidateOrgSubscriptionQueries(queryClient, orgId);
    },
    onError: (error) => {
      const msg =
        error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : getErrorMessage(error));
    },
  });
}

export function useSuspendCourse(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => suspendCourse(entityId),
    onSuccess: () => {
      toast.success(t('entitySuspended'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUnsuspendCourse(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => unsuspendCourse(entityId),
    onSuccess: () => {
      toast.success(t('entityReactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSuspendModule(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => suspendModule(entityId),
    onSuccess: () => {
      toast.success(t('entitySuspended'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUnsuspendModule(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => unsuspendModule(entityId),
    onSuccess: () => {
      toast.success(t('entityReactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSuspendContent(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => suspendContent(entityId),
    onSuccess: () => {
      toast.success(t('entitySuspended'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUnsuspendContent(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => unsuspendContent(entityId),
    onSuccess: () => {
      toast.success(t('entityReactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSuspendUser(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => suspendUser(entityId),
    onSuccess: () => {
      toast.success(t('entitySuspended'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUnsuspendUser(orgId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminDashboard.toasts');
  return useMutation({
    mutationFn: (entityId: string) => unsuspendUser(entityId),
    onSuccess: () => {
      toast.success(t('entityReactivated'));
      void queryClient.invalidateQueries({ queryKey: ['admin-review', 'organization', orgId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ─── Module / Content Browsing ─────────────────────────────────────────

export function useOrganizationCourseModules(
  orgId: string,
  courseId: string,
  options: PaginationOptions
) {
  return useQuery<Paginated<IAdminModule>>({
    queryKey: adminReviewKeys.courseModules(orgId, courseId, options),
    queryFn: () => getOrganizationCourseModules(orgId, courseId, options),
    enabled: !!orgId && !!courseId,
    staleTime: 60 * 1000,
  });
}

export function useOrganizationModuleContents(
  orgId: string,
  moduleId: string,
  options: PaginationOptions
) {
  return useQuery<Paginated<IAdminContent>>({
    queryKey: adminReviewKeys.moduleContents(orgId, moduleId, options),
    queryFn: () => getOrganizationModuleContents(orgId, moduleId, options),
    enabled: !!orgId && !!moduleId,
    staleTime: 60 * 1000,
  });
}
