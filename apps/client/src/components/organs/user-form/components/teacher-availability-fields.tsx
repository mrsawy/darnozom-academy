'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, isValid, parse, setHours, setMilliseconds, setMinutes } from 'date-fns';
import { X } from 'lucide-react';
import type { AvailabilitySlot } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { SimpleTimePicker } from '@/components/molecules/date-input/simple-time-picker';
import {
  useSaveTeacherAvailability,
  useTeacherAvailability,
} from '@/lib/hooks/academics/use-academics.hook';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Stable calendar date for parsing slot times (time-of-day only). */
const SLOT_TIME_REFERENCE = new Date(2000, 0, 1);

function normalizeSlotTimeDate(date: Date): Date {
  return setMilliseconds(date, 0);
}

/** "HH:mm" or "24:00" (end of day) → Date on the reference day; "24:00" maps to 23:59 for the picker. */
function parseSlotTimeString(time: string): Date {
  if (time.trim() === '24:00') {
    return normalizeSlotTimeDate(setMinutes(setHours(SLOT_TIME_REFERENCE, 23), 59));
  }
  const parsed = parse(time.trim(), 'HH:mm', SLOT_TIME_REFERENCE);
  if (!isValid(parsed)) return normalizeSlotTimeDate(setHours(SLOT_TIME_REFERENCE, 9));
  return normalizeSlotTimeDate(parsed);
}

function formatSlotTimeString(date: Date): string {
  return format(date, 'HH:mm');
}

interface TeacherAvailabilityFieldsProps {
  teacherId: string;
}

export function TeacherAvailabilityFields({ teacherId }: TeacherAvailabilityFieldsProps) {
  const t = useTranslations('Academics');
  const { data } = useTeacherAvailability(teacherId);
  const save = useSaveTeacherAvailability();
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    if (!data) return;
    if (data.timezone) setTimezone(data.timezone);
    setSlots(data.slots);
  }, [data]);

  const update = (index: number, patch: Partial<AvailabilitySlot>) =>
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="teacher-availability-timezone">{t('form.timezone')}</Label>
        <Input
          id="teacher-availability-timezone"
          className="w-72"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div key={index} className="bg-background space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('availability.title')}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <span className="text-sm">{t('form.day')}</span>
                <Select
                  value={String(slot.dayOfWeek)}
                  onValueChange={(day) => update(index, { dayOfWeek: Number(day) })}>
                  <SelectTrigger className="border-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {t(`days.${day}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm">{t('form.startTime')}</span>
                <SimpleTimePicker
                  key={`start-${index}-${slot.startTime}`}
                  use12HourFormat
                  value={parseSlotTimeString(slot.startTime)}
                  onChange={(date) => update(index, { startTime: formatSlotTimeString(date) })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm">{t('availability.endTime')}</span>
                <SimpleTimePicker
                  key={`end-${index}-${slot.endTime}`}
                  use12HourFormat
                  value={parseSlotTimeString(slot.endTime)}
                  onChange={(date) => update(index, { endTime: formatSlotTimeString(date) })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setSlots((prev) => [...prev, { dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }])
          }>
          {t('availability.addSlot')}
        </Button>
        <Button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate({ teacherId, timezone, slots })}>
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
