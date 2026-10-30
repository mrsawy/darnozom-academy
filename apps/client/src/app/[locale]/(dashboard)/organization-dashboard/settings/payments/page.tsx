import { getTranslations } from 'next-intl/server';
import { BillingSettingsForm } from './__components/billing-settings-form';

export default async function PaymentsSettingsPage() {
  const t = await getTranslations('Billing');

  return (
    <div className="p-base space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('billingSettings')}</h1>
        <p className="text-muted-foreground">{t('billingSettingsSubtitle')}</p>
      </div>

      <BillingSettingsForm />
    </div>
  );
}
