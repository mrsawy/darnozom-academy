import { DateTime } from 'luxon';
import { ScheduleSlot } from '@darnozom/shared-types';

export interface GeneratedSession {
  sequence: number;
  startsAt: Date;
  endsAt: Date;
}

/**
 * Walks forward from startDate (its UTC calendar date, read as a local date in `timezone`),
 * emitting each weekday's slots in start-time order until totalSessions exist.
 * Each local time is converted with its own date's UTC offset, so daylight saving is respected.
 */
export function generateSessions(schedule: ScheduleSlot[], timezone: string, startDate: Date, totalSessions: number): GeneratedSession[] {
  if (schedule.length === 0 || totalSessions < 1) return [];

  const slotsByDay = new Map<number, ScheduleSlot[]>();
  for (const slot of schedule) {
    const list = slotsByDay.get(slot.dayOfWeek) ?? [];
    list.push(slot);
    slotsByDay.set(slot.dayOfWeek, list);
  }
  for (const list of slotsByDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const first = DateTime.fromObject(
    { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() },
    { zone: timezone }
  );
  const result: GeneratedSession[] = [];
  // Every week has at least one slot, so totalSessions weeks always suffice.
  const maxDays = totalSessions * 7 + 7;
  for (let offset = 0; offset < maxDays && result.length < totalSessions; offset++) {
    const day = first.plus({ days: offset });
    for (const slot of slotsByDay.get(day.weekday % 7) ?? []) {
      if (result.length >= totalSessions) break;
      const [hour, minute] = slot.startTime.split(':').map(Number);
      const startsAt = day.set({ hour, minute, second: 0, millisecond: 0 }).toUTC();
      result.push({
        sequence: result.length + 1,
        startsAt: startsAt.toJSDate(),
        endsAt: startsAt.plus({ minutes: slot.durationMinutes }).toJSDate(),
      });
    }
  }
  return result;
}
