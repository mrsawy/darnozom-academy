'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { TimeSlot } from '@/lib/types/course/course.interface';
import { useTranslations } from 'next-intl';

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedDate: Date | null;
  value: string;
  onChange: (slotId: string) => void;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function SlotPicker({ slots, selectedDate, value, onChange }: SlotPickerProps) {
  const t = useTranslations('AttendanceMark');

  const dayLabel = selectedDate ? WEEKDAY_NAMES[selectedDate.getDay()] : null;
  const matchingSlots = dayLabel ? slots.filter((s) => s.dayOfWeek === dayLabel) : slots;

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{t('selectSlot')}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('selectSlotPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {matchingSlots.length === 0 && (
            <SelectItem value="__none" disabled>
              {t('noSlotsForDate')}
            </SelectItem>
          )}
          {matchingSlots.map((slot) => (
            <SelectItem
              key={slot._id ?? `${slot.dayOfWeek}-${slot.startTime}`}
              value={slot._id ?? ''}
              disabled={!slot._id || (slot.studentsIds ?? []).length === 0}>
              {slot.startTime} – {slot.endTime}
              {(slot.studentsIds ?? []).length === 0 ? ` (${t('noRoster')})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
