'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  PAYMENT_METHOD_ONLINE_GATEWAY,
  PAYMENT_METHOD_RECEIPT_UPLOAD,
  PaymentProvider,
} from '@darnozom/shared-types';
import {
  useAllPaymentMethods,
  useBillingSettings,
  useUpdateBillingSettings,
} from '@/lib/hooks/billing/use-billing.hook';
import { PaymentMethodConfigManager } from '@/components/organs/billing/payment-method-config-manager';

const DEFAULT_ENABLED_METHODS = [PAYMENT_METHOD_RECEIPT_UPLOAD];

export function BillingSettingsForm() {
  const t = useTranslations('Billing');
  const { data: registeredMethods = [] } = useAllPaymentMethods();
  const { data: settings } = useBillingSettings();
  const updateSettings = useUpdateBillingSettings();

  const [enabledMethods, setEnabledMethods] = useState<string[]>(DEFAULT_ENABLED_METHODS);
  const [gatewayProvider, setGatewayProvider] = useState<PaymentProvider | ''>('');

  useEffect(() => {
    if (!settings) return;
    setEnabledMethods(settings.enabledFamilyPaymentMethods);
    setGatewayProvider(settings.academyFeeGatewayProvider ?? '');
  }, [settings]);

  const isGatewaySelected = enabledMethods.includes(PAYMENT_METHOD_ONLINE_GATEWAY);

  const toggleMethod = (key: string) => {
    setEnabledMethods((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      enabledFamilyPaymentMethods: enabledMethods,
      academyFeeGatewayProvider: gatewayProvider ? (gatewayProvider as PaymentProvider) : null,
    });
  };

  const methodsList =
    registeredMethods.length > 0
      ? registeredMethods
      : [{ key: PAYMENT_METHOD_RECEIPT_UPLOAD }, { key: PAYMENT_METHOD_ONLINE_GATEWAY }];

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="bg-card text-card-foreground space-y-6 rounded-lg border p-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">{t('enabledMethods')}</label>
          <div className="space-y-2">
            {methodsList.map((m: { key: string }) => {
              const checked = enabledMethods.includes(m.key);
              return (
                <label
                  key={m.key}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMethod(m.key)}
                    className="text-primary h-4 w-4 rounded border"
                  />
                  <span className="font-medium">{t(`method.${m.key}`)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="gateway-provider" className="text-sm font-medium">
            {t('gatewayProvider')}
          </label>
          <select
            id="gateway-provider"
            value={gatewayProvider}
            onChange={(e) => setGatewayProvider(e.target.value as PaymentProvider | '')}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm">
            <option value="">{t('noProviderSelected')}</option>
            {Object.values(PaymentProvider).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {isGatewaySelected && !gatewayProvider ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t('gatewayProviderRequiredNote')}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
            {t('saveSettings')}
          </button>
          {updateSettings.isSuccess ? <span className="text-sm text-emerald-600">{t('settingsSaved')}</span> : null}
        </div>
      </form>

      <PaymentMethodConfigManager />
    </div>
  );
}
