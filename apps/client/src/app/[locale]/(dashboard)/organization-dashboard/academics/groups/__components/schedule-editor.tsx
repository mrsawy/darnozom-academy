'use client';

import { useTranslations } from 'next-intl';
import type { ScheduleSlot } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function ScheduleEditor({
  value,
  onChange,
}: {
  value: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
}) {
  const t = useTranslations('Academics');
  const update = (index: number, patch: Partial<ScheduleSlot>) =>
    onChange(value.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  return (
    <div className="space-y-2">
      {value.map((slot, index) => (
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
            className="w-28"
            type="number"
            min={15}
            max={480}
            value={slot.durationMinutes}
            onChange={(e) => update(index, { durationMinutes: Number(e.target.value) })}
            aria-label={t('form.duration')}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(value.filter((_, i) => i !== index))}>
            {t('remove')}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...value, { dayOfWeek: 0, startTime: '17:00', durationMinutes: 60 }])
        }>
        {t('form.addSlot')}
      </Button>
    </div>
  );
}
