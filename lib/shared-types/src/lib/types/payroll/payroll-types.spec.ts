import { describe, expect, it } from 'vitest';
import {
  TeacherPayModel,
  PayStatementStatus,
} from './payroll.types';
import { PayrollErrors } from '../../messages/payroll-errors.enum';
import { Subjects } from '../role/subject/subjects.enum';

describe('payroll shared types', () => {
  it('defines the 5 concept teacher pay models', () => {
    expect(Object.values(TeacherPayModel)).toEqual([
      'FIXED',
      'PER_SESSION',
      'PER_HOUR',
      'PER_STUDENT',
      'REVENUE_SHARE',
    ]);
  });

  it('defines the 3 pay statement statuses', () => {
    expect(Object.values(PayStatementStatus)).toEqual([
      'DRAFT',
      'APPROVED',
      'PAID',
    ]);
  });

  it('includes PAYROLL subject in Subjects enum', () => {
    expect(Subjects.PAYROLL).toBe('PAYROLL');
  });

  it('defines payroll error keys', () => {
    expect(PayrollErrors.PAY_PROFILE_NOT_FOUND).toBe('PAY_PROFILE_NOT_FOUND');
    expect(PayrollErrors.STATEMENT_NOT_FOUND).toBe('STATEMENT_NOT_FOUND');
    expect(PayrollErrors.STATEMENT_ALREADY_APPROVED).toBe('STATEMENT_ALREADY_APPROVED');
    expect(PayrollErrors.DISPUTE_BLOCKED_MONTH_APPROVED).toBe('DISPUTE_BLOCKED_MONTH_APPROVED');
  });
});
