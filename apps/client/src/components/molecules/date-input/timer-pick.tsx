'use client';

import * as React from 'react';
import { Button } from '@/components/atoms/button';
import { Calendar } from '@/components/atoms/calendar';
import { Field, FieldGroup, FieldLabel } from '@/components/atoms/field';
import { Input } from '@/components/atoms/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { ar, enUS, he } from 'date-fns/locale';
import { format } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { arSA, he as heDayPicker } from 'react-day-picker/locale';
import { cn } from '@/lib/utils';

function toTimeString(d: Date): string {
  return format(d, 'HH:mm:ss');
}

function mergeDateAndTime(date: Date, timeStr: string): Date {
  const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
  const out = new Date(date);
  out.setHours(h, m, s, 0);
  return out;
}

export interface DatePickerTimeProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  dateLabel?: string | null;
  timeLabel?: string | null;
  id?: string;
  /** When set, the date trigger button shows error state (border, aria-invalid). */
  error?: { message?: string } | null;
}

export function DatePickerTime({
  value,
  onChange,
  dateLabel = 'Date',
  timeLabel = 'Time',
  id = 'date-picker-optional',
  error,
}: DatePickerTimeProps) {
  const t = useTranslations('Calendar');
  const locale = useLocale();
  const isRtl = locale?.startsWith('ar') || locale?.startsWith('he');
  const dateFnsLocale = isRtl ? (locale?.startsWith('he') ? he : ar) : enUS;
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  const [internalDate, setInternalDate] = React.useState<Date | undefined>();
  const displayDate = isControlled ? value : internalDate;

  const defaultTime = '10:30:00';
  const [internalTime, setInternalTime] = React.useState(defaultTime);
  const displayTime = displayDate ? toTimeString(displayDate) : internalTime;

  const handleDateSelect = React.useCallback(
    (selected: Date | undefined) => {
      if (isControlled && onChange) {
        if (selected) {
          const merged = mergeDateAndTime(selected, displayTime);
          onChange(merged);
        } else {
          onChange();
        }
      } else {
        setInternalDate(selected);
        if (selected) {
          const merged = mergeDateAndTime(selected, displayTime);
          onChange?.(merged);
        } else {
          onChange?.();
        }
      }
      setOpen(false);
    },
    [isControlled, onChange, displayTime]
  );

  const handleTimeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      if (next === '') return;
      if (isControlled && value && onChange) {
        const merged = mergeDateAndTime(value, next);
        onChange(merged);
      } else {
        setInternalTime(next);
        if (displayDate) {
          const merged = mergeDateAndTime(displayDate, next);
          onChange?.(merged);
        }
      }
    },
    [isControlled, value, displayDate, onChange]
  );

  return (
    <FieldGroup className="mx-auto max-w-xs flex-row">
      <Field>
        <FieldLabel htmlFor={id}>{dateLabel}</FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id={id}
              className={cn(
                'w-32 justify-between font-normal',
                error && 'border-destructive data-invalid:ring-destructive/20'
              )}
              data-invalid={error ? true : undefined}>
              {displayDate
                ? format(displayDate, 'PPP', { locale: dateFnsLocale })
                : t('selectDate')}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="start"
            dir={isRtl ? 'rtl' : 'ltr'}>
            <Calendar
              mode="single"
              selected={displayDate}
              captionLayout="dropdown"
              defaultMonth={displayDate}
              onSelect={handleDateSelect}
              dir={isRtl ? 'rtl' : 'ltr'}
              locale={isRtl ? (locale?.startsWith('ar') ? arSA : heDayPicker) : undefined}
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field className="w-32">
        <FieldLabel htmlFor={`${id}-time`}>{timeLabel}</FieldLabel>
        <Input
          type="time"
          id={`${id}-time`}
          step="1"
          value={displayTime}
          onChange={handleTimeChange}
          className="bg-background h-10 appearance-none shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </Field>
    </FieldGroup>
  );
}
