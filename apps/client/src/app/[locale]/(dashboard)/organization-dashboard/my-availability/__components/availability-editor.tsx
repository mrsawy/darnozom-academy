'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AvailabilitySlot } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { useMyAvailability, useSaveMyAvailability } from '@/lib/hooks/academics/use-academics.hook';

const DAYS = [0, 1, 2, 3, 4, 5, 6];
/** "HH:mm" or "24:00" (end of day). */
const END_TIME_PATTERN = String.raw`^(([01]\d|2[0-3]):[0-5]\d|24:00)$`;

export function AvailabilityEditor() {
  const t = useTranslations('Academics');
  const { data } = useMyAvailability();
  const save = useSaveMyAvailability();
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
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('availability.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="availability-timezone">{t('form.timezone')}</Label>
            <Input
              id="availability-timezone"
              className="w-72"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
          {slots.map((slot, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Select
                value={String(slot.dayOfWeek)}
                onValueChange={(day) => update(index, { dayOfWeek: Number(day) })}>
                <SelectTrigger className="w-36" aria-label={t('form.day')}>
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
              <Input
                className="w-32"
                type="time"
                value={slot.startTime}
                onChange={(e) => update(index, { startTime: e.target.value })}
                aria-label={t('form.startTime')}
              />
              <Input
                className="w-32"
                value={slot.endTime}
                pattern={END_TIME_PATTERN}
                onChange={(e) => update(index, { endTime: e.target.value })}
                aria-label={t('availability.endTime')}
                title={t('availability.endTime')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}>
                {t('remove')}
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setSlots((prev) => [
                  ...prev,
                  { dayOfWeek: 0, startTime: '09:00', endTime: '12:00' },
                ])
              }>
              {t('availability.addSlot')}
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate({ timezone, slots })}>
              {t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
