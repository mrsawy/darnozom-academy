import { SessionStatus, TeacherPayModel, PayrollErrors } from '@darnozom/shared-types';
import { calculateBaseAmount, calculateTotal, getMonthInterval, isSessionCountable } from './payroll-calculator';

describe('payroll-calculator', () => {
  describe('getMonthInterval', () => {
    it('computes exact UTC start and end for a UTC month', () => {
      const { start, end } = getMonthInterval('2026-10', 'UTC');
      expect(start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
      expect(end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    });

    it('computes timezone-shifted boundaries (e.g. Asia/Riyadh UTC+3)', () => {
      const { start, end } = getMonthInterval('2026-10', 'Asia/Riyadh');
      // 2026-10-01 00:00 in Riyadh is 2026-09-30 21:00 UTC
      expect(start.toISOString()).toBe('2026-09-30T21:00:00.000Z');
      // 2026-11-01 00:00 in Riyadh is 2026-10-31 21:00 UTC
      expect(end.toISOString()).toBe('2026-10-31T21:00:00.000Z');
    });

    it('throws INVALID_MONTH for malformed month string', () => {
      expect(() => getMonthInterval('invalid')).toThrow(PayrollErrors.INVALID_MONTH);
      expect(() => getMonthInterval('2026-13')).toThrow(PayrollErrors.INVALID_MONTH);
      expect(() => getMonthInterval('2026-00')).toThrow(PayrollErrors.INVALID_MONTH);
    });
  });

  describe('isSessionCountable', () => {
    const interval = {
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-11-01T00:00:00.000Z'),
    };
    const teacherId = 'teacher-123';

    it('returns true for a completed, non-disputed session within the month for this teacher', () => {
      const session = {
        status: SessionStatus.COMPLETED,
        disputed: false,
        teacherId,
        startsAt: new Date('2026-10-15T10:00:00.000Z'),
      };
      expect(isSessionCountable(session, teacherId, interval)).toBe(true);
    });

    it('returns false if session status is not COMPLETED', () => {
      const session = {
        status: SessionStatus.SCHEDULED,
        disputed: false,
        teacherId,
        startsAt: new Date('2026-10-15T10:00:00.000Z'),
      };
      expect(isSessionCountable(session, teacherId, interval)).toBe(false);
    });

    it('returns false if session is disputed', () => {
      const session = {
        status: SessionStatus.COMPLETED,
        disputed: true,
        teacherId,
        startsAt: new Date('2026-10-15T10:00:00.000Z'),
      };
      expect(isSessionCountable(session, teacherId, interval)).toBe(false);
    });

    it('returns false if session is for another teacher', () => {
      const session = {
        status: SessionStatus.COMPLETED,
        disputed: false,
        teacherId: 'other-teacher',
        startsAt: new Date('2026-10-15T10:00:00.000Z'),
      };
      expect(isSessionCountable(session, teacherId, interval)).toBe(false);
    });

    it('returns false if session starts outside the month interval', () => {
      const before = {
        status: SessionStatus.COMPLETED,
        disputed: false,
        teacherId,
        startsAt: new Date('2026-09-30T23:59:59.999Z'),
      };
      const after = {
        status: SessionStatus.COMPLETED,
        disputed: false,
        teacherId,
        startsAt: new Date('2026-11-01T00:00:00.000Z'),
      };
      expect(isSessionCountable(before, teacherId, interval)).toBe(false);
      expect(isSessionCountable(after, teacherId, interval)).toBe(false);
    });
  });

  describe('calculateBaseAmount', () => {
    const basis = {
      sessions: 12,
      minutes: 720, // 12 hours
      students: 25,
      revenue: 5000,
    };

    it('calculates FIXED pay regardless of sessions held', () => {
      expect(calculateBaseAmount(TeacherPayModel.FIXED, 1500, basis)).toBe(1500);
      expect(calculateBaseAmount(TeacherPayModel.FIXED, 1500, { ...basis, sessions: 0 })).toBe(1500);
    });

    it('calculates PER_SESSION pay', () => {
      expect(calculateBaseAmount(TeacherPayModel.PER_SESSION, 50, basis)).toBe(600); // 50 * 12
    });

    it('calculates PER_HOUR pay from session minutes', () => {
      expect(calculateBaseAmount(TeacherPayModel.PER_HOUR, 40, basis)).toBe(480); // 40 * (720 / 60) = 480
    });

    it('calculates PER_STUDENT pay from active student count', () => {
      expect(calculateBaseAmount(TeacherPayModel.PER_STUDENT, 30, basis)).toBe(750); // 30 * 25
    });

    it('calculates REVENUE_SHARE pay percentage', () => {
      expect(calculateBaseAmount(TeacherPayModel.REVENUE_SHARE, 20, basis)).toBe(1000); // 20% of 5000 = 1000
    });

    it('rounds to 2 decimal places', () => {
      // 12.3333... -> 12.33
      expect(calculateBaseAmount(TeacherPayModel.PER_HOUR, 37, { ...basis, minutes: 20 })).toBe(12.33);
    });

    it('throws on negative rate or invalid revenue share percentage', () => {
      expect(() => calculateBaseAmount(TeacherPayModel.FIXED, -10, basis)).toThrow(PayrollErrors.INVALID_PAY_RATE);
      expect(() => calculateBaseAmount(TeacherPayModel.REVENUE_SHARE, 105, basis)).toThrow(PayrollErrors.INVALID_PAY_RATE);
    });
  });

  describe('calculateTotal', () => {
    it('sums baseAmount and bonuses', () => {
      const bonuses = [{ amount: 100.5 }, { amount: 50.25 }];
      expect(calculateTotal(1000, bonuses)).toBe(1150.75);
    });

    it('handles empty bonuses', () => {
      expect(calculateTotal(1000, [])).toBe(1000);
    });
  });
});
