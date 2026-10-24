import { useTranslations } from 'next-intl';
import {
  Briefcase,
  Cpu,
  GraduationCap,
  HeartHandshake,
  Landmark,
  School,
  Stethoscope,
  Store,
} from 'lucide-react';
import SectionShell from '@/components/molecules/public-site/section-shell';
import DisplayHeading from '@/components/molecules/public-site/display-heading';

/** Index-aligned with the `about.companies.list` messages array. */
const INDUSTRY_ICONS = [
  GraduationCap,
  Briefcase,
  Landmark,
  School,
  Stethoscope,
  Cpu,
  HeartHandshake,
  Store,
] as const;

function AboutCompaniesSection() {
  const t = useTranslations('about.companies');

  return (
    <SectionShell
      tone="sand"
      innerClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-14">
      <div className="flex flex-col gap-4">
        <DisplayHeading>
          {t('title')} <span className="text-dz-terracotta-deep">{t('count')}</span>
        </DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {INDUSTRY_ICONS.map((Icon, index) => (
          <div
            key={index}
            className="bg-dz-paper-raised border-dz-line hover:border-dz-line-strong flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-center transition-colors">
            <Icon className="text-dz-terracotta size-7" aria-hidden />
            <span className="text-dz-ink-soft text-sm font-medium">{t(`list.${index}`)}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export default AboutCompaniesSection;
