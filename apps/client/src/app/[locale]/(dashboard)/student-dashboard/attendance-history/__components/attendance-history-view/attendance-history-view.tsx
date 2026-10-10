'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, type Locale } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Calendar } from '@/components/atoms/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';
import { AttendanceStatus, StudentScheduledCourse } from '@/lib/types/attendance/attendance.types';
import { useStudentScheduledCourses } from '@/lib/hooks/attendance/use-student-scheduled-courses.hook';
import { useStudentCourseHistory } from '@/lib/hooks/attendance/use-student-course-history.hook';

const PAGE_SIZE = 15;

const STATUS_CLASS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]:
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  [AttendanceStatus.LATE]:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  [AttendanceStatus.EXCUSED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  [AttendanceStatus.ABSENT]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

/** True when `to` is more than one year after `from`. */
function exceedsOneYear(from: Date, to: Date): boolean {
  const maxTo = new Date(from);
  maxTo.setFullYear(maxTo.getFullYear() + 1);
  return to.getTime() > maxTo.getTime();
}

interface AttendanceHistoryViewProps {
  /** Provide to view another student's history (staff). Omit for the logged-in student. */
  studentId?: string;
  /** When viewing as staff, supply the course list; otherwise the student's own scheduled courses are used. */
  courses?: StudentScheduledCourse[];
}

export function AttendanceHistoryView({
  studentId,
  courses: coursesProp,
}: AttendanceHistoryViewProps) {
  const t = useTranslations('AttendanceHistory');
  const locale = useLocale();
  const dateFnsLocale = locale === 'ar' ? ar : enUS;

  const selfCourses = useStudentScheduledCourses();
  const courses = useMemo(
    () => coursesProp ?? selfCourses.data ?? [],
    [coursesProp, selfCourses.data]
  );
  const coursesLoading = coursesProp ? false : selfCourses.isLoading;

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);

  // Default to the first available course once the list loads (dates stay empty — user must pick them).
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) setSelectedCourseId(courses[0].courseId);
  }, [courses, selectedCourseId]);

  // Client-side validation before any request goes to the server.
  const rangeError = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    if (dateFrom.getTime() > dateTo.getTime()) return t('errorFromAfterTo');
    if (exceedsOneYear(dateFrom, dateTo)) return t('errorRangeTooLong');
    return null;
  }, [dateFrom, dateTo, t]);

  const rangeReady = !!dateFrom && !!dateTo && !rangeError;

  const { data, isLoading, isFetching } = useStudentCourseHistory(selectedCourseId, {
    from: rangeReady ? dateFrom.toISOString() : undefined,
    to: rangeReady ? dateTo.toISOString() : undefined,
    page,
    limit: PAGE_SIZE,
    studentId,
  });

  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setPage(1);
  };
  const handleFromChange = (d?: Date) => {
    if (!d) return;
    setDateFrom(d);
    setPage(1);
  };
  const handleToChange = (d?: Date) => {
    if (!d) return;
    setDateTo(d);
    setPage(1);
  };

  if (coursesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">{t('noScheduledCourses')}</p>
    );
  }

  const summary = data?.summary;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);
  const disableFuture = (d: Date) => d.getTime() > Date.now();

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-[260px] space-y-1.5">
          <span className="text-sm font-medium">{t('course')}</span>
          <Select value={selectedCourseId} onValueChange={handleCourseChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectCourse')} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.courseId} value={c.courseId}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DateField
          label={t('from')}
          value={dateFrom}
          placeholder={t('pickDate')}
          dateFnsLocale={dateFnsLocale}
          onChange={handleFromChange}
          disabled={disableFuture}
        />
        <DateField
          label={t('to')}
          value={dateTo}
          placeholder={t('pickDate')}
          dateFnsLocale={dateFnsLocale}
          onChange={handleToChange}
          disabled={disableFuture}
        />
      </div>

      {rangeError ? <p className="text-destructive text-sm">{rangeError}</p> : null}

      {rangeReady ? (
        <>
          {summary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryStat label={t('rate')} value={`${summary.attendanceRate}%`} highlight />
              <SummaryStat label={t('total')} value={summary.total} />
              <SummaryStat label={t('present')} value={summary.present} />
              <SummaryStat label={t('late')} value={summary.late} />
              <SummaryStat label={t('excused')} value={summary.excused} />
              <SummaryStat label={t('absent')} value={summary.absent} />
            </div>
          ) : null}

          <div className="bg-card rounded-lg border shadow-sm">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm">
                {t('noSessions')}
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'transition-opacity',
                    isFetching && 'pointer-events-none opacity-60'
                  )}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('day')}</TableHead>
                        <TableHead>{t('time')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => (
                        <TableRow key={`${row.slotId}-${row.date}`}>
                          <TableCell className="font-medium">
                            {format(new Date(row.date), 'PP', { locale: dateFnsLocale })}
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">
                            {t(`weekday.${row.dayOfWeek}`)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {row.startTime} – {row.endTime}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                STATUS_CLASS[row.status]
                              )}>
                              {t(`statusLabel.${row.status}`)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                  <span className="text-muted-foreground text-xs">
                    {t('showingRange', { from: showingFrom, to: showingTo, total })}
                  </span>
                  {totalPages > 1 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={page <= 1 || isFetching}
                        onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                      </Button>
                      <span className="px-2 text-sm tabular-nums">
                        {t('pageOf', { page, totalPages })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={page >= totalPages || isFetching}
                        onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground py-12 text-center text-sm">{t('selectRangePrompt')}</p>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  placeholder,
  dateFnsLocale,
  onChange,
  disabled,
}: {
  label: string;
  value: Date | undefined;
  placeholder: string;
  dateFnsLocale: Locale;
  onChange: (d?: Date) => void;
  disabled: (d: Date) => boolean;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[180px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}>
            <CalendarIcon className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
            {value ? format(value, 'PP', { locale: dateFnsLocale }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={value} onSelect={onChange} disabled={disabled} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-center',
        highlight && 'border-primary/40 bg-primary/5'
      )}>
      <div className={cn('text-2xl font-bold', highlight && 'text-primary')}>{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
