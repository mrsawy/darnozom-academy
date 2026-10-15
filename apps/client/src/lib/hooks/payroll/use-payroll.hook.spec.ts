import { describe, expect, it } from 'vitest';
import { PayStatementStatus } from '@darnozom/shared-types';
import { payrollKeys } from './use-payroll.hook';

describe('payrollKeys', () => {
  it('namespaces all keys under payroll root so invalidating payroll invalidates everything', () => {
    expect(payrollKeys.profiles[0]).toBe('payroll');
    expect(payrollKeys.profile('t1')[0]).toBe('payroll');
    expect(payrollKeys.statements()[0]).toBe('payroll');
    expect(payrollKeys.statement('s1')[0]).toBe('payroll');
  });

  it('differentiates profile keys by teacherId', () => {
    expect(payrollKeys.profile('t1')).toEqual(['payroll', 'profiles', 't1']);
    expect(payrollKeys.profile('t1')).not.toEqual(payrollKeys.profile('t2'));
  });

  it('differentiates statement keys by statementId and queries', () => {
    expect(payrollKeys.statement('s1')).toEqual(['payroll', 'statement', 's1']);
    expect(payrollKeys.statements({ month: '2026-10' })).toEqual([
      'payroll',
      'statements',
      { month: '2026-10' },
    ]);
    expect(payrollKeys.statements({ status: PayStatementStatus.APPROVED })).not.toEqual(
      payrollKeys.statements({ status: PayStatementStatus.PAID })
    );
  });
});
