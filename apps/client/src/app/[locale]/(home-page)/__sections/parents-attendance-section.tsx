'use client';

import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { cn } from '@/lib/utils';
import { ANCHOR_HOME_PARENTS } from '@/lib/data/constants/routes.constants';

/** 4 weeks x 7 days of attendance: 2 = present, 1 = late, 0 = absent, -1 = no session. */
const ATTENDANCE_MATRIX = [
  [2, 2, -1, 2, 2, 1, -1],
  [2, 1, -1, 2, 2, 2, -1],
  [2, 2, -1, 0, 2, 2, -1],
  [2, 2, -1, 2, 2, 2, -1],
] as const;

const CELL_STYLES: Record<string, string> = {
  '2': 'bg-dz-leaf',
  '1': 'bg-dz-amber',
  '0': 'bg-dz-clay',
  '-1': 'bg-dz-line',
};

/** Index-aligned with `dashboard.legend`. */
const LEGEND_STYLES = ['bg-dz-leaf', 'bg-dz-amber', 'bg-dz-clay'] as const;

/** Share of the child's tracked time, per course — index-aligned with `dashboard.courses`. */
const TIME_ON_TASK = [100, 72, 36] as const;

const BENEFIT_INDEXES = [0, 1, 2, 3] as const;

function ParentsAttendanceSection() {
  const t = useTranslations('ParentsAttendanceSection');

  return (
    <SectionShell
      id={ANCHOR_HOME_PARENTS.slice(1)}
      tone="paper"
      innerClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-14">
      <div className="bg-dz-paper-raised border-dz-line flex flex-col gap-5 rounded-3xl border p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-dz-ink-soft text-[13px] font-semibold">{t('dashboard.label')}</div>
            <div className="font-display text-[26px] font-bold">{t('dashboard.childName')}</div>
          </div>
          <span className="bg-dz-leaf-soft text-dz-leaf-ink rounded-full px-3 py-1.5 text-[13px] font-semibold">
            {t('dashboard.statusOnTrack')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dz-paper rounded-2xl p-4">
            <div className="font-display text-[2.375rem] leading-[1.2] font-bold">
              {t('dashboard.attendanceValue')}
            </div>
            <div className="text-dz-ink-soft text-[13px]">{t('dashboard.attendanceLabel')}</div>
          </div>
          <div className="bg-dz-paper rounded-2xl p-4">
            <div className="font-display text-[2.375rem] leading-[1.2] font-bold">
              {t('dashboard.timeValue')}
            </div>
            <div className="text-dz-ink-soft text-[13px]">{t('dashboard.timeLabel')}</div>
          </div>
        </div>

        <div>
          <div className="text-dz-ink-soft mb-2 text-[13px] font-semibold">
            {t('dashboard.heatmapLabel')}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {ATTENDANCE_MATRIX.flat().map((state, index) => (
              <span
                key={index}
                className={cn('aspect-square rounded-md', CELL_STYLES[String(state)])}
              />
            ))}
          </div>
          <div className="text-dz-ink-soft mt-2.5 flex gap-3.5 text-[13px]">
            {LEGEND_STYLES.map((tone, index) => (
              <span key={index} className="flex items-center gap-1.5">
                <span className={cn('size-2.5 rounded-sm', tone)} />
                {t(`dashboard.legend.${index}`)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {TIME_ON_TASK.map((percent, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <span className="w-[90px] shrink-0">{t(`dashboard.courses.${index}.name`)}</span>
              <span className="bg-dz-sand h-2 flex-1 overflow-hidden rounded-full">
                <span
                  className="bg-dz-terracotta block h-full rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-dz-ink-soft w-16 shrink-0 text-end">
                {t(`dashboard.courses.${index}.time`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <Eyebrow>{t('badge')}</Eyebrow>
        <DisplayHeading>{t('title')}</DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description')}</p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-7 gap-y-5">
          {BENEFIT_INDEXES.map((index) => (
            <div key={index} className="border-dz-ink border-t-2 pt-3">
              <div className="mb-1 font-semibold">{t(`benefits.${index}.title`)}</div>
              <div className="text-dz-ink-soft text-sm">{t(`benefits.${index}.description`)}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export default ParentsAttendanceSection;
