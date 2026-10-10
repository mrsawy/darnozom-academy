'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/actions/verification/verification.action';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { verificationKeys } from './useVerificationStatus';

const ERRORS_NS = 'errors';

export function useSendEmailOtp() {
  const tErrors = useTranslations(ERRORS_NS);

  return useMutation({
    mutationFn: () => sendEmailOtp(),
    onSuccess: (data) => {
      toast.success(translateApiMessage(data.message, tErrors));
    },
    onError: (error) => {
      toast.error(translateApiMessage(getErrorMessage(error), tErrors));
    },
  });
}

export function useVerifyEmailOtp() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations(ERRORS_NS);

  return useMutation({
    mutationFn: (otp: string) => verifyEmailOtp(otp),
    onSuccess: (data) => {
      toast.success(translateApiMessage(data.message, tErrors));
      void queryClient.invalidateQueries({ queryKey: verificationKeys.status });
    },
    onError: (error) => {
      toast.error(translateApiMessage(getErrorMessage(error), tErrors));
    },
  });
}
