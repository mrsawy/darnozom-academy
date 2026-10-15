import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Currency, PayStatementStatus, TeacherPayModel } from '@darnozom/shared-types';
import { PayStatementsTable } from './pay-statements-table';
import type { IPayStatement } from '@/lib/types/payroll/payroll';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values && 'count' in values) {
      return `${key}:${values.count}`;
    }
    return key;
  },
  useLocale: () => 'en',
}));

const DRAFT_STATEMENT: IPayStatement = {
  _id: 'stmt-1',
  organizationId: 'org-1',
  teacherId: 'teacher-1',
  month: '2026-10',
  profileSnapshot: {
    model: TeacherPayModel.PER_SESSION,
    rate: 50,
    currency: Currency.SAR,
  },
  countedSessionIds: ['sess-1', 'sess-2'],
  basis: {
    sessions: 2,
    minutes: 90,
    students: 5,
    revenue: 0,
  },
  baseAmount: 100,
  bonuses: [{ amount: 20, reason: 'Substitute', addedBy: 'user-1', addedAt: '2026-10-15T00:00:00.000Z' }],
  total: 120,
  status: PayStatementStatus.DRAFT,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

const APPROVED_STATEMENT: IPayStatement = {
  ...DRAFT_STATEMENT,
  _id: 'stmt-2',
  status: PayStatementStatus.APPROVED,
};

describe('PayStatementsTable', () => {
  it('renders loading state when isLoading is true', () => {
    render(<PayStatementsTable statements={[]} isLoading />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders empty state when statements array is empty', () => {
    render(<PayStatementsTable statements={[]} isLoading={false} />);
    expect(screen.getByText('emptyStatements')).toBeInTheDocument();
  });

  it('renders draft statement with Add Bonus and Approve buttons', () => {
    const onAddBonus = vi.fn();
    const onApprove = vi.fn();

    render(
      <PayStatementsTable
        statements={[DRAFT_STATEMENT]}
        isLoading={false}
        onAddBonus={onAddBonus}
        onApprove={onApprove}
      />
    );

    expect(screen.getByText('teacher-1')).toBeInTheDocument();
    expect(screen.getByText('2026-10')).toBeInTheDocument();
    expect(screen.getByText('statuses.DRAFT')).toBeInTheDocument();

    const addBonusBtn = screen.getByRole('button', { name: 'addBonus' });
    fireEvent.click(addBonusBtn);
    expect(onAddBonus).toHaveBeenCalledWith(DRAFT_STATEMENT);

    const approveBtn = screen.getByRole('button', { name: 'approve' });
    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledWith('stmt-1');
  });

  it('renders approved statement with Mark Paid button', () => {
    const onMarkPaid = vi.fn();

    render(
      <PayStatementsTable
        statements={[APPROVED_STATEMENT]}
        isLoading={false}
        onMarkPaid={onMarkPaid}
      />
    );

    expect(screen.getByText('statuses.APPROVED')).toBeInTheDocument();
    const markPaidBtn = screen.getByRole('button', { name: 'markPaid' });
    fireEvent.click(markPaidBtn);
    expect(onMarkPaid).toHaveBeenCalledWith(APPROVED_STATEMENT);
  });

  it('hides action column in instructor view', () => {
    render(
      <PayStatementsTable
        statements={[APPROVED_STATEMENT]}
        isLoading={false}
        isInstructorView
      />
    );

    expect(screen.queryByText('actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'markPaid' })).not.toBeInTheDocument();
  });
});
