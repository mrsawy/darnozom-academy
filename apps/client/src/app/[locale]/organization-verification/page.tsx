import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Clock } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('verificationTitle') };
}

export default async function OrganizationVerificationPage() {
  const t = await getTranslations('organizationVerification');

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <Clock className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('description')}</p>
    </div>
  );
}
