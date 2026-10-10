'use client';

import * as React from 'react';
import { type DateRange } from 'react-day-picker';
import { useLocale } from 'next-intl';
import { arSA, he } from 'react-day-picker/locale';

import { Calendar } from '@/components/atoms/calendar';

interface Calendar05Props {
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
}

export default function Calendar05({ dateRange, onDateRangeChange }: Calendar05Props) {
  const locale = useLocale();
  const isRtl = locale?.startsWith('ar') || locale?.startsWith('he');
  const dayPickerLocale = isRtl ? (locale?.startsWith('ar') ? arSA : he) : undefined;
  const [internalDateRange, setInternalDateRange] = React.useState<DateRange | undefined>(
    dateRange ?? {
      from: new Date(),
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    }
  );

  const currentDateRange = dateRange ?? internalDateRange;

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    } else {
      setInternalDateRange(newDateRange);
    }
  };

  return (
    <Calendar
      mode="range"
      defaultMonth={currentDateRange?.from}
      selected={currentDateRange}
      onSelect={handleDateRangeChange}
      numberOfMonths={2}
      className="rounded-lg border shadow-sm"
      disabled={(date) => date < new Date()}
      dir={isRtl ? 'rtl' : 'ltr'}
      locale={dayPickerLocale}
    />
  );
}
