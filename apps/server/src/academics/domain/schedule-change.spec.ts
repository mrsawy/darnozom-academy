import { isScheduleChange } from './schedule-change';

const slot = (dayOfWeek: number, startTime = '10:00', durationMinutes = 60) => ({ dayOfWeek, startTime, durationMinutes });

describe('isScheduleChange', () => {
  const current = { schedule: [slot(1), slot(3)], timezone: 'UTC' };
  it('is false when nothing is sent or the same values are re-sent (in any order)', () => {
    expect(isScheduleChange(current, {})).toBe(false);
    expect(isScheduleChange(current, { schedule: [slot(3), slot(1)], timezone: 'UTC' })).toBe(false);
  });
  it('is true for a different timezone, slot, duration or slot count', () => {
    expect(isScheduleChange(current, { timezone: 'Asia/Riyadh' })).toBe(true);
    expect(isScheduleChange(current, { schedule: [slot(1), slot(4)] })).toBe(true);
    expect(isScheduleChange(current, { schedule: [slot(1), slot(3, '10:00', 90)] })).toBe(true);
    expect(isScheduleChange(current, { schedule: [slot(1)] })).toBe(true);
  });
});
