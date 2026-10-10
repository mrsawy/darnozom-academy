'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import type { FieldError } from 'react-hook-form';
import { format, isValid, parse, setHours, setMilliseconds } from 'date-fns';
import { Button } from '@/components/atoms/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';
import { SimpleTimePicker } from '@/components/molecules/date-input/simple-time-picker';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useInfiniteUsers } from '@/lib/hooks/user/use-user.hook';
import { useInfiniteCourseEnrollments } from '@/lib/hooks/enrollment/use-course-enrollments.hook';
import { Roles } from '@lms-organization/shared-types';
import type { OfflineScheduleSlot } from './types';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Stable calendar date for parsing slot times (time-of-day only). */
const OFFLINE_SLOT_TIME_REFERENCE = new Date(2000, 0, 1);

function normalizeOfflineSlotTimeDate(date: Date): Date {
  return setMilliseconds(date, 0);
}

function parseOfflineSlotTimeString(time: string): Date {
  const trimmed = time.trim();
  if (!trimmed) {
    return normalizeOfflineSlotTimeDate(setHours(OFFLINE_SLOT_TIME_REFERENCE, 9));
  }
  let parsed = parse(trimmed, 'hh:mm a', OFFLINE_SLOT_TIME_REFERENCE);
  if (!isValid(parsed)) parsed = parse(trimmed, 'h:mm a', OFFLINE_SLOT_TIME_REFERENCE);
  if (!isValid(parsed)) {
    parsed = parse(trimmed.toLowerCase(), 'h:mm a', OFFLINE_SLOT_TIME_REFERENCE);
  }
  if (!isValid(parsed)) parsed = parse(trimmed, 'HH:mm', OFFLINE_SLOT_TIME_REFERENCE);
  if (!isValid(parsed)) {
    return normalizeOfflineSlotTimeDate(setHours(OFFLINE_SLOT_TIME_REFERENCE, 9));
  }
  return normalizeOfflineSlotTimeDate(parsed);
}

function formatOfflineSlotTimeString(date: Date): string {
  return format(date, 'hh:mm a');
}

interface OfflineScheduleSlotCardProps {
  slot: OfflineScheduleSlot;
  index: number;
  scheduleLength: number;
  offlineSchedule: OfflineScheduleSlot[];
  setOfflineSchedule: Dispatch<SetStateAction<OfflineScheduleSlot[]>>;
  courseId?: string;
  /** Per-field errors for this row (react-hook-form / yup). */
  fieldErrors?: Partial<Record<'dayOfWeek' | 'startTime' | 'endTime', FieldError>>;
}

export function OfflineScheduleSlotCard({
  slot,
  index,
  scheduleLength,
  offlineSchedule,
  setOfflineSchedule,
  courseId,
  fieldErrors,
}: OfflineScheduleSlotCardProps) {
  const t = useTranslations('CourseForm');

  const [instructorSearch, setInstructorSearch] = useState('');
  const [coInstructorSearch, setCoInstructorSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const {
    data: instructorOptions,
    hasMore: instructorsHasMore,
    fetchNextPage: fetchNextInstructors,
    isLoading: instructorsLoading,
    isFetchingNextPage: instructorsFetchingNext,
  } = useInfiniteUsers({
    search: instructorSearch,
    roleFilter: Roles.INSTRUCTOR,
    pageSize: 10,
  });

  const {
    data: coInstructorOptions,
    hasMore: coInstructorsHasMore,
    fetchNextPage: fetchNextCoInstructors,
    isLoading: coInstructorsLoading,
    isFetchingNextPage: coInstructorsFetchingNext,
  } = useInfiniteUsers({
    search: coInstructorSearch,
    roleFilter: Roles.INSTRUCTOR,
    pageSize: 10,
  });

  const {
    data: studentOptions,
    hasMore: studentsHasMore,
    fetchNextPage: fetchNextStudents,
    isLoading: studentsLoading,
    isFetchingNextPage: studentsFetchingNext,
  } = useInfiniteCourseEnrollments({
    courseId,
    search: studentSearch,
    pageSize: 10,
  });

  const selectedInstructors: Option[] = (slot.instructorsIds ?? [])
    .map((id) => instructorOptions.find((o) => o.value === id))
    .filter((o): o is Option => o !== undefined);

  const selectedCoInstructors: Option[] = (slot.coInstructorsIds ?? [])
    .map((id) => coInstructorOptions.find((o) => o.value === id))
    .filter((o): o is Option => o !== undefined);

  const selectedStudents: Option[] = (slot.studentsIds ?? [])
    .map((id) => studentOptions.find((o) => o.value === id))
    .filter((o): o is Option => o !== undefined);

  return (
    <div className="bg-background space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('timeSlot', { index: index + 1 })}</span>
        {scheduleLength > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOfflineSchedule((prev) => prev.filter((_, i) => i !== index))}
            className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span>{t('dayOfWeek')}</span>
          <Select
            value={slot.dayOfWeek}
            onValueChange={(value) => {
              const newSchedule = [...offlineSchedule];
              newSchedule[index].dayOfWeek = value;
              setOfflineSchedule(newSchedule);
            }}>
            <SelectTrigger className={cn('border-3', fieldErrors?.dayOfWeek && 'border-red-500')}>
              <SelectValue placeholder={t('selectDay')} />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {t(`days.${day}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors?.dayOfWeek?.message ? (
            <p className="text-start text-sm text-red-400" role="alert">
              {fieldErrors.dayOfWeek.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span>{t('startTime')}</span>
          <div
            id={`startTime-${index}`}
            aria-invalid={!!fieldErrors?.startTime}
            className={cn(
              fieldErrors?.startTime && 'rounded-md ring-2 ring-red-500 ring-offset-2'
            )}>
            <SimpleTimePicker
              key={`start-${index}-${slot.startTime}`}
              use12HourFormat
              value={parseOfflineSlotTimeString(slot.startTime)}
              onChange={(date) => {
                const startTime = formatOfflineSlotTimeString(date);
                setOfflineSchedule((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, startTime } : s))
                );
              }}
            />
          </div>
          {fieldErrors?.startTime?.message ? (
            <p className="text-start text-sm text-red-400" role="alert">
              {fieldErrors.startTime.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span>{t('endTime')}</span>
          <div
            id={`endTime-${index}`}
            aria-invalid={!!fieldErrors?.endTime}
            className={cn(fieldErrors?.endTime && 'rounded-md ring-2 ring-red-500 ring-offset-2')}>
            <SimpleTimePicker
              key={`end-${index}-${slot.endTime}`}
              use12HourFormat
              value={parseOfflineSlotTimeString(slot.endTime)}
              onChange={(date) => {
                const endTime = formatOfflineSlotTimeString(date);
                setOfflineSchedule((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, endTime } : s))
                );
              }}
            />
          </div>
          {fieldErrors?.endTime?.message ? (
            <p className="text-start text-sm text-red-400" role="alert">
              {fieldErrors.endTime.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t pt-4">
        <h4 className="text-muted-foreground text-sm font-medium">{t('assignUsersToTimeSlot')}</h4>

        <div className="flex flex-col gap-2">
          <span>{t('instructorsOptional')}</span>
          <MultipleSelector
            value={selectedInstructors}
            onChange={(selected) => {
              const newSchedule = [...offlineSchedule];
              newSchedule[index].instructorsIds = selected.map((s) => s.value);
              setOfflineSchedule(newSchedule);
            }}
            triggerSearchOnFocus
            onSearchChange={setInstructorSearch}
            onLoadMore={() => void fetchNextInstructors()}
            paginatedOptions={instructorOptions}
            hasMore={instructorsHasMore}
            isLoadingMore={instructorsFetchingNext}
            isSearchLoading={instructorsLoading}
            placeholder={t('selectInstructorsForSlot')}
            loadingIndicator={
              <p className="text-muted-foreground py-4 text-center text-sm">{t('loading')}</p>
            }
            emptyIndicator={
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                {t('noInstructorsFound')}
              </p>
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <span>{t('coInstructorsOptional')}</span>
          <MultipleSelector
            value={selectedCoInstructors}
            onChange={(selected) => {
              const newSchedule = [...offlineSchedule];
              newSchedule[index].coInstructorsIds = selected.map((s) => s.value);
              setOfflineSchedule(newSchedule);
            }}
            triggerSearchOnFocus
            onSearchChange={setCoInstructorSearch}
            onLoadMore={() => void fetchNextCoInstructors()}
            paginatedOptions={coInstructorOptions}
            hasMore={coInstructorsHasMore}
            isLoadingMore={coInstructorsFetchingNext}
            isSearchLoading={coInstructorsLoading}
            placeholder={t('selectCoInstructorsForSlot')}
            loadingIndicator={
              <p className="text-muted-foreground py-4 text-center text-sm">{t('loading')}</p>
            }
            emptyIndicator={
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                {t('noCoInstructorsFound')}
              </p>
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <span>{t('studentsOptional')}</span>
          {courseId ? (
            <>
              <MultipleSelector
                value={selectedStudents}
                onChange={(selected) => {
                  const newSchedule = [...offlineSchedule];
                  newSchedule[index].studentsIds = selected.map((s) => s.value);
                  setOfflineSchedule(newSchedule);
                }}
                triggerSearchOnFocus
                onSearchChange={setStudentSearch}
                onLoadMore={() => void fetchNextStudents()}
                paginatedOptions={studentOptions}
                hasMore={studentsHasMore}
                isLoadingMore={studentsFetchingNext}
                isSearchLoading={studentsLoading}
                placeholder={t('selectStudentsForSlot')}
                loadingIndicator={
                  <p className="text-muted-foreground py-4 text-center text-sm">{t('loading')}</p>
                }
                emptyIndicator={
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    {t('noStudentsFound')}
                  </p>
                }
              />
              <p className="text-muted-foreground text-xs">{t('assignStudentsHelp')}</p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              {t('saveCourseThenAssignStudents')}
            </p>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">{t('timeFormatHelp')}</p>
    </div>
  );
}
