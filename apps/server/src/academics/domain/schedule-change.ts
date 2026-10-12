import { ScheduleSlot } from '@darnozom/shared-types';

const keyOf = (slots: ScheduleSlot[]) => {
  const keys = slots.map((slot) => `${slot.dayOfWeek}|${slot.startTime}|${slot.durationMinutes}`);
  keys.sort();
  return keys.join(',');
};

/** True only when the posted schedule/timezone differs from the stored one (forms re-post unchanged values). */
export function isScheduleChange(current: { schedule: ScheduleSlot[]; timezone: string }, next: { schedule?: ScheduleSlot[]; timezone?: string }): boolean {
  if (next.timezone !== undefined && next.timezone !== current.timezone) return true;
  return next.schedule !== undefined && keyOf(next.schedule) !== keyOf(current.schedule);
}
