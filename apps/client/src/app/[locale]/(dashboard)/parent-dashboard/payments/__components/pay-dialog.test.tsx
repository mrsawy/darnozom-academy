import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Currency,
  PAYMENT_METHOD_ONLINE_GATEWAY,
  PAYMENT_METHOD_RECEIPT_UPLOAD,
} from '@darnozom/shared-types';
import { PayDialog } from './pay-dialog';
import type { IPaymentMethodOption } from '@/lib/types/billing/billing';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vitest hoists vi.mock
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const METHODS_ALL: IPaymentMethodOption[] = [
  { key: PAYMENT_METHOD_RECEIPT_UPLOAD },
  { key: PAYMENT_METHOD_ONLINE_GATEWAY },
];

const METHODS_RECEIPT_ONLY: IPaymentMethodOption[] = [{ key: PAYMENT_METHOD_RECEIPT_UPLOAD }];

describe('PayDialog', () => {
  it('offers enabled methods and omits methods the organization has not enabled', () => {
    render(<PayDialog methods={METHODS_RECEIPT_ONLY} onPay={vi.fn()} isSubmitting={false} />);
    expect(screen.getByLabelText(PAYMENT_METHOD_RECEIPT_UPLOAD)).toBeInTheDocument();
    expect(screen.queryByLabelText(PAYMENT_METHOD_ONLINE_GATEWAY)).not.toBeInTheDocument();
  });

  it('shows noMethods when the method list is empty', () => {
    render(<PayDialog methods={[]} onPay={vi.fn()} isSubmitting={false} />);
    expect(screen.getByText(/noMethods/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'pay' })).not.toBeInTheDocument();
  });

  it('shows an upload control when receipt upload is selected', () => {
    render(<PayDialog methods={METHODS_ALL} onPay={vi.fn()} isSubmitting={false} />);
    fireEvent.click(screen.getByLabelText(PAYMENT_METHOD_RECEIPT_UPLOAD));
    expect(screen.getByLabelText('receiptUpload')).toBeInTheDocument();
  });

  it('shows no upload control when gateway is selected', () => {
    render(<PayDialog methods={METHODS_ALL} onPay={vi.fn()} isSubmitting={false} />);
    fireEvent.click(screen.getByLabelText(PAYMENT_METHOD_ONLINE_GATEWAY));
    expect(screen.queryByLabelText('receiptUpload')).not.toBeInTheDocument();
  });

  it('blocks onPay and shows amountInvalid when amount cannot be parsed', () => {
    const onPay = vi.fn();
    render(<PayDialog methods={METHODS_ALL} onPay={onPay} isSubmitting={false} />);
    fireEvent.change(screen.getByLabelText('amount'), { target: { value: 'not-a-number' } });
    fireEvent.click(screen.getByRole('button', { name: 'pay' }));

    expect(onPay).not.toHaveBeenCalled();
    expect(screen.getByText(/amountInvalid/)).toBeInTheDocument();
  });

  it('calls onPay with method, amountMinor in minor units, and currency', () => {
    const onPay = vi.fn();
    render(<PayDialog methods={METHODS_ALL} onPay={onPay} isSubmitting={false} />);
    fireEvent.click(screen.getByLabelText(PAYMENT_METHOD_ONLINE_GATEWAY));
    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'pay' }));

    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({
        method: PAYMENT_METHOD_ONLINE_GATEWAY,
        amountMinor: 10_000,
        currency: Currency.EGP,
      })
    );
  });

  it('disables the submit button while in flight', () => {
    render(<PayDialog methods={METHODS_ALL} onPay={vi.fn()} isSubmitting />);
    const submitBtn = screen.getByRole('button', { name: 'pay' });
    expect(submitBtn).toBeDisabled();
  });
});
