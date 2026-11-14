import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Currency, GroupPayModel, PayStatementStatus } from '@darnozom/shared-types';
import { GroupPayrollTable } from './group-payroll-table';
import type { IPayStatement } from '@/lib/types/payroll/payroll';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const statement = (over: Partial<IPayStatement>): IPayStatement => ({
  _id: 's1',
  organizationId: 'org',
  teacherId: 't1',
  month: '2026-10',
  countedSessionIds: [],
  basis: { sessions: 0, minutes: 0, students: 0, revenue: 0 },
  baseAmount: 0,
  bonuses: [],
  total: 0,
  status: PayStatementStatus.DRAFT,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('GroupPayrollTable', () => {
  it('shows empty state when no statement has group lines', () => {
    render(<GroupPayrollTable statements={[statement({})]} />);
    expect(screen.getByText('emptyStatements')).toBeInTheDocument();
  });

  it('lists one row per group line with the teacher name and its share of the collected money', () => {
    render(
      <GroupPayrollTable
        teacherNames={{ t1: 'Ustaz Omar' }}
        statements={[
          statement({
            currency: Currency.USD,
            lines: [
              {
                groupId: 'g1',
                groupName: 'Tajweed A',
                model: GroupPayModel.PERCENT_OF_SUBSCRIPTIONS,
                rate: 25,
                currency: Currency.USD,
                subscriptions: 4,
                collected: 800,
                sessions: 8,
                amount: 200,
              },
            ],
          }),
        ]}
      />
    );

    expect(screen.getByText('Tajweed A')).toBeInTheDocument();
    expect(screen.getByText('Ustaz Omar')).toBeInTheDocument();
    // 200 of 800 collected is 25%, in the row and in the footer total.
    expect(screen.getAllByText('25%').length).toBeGreaterThanOrEqual(1);
  });

  it('totals per currency instead of mixing currencies', () => {
    const line = (groupId: string, currency: Currency, amount: number) => ({
      groupId,
      groupName: groupId,
      model: GroupPayModel.FIXED_PER_GROUP,
      rate: amount,
      currency,
      subscriptions: 0,
      collected: 0,
      sessions: 0,
      amount,
    });
    render(
      <GroupPayrollTable
        statements={[
          statement({ _id: 'a', lines: [line('g1', Currency.USD, 100)] }),
          statement({ _id: 'b', teacherId: 't2', lines: [line('g2', Currency.SAR, 300)] }),
        ]}
      />
    );
    expect(screen.getByText('teacherTotal (USD)')).toBeInTheDocument();
    expect(screen.getByText('teacherTotal (SAR)')).toBeInTheDocument();
  });
});
