import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BillingSubscriptionStatus, Currency, GroupPaymentStatus, SubscriptionType } from '@darnozom/shared-types';
import { SubscriptionsCard } from './subscriptions-card';
import type { IGroupDetail } from '@/lib/types/academics/academics';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/lib/hooks/billing/use-billing.hook', () => ({
  useCreateSubscription: () => ({ mutate: vi.fn(), isPending: false }),
  useEndSubscription: () => ({ mutate: vi.fn(), isPending: false }),
  useGroupSubscriptions: () => ({
    data: [
      {
        _id: 'sub1',
        items: [{ studentId: 's1', groupId: 'g1' }],
        type: SubscriptionType.MONTHLY,
        amountMinor: 10_000,
        currency: Currency.EGP,
        status: BillingSubscriptionStatus.ACTIVE,
      },
    ],
    isLoading: false,
  }),
  useReceiptQueue: () => ({
    data: [
      { _id: 'p1', amountMinor: 10_000, currency: Currency.EGP, method: 'MANUAL_TRANSFER', createdAt: '2026-01-01T00:00:00.000Z' },
      { _id: 'p2', amountMinor: 20_000, currency: Currency.EGP, method: 'MANUAL_TRANSFER', createdAt: '2026-01-02T00:00:00.000Z' },
    ],
    isLoading: false,
  }),
  useApprovePayment: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectPayment: () => ({ mutate: vi.fn(), isPending: false }),
}));

const group = (paymentStatus: GroupPaymentStatus): IGroupDetail =>
  ({
    _id: 'g1',
    students: [{ studentId: 's1', paymentStatus, whatsappAdded: false, addedAt: '2026-01-01' }],
    people: { s1: 'Student One' },
  }) as unknown as IGroupDetail;

describe('SubscriptionsCard payment status', () => {
  it('shows UNDER_REVIEW for a student with a pending manual-transfer payment', () => {
    render(<SubscriptionsCard group={group(GroupPaymentStatus.UNDER_REVIEW)} disabled={false} />);
    expect(screen.getByText('status.UNDER_REVIEW')).toBeInTheDocument();
  });

  it('still shows PAID as before', () => {
    render(<SubscriptionsCard group={group(GroupPaymentStatus.PAID)} disabled={false} />);
    expect(screen.getByText('status.PAID')).toBeInTheDocument();
  });
});

describe('SubscriptionsCard review payments entry point', () => {
  it('shows a pending-review button with the pending count', () => {
    render(<SubscriptionsCard group={group(GroupPaymentStatus.PAID)} disabled={false} />);
    const button = screen.getByRole('button', { name: /reviewPayments/ });
    expect(button).toHaveTextContent('2');
  });

  it('opens the review modal when clicked', () => {
    render(<SubscriptionsCard group={group(GroupPaymentStatus.PAID)} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: /reviewPayments/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
