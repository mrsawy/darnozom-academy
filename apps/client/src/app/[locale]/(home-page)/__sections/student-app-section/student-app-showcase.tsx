'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { cn } from '@/lib/utils';
import { useElementIsVisible } from '@/lib/hooks/use-element-is-visible';
import {
  ANCHOR_HOME_STUDENT_APP,
  URL_APP_STORE,
  URL_GOOGLE_PLAY,
} from '@/lib/data/constants/routes.constants';
import { APP_SCREENS, SCREEN_COUNT } from './student-app-screens';

const ADVANCE_MS = 3600;
const FEATURE_INDEXES = [0, 1, 2, 3] as const;

interface PhoneProps {
  /** Index into APP_SCREENS currently shown in this device. */
  activeIndex: number;
  widthClassName: string;
  className?: string;
  /** Only the lead device announces its screen; the trailing one is decorative. */
  isDecorative?: boolean;
}

/**
 * One device. The mockup PNGs already carry the phone bezel, so there is no
 * frame here — every screen is stacked and cross-faded in place.
 */
function Phone({ activeIndex, widthClassName, className, isDecorative = false }: PhoneProps) {
  const t = useTranslations('StudentAppSection');

  return (
    <div className={cn('relative aspect-1086/1448', widthClassName, className)}>
      {APP_SCREENS.map((screen, index) => (
        <Image
          key={screen}
          src={screen}
          alt={isDecorative ? '' : t(`screens.${index}.alt`)}
          aria-hidden={isDecorative || index !== activeIndex}
          fill
          sizes="260px"
          className={cn(
            'object-contain transition-opacity duration-700',
            index === activeIndex ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}
    </div>
  );
}

function StudentAppShowcase() {
  const t = useTranslations('StudentAppSection');
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useElementIsVisible(sectionRef, { threshold: 0.35 });
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const timer = globalThis.setInterval(() => {
      setCursor((current) => (current + 1) % SCREEN_COUNT);
    }, ADVANCE_MS);
    return () => globalThis.clearInterval(timer);
  }, [isVisible]);

  return (
    <SectionShell
      id={ANCHOR_HOME_STUDENT_APP.slice(1)}
      tone="paper"
      innerClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-14">
      <div ref={sectionRef} className="flex justify-center gap-4">
        <Phone activeIndex={cursor} widthClassName="w-[min(100%,260px)]" />
        <Phone
          activeIndex={(cursor + 1) % SCREEN_COUNT}
          widthClassName="w-[min(100%,220px)]"
          className="mt-15"
          isDecorative
        />
      </div>

      <div className="flex flex-col gap-5">
        <Eyebrow>{t('badge')}</Eyebrow>
        <DisplayHeading>{t('title')}</DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description')}</p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {FEATURE_INDEXES.map((index) => (
            <div key={index} className="bg-dz-paper-raised border-dz-line rounded-2xl border p-4.5">
              <div className="mb-1.5 font-semibold">{t(`features.${index}.title`)}</div>
              <div className="text-dz-ink-soft text-sm">{t(`features.${index}.description`)}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <a
            href={URL_APP_STORE}
            className="bg-dz-ink text-dz-paper-raised hover:bg-dz-ink/90 inline-flex items-center rounded-xl px-4.5 py-3 text-sm font-semibold transition-colors">
            {t('stores.appStore')}
          </a>
          <a
            href={URL_GOOGLE_PLAY}
            className="bg-dz-ink text-dz-paper-raised hover:bg-dz-ink/90 inline-flex items-center rounded-xl px-4.5 py-3 text-sm font-semibold transition-colors">
            {t('stores.googlePlay')}
          </a>
        </div>
      </div>
    </SectionShell>
  );
}

export default StudentAppShowcase;
