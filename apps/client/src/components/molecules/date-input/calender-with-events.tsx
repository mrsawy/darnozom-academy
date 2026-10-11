'use client';

import * as React from 'react';

import { formatDateRange } from 'little-date';
import { useTranslations } from 'next-intl';
import { DayButton } from 'react-day-picker';
import { Button } from '@/components/atoms/button';
import { Calendar, CalendarDayButton } from '@/components/atoms/calendar';
import { Card, CardContent, CardFooter } from '@/components/atoms/card';
import type { ICalendarAppointment } from '@darnozom/shared-types';
import { CalendarAppointmentType } from '@darnozom/shared-types';
import { cn } from '@/lib/utils';

const typeColors: Record<CalendarAppointmentType, string> = {
  ASSIGNMENT: 'after:bg-warning',
  QUIZ: 'after:bg-info',
  LIVE_SESSION: 'after:bg-success',
  PROJECT: 'after:bg-primary',
  ATTENDANCE: 'after:bg-destructive',
  PRIVATE_SESSION: 'after:bg-[#a855f7]',
};

const dayDotColors: Record<CalendarAppointmentType, string> = {
  ASSIGNMENT: 'bg-warning',
  QUIZ: 'bg-info',
  LIVE_SESSION: 'bg-success',
  PROJECT: 'bg-primary',
  ATTENDANCE: 'bg-destructive',
  PRIVATE_SESSION: 'bg-[#a855f7]',
};

const typeBadgeColors: Record<CalendarAppointmentType, string> = {
  ASSIGNMENT: 'bg-warning/10 text-warning',
  QUIZ: 'bg-info/10 text-info',
  LIVE_SESSION: 'bg-success/10 text-success',
  PROJECT: 'bg-primary/10 text-primary',
  ATTENDANCE: 'bg-destructive/10 text-destructive',
  PRIVATE_SESSION: 'bg-[#f3e8ff] text-[#7c3aed]',
};

export interface CalendarWithEventsProps {
  appointments?: ICalendarAppointment[];
  onMonthChange?: (month: Date) => void;
  isLoading?: boolean;
}

const defaultAppointments: ICalendarAppointment[] = [];

export default function CalendarWithEvents({
  appointments = defaultAppointments,
  onMonthChange,
  isLoading,
}: CalendarWithEventsProps) {
  const t = useTranslations('Calendar');
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [month, setMonth] = React.useState<Date>(new Date());

  const appointmentDates = React.useMemo(() => {
    const dateMap = new Map<string, ICalendarAppointment[]>();
    for (const appt of appointments) {
      const key = new Date(appt.date).toDateString();
      const list = dateMap.get(key) ?? [];
      list.push(appt);
      dateMap.set(key, list);
    }
    return dateMap;
  }, [appointments]);

  const appointmentDayDates = React.useMemo(
    () => [...appointmentDates.keys()].map((key) => new Date(key)),
    [appointmentDates]
  );

  const selectedDayAppointments = React.useMemo(() => {
    if (!date) return [];
    return appointmentDates.get(date.toDateString()) ?? [];
  }, [date, appointmentDates]);

  const handleMonthChange = React.useCallback(
    (newMonth: Date) => {
      setMonth(newMonth);
      onMonthChange?.(newMonth);
    },
    [onMonthChange]
  );

  const goToToday = React.useCallback(() => {
    const now = new Date();
    handleMonthChange(now);
    setDate(now);
  }, [handleMonthChange]);

  return (
    <Card className="w-full max-w-full py-4">
      <CardContent className="px-4">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={handleMonthChange}
          selected={date}
          onSelect={setDate}
          modifiers={{ hasAppointment: appointmentDayDates }}
          className={cn('w-full bg-transparent p-0', isLoading && 'opacity-50')}
          components={{
            DayButton: (props: React.ComponentProps<typeof DayButton>) => {
              const dayDate = props.day.date;
              const dayAppointments = appointmentDates.get(dayDate.toDateString());
              const uniqueTypes = dayAppointments
                ? [...new Set(dayAppointments.map((a) => a.type))]
                : [];

              return (
                <div className="relative flex flex-col items-center">
                  <CalendarDayButton {...props} />
                  {uniqueTypes.length > 0 && (
                    <div className="absolute -bottom-0.5 flex gap-0.5">
                      {uniqueTypes.slice(0, 3).map((type) => (
                        <span
                          key={type}
                          className={cn('size-1 rounded-full', dayDotColors[type])}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t px-4 pt-4!">
        <div className="flex w-full items-center justify-between gap-2 px-1">
          <div className="text-sm font-medium">
            {date?.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t('today')}
          </Button>
        </div>

        {date && selectedDayAppointments.length > 0 ? (
          <div className="flex w-full flex-col gap-2">
            {selectedDayAppointments.map((appt, i) => {
              const from = new Date(appt.date);
              const to = appt.endDate ? new Date(appt.endDate) : from;
              return (
                <div
                  key={`${appt.contentId ?? appt.type}-${i}`}
                  className={cn(
                    'bg-muted relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full',
                    typeColors[appt.type]
                  )}>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                        typeBadgeColors[appt.type]
                      )}>
                      {t(`type_${appt.type}`)}
                    </span>
                  </div>
                  <div className="font-medium">{appt.title}</div>
                  <div className="text-muted-foreground truncate text-xs">{appt.courseName}</div>
                  {appt.moduleName ? (
                    <div className="text-muted-foreground truncate text-xs">{appt.moduleName}</div>
                  ) : null}
                  <div className="text-muted-foreground text-xs">{formatDateRange(from, to)}</div>
                </div>
              );
            })}
          </div>
        ) : null}

        {date && selectedDayAppointments.length === 0 && !isLoading ? (
          <p className="text-muted-foreground text-center text-xs">{t('noAppointments')}</p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
