import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Surface tones of the public site. The design alternates paper and raised
 * panels, then breaks the rhythm with a full-bleed cocoa band.
 */
export type SectionTone = 'paper' | 'raised' | 'sand' | 'cocoa';

const TONE_STYLES: Record<SectionTone, string> = {
  paper: 'bg-dz-paper text-dz-ink',
  raised: 'border-dz-line bg-dz-paper-raised text-dz-ink border-y',
  sand: 'bg-dz-sand text-dz-ink',
  cocoa: 'bg-dz-cocoa text-dz-cocoa-ink',
};

interface SectionShellProps {
  children: ReactNode;
  /** Anchor target for the in-page nav links. */
  id?: string;
  tone?: SectionTone;
  className?: string;
  /** Inner wrapper classes — use for the section's own grid or flow. */
  innerClassName?: string;
  as?: ElementType;
}

/**
 * Full-bleed band plus the site's 1240px reading column. Every public section
 * sits in one of these so gutters and vertical rhythm stay identical.
 */
function SectionShell({
  children,
  id,
  tone = 'paper',
  className,
  innerClassName,
  as: Tag = 'section',
}: SectionShellProps) {
  return (
    <Tag id={id} className={cn('w-full', TONE_STYLES[tone], className)}>
      <div className={cn('mx-auto w-full max-w-[1240px] px-6 py-20 md:py-24', innerClassName)}>
        {children}
      </div>
    </Tag>
  );
}

export default SectionShell;
