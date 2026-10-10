'use client';

import { useState } from 'react';
import { useMutation } from '@/lib/utils';
import { generateAttendanceReport } from '@/lib/actions/attendance/generateReport.action';
import { AttendanceReportData } from '@/lib/types/attendance/attendance.types';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useAttendanceReport() {
  const t = useTranslations('AttendanceReport');
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null);

  const mutation = useMutation({
    mutationFn: async (params: { courseId: string; startDate?: Date; endDate?: Date }) => {
      const result = await generateAttendanceReport({
        courseId: params.courseId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
      return result;
    },
    onSuccess: (data) => {
      setReportData(data);
      toast.success(t('reportGenerated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failedToGenerate'));
    },
  });

  return { reportData, ...mutation };
}
