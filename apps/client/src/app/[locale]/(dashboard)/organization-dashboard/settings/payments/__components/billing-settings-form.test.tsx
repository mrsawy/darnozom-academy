import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PAYMENT_METHOD_MANUAL_TRANSFER, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { BillingSettingsForm } from './billing-settings-form';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
}));

const updateSettingsMutate = vi.fn();

vi.mock('@/lib/hooks/billing/use-billing.hook', () => ({
  useAllPaymentMethods: () => ({
    data: [{ key: PAYMENT_METHOD_RECEIPT_UPLOAD }, { key: PAYMENT_METHOD_MANUAL_TRANSFER }],
  }),
  useUpdateBillingSettings: () => ({ mutate: updateSettingsMutate, isPending: false }),
}));

vi.mock('@/components/organs/billing/payment-method-config-manager', () => ({
  PaymentMethodConfigManager: () => null,
}));

describe('BillingSettingsForm', () => {
  it('calls the update mutation on save with the selected methods', () => {
    render(<BillingSettingsForm initialEnabledMethods={[PAYMENT_METHOD_RECEIPT_UPLOAD]} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'method.MANUAL_TRANSFER' }));
    fireEvent.click(screen.getByRole('button', { name: 'saveSettings' }));
    expect(updateSettingsMutate).toHaveBeenCalledWith({
      enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD, PAYMENT_METHOD_MANUAL_TRANSFER],
      academyFeeGatewayProvider: null,
    });
  });
});
