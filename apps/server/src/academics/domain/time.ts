import { AvailabilitySlot, ScheduleSlot } from '@darnozom/shared-types';

export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes after midnight for "HH:mm"; "24:00" (= 1440) only when allowEndOfDay. Null when invalid. */
export function parseHHmm(value: string, allowEndOfDay = false): number | null {
  if (allowEndOfDay && value === '24:00') return MINUTES_PER_DAY;
  const match = HH_MM.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const isDay = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;

/** Normalises [start, end) onto the week; an interval passing Saturday 24:00 is split in two. */
export function splitWeek(start: number, end: number): [number, number][] {
  const s = ((start % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
  const e = s + (end - start);
  if (e <= MINUTES_PER_WEEK) return [[s, e]];
  return [
    [s, MINUTES_PER_WEEK],
    [0, e - MINUTES_PER_WEEK],
  ];
}

const byStart = (intervals: [number, number][]) => {
  const copy = [...intervals];

  copy.sort((a, b) => a[0] - b[0]);
  return copy;
};

export function hasOverlap(intervals: [number, number][]): boolean {
  let maxEnd = -1;
  for (const [start, end] of byStart(intervals)) {
    if (start < maxEnd) return true;
    maxEnd = Math.max(maxEnd, end);
  }
  return false;
}

export function mergeIntervals(intervals: [number, number][]): [number, number][] {
  const merged: [number, number][] = [];
  for (const [start, end] of byStart(intervals)) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function isValidSchedule(slots: ScheduleSlot[]): boolean {
  if (!Array.isArray(slots) || slots.length === 0) return false;
  const intervals: [number, number][] = [];
  for (const slot of slots) {
    const start = parseHHmm(slot.startTime);
    const duration = slot.durationMinutes;
    if (!isDay(slot.dayOfWeek) || start === null || !Number.isInteger(duration) || duration < 15 || duration > 480) return false;
    const begin = slot.dayOfWeek * MINUTES_PER_DAY + start;
    intervals.push(...splitWeek(begin, begin + duration));
  }
  return !hasOverlap(intervals);
}

export function isValidAvailability(slots: AvailabilitySlot[]): boolean {
  if (!Array.isArray(slots)) return false;
  const intervals: [number, number][] = [];
  for (const slot of slots) {
    const start = parseHHmm(slot.startTime);
    const end = parseHHmm(slot.endTime, true);
    if (!isDay(slot.dayOfWeek) || start === null || end === null || end <= start) return false;
    const dayStart = slot.dayOfWeek * MINUTES_PER_DAY;
    intervals.push([dayStart + start, dayStart + end]);
  }
  return !hasOverlap(intervals);
}
