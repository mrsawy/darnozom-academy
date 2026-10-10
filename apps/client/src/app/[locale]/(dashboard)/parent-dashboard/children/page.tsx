import { getTranslations } from 'next-intl/server';

export default async function ParentChildrenPage() {
  const t = await getTranslations('parentDashboard.children');

  return (
    <div>
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('comingSoon')}</p>
    </div>
  );
}
