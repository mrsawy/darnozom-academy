'use client';

import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import type { PaginationOptions, Paginated } from '@/lib/types/Paginated';
import type { IVerificationOrg } from '@/lib/types/verification/verification.interface';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import {
  getPendingVerifications,
  getVerificationDetail,
  approveIdentityVerification,
  rejectIdentityVerification,
} from '@/lib/actions/verification/verification.action';

export const verificationReviewKeys = {
  pending: (opts: PaginationOptions) => ['admin-review', 'verifications', opts] as const,
  detail: (orgId: string) => ['admin-review', 'verification-detail', orgId] as const,
};

export function usePendingVerifications(options: PaginationOptions) {
  return useQuery<Paginated<IVerificationOrg>>({
    queryKey: verificationReviewKeys.pending(options),
    queryFn: () => getPendingVerifications(options),
  });
}

export function useVerificationDetail(orgId: string) {
  return useQuery<IVerificationOrg>({
    queryKey: verificationReviewKeys.detail(orgId),
    queryFn: () => getVerificationDetail(orgId),
    enabled: !!orgId,
  });
}

export function useApproveIdentityVerification(options?: { onSuccessMessage?: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgId: string) => approveIdentityVerification(orgId),
    onSuccess: () => {
      if (options?.onSuccessMessage) toast.success(options.onSuccessMessage);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useRejectIdentityVerification(options?: { onSuccessMessage?: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, comment }: { orgId: string; comment: string }) =>
      rejectIdentityVerification(orgId, comment),
    onSuccess: () => {
      if (options?.onSuccessMessage) toast.success(options.onSuccessMessage);
      void queryClient.invalidateQueries({ queryKey: ['admin-review'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
