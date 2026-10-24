'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { cn } from '@/lib/utils';
import { ANCHOR_HOME_STRUCTURE } from '@/lib/data/constants/routes.constants';

interface Step {
  title: string;
  description: string;
}

interface ReadinessCheck {
  label: string;
  value: string;
}

interface StructureFeature {
  title: string;
  description: string;
}

/**
 * The academic hierarchy — program, courses, levels, cohorts, groups — rendered
 * as a segmented stepper over the cocoa band, with a sample group's readiness
 * card beneath it.
 */
function AcademicStructureSection() {
  const t = useTranslations('AcademicStructureSection');
  const steps = t.raw('steps') as Step[];
  const checks = t.raw('readiness.checks') as ReadinessCheck[];
  const features = t.raw('features') as StructureFeature[];

  // Opens on the last step: groups are where the hierarchy pays off.
  const [activeStep, setActiveStep] = useState(steps.length - 1);

  return (
    <SectionShell
      id={ANCHOR_HOME_STRUCTURE.slice(1)}
      tone="cocoa"
      innerClassName="flex flex-col gap-12">
      <div className="flex max-w-[760px] flex-col gap-2.5">
        <Eyebrow onDark>{t('badge')}</Eyebrow>
        <DisplayHeading>{t('title')}</DisplayHeading>
        <p className="text-dz-cocoa-soft m-0 mt-2 text-[17px] text-pretty">{t('description')}</p>
      </div>

      {/* Hairline gaps between cells come from the 2px track showing through. */}
      <div className="bg-dz-cocoa-line border-dz-cocoa-line grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-px overflow-hidden rounded-[20px] border-2">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          return (
            <button
              key={step.title}
              type="button"
              onClick={() => setActiveStep(index)}
              aria-pressed={isActive}
              className={cn(
                'flex min-h-[190px] cursor-pointer flex-col gap-2.5 p-6 text-start transition-colors duration-300',
                isActive
                  ? 'bg-dz-tan text-dz-ink'
                  : 'bg-dz-cocoa text-dz-cocoa-ink hover:bg-dz-cocoa-line/60'
              )}>
              <span className="text-[13px] font-semibold opacity-80">
                {t('stepLabel', { number: String(index + 1) })}
              </span>
              <span className="font-display text-[28px] leading-[1.3] font-bold">{step.title}</span>
              <span className="text-sm leading-relaxed opacity-90">{step.description}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-6">
        <div className="bg-dz-paper-raised text-dz-ink flex flex-col gap-4 rounded-[20px] p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-dz-ink-soft text-[13px] font-semibold">
                {t('readiness.context')}
              </div>
              <div className="font-display text-[26px] leading-[1.4] font-bold">
                {t('readiness.groupTitle')}
              </div>
            </div>
            <span className="bg-dz-leaf-soft text-dz-leaf-ink rounded-full px-3 py-1.5 text-[13px] font-semibold">
              {t('readiness.statusBadge')}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {checks.map((check) => (
              <div
                key={check.label}
                className="bg-dz-paper flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm">
                <span className="bg-dz-leaf text-dz-paper-raised flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3" aria-hidden />
                </span>
                <span className="flex-1">{check.label}</span>
                <span className="text-dz-ink-soft font-semibold">{check.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-dz-cocoa-line flex flex-col border-t">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border-dz-cocoa-line grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 border-b py-5">
              <div className="font-semibold">{feature.title}</div>
              <div className="text-dz-cocoa-soft text-[15px]">{feature.description}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export default AcademicStructureSection;
