'use client';

import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { ANCHOR_HOME_PRICING } from '@/lib/data/constants/routes.constants';
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

  return (
    <SectionShell
      id={ANCHOR_HOME_PRICING.slice(1)}
      tone="paper"
      className={className}
      innerClassName="flex flex-col items-center gap-9">
      <div className="flex max-w-[640px] flex-col gap-2.5 text-center">
        <Eyebrow>{t('badge')}</Eyebrow>
        <DisplayHeading as={headingLevel}>
          {t('titleLead')} <span className="text-dz-terracotta">{t('titleAccent')}</span>
        </DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-pretty">{t('description')}</p>
      </div>

      <PricingPlansBlock cached className="w-full" />
    </SectionShell>
  );
}
