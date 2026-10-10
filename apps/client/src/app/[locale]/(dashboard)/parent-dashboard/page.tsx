import { getTranslations } from 'next-intl/server';

export default async function ParentDashboardPage() {
  const t = await getTranslations('parentDashboard.home');

  return (
    <div>
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
    </div>
  );
}
