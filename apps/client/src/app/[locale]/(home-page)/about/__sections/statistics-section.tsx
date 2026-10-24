import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';

const STAT_INDEXES = [0, 1, 2, 3] as const;

/** Flat proof strip — numbers in Naskh over a hairline rule, no cards. */
function AboutStatisticsSection() {
  const t = useTranslations('about.statistics');

  return (
    <SectionShell tone="raised">
      <div className="border-dz-line grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] border-t">
        {STAT_INDEXES.map((index) => (
          <div key={index} className="border-dz-line flex flex-col gap-1 border-b py-7 pe-6">
            <div className="font-display text-dz-terracotta text-[2.5rem] leading-[1.15] font-bold">
              {t(`items.${index}.value`)}
            </div>
            <div className="text-dz-ink-soft text-sm font-medium">{t(`items.${index}.label`)}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export default AboutStatisticsSection;
