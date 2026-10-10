'use client';

import { useState, useMemo, useCallback } from 'react';
import { ICourse } from '@/lib/types/course/course.interface';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Calendar } from '@/components/atoms/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Button } from '@/components/atoms/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { useCourseSlots } from '@/lib/hooks/attendance/use-course-slots.hook';
import { useSessionRoster } from '@/lib/hooks/attendance/use-session-roster.hook';
import { useBulkMarkAttendance } from '@/lib/hooks/attendance/use-bulk-mark-attendance.hook';
import { SlotModeToggle } from '../slot-mode-toggle';
import { SlotPicker } from '../slot-picker';
import { SlotSessionPanel } from '../slot-session-panel/slot-session-panel';
import { OverridesMap } from '../slot-session-panel/slot-session-panel.schema';
import { AttendanceStatus } from '@/lib/types/attendance/attendance.types';
import type { TimeSlot } from '@/lib/types/course/course.interface';

interface AttendanceMarkProps {
  courses: ICourse[];
}

type SlotMode = 'single' | 'all';

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const ROSTER_PAGE_SIZE = 15;

export function AttendanceMark({ courses }: AttendanceMarkProps) {
  const t = useTranslations('AttendanceMark');
  const locale = useLocale();
  const dateFnsLocale = locale === 'ar' ? ar : enUS;

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [slotMode, setSlotMode] = useState<SlotMode>('single');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [overridesMap, setOverridesMap] = useState<Record<string, OverridesMap>>({});

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);
  const slots = useCourseSlots(selectedCourse);

  // Weekday indexes that have at least one active slot with a roster — drives the date picker.
  const slotWeekdays = useMemo(() => {
    const set = new Set<number>();
    for (const s of slots) {
      if ((s.studentsIds ?? []).length === 0) continue;
      const idx = WEEKDAY_NAMES.indexOf(s.dayOfWeek ?? '');
      if (idx !== -1) set.add(idx);
    }
    return set;
  }, [slots]);

  const dayLabel = WEEKDAY_NAMES[date.getDay()];
  const slotsForDay = slots.filter(
    (s) => s.dayOfWeek === dayLabel && (s.studentsIds ?? []).length > 0
  );
  const displaySlots =
    slotMode === 'single'
      ? selectedSlotId
        ? slots.filter((s) => s._id === selectedSlotId)
        : []
      : slotsForDay;

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedSlotId('');
    setOverridesMap({});
  };

  const handleDateChange = (d: Date | undefined) => {
    if (!d) return;
    setDate(d);
    setSelectedSlotId('');
    setOverridesMap({});
  };

  const handleOverrideChange = (
    slotId: string,
    studentId: string,
    override: Partial<{ status: AttendanceStatus | null; notes: string }>
  ) => {
    setOverridesMap((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [studentId]: { ...(prev[slotId]?.[studentId] ?? { status: null, notes: '' }), ...override },
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-card flex flex-wrap items-end gap-4 rounded-lg border p-4 shadow-sm">
        <div className="w-[260px] space-y-1.5">
          <span className="text-sm font-medium">{t('selectCourse')}</span>
          <Select value={selectedCourseId} onValueChange={handleCourseChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectCoursePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1.5">
          <span className="text-sm font-medium">{t('date')}</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!selectedCourseId}
                className={cn(
                  'h-9 w-[200px] justify-start text-left font-normal',
                  !selectedCourseId && 'opacity-60'
                )}>
                <CalendarIcon className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                {format(date, 'PPP', { locale: dateFnsLocale })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                disabled={(d) => !slotWeekdays.has(d.getDay())}
              />
            </PopoverContent>
          </Popover>
        </div>

        {selectedCourseId ? (
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t('mode')}</span>
            <SlotModeToggle value={slotMode} onChange={setSlotMode} />
          </div>
        ) : null}

        {selectedCourseId && slotMode === 'single' ? (
          <SlotPicker
            slots={slots}
            selectedDate={date}
            value={selectedSlotId}
            onChange={setSelectedSlotId}
          />
        ) : null}
      </div>

      {selectedCourseId ? (
        slotsForDay.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t('noSlotsForDay')}</p>
        ) : null
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">{t('selectCourseToStart')}</p>
      )}

      {displaySlots.map((slot) => (
        <SlotPanelWrapper
          key={slot._id}
          courseId={selectedCourseId}
          slot={slot}
          date={date}
          overrides={overridesMap[slot._id ?? ''] ?? {}}
          autoFocusSearch={slotMode === 'single'}
          onOverrideChange={(studentId, override) =>
            handleOverrideChange(slot._id ?? '', studentId, override)
          }
        />
      ))}
    </div>
  );
}

function SlotPanelWrapper({
  courseId,
  slot,
  date,
  overrides,
  onOverrideChange,
  autoFocusSearch,
}: {
  courseId: string;
  slot: TimeSlot;
  date: Date;
  overrides: OverridesMap;
  onOverrideChange: (
    studentId: string,
    override: Partial<{ status: AttendanceStatus | null; notes: string }>
  ) => void;
  autoFocusSearch?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching } = useSessionRoster(courseId, slot._id ?? '', date, {
    page,
    limit: ROSTER_PAGE_SIZE,
    search,
  });

  const roster = data?.items ?? [];
  const bulkMark = useBulkMarkAttendance(courseId, slot._id ?? '', date);

  const pendingCount = useMemo(
    () => Object.values(overrides).filter((ov) => ov.status != null).length,
    [overrides]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  // Build records from the overrides map (not just the visible page) so edits made
  // on one page still save after navigating to another.
  const handleSave = useCallback(() => {
    const records = Object.entries(overrides).flatMap(([studentId, ov]) =>
      ov.status == null ? [] : [{ studentId, status: ov.status, notes: ov.notes }]
    );

    if (records.length === 0) return;

    bulkMark.mutate({ courseId, slotId: slot._id ?? '', date, attendanceRecords: records });
  }, [overrides, bulkMark, courseId, slot._id, date]);

  return (
    <SlotSessionPanel
      courseId={courseId}
      slot={slot}
      date={date}
      roster={roster}
      total={data?.total ?? 0}
      page={data?.page ?? page}
      totalPages={data?.totalPages ?? 0}
      limit={data?.limit ?? ROSTER_PAGE_SIZE}
      search={search}
      pendingCount={pendingCount}
      isLoading={isLoading}
      isFetching={isFetching}
      overrides={overrides}
      onOverrideChange={onOverrideChange}
      onSearchChange={handleSearchChange}
      onPageChange={setPage}
      onSave={handleSave}
      isSaving={bulkMark.isPending}
      autoFocusSearch={autoFocusSearch}
    />
  );
}
