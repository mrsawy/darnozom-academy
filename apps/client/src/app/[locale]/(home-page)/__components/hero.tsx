'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ROUTE_LOGIN, ROUTE_SIGNUP } from '@/lib/data/constants/routes.constants';

export function Hero() {
  const t = useTranslations('home.hero');

  return (
    <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-2xl text-3xl font-bold sm:text-5xl">{t('title')}</h1>
      <p className="max-w-xl text-muted-foreground sm:text-lg">{t('subtitle')}</p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href={ROUTE_SIGNUP}>{t('ctaPrimary')}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={ROUTE_LOGIN}>{t('ctaSecondary')}</Link>
        </Button>
      </div>
    </section>
  );
}
