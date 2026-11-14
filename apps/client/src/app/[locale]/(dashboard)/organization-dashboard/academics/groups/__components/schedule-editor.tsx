'use client';

import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ScheduleSlot } from '@darnozom/shared-types';
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
import { cn } from '@/lib/utils';

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const DURATION_PRESETS = [30, 45, 60, 90, 120];
const NEW_SLOT: ScheduleSlot = { dayOfWeek: 0, startTime: '17:00', durationMinutes: 60 };

/** "17:00" + 60 -> "18:00" (wraps past midnight). */
function endTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '--:--';
  const total = (h * 60 + m + durationMinutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

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
    <div className="space-y-3">
      {value.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm">
          <CalendarClock className="size-5 shrink-0" aria-hidden />
          {t('form.noSlots')}
        </div>
      ) : null}

      {value.map((slot, index) => (
        <div key={index} className="bg-muted/30 space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-semibold">
                {index + 1}
              </span>
              <span className="text-sm font-medium">{t('form.slotLabel', { n: index + 1 })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="bg-background text-muted-foreground rounded-md border px-2 py-1 text-xs tabular-nums"
                dir="ltr">
                {slot.startTime} → {endTime(slot.startTime, slot.durationMinutes)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive size-8"
                aria-label={t('form.removeSlot')}
                onClick={() => onChange(value.filter((_, i) => i !== index))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">{t('form.day')}</Label>
              <Select
                value={String(slot.dayOfWeek)}
                onValueChange={(day) => update(index, { dayOfWeek: Number(day) })}>
                <SelectTrigger className="w-full" aria-label={t('form.day')}>
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
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">{t('form.startTime')}</Label>
              <Input
                type="time"
                value={slot.startTime}
                onChange={(e) => update(index, { startTime: e.target.value })}
                aria-label={t('form.startTime')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">{t('form.duration')}</Label>
              <Input
                type="number"
                min={15}
                max={480}
                step={5}
                value={slot.durationMinutes}
                onChange={(e) => update(index, { durationMinutes: Number(e.target.value) })}
                aria-label={t('form.duration')}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => update(index, { durationMinutes: minutes })}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs tabular-nums transition-colors',
                  slot.durationMinutes === minutes
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                )}>
                {minutes} {t('form.minutesShort')}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed sm:w-auto"
        onClick={() => {
          const last = value[value.length - 1];
          onChange([
            ...value,
            last ? { ...last, dayOfWeek: (last.dayOfWeek + 1) % 7 } : NEW_SLOT,
          ]);
        }}>
        <Plus className="size-4" />
        {t('form.addSlot')}
      </Button>
    </div>
  );
}
