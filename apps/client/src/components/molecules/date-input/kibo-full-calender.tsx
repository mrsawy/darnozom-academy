'use client';

import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  useCalendarMonth,
  useCalendarYear,
  type Feature,
  type Status,
} from '@/components/atoms/kibo-ui/calendar';
import { useStudentCalendar } from '@/lib/hooks/calender/useStudentCalendar.hook';
import type { ICalendarAppointment } from '@lms-organization/shared-types';
import { CalendarAppointmentType } from '@lms-organization/shared-types';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

const typeStatusColors: Record<CalendarAppointmentType, string> = {
  ASSIGNMENT: '#f59e0b',
  QUIZ: '#3b82f6',
  LIVE_SESSION: '#22c55e',
  PROJECT: '#6366f1',
  ATTENDANCE: '#ef4444',
  PRIVATE_SESSION: '#a855f7',
};

function typeToStatus(type: CalendarAppointmentType): Status {
  return {
    id: type,
    name: type,
    color: typeStatusColors[type] ?? '#6b7280',
  };
}

function parseAppointmentDate(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return new Date();
  }
  return d;
}

/** Maps API appointments to kibo `Feature`s. `CalendarBody` places items by `endAt` (see kibo calendar). */
function appointmentsToFeatures(appointments: ICalendarAppointment[] | undefined): Feature[] {
  if (!appointments?.length) return [];

  return appointments.map((a) => {
    const start = parseAppointmentDate(a.date);
    const id = [a.courseId, a.contentId ?? '', a.date, a.title].join(':');

    return {
      id,
      name: a.title,
      startAt: start,
      endAt: start,
      status: typeToStatus(a.type),
    };
  });
}

function KiboFullCalendarContent() {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();
  const visibleMonth = useMemo(() => new Date(year, month, 1), [year, month]);

  const t = useTranslations('Calendar');
  const { data: appointments, isFetching } = useStudentCalendar(visibleMonth);
  const features = useMemo(() => appointmentsToFeatures(appointments), [appointments]);

  const yearNow = new Date().getFullYear();

  return (
    <>
      <CalendarDate>
        <CalendarDatePicker>
          <CalendarMonthPicker />
          <CalendarYearPicker end={yearNow + 5} start={yearNow - 5} />
        </CalendarDatePicker>
        <CalendarDatePagination />
      </CalendarDate>
      <CalendarHeader />
      <div className="relative min-h-[min(70vh,800px)] flex-1">
        {isFetching ? (
          <div
            aria-busy
            aria-label={t('loadingCalendar')}
            className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
          </div>
        ) : null}
        <CalendarBody features={features}>
          {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
        </CalendarBody>
      </div>
    </>
  );
}

export default function KiboFullCalendar() {
  const locale = useLocale();
  const calendarLocale = locale === 'ar' ? 'ar' : 'en-US';

  return (
    <CalendarProvider className="bg-card rounded-lg border p-4" locale={calendarLocale}>
      <KiboFullCalendarContent />
    </CalendarProvider>
  );
}
