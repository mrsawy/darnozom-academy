import { getTranslations } from 'next-intl/server';
import { BillingSettingsForm } from './__components/billing-settings-form';

export default async function SettingsPage() {
  const t = await getTranslations('dashboard.settings');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">{t('title')}</h1>
      </div>

      <BillingSettingsForm />
    </div>
  );
}
