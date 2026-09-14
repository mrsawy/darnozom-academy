'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ROUTE_SIGNUP } from '@/lib/data/constants/routes.constants';

export function Cta() {
  const t = useTranslations('home.cta');

  return (
    <section className="flex flex-col items-center gap-4 bg-muted px-6 py-16 text-center">
      <h2 className="text-2xl font-bold">{t('title')}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{t('description')}</p>
      <Button asChild size="lg">
        <Link href={ROUTE_SIGNUP}>{t('button')}</Link>
      </Button>
    </section>
  );
}
