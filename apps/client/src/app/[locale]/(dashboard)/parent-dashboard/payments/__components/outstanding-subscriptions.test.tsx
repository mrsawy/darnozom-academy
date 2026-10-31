import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Currency, SubscriptionType, BillingSubscriptionStatus } from '@darnozom/shared-types';
import { OutstandingSubscriptions, type OutstandingSubscriptionRow } from './outstanding-subscriptions';
import type { IBillingSubscription } from '@/lib/types/billing/billing';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
  useLocale: () => 'en',
}));

const SUBSCRIPTION: IBillingSubscription = {
  _id: 'sub-1',
  organizationId: 'org-1',
  familyId: 'fam-1',
  items: [{ studentId: 'child-1', groupId: 'group-1' }],
  type: SubscriptionType.MONTHLY,
  amountMinor: 1000,
  currency: Currency.EGP,
  status: BillingSubscriptionStatus.ACTIVE,
  createdBy: 'staff-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ROW: OutstandingSubscriptionRow = {
  balance: { subscriptionId: 'sub-1', currency: Currency.EGP, outstandingMinor: 3000, chargeCount: 3, studentIds: ['child-1'] },
  subscription: SUBSCRIPTION,
  studentNames: ['Ahmed'],
};

describe('OutstandingSubscriptions', () => {
  it('shows a pay button per outstanding subscription with the student name and month count', () => {
    render(<OutstandingSubscriptions rows={[ROW]} onPay={vi.fn()} />);
    expect(screen.getByText('Ahmed')).toBeInTheDocument();
    expect(screen.getByText(/monthsPending/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pay' })).toBeInTheDocument();
  });

  it('calls onPay with the row when its pay button is clicked', () => {
    const onPay = vi.fn();
    render(<OutstandingSubscriptions rows={[ROW]} onPay={onPay} />);
    screen.getByRole('button', { name: 'pay' }).click();
    expect(onPay).toHaveBeenCalledWith(ROW);
  });

  it('shows an empty state when nothing is outstanding', () => {
    render(<OutstandingSubscriptions rows={[]} onPay={vi.fn()} />);
    expect(screen.getByText('noOutstanding')).toBeInTheDocument();
  });
});
