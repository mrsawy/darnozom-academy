import { DateTime } from 'luxon';
import { AvailabilitySlot, ScheduleSlot, TeacherFitReason } from '@darnozom/shared-types';
import { mergeIntervals, MINUTES_PER_DAY, parseHHmm, splitWeek } from './time';

type Interval = [number, number];

/**
 * UTC minutes-of-week (Sunday 00:00 UTC = 0) for a local weekly time, taken in the week that
 * starts at `referenceDate` so that each zone's DST offset for that week is used.
 */
export function toUtcMinuteOfWeek(dayOfWeek: number, minutesAfterMidnight: number, timezone: string, referenceDate: Date): number {
  const reference = DateTime.fromJSDate(referenceDate, { zone: timezone }).startOf('day');
  const targetWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const day = reference.plus({ days: (targetWeekday - reference.weekday + 7) % 7 });
  const local =
    minutesAfterMidnight >= MINUTES_PER_DAY
      ? day.plus({ days: 1 }).startOf('day')
      : day.set({ hour: Math.floor(minutesAfterMidnight / 60), minute: minutesAfterMidnight % 60 });
  const utc = local.toUTC();
  return (utc.weekday % 7) * MINUTES_PER_DAY + utc.hour * 60 + utc.minute;
}

function scheduleToUtc(schedule: ScheduleSlot[], timezone: string, referenceDate: Date): Interval[] {
  return schedule.flatMap((slot) => {
    const start = toUtcMinuteOfWeek(slot.dayOfWeek, parseHHmm(slot.startTime) ?? 0, timezone, referenceDate);
    return splitWeek(start, start + slot.durationMinutes);
  });
}

function availabilityToUtc(slots: AvailabilitySlot[], timezone: string, referenceDate: Date): Interval[] {
  const intervals = slots.flatMap((slot) => {
    const startLocal = parseHHmm(slot.startTime) ?? 0;
    const endLocal = parseHHmm(slot.endTime, true) ?? startLocal;
    const start = toUtcMinuteOfWeek(slot.dayOfWeek, startLocal, timezone, referenceDate);
    return splitWeek(start, start + (endLocal - startLocal));
  });
  return mergeIntervals(intervals);
}

export interface TeacherFitInput {
  isInstructor: boolean;
  groupSchedule: ScheduleSlot[];
  groupTimezone: string;
  referenceDate: Date;
  availability: { timezone: string; slots: AvailabilitySlot[] } | null;
  otherGroups: { _id: string; name: string; timezone: string; schedule: ScheduleSlot[] }[];
}

export interface TeacherFitResult {
  ok: boolean;
  reasons: TeacherFitReason[];
  conflictingGroups: { _id: string; name: string }[];
}

export function checkTeacherFit(input: TeacherFitInput): TeacherFitResult {
  const reasons: TeacherFitReason[] = [];
  if (!input.isInstructor) reasons.push(TeacherFitReason.NOT_INSTRUCTOR);

  const groupIntervals = scheduleToUtc(input.groupSchedule, input.groupTimezone, input.referenceDate);

  if (input.availability) {
    const available = availabilityToUtc(input.availability.slots, input.availability.timezone, input.referenceDate);
    const covered = groupIntervals.every(([start, end]) => available.some(([aStart, aEnd]) => aStart <= start && end <= aEnd));
    if (!covered) reasons.push(TeacherFitReason.OUTSIDE_AVAILABILITY);
  } else {
    reasons.push(TeacherFitReason.NO_AVAILABILITY);
  }

  const conflictingGroups = input.otherGroups
    .filter((other) => {
      const otherIntervals = scheduleToUtc(other.schedule, other.timezone, input.referenceDate);
      return groupIntervals.some(([start, end]) => otherIntervals.some(([oStart, oEnd]) => start < oEnd && oStart < end));
    })
    .map((other) => ({ _id: other._id, name: other.name }));
  if (conflictingGroups.length > 0) reasons.push(TeacherFitReason.CONFLICT);

  return { ok: reasons.length === 0, reasons, conflictingGroups };
}
