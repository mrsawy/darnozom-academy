'use client';

import { getStudentCalendar } from '@/lib/actions/calender/getStudentCalendar.action';
import type { ICalendarAppointment } from '@lms-organization/shared-types';
import { useQuery } from '@/lib/utils';

export const studentCalendarKeys = {
  all: ['studentCalendar'] as const,
  byMonth: (year: number, month: number) => [...studentCalendarKeys.all, year, month] as const,
};

/** Fetches `ICalendarAppointment[]` (includes optional `moduleId` / `moduleName` when applicable). */
export function useStudentCalendar(month: Date) {
  const year = month.getFullYear();
  const m = month.getMonth();

  const fromDate = new Date(year, m, 1, 0, 0, 0, 0).toISOString();
  const toDate = new Date(year, m + 1, 0, 23, 59, 59, 999).toISOString();

  return useQuery<ICalendarAppointment[]>({
    queryKey: [...studentCalendarKeys.byMonth(year, m), fromDate, toDate],
    queryFn: () => getStudentCalendar({ fromDate, toDate }),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    // cached: true,
    // cacheTtl: '5m',
  });
}
