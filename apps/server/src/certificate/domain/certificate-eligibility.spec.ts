import { FinalResult } from '@darnozom/shared-types';
import {
  calculateAttendancePercent,
  calculateHomeworkAverage,
  evaluateEligibility,
} from './certificate-eligibility';

describe('certificate-eligibility domain rules', () => {
  describe('calculateAttendancePercent', () => {
    it('returns 100% when there are 0 completed sessions', () => {
      expect(calculateAttendancePercent(0, 0)).toBe(100);
    });

    it('calculates correct percentage with rounding', () => {
      // 7 out of 9 sessions attended = 77.777... -> 77.78%
      expect(calculateAttendancePercent(9, 7)).toBe(77.78);
      // 10 out of 10 = 100%
      expect(calculateAttendancePercent(10, 10)).toBe(100);
      // 0 out of 5 = 0%
      expect(calculateAttendancePercent(5, 0)).toBe(0);
    });
  });

  describe('calculateHomeworkAverage', () => {
    it('returns 0 when there are no homework scores', () => {
      expect(calculateHomeworkAverage([])).toBe(0);
    });

    it('calculates the mean of scores with 2 decimal places', () => {
      // [4, 5, 4] -> 13 / 3 = 4.333... -> 4.33
      expect(calculateHomeworkAverage([4, 5, 4])).toBe(4.33);
      // [5, 5, 5] -> 5
      expect(calculateHomeworkAverage([5, 5, 5])).toBe(5);
    });
  });

  describe('evaluateEligibility', () => {
    it('marks eligible when no rules are configured', () => {
      const result = evaluateEligibility(undefined, {
        completedSessionsCount: 10,
        attendedSessionsCount: 5,
        homeworkScores: [2],
        finalResult: FinalResult.FAIL,
        paymentStatus: 'UNPAID',
      });

      expect(result.isEligible).toBe(true);
      expect(result.failedRules).toBeUndefined();
      expect(result.attendancePercent).toBe(50);
      expect(result.homeworkAverage).toBe(2);
    });

    it('enforces minAttendancePercent rule', () => {
      const rules = { minAttendancePercent: 80 };

      const pass = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 8,
        homeworkScores: [],
      });
      expect(pass.isEligible).toBe(true);
      expect(pass.attendancePercent).toBe(80);

      const fail = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 7,
        homeworkScores: [],
      });
      expect(fail.isEligible).toBe(false);
      expect(fail.failedRules).toEqual(['attendance']);
    });

    it('enforces minHomeworkAverage rule', () => {
      const rules = { minHomeworkAverage: 4.0 };

      const pass = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [4, 5, 4], // avg 4.33
      });
      expect(pass.isEligible).toBe(true);

      const fail = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [3, 4, 3], // avg 3.33
      });
      expect(fail.isEligible).toBe(false);
      expect(fail.failedRules).toEqual(['homework']);
    });

    it('enforces requireExamPass rule', () => {
      const rules = { requireExamPass: true };

      const pass = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [],
        finalResult: FinalResult.PASS,
      });
      expect(pass.isEligible).toBe(true);
      expect(pass.examPassed).toBe(true);

      const fail = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [],
        finalResult: FinalResult.FAIL,
      });
      expect(fail.isEligible).toBe(false);
      expect(fail.failedRules).toEqual(['exam']);
      expect(fail.examPassed).toBe(false);

      const unset = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [],
        finalResult: null,
      });
      expect(unset.isEligible).toBe(false);
      expect(unset.failedRules).toEqual(['exam']);
    });

    it('enforces requireFullyPaid rule', () => {
      const rules = { requireFullyPaid: true };

      const pass = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [],
        paymentStatus: 'PAID',
        hasOverdueCharges: false,
      });
      expect(pass.isEligible).toBe(true);
      expect(pass.fullyPaid).toBe(true);

      const failUnpaid = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [],
        paymentStatus: 'PARTIALLY_PAID',
        hasOverdueCharges: false,
      });
      expect(failUnpaid.isEligible).toBe(false);
      expect(failUnpaid.failedRules).toEqual(['payment']);

      const failOverdue = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 10,
        homeworkScores: [],
        paymentStatus: 'PAID',
        hasOverdueCharges: true,
      });
      expect(failOverdue.isEligible).toBe(false);
      expect(failOverdue.failedRules).toEqual(['payment']);
    });

    it('evaluates multiple combined rules and lists all failures', () => {
      const rules = {
        minAttendancePercent: 85,
        minHomeworkAverage: 4.0,
        requireExamPass: true,
        requireFullyPaid: true,
      };

      const partialFail = evaluateEligibility(rules, {
        completedSessionsCount: 10,
        attendedSessionsCount: 7, // 70% < 85% -> fail
        homeworkScores: [4, 5, 5], // avg 4.67 -> pass
        finalResult: FinalResult.FAIL, // fail
        paymentStatus: 'PAID',
        hasOverdueCharges: false, // pass
      });

      expect(partialFail.isEligible).toBe(false);
      expect(partialFail.failedRules).toEqual(['attendance', 'exam']);
    });
  });
});
