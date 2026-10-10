'use client';

import { HERO_FEATURE_ICONS } from '@/lib/data/hero-feature-icons';
import LogoLoop, { type LogoItem } from './LogoLoop';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useIsMobile } from '@/lib/hooks/use-mobile';
export interface LogoLoopOrganProps {
  /**
   * Items to show in the loop (desktop) and carousel (mobile).
   * Each entry is either `{ node, title?, ariaLabel?, href? }` for custom UI / icons
   * or `{ src, alt?, ... }` for images — same shape as `LogoLoop`.
   */
  items?: LogoItem[];
  /** Overrides the default translated region label when `items` is omitted. */
  ariaLabel?: string;
  /** Mobile carousel auto-advance interval in ms until the user interacts. */
  mobileAutoScrollIntervalMs?: number;
}

function LogoLoopOrgan({
  items: itemsProp,
  ariaLabel: ariaLabelProp,
  mobileAutoScrollIntervalMs: _mobileAutoScrollIntervalMs,
}: LogoLoopOrganProps = {}) {
  const { theme } = useTheme();
  const t = useTranslations('Hero');

  const isDark = theme == 'dark';

  const defaultItems = useMemo(
    () =>
      HERO_FEATURE_ICONS.map(({ Icon, labelKey }) => {
        const label = t(labelKey);
        return {
          node: (
            <div className="group flex flex-col items-center gap-1.5">
              <div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2.5 transition-colors">
                <Icon className="text-primary h-7 w-7" />
              </div>
              <span className="text-muted-foreground max-w-[120px] text-center text-xs font-medium">
                {label}
              </span>
            </div>
          ),
          title: label,
          ariaLabel: label,
        } satisfies LogoItem;
      }),
    [t]
  );

  const items = itemsProp ?? defaultItems;
  const ariaLabel = ariaLabelProp ?? t('featuresLoopAria');
  const isMobile = useIsMobile();

  return (
    <div className="ltr relative my-12 h-[200px] overflow-hidden">
      <LogoLoop
        logos={items}
        speed={isMobile ? 80 : 120}
        direction="left"
        logoHeight={100}
        gap={isMobile ? 30 : 50}
        pauseOnHover
        scaleOnHover
        fadeOut={!isMobile}
        fadeOutColor={isDark ? '#ffffff' : '#000'}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}
export default LogoLoopOrgan;
