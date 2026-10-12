'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import type { GroupFormValues } from '@/lib/types/academics/academics';
import { ScheduleEditor } from './schedule-editor';

interface GroupFormProps {
  initial: GroupFormValues;
  submitLabel: string;
  pending: boolean;
  /** Running groups: schedule, time zone and number of sessions cannot change. */
  lockSchedule?: boolean;
  onSubmit: (values: GroupFormValues) => void;
}

export function GroupForm({
  initial,
  submitLabel,
  pending,
  lockSchedule = false,
  onSubmit,
}: GroupFormProps) {
  const t = useTranslations('Academics');
  const [values, setValues] = useState<GroupFormValues>(initial);
  const set = <K extends keyof GroupFormValues>(key: K, value: GroupFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...values,
          name: values.name.trim(),
          meetingLink: values.meetingLink?.trim() || null,
          whatsappGroupLink: values.whatsappGroupLink?.trim() || null,
        });
      }}>
      <div className="space-y-1">
        <Label htmlFor="group-name">{t('name')}</Label>
        <Input
          id="group-name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-timezone">{t('form.timezone')}</Label>
        <Input
          id="group-timezone"
          value={values.timezone}
          onChange={(e) => set('timezone', e.target.value)}
          disabled={lockSchedule}
          required
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>{t('form.schedule')}</Label>
        <fieldset disabled={lockSchedule}>
          <ScheduleEditor
            value={values.schedule}
            onChange={(schedule) => set('schedule', schedule)}
          />
        </fieldset>
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-min">{t('form.minStudents')}</Label>
        <Input
          id="group-min"
          type="number"
          min={1}
          value={values.minStudents}
          onChange={(e) => set('minStudents', Number(e.target.value))}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-max">{t('form.maxStudents')}</Label>
        <Input
          id="group-max"
          type="number"
          min={1}
          value={values.maxStudents}
          onChange={(e) => set('maxStudents', Number(e.target.value))}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-total">{t('form.totalSessions')}</Label>
        <Input
          id="group-total"
          type="number"
          min={1}
          max={500}
          value={values.totalSessions}
          onChange={(e) => set('totalSessions', Number(e.target.value))}
          disabled={lockSchedule}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-meeting">{t('form.meetingLink')}</Label>
        <Input
          id="group-meeting"
          type="url"
          value={values.meetingLink ?? ''}
          onChange={(e) => set('meetingLink', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-whatsapp">{t('form.whatsappGroupLink')}</Label>
        <Input
          id="group-whatsapp"
          type="url"
          value={values.whatsappGroupLink ?? ''}
          onChange={(e) => set('whatsappGroupLink', e.target.value)}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending || values.schedule.length === 0}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
