import {
  ICertificateRules,
  ICertificateEligibility,
  FinalResult,
} from '@darnozom/shared-types';

export interface SessionDataForAttendance {
  _id: string;
  status: string; // 'COMPLETED', 'CANCELLED', etc.
}

export interface AttendanceRecordForStudent {
  sessionId: string;
  attendance: string; // 'PRESENT', 'LATE', 'EXCUSED', 'ABSENT'
}

export interface ReportDataForStudent {
  homework?: number | null; // 1-5
}

export interface StudentEligibilityInput {
  completedSessionsCount: number;
  attendedSessionsCount: number;
  homeworkScores: number[];
  finalResult?: FinalResult | string | null;
  paymentStatus?: string | null; // 'PAID', 'PARTIALLY_PAID', 'UNPAID'
  hasOverdueCharges?: boolean;
}

/**
 * Computes attendance percentage for a student in a group.
 * Attendance % = (PRESENT + LATE + EXCUSED) / COMPLETED sessions * 100.
 * Cancelled or non-completed sessions are excluded.
 */
export function calculateAttendancePercent(
  completedSessionsCount: number,
  attendedSessionsCount: number,
): number {
  if (completedSessionsCount <= 0) {
    return 100;
  }
  const percent = (attendedSessionsCount / completedSessionsCount) * 100;
  return Math.round(percent * 100) / 100;
}

/**
 * Computes the mean of the student's homework scores across reports.
 * Returns 0 if no scores exist.
 */
export function calculateHomeworkAverage(scores: number[]): number {
  const validScores = scores.filter((s) => typeof s === 'number' && !isNaN(s));
  if (validScores.length === 0) {
    return 0;
  }
  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  return Math.round((sum / validScores.length) * 100) / 100;
}

/**
 * Evaluates whether a student meets the configured certificate rules.
 * Rules that are not set (undefined) are ignored.
 */
export function evaluateEligibility(
  rules: ICertificateRules | undefined | null,
  input: StudentEligibilityInput,
): ICertificateEligibility {
  const rulesSnapshot: ICertificateRules = {
    minAttendancePercent: rules?.minAttendancePercent,
    minHomeworkAverage: rules?.minHomeworkAverage,
    requireExamPass: rules?.requireExamPass,
    requireFullyPaid: rules?.requireFullyPaid,
  };

  const attendancePercent = calculateAttendancePercent(
    input.completedSessionsCount,
    input.attendedSessionsCount,
  );

  const homeworkAverage = calculateHomeworkAverage(input.homeworkScores);

  const examPassed = input.finalResult === FinalResult.PASS;

  const fullyPaid =
    input.paymentStatus === 'PAID' && !input.hasOverdueCharges;

  const failedRules: string[] = [];

  if (
    rulesSnapshot.minAttendancePercent !== undefined &&
    rulesSnapshot.minAttendancePercent !== null
  ) {
    if (attendancePercent < rulesSnapshot.minAttendancePercent) {
      failedRules.push('attendance');
    }
  }

  if (
    rulesSnapshot.minHomeworkAverage !== undefined &&
    rulesSnapshot.minHomeworkAverage !== null
  ) {
    if (homeworkAverage < rulesSnapshot.minHomeworkAverage) {
      failedRules.push('homework');
    }
  }

  if (rulesSnapshot.requireExamPass) {
    if (!examPassed) {
      failedRules.push('exam');
    }
  }

  if (rulesSnapshot.requireFullyPaid) {
    if (!fullyPaid) {
      failedRules.push('payment');
    }
  }

  return {
    attendancePercent,
    homeworkAverage,
    examPassed: input.finalResult ? examPassed : undefined,
    fullyPaid: input.paymentStatus ? fullyPaid : undefined,
    rulesSnapshot,
    isEligible: failedRules.length === 0,
    failedRules: failedRules.length > 0 ? failedRules : undefined,
  };
}
