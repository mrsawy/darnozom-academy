'use client';

import { Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import PricingPlansBlock from './pricing-plans-block';

export type PricingShowcaseHeading = 'h1' | 'h2';

interface PricingShowcaseSectionProps {
  headingLevel?: PricingShowcaseHeading;
  className?: string;
}

export default function PricingShowcaseSection({
  headingLevel = 'h2',
  className,
}: PricingShowcaseSectionProps) {
  const t = useTranslations('HomeLegal.homePricingSection');

  const title = (
    <>
      <span className="text-foreground">{t('titleLead')}</span>
      <br />
      <span className="bg-linear-to-r from-violet-600 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
        {t('titleAccent')}
      </span>
    </>
  );

  const titleClassName =
    'font-heading mb-6 text-4xl font-bold tracking-tight md:mb-8 md:text-5xl lg:text-6xl';

  return (
    <section className={cn('relative overflow-hidden px-6 py-24 md:py-32', className)}>
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-12 text-center md:mb-20">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Rocket className="text-primary h-6 w-6 shrink-0" aria-hidden />
            <span className="text-primary text-sm font-medium tracking-wider uppercase">
              {t('badge')}
            </span>
          </div>

          {headingLevel === 'h1' ? (
            <h1 className={titleClassName}>{title}</h1>
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}

          <p className="text-muted-foreground mx-auto max-w-3xl text-lg text-pretty md:text-xl">
            {t('description')}
          </p>
        </div>

        <PricingPlansBlock cached />
      </div>
    </section>
  );
}
