import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * `hero` is reserved for the single h1 on a page; `section` is the h2 scale every
 * other band uses; `card` is the in-panel h3.
 */
type DisplayScale = 'hero' | 'section' | 'card';

const SCALE_STYLES: Record<DisplayScale, string> = {
  hero: 'text-[clamp(2.5rem,5.4vw,4.25rem)] leading-[1.3]',
  section: 'text-[clamp(1.875rem,3.6vw,2.875rem)] leading-[1.35]',
  card: 'text-[clamp(1.5rem,2.2vw,1.875rem)] leading-[1.4]',
};

interface DisplayHeadingProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  scale?: DisplayScale;
  className?: string;
}

/** Naskh display heading — the single strongest brand signal on the page. */
function DisplayHeading({
  children,
  as: Tag = 'h2',
  scale = 'section',
  className,
}: DisplayHeadingProps) {
  return (
    <Tag className={cn('font-display m-0 font-bold text-balance', SCALE_STYLES[scale], className)}>
      {children}
    </Tag>
  );
}

export default DisplayHeading;
