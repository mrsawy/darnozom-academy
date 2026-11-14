import { getTranslations } from 'next-intl/server';
import { AcademySettingsForm } from './__components/academy-settings-form/academy-settings-form';

export default async function AcademySettingsPage() {
  const t = await getTranslations('AcademySettings');

  return (
    <div className="p-base space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <AcademySettingsForm />
    </div>
  );
}
