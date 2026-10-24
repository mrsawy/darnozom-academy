'use client';

import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import AiPricingPlansBlock from '../__components/ai-pricing-plans-block';

interface AiPricingContentSectionProps {
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

export default function AiPricingContentSection({
  headingLevel = 'h1',
  className,
}: AiPricingContentSectionProps) {
  const t = useTranslations('AiPricing');

  return (
    <SectionShell
      tone="paper"
      className={className}
      innerClassName="flex flex-col items-center gap-9">
      <div className="flex max-w-[640px] flex-col gap-2.5 text-center">
        <Eyebrow>{t('badge')}</Eyebrow>
        <DisplayHeading as={headingLevel}>
          {t('titleLead')} <span className="text-dz-terracotta">{t('titleAccent')}</span>
        </DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-pretty">{t('subtitle')}</p>
      </div>

      <AiPricingPlansBlock />
    </SectionShell>
  );
}
