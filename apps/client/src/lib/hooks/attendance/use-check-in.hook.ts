'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useMutation } from '@/lib/utils';
import { markStudentByQr } from '@/lib/actions/attendance/markStudentByQr.action';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';

export function useCheckIn(courseId: string) {
  const t = useTranslations('StudentCheckIn');
  const tErrors = useTranslations('errors');

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await markStudentByQr(courseId);
      if (result && 'err' in result) {
        throw new Error(result.err.message ?? '');
      }
    },
    onError: (error: Error) => {
      const msg = error.message;
      toast.error(msg ? translateApiMessage(msg, tErrors) : t('errorGeneric'));
    },
  });

  const { mutate } = mutation;

  useEffect(() => {
    mutate();
  }, [courseId, mutate]);

  const status = mutation.isPending ? 'submitting' : mutation.isError ? 'error' : 'success';
  const errorMessage = mutation.isError
    ? (() => {
        const msg = mutation.error?.message ?? '';
        return msg ? translateApiMessage(msg, tErrors) : t('errorGeneric');
      })()
    : '';

  return { status, errorMessage } as {
    status: 'submitting' | 'success' | 'error';
    errorMessage: string;
  };
}
