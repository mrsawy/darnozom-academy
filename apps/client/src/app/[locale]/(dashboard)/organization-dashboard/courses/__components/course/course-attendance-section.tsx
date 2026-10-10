'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/atoms/button';
import { CreateCourseSchema } from '@/lib/schema/course.schema';
import { FieldErrors, PathValue, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Clock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { OfflineScheduleSlotCard } from './offline-schedule-slot';
import type { OfflineScheduleSlot } from './types';
import { Switch } from '@/components/atoms/switch';
import { Label } from '@/components/atoms/label';
import { CourseQrDialog } from './course-qr-dialog/course-qr-dialog';
import { CourseFormSection } from './course-form-section';

interface CourseAttendanceSectionProps {
  watch: UseFormWatch<CreateCourseSchema>;
  setValue: UseFormSetValue<CreateCourseSchema>;
  offlineSchedule: OfflineScheduleSlot[];
  setOfflineSchedule: Dispatch<SetStateAction<OfflineScheduleSlot[]>>;
  courseId?: string;
  errors: FieldErrors<CreateCourseSchema>;
  mode: 'create' | 'update';
}

const emptySlot = (): OfflineScheduleSlot => ({
  startTime: '',
  endTime: '',
  dayOfWeek: '',
  instructorsIds: [],
  coInstructorsIds: [],
  studentsIds: [],
});

export function CourseAttendanceSection({
  watch,
  setValue,
  offlineSchedule,
  setOfflineSchedule,
  courseId,
  errors,
  mode,
}: CourseAttendanceSectionProps) {
  const t = useTranslations('CourseForm');
  const requireAttendance = watch('attendanceSettings')?.requireAttendance ?? false;
  const offlineScheduleFieldErrors = errors.attendanceSettings?.offlineSchedule;

  return (
    <CourseFormSection
      title={t('attendanceSettings')}
      description={t('attendanceSettingsHelp')}
      icon={Clock}>
      <label className="bg-muted/20 hover:bg-muted/40 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors">
        <Label htmlFor="requireAttendance" className="text-sm font-medium">
          {t('requireAttendanceTracking')}
        </Label>
        <Switch
          id="requireAttendance"
          checked={requireAttendance}
          onCheckedChange={(checked) => {
            const currentAttendanceSettings = watch('attendanceSettings') ?? {};
            setValue('attendanceSettings', {
              ...currentAttendanceSettings,
              requireAttendance: checked,
            } as PathValue<CreateCourseSchema, 'attendanceSettings'>);
          }}
        />
      </label>

      {requireAttendance ? (
        <div className="bg-muted/20 space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t('offlineScheduleTimeSlots')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOfflineSchedule((prev) => [...prev, emptySlot()])}
              className="shrink-0 gap-1">
              <Plus className="h-4 w-4" />
              {t('addTimeSlot')}
            </Button>
          </div>

          <div className="space-y-4">
            {offlineSchedule.map((slot, index) => (
              <OfflineScheduleSlotCard
                key={index}
                slot={slot}
                index={index}
                scheduleLength={offlineSchedule.length}
                offlineSchedule={offlineSchedule}
                setOfflineSchedule={setOfflineSchedule}
                courseId={courseId}
                fieldErrors={offlineScheduleFieldErrors?.[index]}
              />
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'update' && courseId ? (
        <CourseQrDialog courseId={courseId} courseName={watch('name')} />
      ) : null}
    </CourseFormSection>
  );
}
