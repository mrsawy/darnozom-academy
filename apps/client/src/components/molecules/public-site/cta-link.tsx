import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * `terracotta` is the single primary action per band, `ink` the near-black
 * variant the header uses, `outline` the quiet companion, and `paper` the
 * inverted button that sits on cocoa or terracotta fills.
 */
type CtaVariant = 'terracotta' | 'ink' | 'outline' | 'paper' | 'outlineOnDark';

const VARIANT_STYLES: Record<CtaVariant, string> = {
  terracotta:
    'bg-dz-terracotta text-dz-paper-raised hover:bg-dz-terracotta-deep border-transparent',
  ink: 'bg-dz-ink text-dz-paper-raised hover:bg-dz-ink/90 border-transparent',
  outline: 'border-dz-line-strong text-dz-ink hover:border-dz-ink bg-transparent',
  paper: 'bg-dz-paper-raised text-dz-ink hover:bg-dz-sand border-transparent',
  outlineOnDark: 'border-dz-paper-raised/60 text-dz-paper-raised hover:bg-dz-paper-raised/10',
};

const SIZE_STYLES = {
  sm: 'px-4 py-2.5 text-sm',
  md: 'px-[26px] py-3.5 text-base',
} as const;

interface CtaLinkProps extends Omit<ComponentProps<typeof Link>, 'className' | 'children'> {
  children: ReactNode;
  variant?: CtaVariant;
  size?: keyof typeof SIZE_STYLES;
  className?: string;
}

/** Pill call-to-action — the only button shape the public site uses. */
function CtaLink({
  children,
  variant = 'terracotta',
  size = 'md',
  className,
  ...linkProps
}: CtaLinkProps) {
  return (
    <Link
      {...linkProps}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border font-semibold whitespace-nowrap transition-colors duration-200',
        SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        className
      )}>
      {children}
    </Link>
  );
}

export default CtaLink;
