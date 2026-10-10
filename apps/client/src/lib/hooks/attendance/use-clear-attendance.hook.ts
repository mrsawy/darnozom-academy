'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import { clearAttendance } from '@/lib/actions/attendance/clearAttendance.action';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useClearAttendance(courseId: string, slotId: string, date: Date | null) {
  const t = useTranslations('AttendanceMark');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      if (!date) throw new Error('No date selected');
      const result = await clearAttendance({
        courseId,
        slotId,
        studentId,
        date: date.toISOString(),
      });
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['sessionRoster', courseId, slotId, date?.toISOString() ?? ''],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failedToClear'));
    },
  });
}
