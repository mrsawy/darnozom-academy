'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { IdentityDocumentType } from '@lms-organization/shared-types';
import { submitIdentityVerification } from '@/lib/actions/verification/verification.action';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { verificationKeys } from './useVerificationStatus';

export function useSubmitIdentityVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentType,
      fileKeys,
    }: {
      documentType: IdentityDocumentType;
      fileKeys: string[];
    }) => submitIdentityVerification(documentType, fileKeys),
    onSuccess: (data) => {
      toast.success(data.message);
      void queryClient.invalidateQueries({ queryKey: verificationKeys.status });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
