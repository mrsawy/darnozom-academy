'use client';

import { Button } from '@/components/atoms/button';
import { AttendanceStatus } from '@/lib/types/attendance/attendance.types';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface MarkStatusButtonsProps {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus | null) => void;
  disabled?: boolean;
}

export function MarkStatusButtons({ value, onChange, disabled }: MarkStatusButtonsProps) {
  const t = useTranslations('AttendanceMark');

  const options: { status: AttendanceStatus; label: string; activeClass: string }[] = [
    {
      status: AttendanceStatus.PRESENT,
      label: t('present'),
      activeClass: 'bg-green-600 text-white hover:bg-green-700 border-green-600',
    },
    {
      status: AttendanceStatus.LATE,
      label: t('late'),
      activeClass: 'bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500',
    },
    {
      status: AttendanceStatus.EXCUSED,
      label: t('excused'),
      activeClass: 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500',
    },
    {
      status: AttendanceStatus.ABSENT,
      label: t('absent'),
      activeClass: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
    },
  ];

  return (
    <div className="flex gap-1">
      {options.map(({ status, label, activeClass }) => (
        <Button
          key={status}
          size="sm"
          variant="outline"
          disabled={disabled}
          className={cn('h-7 px-2 text-xs', value === status && activeClass)}
          onClick={() => onChange(value === status ? null : status)}>
          {label}
        </Button>
      ))}
    </div>
  );
}
