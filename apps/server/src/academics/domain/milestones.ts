import { DateTime } from 'luxon';
import { TASK_MILESTONE_DAYS, TaskMilestoneDay } from '@darnozom/shared-types';

/**
 * Local midnight `days` before `startDate`, returned as a UTC instant.
 *
 * `startDate` is stored as a UTC midnight standing for a calendar date, so its UTC fields are read
 * as a local date in `timezone` — the same reading `generateSessions` uses. Subtracting the days
 * first and taking the start of that day afterwards lets luxon resolve a local midnight that a
 * daylight-saving shift moved or skipped. Null means the timezone is not one luxon knows.
 */
export function milestoneInstant(startDate: Date, days: number, timezone: string): Date | null {
  const localStart = DateTime.fromObject(
    { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() },
    { zone: timezone }
  );
  if (!localStart.isValid) return null;
  const milestone = localStart.minus({ days }).startOf('day');
  if (!milestone.isValid) return null;
  return milestone.toUTC().toJSDate();
}

/** The milestones whose instant has arrived, earliest first. An unreadable timezone yields none. */
export function reachedMilestones(startDate: Date, timezone: string, now: Date): TaskMilestoneDay[] {
  return TASK_MILESTONE_DAYS.filter((days) => {
    const at = milestoneInstant(startDate, days, timezone);
    return at !== null && at.getTime() <= now.getTime();
  });
}
