'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { AccessType } from '@darnozom/shared-types';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { getUserEnrollments } from '@/lib/actions/enrollment/getUserEnrollments.action';
import { Paginated, PaginationOptions } from '@/lib/types/Paginated';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { IEnrollment, SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';
import useGeneralStore from '@/lib/store/generalStore';

// Query keys
export const enrollmentKeys = {
  all: ['enrollments'] as const,
  organization: () => [...enrollmentKeys.all, 'organization'] as const,
  student: () => [...enrollmentKeys.all, 'student'] as const,
};

export interface EnrollmentFilters {
  courseIds?: string[];
}

// Custom hook for fetching users by organization
export function useEnrollmentsByOrganization(
  options?: PaginationOptions,
  filters?: EnrollmentFilters
) {
  return useQuery({
    queryKey: [...enrollmentKeys.organization(), options, filters],
    queryFn: async () => {
      const enrollments = await createAuthorizedNatsRequest<Paginated<IEnrollment>>(
        'enrollment.getOrganizationEnrollments',
        {
          options: {
            ...options,
            ...(filters?.courseIds && filters.courseIds.length > 0
              ? { courseIds: filters.courseIds }
              : {}),
          },
        }
      );
      return enrollments;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Refetch when component mounts
  });
}

export interface EnrollByOrgPayload {
  userId: string;
  courseId: string;
  startsAt?: string;
  endsAt?: string;
}

export function useToggleOrgEnrollmentSubscription() {
  const queryClient = useQueryClient();
  const t = useTranslations('EnrollmentDataTable');

  return useCallback(
    async (enrollment: Pick<IEnrollment, '_id' | 'accessType'>, status: SubscriptionStatus) => {
      if (!enrollment._id) return;
      if (enrollment.accessType !== AccessType.BY_ORGANIZATION) {
        toast.error(t('statusToggleRequiresOrgAccess'));
        return;
      }
      try {
        useGeneralStore.setState({ generalIsLoading: true });

        await createAuthorizedNatsRequest('enrollment.updateByOrg', {
          enrollmentId: enrollment._id,
          enrollmentData: { subscription: { status } },
        });
        void queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
        toast.success(t('statusUpdated'));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('errorUpdatingStatus');
        toast.error(errorMessage);
      } finally {
        useGeneralStore.setState({ generalIsLoading: false });
      }
    },
    [queryClient, t]
  );
}

export function useEnrollByOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EnrollByOrgPayload) =>
      createAuthorizedNatsRequest<IEnrollment>('enrollment.enrollToCourseByOrg', payload, true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
    },
  });
}

export function useStudentEnrollments(options: PaginationOptions = {}) {
  return useQuery({
    queryKey: [...enrollmentKeys.student(), options],
    queryFn: () => getUserEnrollments(options),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  });
}
