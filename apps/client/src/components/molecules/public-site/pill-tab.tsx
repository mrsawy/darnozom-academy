'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * `outline` is the bordered filter pill (roles, course categories), `soft` sits on
 * a paper card (assistant conversation tabs), `ghost` lives inside a filled track
 * (the pricing billing switch).
 */
type PillVariant = 'outline' | 'soft' | 'ghost';

const VARIANT_STYLES: Record<PillVariant, { active: string; idle: string }> = {
  outline: {
    active: 'border-dz-ink bg-dz-ink text-dz-paper-raised',
    idle: 'border-dz-line-strong text-dz-ink hover:border-dz-ink bg-transparent',
  },
  soft: {
    active: 'border-transparent bg-dz-ink text-dz-paper-raised',
    idle: 'border-transparent bg-dz-paper text-dz-ink hover:bg-dz-sand',
  },
  ghost: {
    active: 'border-transparent bg-dz-ink text-dz-paper-raised',
    idle: 'border-transparent bg-transparent text-dz-ink hover:bg-dz-paper-raised/60',
  },
};

const SIZE_STYLES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-[15px]',
} as const;

interface PillTabProps {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  variant?: PillVariant;
  size?: keyof typeof SIZE_STYLES;
  className?: string;
}

/** The pill control the design reuses for every tab strip and filter row. */
function PillTab({
  children,
  isActive,
  onClick,
  variant = 'outline',
  size = 'md',
  className,
}: PillTabProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'focus-visible:ring-dz-terracotta focus-visible:ring-offset-dz-paper cursor-pointer rounded-full border font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        SIZE_STYLES[size],
        isActive ? styles.active : styles.idle,
        className
      )}>
      {children}
    </button>
  );
}

export default PillTab;
