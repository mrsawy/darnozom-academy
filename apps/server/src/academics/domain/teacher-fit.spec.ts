import { TeacherFitReason } from '@darnozom/shared-types';
import { checkTeacherFit, TeacherFitInput, toUtcMinuteOfWeek } from './teacher-fit';

const WINTER = new Date('2027-01-04T00:00:00Z'); // Monday; London on GMT (UTC+0)
const SUMMER = new Date('2027-07-05T00:00:00Z'); // Monday; London on BST (UTC+1)

const base = (over: Partial<TeacherFitInput> = {}): TeacherFitInput => ({
  isInstructor: true,
  groupSchedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
  groupTimezone: 'UTC',
  referenceDate: WINTER,
  availability: { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] },
  otherGroups: [],
  ...over,
});

describe('toUtcMinuteOfWeek', () => {
  it('converts a Riyadh local time to UTC minutes of the week', () => {
    // Monday 18:00 Asia/Riyadh (UTC+3) = Monday 15:00 UTC = 1440 + 900
    expect(toUtcMinuteOfWeek(1, 18 * 60, 'Asia/Riyadh', WINTER)).toBe(2340);
  });
});

describe('checkTeacherFit', () => {
  it('fits a slot fully inside availability', () => {
    expect(checkTeacherFit(base())).toEqual({ ok: true, reasons: [], conflictingGroups: [] });
  });

  it('rejects a slot partially outside availability', () => {
    const result = checkTeacherFit(base({ groupSchedule: [{ dayOfWeek: 1, startTime: '11:30', durationMinutes: 60 }] }));
    expect(result.reasons).toEqual([TeacherFitReason.OUTSIDE_AVAILABILITY]);
  });

  it('reports missing availability and non-instructors', () => {
    expect(checkTeacherFit(base({ availability: null })).reasons).toEqual([TeacherFitReason.NO_AVAILABILITY]);
    expect(checkTeacherFit(base({ isInstructor: false })).reasons).toEqual([TeacherFitReason.NOT_INSTRUCTOR]);
  });

  it('reports overlapping groups of the same teacher, but not back-to-back ones', () => {
    const overlapping = { _id: 'g2', name: 'Group B', timezone: 'UTC', schedule: [{ dayOfWeek: 1, startTime: '10:30', durationMinutes: 60 }] };
    const adjacent = { _id: 'g3', name: 'Group C', timezone: 'UTC', schedule: [{ dayOfWeek: 1, startTime: '11:00', durationMinutes: 60 }] };
    const result = checkTeacherFit(base({ otherGroups: [overlapping, adjacent] }));
    expect(result.reasons).toEqual([TeacherFitReason.CONFLICT]);
    expect(result.conflictingGroups).toEqual([{ _id: 'g2', name: 'Group B' }]);
  });

  it('compares across timezones (Riyadh group, London teacher, winter)', () => {
    // Group Mon 18:00 Riyadh = 15:00–16:00 UTC; teacher Mon 14:00–17:00 London (GMT) = 14:00–17:00 UTC
    const result = checkTeacherFit(base({
      groupTimezone: 'Asia/Riyadh',
      groupSchedule: [{ dayOfWeek: 1, startTime: '18:00', durationMinutes: 60 }],
      availability: { timezone: 'Europe/London', slots: [{ dayOfWeek: 1, startTime: '14:00', endTime: '17:00' }] },
    }));
    expect(result.ok).toBe(true);
  });

  it('applies the daylight-saving offset of the reference date', () => {
    // Group Sun 11:00 Riyadh = 08:00 UTC. Teacher Sun 09:00–12:00 London: GMT → 09:00 UTC (outside); BST → 08:00 UTC (inside).
    const input = {
      groupTimezone: 'Asia/Riyadh',
      groupSchedule: [{ dayOfWeek: 0, startTime: '11:00', durationMinutes: 60 }],
      availability: { timezone: 'Europe/London', slots: [{ dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }] },
    };
    expect(checkTeacherFit(base({ ...input, referenceDate: WINTER })).reasons).toEqual([TeacherFitReason.OUTSIDE_AVAILABILITY]);
    expect(checkTeacherFit(base({ ...input, referenceDate: SUMMER })).ok).toBe(true);
  });

  it('fits a slot that crosses midnight when availability is split at 24:00 / 00:00', () => {
    const saturdayLate = base({
      groupSchedule: [{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }, { dayOfWeek: 0, startTime: '00:00', endTime: '01:00' }] },
    });
    expect(checkTeacherFit(saturdayLate).ok).toBe(true);

    const mondayLate = base({
      groupSchedule: [{ dayOfWeek: 1, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '23:00', endTime: '24:00' }, { dayOfWeek: 2, startTime: '00:00', endTime: '01:00' }] },
    });
    expect(checkTeacherFit(mondayLate).ok).toBe(true);

    const missingSunday = base({
      groupSchedule: [{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }] },
    });
    expect(checkTeacherFit(missingSunday).reasons).toEqual([TeacherFitReason.OUTSIDE_AVAILABILITY]);
  });

  it('detects a conflict across the week boundary', () => {
    const result = checkTeacherFit(base({
      groupSchedule: [{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }, { dayOfWeek: 0, startTime: '00:00', endTime: '01:00' }] },
      otherGroups: [{ _id: 'g9', name: 'Early Sunday', timezone: 'UTC', schedule: [{ dayOfWeek: 0, startTime: '00:00', durationMinutes: 15 }] }],
    }));
    expect(result.reasons).toEqual([TeacherFitReason.CONFLICT]);
  });
});
