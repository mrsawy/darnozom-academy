'use client';

import { useEffect } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useQuery } from '@/lib/utils';
import { getAttendanceBySession } from '@/lib/actions/attendance/getAttendanceBySession.action';
import { PaginatedSessionRoster } from '@/lib/types/attendance/attendance.types';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

const EMPTY_ROSTER: PaginatedSessionRoster = {
  items: [],
  total: 0,
  page: 1,
  limit: 15,
  totalPages: 0,
};

interface SessionRosterParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function useSessionRoster(
  courseId: string,
  slotId: string,
  date: Date | null,
  params: SessionRosterParams = {}
) {
  const t = useTranslations('AttendanceMark');
  const { page = 1, limit = 15, search = '' } = params;

  const query = useQuery<PaginatedSessionRoster>({
    queryKey: ['sessionRoster', courseId, slotId, date, page, limit, search],
    queryFn: async () => {
      if (!courseId || !slotId || !date) return EMPTY_ROSTER;
      return getAttendanceBySession({
        courseId,
        slotId,
        date: date.toISOString(),
        page,
        limit,
        search: search || undefined,
      });
    },
    enabled: !!courseId && !!slotId && !!date,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!query.isError || !query.error) return;
    toast.error(query.error.message || t('failedToLoadRoster'));
  }, [query.isError, query.error, t]);

  return query;
}
