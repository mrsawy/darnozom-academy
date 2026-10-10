'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Calendar, CalendarDayButton } from '@/components/atoms/calendar';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import type { ICalendarAppointment } from '@lms-organization/shared-types';
import { CalendarAppointmentType } from '@lms-organization/shared-types';
import { cn } from '@/lib/utils';
import { DayButton } from 'react-day-picker';

const typeColors: Record<CalendarAppointmentType, string> = {
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

interface CalendarWithTodayButtonProps {
  appointments?: ICalendarAppointment[];
  onMonthChange?: (month: Date) => void;
  isLoading?: boolean;
}
const defaultAppointments: ICalendarAppointment[] = [];

export default function CalendarWithTodayButton({
  appointments = defaultAppointments,
  onMonthChange,
  isLoading,
}: CalendarWithTodayButtonProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('appointment')}</CardTitle>
        <CardDescription>{t('findDate')}</CardDescription>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const now = new Date();
              handleMonthChange(now);
              setDate(now);
            }}>
            {t('today')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={handleMonthChange}
          selected={date}
          onSelect={setDate}
          modifiers={{ hasAppointment: appointmentDayDates }}
          className={cn('bg-transparent p-0', isLoading && 'opacity-50')}
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
                        <span key={type} className={cn('size-1 rounded-full', typeColors[type])} />
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />

        {date && selectedDayAppointments.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {selectedDayAppointments.map((appt, i) => (
              <div
                key={`${appt.contentId ?? appt.type}-${i}`}
                className="flex items-start gap-2 rounded-md border p-2 text-xs">
                <span
                  className={cn(
                    'mt-0.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                    typeBadgeColors[appt.type]
                  )}>
                  {t(`type_${appt.type}`)}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{appt.title}</span>
                  <span className="text-muted-foreground truncate">{appt.courseName}</span>
                  {appt.moduleName ? (
                    <span className="text-muted-foreground truncate text-[11px]">
                      {appt.moduleName}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {date && selectedDayAppointments.length === 0 && !isLoading ? (
          <p className="text-muted-foreground text-center text-xs">{t('noAppointments')}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
