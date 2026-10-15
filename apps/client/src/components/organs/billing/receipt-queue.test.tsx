import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';
import { ReceiptQueue } from './receipt-queue';
import type { IFamilyPayment } from '@/lib/types/billing/billing';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vitest hoists vi.mock
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const PAYMENT: IFamilyPayment = {
  _id: 'p1',
  organizationId: 'o1',
  familyId: 'f1',
  payerId: 'u1',
  method: 'RECEIPT_UPLOAD',
  amountMinor: 15_000,
  currency: Currency.EGP,
  status: FamilyPaymentState.PENDING_REVIEW,
  receiptFileKey: 'receipts/p1.jpg',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

describe('ReceiptQueue', () => {
  it('renders an empty state when there are no payments', () => {
    render(<ReceiptQueue payments={[]} isLoading={false} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders a loading state when isLoading is true', () => {
    render(<ReceiptQueue payments={[]} isLoading onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders receipt link or image for review', () => {
    render(
      <ReceiptQueue payments={[PAYMENT]} isLoading={false} onApprove={vi.fn()} onReject={vi.fn()} />
    );
    const receiptLink = screen.getByRole('link', { name: 'receipt' });
    expect(receiptLink).toHaveAttribute('href', expect.stringContaining('receipts/p1.jpg'));
  });

  it('passes payment id on approve', () => {
    const onApprove = vi.fn();
    render(
      <ReceiptQueue
        payments={[PAYMENT]}
        isLoading={false}
        onApprove={onApprove}
        onReject={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'approve' }));
    expect(onApprove).toHaveBeenCalledWith('p1');
  });

  it('does not fire reject without a reason and displays reasonRequired', () => {
    const onReject = vi.fn();
    render(
      <ReceiptQueue
        payments={[PAYMENT]}
        isLoading={false}
        onApprove={vi.fn()}
        onReject={onReject}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'reject' }));
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByText('reasonRequired')).toBeInTheDocument();
  });

  it('passes payment id and reason when reject reason is provided', () => {
    const onReject = vi.fn();
    render(
      <ReceiptQueue
        payments={[PAYMENT]}
        isLoading={false}
        onApprove={vi.fn()}
        onReject={onReject}
      />
    );
    fireEvent.change(screen.getByLabelText('rejectReason'), {
      target: { value: 'Illegible image' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'reject' }));
    expect(onReject).toHaveBeenCalledWith('p1', 'Illegible image');
  });
});
