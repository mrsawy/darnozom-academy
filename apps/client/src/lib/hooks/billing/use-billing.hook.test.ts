import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { billingKeys, useApprovePayment, useAttachReceipt, useRejectPayment } from './use-billing.hook';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/actions/billing/billing.action', () => ({
  approvePayment: vi.fn(async () => ({})),
  rejectPayment: vi.fn(async () => ({})),
  attachReceipt: vi.fn(async () => ({})),
}));

const invalidateQueries = vi.fn();

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
    useMutation: <TVars, TResult>(opts: {
      mutationFn: (vars: TVars) => Promise<TResult>;
      onSuccess?: () => void;
      onError?: (e: Error) => void;
    }) => ({
      mutate: (vars: TVars) => {
        void opts
          .mutationFn(vars)
          .then(() => opts.onSuccess?.())
          .catch((error: Error) => opts.onError?.(error));
      },
    }),
  };
});

describe('billingKeys', () => {
  it('namespaces every key under billing, so one payment refreshes the ledger and the queue', () => {
    expect(billingKeys.statement('f1')[0]).toBe('billing');
    expect(billingKeys.receiptQueue()[0]).toBe('billing');
    expect(billingKeys.groupSubscriptions('g1')[0]).toBe('billing');
  });

  it('keys the statement by family and the subscriptions by group', () => {
    expect(billingKeys.statement('f1')).not.toEqual(billingKeys.statement('f2'));
    expect(billingKeys.groupSubscriptions('g1')).not.toEqual(billingKeys.groupSubscriptions('g2'));
  });

  it('namespaces the new payment method config and settings keys under billing too', () => {
    expect(billingKeys.paymentMethodConfigs[0]).toBe('billing');
    expect(billingKeys.settings[0]).toBe('billing');
  });

  it('namespaces the my-family-payments key under billing too', () => {
    expect(billingKeys.myFamilyPayments[0]).toBe('billing');
  });
});

describe('payment review mutations invalidate academics, not just billing', () => {
  it('useApprovePayment invalidates the academics query root, so group readiness refreshes', async () => {
    invalidateQueries.mockClear();
    const { result } = renderHook(() => useApprovePayment());

    result.current.mutate('payment-1');

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['academics'] }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['billing'] });
  });

  it('useRejectPayment invalidates the academics query root too', async () => {
    invalidateQueries.mockClear();
    const { result } = renderHook(() => useRejectPayment());

    result.current.mutate({ paymentId: 'payment-1', reason: 'blurry' });

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['academics'] }));
  });

  it('useAttachReceipt invalidates academics, so the roster shows "under review" immediately', async () => {
    invalidateQueries.mockClear();
    const { result } = renderHook(() => useAttachReceipt());

    result.current.mutate({ paymentId: 'payment-1', fileKey: 'receipts/p1.png' });

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['academics'] }));
  });
});
