import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PaymentMethodConfigManager } from './payment-method-config-manager';
import type { IPaymentMethodConfig } from '@/lib/types/billing/payment-method-config';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
}));

const setEnabledMutate = vi.fn();
const upsertFieldsMutate = vi.fn();
const createCustomMutate = vi.fn();

const INSTAPAY: IPaymentMethodConfig = {
  _id: 'cfg1',
  key: 'INSTAPAY',
  kind: 'BUILT_IN',
  label: 'InstaPay',
  enabled: false,
  fields: [{ key: 'transferNumber', label: 'Number', type: 'TEXT', value: '', order: 0 }],
};

vi.mock('@/lib/hooks/billing/use-billing.hook', () => ({
  usePaymentMethodConfigs: () => ({ data: [INSTAPAY], isLoading: false }),
  useUpsertPaymentMethodConfigFields: () => ({ mutate: upsertFieldsMutate, isPending: false }),
  useSetPaymentMethodConfigEnabled: () => ({ mutate: setEnabledMutate, isPending: false }),
  useCreateCustomPaymentMethodConfig: () => ({ mutate: createCustomMutate, isPending: false }),
}));

describe('PaymentMethodConfigManager', () => {
  it('toggles a built-in method enabled', () => {
    render(<PaymentMethodConfigManager />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'InstaPay' }));
    expect(setEnabledMutate).toHaveBeenCalledWith({ configId: 'cfg1', enabled: true });
  });

  it('adds a field to a method and saves', () => {
    render(<PaymentMethodConfigManager />);
    fireEvent.click(screen.getByRole('button', { name: 'editFields' }));
    fireEvent.click(screen.getByRole('button', { name: 'addField' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(upsertFieldsMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        configId: 'cfg1',
        fields: expect.arrayContaining([expect.objectContaining({ label: 'Number' })]),
      })
    );
  });

  it('creates a custom method with a label and no fields', () => {
    render(<PaymentMethodConfigManager />);
    fireEvent.click(screen.getByRole('button', { name: 'addMethod' }));
    fireEvent.change(screen.getByLabelText('newMethodLabel'), { target: { value: 'Western Union' } });
    fireEvent.click(screen.getByRole('button', { name: 'createMethod' }));
    expect(createCustomMutate).toHaveBeenCalledWith({ label: 'Western Union', fields: [] });
  });
});
