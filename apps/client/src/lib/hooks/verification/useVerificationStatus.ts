'use client';

import { useQuery } from '@/lib/utils';
import { getVerificationStatus } from '@/lib/actions/verification/verification.action';
import type { IVerificationStatusResponse } from '@/lib/types/verification/verification.interface';

export const verificationKeys = {
  status: ['verification', 'status'] as const,
};

export function useVerificationStatus() {
  return useQuery<IVerificationStatusResponse>({
    queryKey: verificationKeys.status,
    queryFn: () => getVerificationStatus(),
    cached: false,
    // Verification/approval state must reflect the server on every mount (e.g. after
    // re-login) so the wizard resumes at the correct step instead of a stale one.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
