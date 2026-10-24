'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import PillTab from '@/components/molecules/public-site/pill-tab';
import { ANCHOR_HOME_AUDIENCE } from '@/lib/data/constants/routes.constants';

const ROLE_INDEXES = [0, 1, 2, 3] as const;
const BULLET_INDEXES = [0, 1, 2] as const;
const AUTO_ROTATE_MS = 6000;

function AudienceSection() {
  const t = useTranslations('AudienceSection');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPinned, setIsPinned] = useState(false);

  // Cycles the four roles until the visitor picks one, so each audience gets
  // seen without a click.
  useEffect(() => {
    if (isPinned) return;
    const timer = globalThis.setInterval(() => {
      setActiveIndex((current) => (current + 1) % ROLE_INDEXES.length);
    }, AUTO_ROTATE_MS);
    return () => globalThis.clearInterval(timer);
  }, [isPinned]);

  const selectRole = useCallback((index: number) => {
    setActiveIndex(index);
    setIsPinned(true);
  }, []);

  return (
    <SectionShell
      id={ANCHOR_HOME_AUDIENCE.slice(1)}
      tone="raised"
      innerClassName="flex flex-col gap-10">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-end gap-6">
        <div className="flex flex-col gap-2.5">
          <Eyebrow>{t('badge')}</Eyebrow>
          <DisplayHeading>{t('title')}</DisplayHeading>
        </div>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_INDEXES.map((index) => (
          <PillTab
            key={index}
            size="lg"
            isActive={index === activeIndex}
            onClick={() => selectRole(index)}>
            {t(`roles.${index}.label`)}
          </PillTab>
        ))}
      </div>

      <div className="bg-dz-paper border-dz-line grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-8 rounded-3xl border p-9">
        {/* Both columns are stacked per role in one grid cell so the panel keeps
            the height of the tallest role and switching cross-fades in place. */}
        <div className="grid">
          {ROLE_INDEXES.map((index) => (
            <div
              key={index}
              aria-hidden={index !== activeIndex}
              className={
                index === activeIndex
                  ? 'col-start-1 row-start-1 flex flex-col gap-3.5 opacity-100 transition-opacity duration-500'
                  : 'pointer-events-none col-start-1 row-start-1 flex flex-col gap-3.5 opacity-0 transition-opacity duration-500'
              }>
              <DisplayHeading as="h3" scale="card">
                {t(`roles.${index}.title`)}
              </DisplayHeading>
              <p className="text-dz-ink-soft m-0">{t(`roles.${index}.tagline`)}</p>
              <p className="border-dz-line text-dz-ink-soft m-0 mt-3 border-t pt-3.5 text-sm">
                <strong className="text-dz-ink">{t('whyLabel')}</strong> {t('whyItMatters')}
              </p>
            </div>
          ))}
        </div>

        <div className="grid">
          {ROLE_INDEXES.map((index) => (
            <ol
              key={index}
              aria-hidden={index !== activeIndex}
              className={
                index === activeIndex
                  ? 'col-start-1 row-start-1 m-0 flex list-none flex-col p-0 opacity-100 transition-opacity duration-500'
                  : 'pointer-events-none col-start-1 row-start-1 m-0 flex list-none flex-col p-0 opacity-0 transition-opacity duration-500'
              }>
              {BULLET_INDEXES.map((bulletIndex) => (
                <li
                  key={bulletIndex}
                  className="border-dz-line flex gap-4 border-b py-4 last:border-b-0">
                  <span className="font-display text-dz-terracotta w-7 shrink-0 text-[22px] leading-[1.4] font-bold">
                    {`0${bulletIndex + 1}`}
                  </span>
                  <span className="text-base">{t(`roles.${index}.bullets.${bulletIndex}`)}</span>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export default AudienceSection;
