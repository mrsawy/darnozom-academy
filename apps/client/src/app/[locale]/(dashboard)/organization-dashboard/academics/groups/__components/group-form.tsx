'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { MeetingProvider } from '@darnozom/shared-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import type { GroupFormValues } from '@/lib/types/academics/academics';
import { ScheduleEditor } from './schedule-editor';

interface GroupFormProps {
  initial: GroupFormValues;
  submitLabel: string;
  pending: boolean;
  /** Running groups: the number of sessions and the start date cannot change; the weekly schedule still can. */
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
      className="mx-auto w-full max-w-3xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...values,
          name: values.name.trim(),
          // An in-platform (Agora) room has no link.
          meetingLink: values.meetingProvider === MeetingProvider.AGORA ? null : values.meetingLink?.trim() || null,
          whatsappGroupLink: values.whatsappGroupLink?.trim() || null,
        });
      }}>
      <Card>
        <CardHeader>
          <CardTitle>{t('form.sectionBasics')}</CardTitle>
          <CardDescription>{t('form.sectionBasicsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="group-name">{t('name')}</Label>
            <Input id="group-name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('form.sectionSchedule')}</CardTitle>
          <CardDescription>
            {t('form.sectionScheduleHint')}
            {values.schedule.length > 0 ? ` · ${t('form.slotsSummary', { count: values.schedule.length })}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lockSchedule ? (
            <p className="bg-muted/50 text-muted-foreground mb-3 rounded-md border px-3 py-2 text-xs">
              {t('form.runningScheduleHint')}
            </p>
          ) : null}
          <ScheduleEditor value={values.schedule} onChange={(schedule) => set('schedule', schedule)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('form.sectionSessions')}</CardTitle>
          <CardDescription>{t('form.sectionSessionsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-start">{t('form.startDate')}</Label>
            <Input
              id="group-start"
              type="date"
              value={values.startDate ?? ''}
              onChange={(e) => set('startDate', e.target.value || null)}
              disabled={lockSchedule}
              required
            />
            <p className="text-muted-foreground text-xs">{t('form.startDateHint')}</p>
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label htmlFor="group-estimated-end">{t('form.estimatedEndDate')}</Label>
            <Input
              id="group-estimated-end"
              type="date"
              value={values.estimatedEndDate ?? ''}
              onChange={(e) => set('estimatedEndDate', e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('form.sectionMeeting')}</CardTitle>
          <CardDescription>{t('form.sectionMeetingHint')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="group-provider">{t('form.meetingProvider')}</Label>
            <Select
              value={values.meetingProvider}
              onValueChange={(value) => set('meetingProvider', value as MeetingProvider)}>
              <SelectTrigger id="group-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MeetingProvider.EXTERNAL_URL}>{t('form.providerExternal')}</SelectItem>
                <SelectItem value={MeetingProvider.AGORA}>{t('form.providerAgora')}</SelectItem>
              </SelectContent>
            </Select>
            {values.meetingProvider === MeetingProvider.AGORA ? (
              <p className="text-muted-foreground text-xs">{t('form.providerAgoraHint')}</p>
            ) : null}
          </div>
          {values.meetingProvider === MeetingProvider.AGORA ? null : (
            <div className="space-y-1.5">
              <Label htmlFor="group-meeting">{t('form.meetingLink')}</Label>
              <Input
                id="group-meeting"
                type="url"
                dir="ltr"
                value={values.meetingLink ?? ''}
                onChange={(e) => set('meetingLink', e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="group-whatsapp">{t('form.whatsappGroupLink')}</Label>
            <Input
              id="group-whatsapp"
              type="url"
              dir="ltr"
              value={values.whatsappGroupLink ?? ''}
              onChange={(e) => set('whatsappGroupLink', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending || values.schedule.length === 0}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
