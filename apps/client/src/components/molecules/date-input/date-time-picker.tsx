'use client';

import * as React from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { CalendarIcon } from '@radix-ui/react-icons';
import { ar, enUS as enUSDateFns, he as heDateFns } from 'date-fns/locale';
import { format } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';
import { Calendar } from '@/components/atoms/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/atoms/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { ScrollArea, ScrollBar } from '@/components/atoms/scroll-area';
import { toast } from 'sonner';

const dateFnsLocales: Record<string, typeof ar> = {
  ar,
  he: heDateFns,
  en: enUSDateFns,
};

/** Align with `Calendar`: support ar, he, en variants from next-intl. */
function getDisplayLocale(locale: string): 'ar' | 'he' | 'en' {
  if (locale?.startsWith('ar')) return 'ar';
  if (locale?.startsWith('he')) return 'he';
  return 'en';
}

function useDateFnsLocale() {
  const locale = useLocale();
  const display = getDisplayLocale(locale);
  return dateFnsLocales[display] ?? enUSDateFns;
}

const AMPM_CYCLE = ['AM', 'PM'] as const;

export interface DateTimePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  id?: string;
  dateLabel?: string | null;
  timeLabel?: string | null;
  /** When set, the trigger button shows error state. */
  error?: { message?: string } | null;
}

export function DateTimePicker({
  value,
  onChange,
  id = 'date-time-picker',
  dateLabel,
  timeLabel,
  error,
}: DateTimePickerProps) {
  const t = useTranslations('DateTimePicker');
  const dateFnsLocale = useDateFnsLocale();
  const displayValue = value ?? undefined;

  const handleDateSelect = React.useCallback(
    (date: Date | undefined) => {
      if (!date) {
        onChange?.();
        return;
      }
      const current = displayValue ?? new Date();
      const merged = new Date(date);
      merged.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), 0);
      onChange?.(merged);
    },
    [displayValue, onChange]
  );

  const handleTimeChange = React.useCallback(
    (type: 'hour' | 'minute' | 'ampm', val: string) => {
      const currentDate = displayValue ?? new Date();
      const newDate = new Date(currentDate);

      switch (type) {
        case 'hour': {
          const hour12 = Number.parseInt(val, 10);
          const isPm = newDate.getHours() >= 12;
          newDate.setHours(isPm ? (hour12 === 12 ? 12 : hour12 + 12) : hour12 === 12 ? 0 : hour12);
          break;
        }
        case 'minute': {
          newDate.setMinutes(Number.parseInt(val, 10));
          break;
        }
        case 'ampm': {
          const hours = newDate.getHours();
          if (val === 'AM' && hours >= 12) {
            newDate.setHours(hours - 12);
          } else if (val === 'PM' && hours < 12) {
            newDate.setHours(hours + 12);
          }
          break;
        }
        default: {
          break;
        }
      }
      onChange?.(newDate);
    },
    [displayValue, onChange]
  );

  const label =
    (dateLabel ?? timeLabel) ? [dateLabel, timeLabel].filter(Boolean).join(' / ') : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label ? <span className="text-sm font-medium">{label}</span> : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-full justify-start pl-3 text-left font-normal',
              !displayValue && 'text-muted-foreground',
              error && 'border-destructive data-invalid:ring-destructive/20'
            )}
            data-invalid={error ? true : undefined}>
            {displayValue ? (
              format(displayValue, 'Pp', { locale: dateFnsLocale })
            ) : (
              <span>{t('placeholder')}</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={displayValue}
              onSelect={handleDateSelect}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <div className="flex flex-col divide-y sm:h-[300px] sm:flex-row sm:divide-x sm:divide-y-0">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .toReversed()
                    .map((hour) => (
                      <Button
                        key={hour}
                        size="icon"
                        variant={
                          displayValue && displayValue.getHours() % 12 === hour % 12
                            ? 'default'
                            : 'ghost'
                        }
                        className="aspect-square shrink-0 sm:w-full"
                        onClick={() => handleTimeChange('hour', hour.toString())}>
                        {hour}
                      </Button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {Array.from({ length: 59 }, (_, i) => i * 1).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={
                        displayValue && displayValue.getMinutes() === minute ? 'default' : 'ghost'
                      }
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange('minute', minute.toString())}>
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea>
                <div className="flex p-2 sm:flex-col">
                  {AMPM_CYCLE.map((ampm) => (
                    <Button
                      key={ampm}
                      size="icon"
                      variant={
                        displayValue &&
                        ((ampm === 'AM' && displayValue.getHours() < 12) ||
                          (ampm === 'PM' && displayValue.getHours() >= 12))
                          ? 'default'
                          : 'ghost'
                      }
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange('ampm', ampm)}>
                      {t(ampm === 'AM' ? 'am' : 'pm')}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error?.message ? <p className="text-destructive text-sm">{error.message}</p> : null}
    </div>
  );
}

interface DateTimePickerFormValues {
  time: Date;
}

export function DateTimePickerForm() {
  const t = useTranslations('DateTimePicker');
  const dateFnsLocale = useDateFnsLocale();

  const formSchema = React.useMemo(
    () =>
      yup.object({
        time: yup.date().required(t('validation.required')),
      }),
    [t]
  );

  const form = useForm<DateTimePickerFormValues>({
    resolver: yupResolver(formSchema),
  });

  function onSubmit(data: DateTimePickerFormValues) {
    const datetime = format(data.time, 'PPPPpppp', { locale: dateFnsLocale });
    toast.success(t('toast.success', { datetime }));
  }

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      form.setValue('time', date);
    }
  }

  function handleTimeChange(type: 'hour' | 'minute' | 'ampm', value: string) {
    const currentDate = form.getValues('time') || new Date();
    const newDate = new Date(currentDate);

    switch (type) {
      case 'hour': {
        const hour = Number.parseInt(value, 10);
        newDate.setHours(newDate.getHours() >= 12 ? hour + 12 : hour);
        break;
      }
      case 'minute': {
        newDate.setMinutes(Number.parseInt(value, 10));
        break;
      }
      case 'ampm': {
        const hours = newDate.getHours();
        if (value === 'AM' && hours >= 12) {
          newDate.setHours(hours - 12);
        } else if (value === 'PM' && hours < 12) {
          newDate.setHours(hours + 12);
        }
        break;
      }
      default: {
        break;
      }
    }

    form.setValue('time', newDate);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-5">
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('form.label')}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}>
                      {field.value ? (
                        format(field.value, 'Pp', { locale: dateFnsLocale })
                      ) : (
                        <span>{t('placeholder')}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="sm:flex">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={handleDateSelect}
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                    />
                    <div className="flex flex-col divide-y sm:h-[300px] sm:flex-row sm:divide-x sm:divide-y-0">
                      <ScrollArea className="w-64 sm:w-auto">
                        <div className="flex p-2 sm:flex-col">
                          {Array.from({ length: 12 }, (_, i) => i + 1)
                            .toReversed()
                            .map((hour) => (
                              <Button
                                key={hour}
                                size="icon"
                                variant={
                                  field.value && field.value.getHours() % 12 === hour % 12
                                    ? 'default'
                                    : 'ghost'
                                }
                                className="aspect-square shrink-0 sm:w-full"
                                onClick={() => handleTimeChange('hour', hour.toString())}>
                                {hour}
                              </Button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="sm:hidden" />
                      </ScrollArea>
                      <ScrollArea className="w-64 sm:w-auto">
                        <div className="flex p-2 sm:flex-col">
                          {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                            <Button
                              key={minute}
                              size="icon"
                              variant={
                                field.value && field.value.getMinutes() === minute
                                  ? 'default'
                                  : 'ghost'
                              }
                              className="aspect-square shrink-0 sm:w-full"
                              onClick={() => handleTimeChange('minute', minute.toString())}>
                              {minute.toString().padStart(2, '0')}
                            </Button>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="sm:hidden" />
                      </ScrollArea>
                      <ScrollArea className="">
                        <div className="flex p-2 sm:flex-col">
                          {AMPM_CYCLE.map((ampm) => (
                            <Button
                              key={ampm}
                              size="icon"
                              variant={
                                field.value &&
                                ((ampm === 'AM' && field.value.getHours() < 12) ||
                                  (ampm === 'PM' && field.value.getHours() >= 12))
                                  ? 'default'
                                  : 'ghost'
                              }
                              className="aspect-square shrink-0 sm:w-full"
                              onClick={() => handleTimeChange('ampm', ampm)}>
                              {t(ampm === 'AM' ? 'am' : 'pm')}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>{t('form.description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{t('form.submit')}</Button>
      </form>
    </Form>
  );
}
