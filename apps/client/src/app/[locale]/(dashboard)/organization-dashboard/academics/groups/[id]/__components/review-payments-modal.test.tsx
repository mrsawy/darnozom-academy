import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';
import { ReviewPaymentsModal } from './review-payments-modal';
import type { IFamilyPayment } from '@/lib/types/billing/billing';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const PAYMENT: IFamilyPayment = {
  _id: 'p1',
  organizationId: 'o1',
  familyId: 'f1',
  payerId: 'u1',
  method: 'MANUAL_TRANSFER',
  amountMinor: 10_000,
  currency: Currency.EGP,
  status: FamilyPaymentState.PENDING_REVIEW,
  receiptFileKey: 'receipts/p1.jpg',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

const useReceiptQueue = vi.fn();
const approveMutate = vi.fn();
const rejectMutate = vi.fn();

vi.mock('@/lib/hooks/billing/use-billing.hook', () => ({
  useReceiptQueue: (...args: unknown[]) => useReceiptQueue(...args),
  useApprovePayment: () => ({ mutate: approveMutate, isPending: false }),
  useRejectPayment: () => ({ mutate: rejectMutate, isPending: false }),
}));

describe('ReviewPaymentsModal', () => {
  it('scopes the receipt queue to this group', () => {
    useReceiptQueue.mockReturnValue({ data: [PAYMENT], isLoading: false });
    render(<ReviewPaymentsModal groupId="g1" open onOpenChange={vi.fn()} />);
    expect(useReceiptQueue).toHaveBeenCalledWith({ groupId: 'g1' }, true);
  });

  it('approves using the shared mutation', () => {
    useReceiptQueue.mockReturnValue({ data: [PAYMENT], isLoading: false });
    render(<ReviewPaymentsModal groupId="g1" open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'approve' }));
    expect(approveMutate).toHaveBeenCalledWith('p1');
  });
});
