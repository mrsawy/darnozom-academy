'use client';

import { useEffect } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useQuery } from '@/lib/utils';
import { getStudentCourseHistory } from '@/lib/actions/attendance/getStudentCourseHistory.action';
import { StudentCourseHistory } from '@/lib/types/attendance/attendance.types';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

interface StudentCourseHistoryParams {
  /** ISO date strings. The query stays disabled until both are provided. */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  /** Pass to view another student's history (staff). Omit for the logged-in student. */
  studentId?: string;
}

export function useStudentCourseHistory(courseId: string, params: StudentCourseHistoryParams = {}) {
  const t = useTranslations('AttendanceHistory');
  const { from, to, page = 1, limit = 15, studentId } = params;

  const query = useQuery<StudentCourseHistory>({
    queryKey: [
      'studentCourseHistory',
      courseId,
      studentId ?? 'self',
      from ?? '',
      to ?? '',
      page,
      limit,
    ],
    queryFn: () => {
      if (!from || !to) {
        throw new Error('from and to are required');
      }
      return getStudentCourseHistory({ courseId, from, to, page, limit, studentId });
    },
    enabled: !!courseId && !!from && !!to,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!query.isError || !query.error) return;
    toast.error(query.error.message || t('failedToLoadHistory'));
  }, [query.isError, query.error, t]);

  return query;
}
