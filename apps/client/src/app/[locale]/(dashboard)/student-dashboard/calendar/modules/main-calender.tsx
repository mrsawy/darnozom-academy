'use client';

import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import arLocale from '@fullcalendar/core/locales/ar';
import enLocale from '@fullcalendar/core/locales/en-gb';
import dayGridPlugin from '@fullcalendar/daygrid';
import FullCalendar from '@fullcalendar/react';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { useStudentCalendar } from '@/lib/hooks/calender/useStudentCalendar.hook';
import { ICalendarAppointment, CalendarAppointmentType } from '@darnozom/shared-types';
import { cn } from '@/lib/utils/index';
import { format } from 'date-fns';
import { ar as arDateFns, enUS as enUSDateFns } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function appointmentsToEvents(appointments: ICalendarAppointment[] | undefined): EventInput[] {
  if (!appointments?.length) return [];

  return appointments.map((a) => {
    const id = [a.courseId, a.contentId ?? '', a.date, a.title].join(':');
    const event: EventInput = {
      id,
      title: a.title,
      start: a.date,
      extendedProps: { appointment: a },
    };

    if (a.endDate) {
      event.end = a.endDate;
    }

    const dateOnly = !a.date.includes('T');
    if (dateOnly && !a.endDate) {
      event.allDay = true;
    }

    return event;
  });
}

function formatIsoDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const loc = locale === 'ar' ? arDateFns : enUSDateFns;
  const hasTime = iso.includes('T') && !iso.endsWith('T00:00:00.000Z');
  return format(d, hasTime ? 'PPp' : 'PP', { locale: loc });
}

function AppointmentModal({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: ICalendarAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('StudentCalendar');
  const locale = useLocale();

  const typeLabel = useMemo(() => {
    if (!appointment) return '';
    switch (appointment.type) {
      case CalendarAppointmentType.ASSIGNMENT: {
        return t('types.ASSIGNMENT');
      }
      case CalendarAppointmentType.QUIZ: {
        return t('types.QUIZ');
      }
      case CalendarAppointmentType.LIVE_SESSION: {
        return t('types.LIVE_SESSION');
      }
      case CalendarAppointmentType.PROJECT: {
        return t('types.PROJECT');
      }
      case CalendarAppointmentType.ATTENDANCE: {
        return t('types.ATTENDANCE');
      }
      default: {
        return String(appointment.type);
      }
    }
  }, [appointment, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        {appointment ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('eventDetails')}</DialogTitle>
              <DialogDescription className="sr-only">{appointment.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t('course')}
                </p>
                <p className="font-medium">{appointment.courseName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t('type')}
                </p>
                <p>{typeLabel}</p>
              </div>
              {appointment.moduleName ? (
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t('module')}
                  </p>
                  <p>{appointment.moduleName}</p>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t('starts')}
                </p>
                <p>{formatIsoDate(appointment.date, locale)}</p>
              </div>
              {appointment.endDate ? (
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t('ends')}
                  </p>
                  <p>{formatIsoDate(appointment.endDate, locale)}</p>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t('eventTitle')}
                </p>
                <p className="font-medium">{appointment.title}</p>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function MainCalendar() {
  const locale = useLocale();
  const t = useTranslations('StudentCalendar');
  const calendarRef = useRef<FullCalendar>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [toolbarTitle, setToolbarTitle] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<ICalendarAppointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: appointments, isFetching } = useStudentCalendar(visibleMonth);

  const events = useMemo(() => appointmentsToEvents(appointments), [appointments]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const d = arg.view.currentStart;
    const next = startOfMonth(d);
    setToolbarTitle(arg.view.title);
    setVisibleMonth((prev) => {
      if (prev.getFullYear() === next.getFullYear() && prev.getMonth() === next.getMonth()) {
        return prev;
      }
      return next;
    });
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const ap = info.event.extendedProps.appointment as ICalendarAppointment | undefined;
    if (ap) {
      setSelectedAppointment(ap);
      setDetailsOpen(true);
    }
  }, []);

  const fcLocale = locale === 'ar' ? arLocale : enLocale;

  const goPrev = () => calendarRef.current?.getApi().prev();
  const goNext = () => calendarRef.current?.getApi().next();
  const goToday = () => calendarRef.current?.getApi().today();

  return (
    <div
      className={cn(
        'student-calendar bg-card relative min-h-[min(70vh,800px)] rounded-lg border p-4',
        '[&_.fc-daygrid-event-harness]:mb-1.5 [&_.fc-daygrid-event-harness]:last:mb-0',
        '[&_.fc-daygrid-event]:text-[11px] [&_.fc-daygrid-event]:leading-snug',
        '[&_.fc-event-title]:text-[11px] [&_.fc-event-title]:leading-snug [&_.fc-event-title]:font-normal',
        '[&_.fc-event-main]:text-[11px]',
        '[&_.fc-daygrid-block-event]:py-0.5 [&_.fc-daygrid-event]:cursor-pointer'
      )}>
      <AppointmentModal
        appointment={selectedAppointment}
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedAppointment(null);
        }}
      />

      {isFetching ? (
        <div
          className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-[1px]"
          aria-busy
          aria-label={t('loadingCalendar')}>
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      ) : null}

      <div className="mb-4 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {/* dir=ltr keeps Lucide chevrons readable (FullCalendar fc-icons break in some RTL/font setups) */}
        <div
          dir="ltr"
          className="flex flex-wrap items-center justify-center gap-1 sm:justify-self-start">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={goPrev}
            aria-label={t('prevMonth')}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={goNext}
            aria-label={t('nextMonth')}>
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={goToday}>
            {t('today')}
          </Button>
        </div>
        <h2 className="text-center text-lg font-semibold tracking-tight">{toolbarTitle}</h2>
        <div className="hidden sm:block" aria-hidden />
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        initialDate={visibleMonth}
        locale={fcLocale}
        direction={locale === 'ar' ? 'rtl' : 'ltr'}
        headerToolbar={false}
        height="auto"
        events={events}
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        eventDisplay="block"
        dayMaxEvents
      />
    </div>
  );
}
