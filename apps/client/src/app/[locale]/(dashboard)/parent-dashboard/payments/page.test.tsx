import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';
import ParentPaymentsPage from './page';
import type { IFamilyPayment } from '@/lib/types/billing/billing';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/lib/store/userStore', () => ({
  default: (selector: (s: { user: { _id: string } }) => unknown) => selector({ user: { _id: 'f1' } }),
}));

const REJECTED_PAYMENT: IFamilyPayment = {
  _id: 'p1',
  organizationId: 'o1',
  familyId: 'f1',
  payerId: 'f1',
  method: 'MANUAL_TRANSFER',
  amountMinor: 10_000,
  currency: Currency.EGP,
  status: FamilyPaymentState.REJECTED,
  rejectReason: 'Blurry screenshot',
  methodSnapshot: { label: 'InstaPay', fields: [] },
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

const UNDER_REVIEW_PAYMENT: IFamilyPayment = {
  _id: 'p2',
  organizationId: 'o1',
  familyId: 'f1',
  payerId: 'f1',
  method: 'MANUAL_TRANSFER',
  amountMinor: 20_000,
  currency: Currency.EGP,
  status: FamilyPaymentState.PENDING_REVIEW,
  methodSnapshot: { label: 'InstaPay', fields: [] },
  createdAt: '2026-03-02T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
};

let myPayments: IFamilyPayment[] = [REJECTED_PAYMENT];

vi.mock('@/lib/hooks/billing/use-billing.hook', () => ({
  useStatement: () => ({ data: { entries: [], balances: [], openSubscriptions: [] }, isLoading: false }),
  useFamilySubscriptions: () => ({ data: [] }),
  useMethods: () => ({ data: [] }),
  usePaymentMethodConfigs: () => ({ data: [] }),
  useInitiatePayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAttachReceipt: () => ({ mutateAsync: vi.fn(), isPending: false }),
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useMyFamilyPayments: () => ({ data: myPayments }),
}));

vi.mock('@/lib/hooks/parent/useParent.hook', () => ({
  useChildren: () => ({ data: [] }),
}));

describe('ParentPaymentsPage rejected payments', () => {
  it('shows the reject reason for a rejected payment', () => {
    myPayments = [REJECTED_PAYMENT];
    render(<ParentPaymentsPage />);
    expect(screen.getByText((_, element) => element?.textContent === 'rejected: Blurry screenshot')).toBeInTheDocument();
  });

  it('offers a retry action for a rejected payment', () => {
    myPayments = [REJECTED_PAYMENT];
    render(<ParentPaymentsPage />);
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument();
  });
});

describe('ParentPaymentsPage payments under review', () => {
  it('shows an under-review badge for a pending-review payment', () => {
    myPayments = [UNDER_REVIEW_PAYMENT];
    render(<ParentPaymentsPage />);
    expect(screen.getByText('paymentsUnderReview')).toBeInTheDocument();
    expect(screen.getByText('status.UNDER_REVIEW')).toBeInTheDocument();
  });

  it('shows nothing under review when there is none', () => {
    myPayments = [];
    render(<ParentPaymentsPage />);
    expect(screen.queryByText('paymentsUnderReview')).not.toBeInTheDocument();
  });
});
