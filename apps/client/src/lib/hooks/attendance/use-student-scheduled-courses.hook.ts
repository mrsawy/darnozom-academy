'use client';

import { useEffect } from 'react';
import { useQuery } from '@/lib/utils';
import { getStudentScheduledCourses } from '@/lib/actions/attendance/getStudentScheduledCourses.action';
import { StudentScheduledCourse } from '@/lib/types/attendance/attendance.types';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useStudentScheduledCourses() {
  const t = useTranslations('AttendanceHistory');

  const query = useQuery<StudentScheduledCourse[]>({
    queryKey: ['studentScheduledCourses'],
    queryFn: () => getStudentScheduledCourses(),
  });

  useEffect(() => {
    if (!query.isError || !query.error) return;
    toast.error(query.error.message || t('failedToLoadCourses'));
  }, [query.isError, query.error, t]);

  return query;
}
