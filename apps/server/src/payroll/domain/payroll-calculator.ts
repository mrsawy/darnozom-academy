import { DateTime } from 'luxon';
import { PayrollErrors, SessionStatus, TeacherPayModel } from '@darnozom/shared-types';

export function getMonthInterval(month: string, timezone = 'UTC'): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error(PayrollErrors.INVALID_MONTH);
  }

  const year = Number.parseInt(match[1], 10);
  const monthNum = Number.parseInt(match[2], 10);

  if (monthNum < 1 || monthNum > 12) {
    throw new Error(PayrollErrors.INVALID_MONTH);
  }

  const startDt = DateTime.fromObject({ year, month: monthNum, day: 1 }, { zone: timezone }).startOf('day');
  if (!startDt.isValid) {
    throw new Error(PayrollErrors.INVALID_MONTH);
  }

  const endDt = startDt.plus({ months: 1 });

  return {
    start: startDt.toJSDate(),
    end: endDt.toJSDate(),
  };
}

export interface ICountableSessionCandidate {
  status: SessionStatus | string;
  disputed?: boolean;
  teacherId: { toString(): string } | string;
  startsAt: Date | string;
}

export function isSessionCountable(session: ICountableSessionCandidate, targetTeacherId: string, monthInterval: { start: Date; end: Date }): boolean {
  if (session.status !== SessionStatus.COMPLETED) {
    return false;
  }

  if (session.disputed) {
    return false;
  }

  if (session.teacherId.toString() !== targetTeacherId.toString()) {
    return false;
  }

  const startsAt = session.startsAt instanceof Date ? session.startsAt : new Date(session.startsAt);
  if (startsAt < monthInterval.start || startsAt >= monthInterval.end) {
    return false;
  }

  return true;
}

export interface IPayrollBasis {
  sessions: number;
  minutes: number;
  students: number;
  revenue: number;
}

function roundToTwo(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateBaseAmount(model: TeacherPayModel, rate: number, basis: IPayrollBasis): number {
  if (rate < 0) {
    throw new Error(PayrollErrors.INVALID_PAY_RATE);
  }

  switch (model) {
    case TeacherPayModel.FIXED: {
      return roundToTwo(rate);
    }
    case TeacherPayModel.PER_SESSION: {
      return roundToTwo(rate * basis.sessions);
    }
    case TeacherPayModel.PER_HOUR: {
      return roundToTwo(rate * (basis.minutes / 60));
    }
    case TeacherPayModel.PER_STUDENT: {
      return roundToTwo(rate * basis.students);
    }
    case TeacherPayModel.REVENUE_SHARE: {
      if (rate > 100) {
        throw new Error(PayrollErrors.INVALID_PAY_RATE);
      }
      return roundToTwo((rate / 100) * basis.revenue);
    }
    default: {
      throw new Error(PayrollErrors.INVALID_PAY_MODEL);
    }
  }
}

export function calculateTotal(baseAmount: number, bonuses: { amount: number }[]): number {
  const bonusTotal = bonuses.reduce((acc, b) => acc + (b.amount || 0), 0);
  return roundToTwo(baseAmount + bonusTotal);
}
