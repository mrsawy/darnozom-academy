import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Currency } from '@darnozom/shared-types';
import { ManualTransferPayPanel } from './manual-transfer-pay-panel';
import type { IPaymentMethodConfig } from '@/lib/types/billing/payment-method-config';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
}));

const initiateMutateAsync = vi.fn(async () => ({ kind: 'AWAIT_RECEIPT', paymentId: 'p1' }));
const attachMutateAsync = vi.fn(async () => undefined);

vi.mock('@/lib/hooks/billing/use-billing.hook', () => ({
  useInitiatePayment: () => ({ mutateAsync: initiateMutateAsync, isPending: false }),
  useAttachReceipt: () => ({ mutateAsync: attachMutateAsync, isPending: false }),
}));

vi.mock('@/lib/actions/file/uploadFile', () => ({
  uploadFileToS3: vi.fn(async () => 'files/proof.png'),
}));

const CONFIG: IPaymentMethodConfig = {
  _id: 'cfg1',
  key: 'INSTAPAY',
  kind: 'BUILT_IN',
  label: 'InstaPay',
  enabled: true,
  fields: [{ key: 'transferNumber', label: 'Number', type: 'TEXT', value: '0100000000', order: 0 }],
};

describe('ManualTransferPayPanel', () => {
  it('renders the configured fields read-only', () => {
    render(
      <ManualTransferPayPanel config={CONFIG} amountMinor={10_000} currency={Currency.EGP} onSubmitted={vi.fn()} />
    );
    expect(screen.getByText('0100000000')).toBeInTheDocument();
  });

  it('initiates then attaches the uploaded image on submit', async () => {
    const onSubmitted = vi.fn();
    render(
      <ManualTransferPayPanel config={CONFIG} amountMinor={10_000} currency={Currency.EGP} onSubmitted={onSubmitted} />
    );

    const file = new File(['x'], 'proof.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('uploadReceipt'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'submitPayment' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());

    expect(initiateMutateAsync).toHaveBeenCalledWith({
      method: 'MANUAL_TRANSFER',
      amountMinor: 10_000,
      currency: Currency.EGP,
      meta: { paymentMethodConfigId: 'cfg1' },
    });
    expect(attachMutateAsync).toHaveBeenCalledWith({ paymentId: 'p1', fileKey: 'files/proof.png' });
  });
});
