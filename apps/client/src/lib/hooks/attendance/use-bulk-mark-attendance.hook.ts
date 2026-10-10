'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import {
  bulkMarkAttendance,
  BulkAttendanceDto,
} from '@/lib/actions/attendance/bulkMarkAttendance.action';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useBulkMarkAttendance(courseId: string, slotId: string, date: Date | null) {
  const t = useTranslations('AttendanceMark');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: BulkAttendanceDto) => {
      const result = await bulkMarkAttendance(dto);
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
      return result;
    },
    onSuccess: () => {
      toast.success(t('attendanceSaved'));
      void queryClient.invalidateQueries({
        queryKey: ['sessionRoster', courseId, slotId, date?.toISOString() ?? ''],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failedToSave'));
    },
  });
}
