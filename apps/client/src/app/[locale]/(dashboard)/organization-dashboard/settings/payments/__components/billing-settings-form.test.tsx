import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PAYMENT_METHOD_MANUAL_TRANSFER, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { BillingSettingsForm } from './billing-settings-form';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
}));

const updateSettingsMutate = vi.fn();
const useBillingSettings = vi.fn();

vi.mock('@/lib/hooks/billing/use-billing.hook', () => ({
  useAllPaymentMethods: () => ({
    data: [{ key: PAYMENT_METHOD_RECEIPT_UPLOAD }, { key: PAYMENT_METHOD_MANUAL_TRANSFER }],
  }),
  useUpdateBillingSettings: () => ({ mutate: updateSettingsMutate, isPending: false, isSuccess: false }),
  useBillingSettings: (...args: unknown[]) => useBillingSettings(...args),
}));

vi.mock('@/components/organs/billing/payment-method-config-manager', () => ({
  PaymentMethodConfigManager: () => <div data-testid="config-manager" />,
}));

describe('BillingSettingsForm', () => {
  it('renders the persisted settings, not a hard-coded default', () => {
    useBillingSettings.mockReturnValue({
      data: { enabledFamilyPaymentMethods: [PAYMENT_METHOD_MANUAL_TRANSFER], academyFeeGatewayProvider: null },
    });
    render(<BillingSettingsForm />);
    expect(screen.getByRole('checkbox', { name: 'method.MANUAL_TRANSFER' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'method.RECEIPT_UPLOAD' })).not.toBeChecked();
  });

  it('calls the update mutation on save with the selected methods', () => {
    useBillingSettings.mockReturnValue({
      data: { enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD], academyFeeGatewayProvider: null },
    });
    render(<BillingSettingsForm />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'method.MANUAL_TRANSFER' }));
    fireEvent.click(screen.getByRole('button', { name: 'saveSettings' }));
    expect(updateSettingsMutate).toHaveBeenCalledWith({
      enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD, PAYMENT_METHOD_MANUAL_TRANSFER],
      academyFeeGatewayProvider: null,
    });
  });

  it('renders the payment method manager outside the settings form', () => {
    useBillingSettings.mockReturnValue({
      data: { enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD], academyFeeGatewayProvider: null },
    });
    render(<BillingSettingsForm />);
    const manager = screen.getByTestId('config-manager');
    expect(manager.closest('form')).toBeNull();
  });
});
