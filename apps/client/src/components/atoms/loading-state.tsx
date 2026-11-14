import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Replaces plain "Loading…" text. A large, centred spinner that announces itself to assistive tech
 * (`role="status"` + `aria-busy`) without printing any words.
 *
 * - default: centred inside its container (cards, tables, dialogs)
 * - `fullPage`: centred in the middle of the viewport area, for screens that have nothing else to show yet
 *
 * Use `Skeleton` instead when the final layout is known (headings, rows of a table).
 */
function LoadingState({
  className,
  spinnerClassName,
  label,
  fullPage = false,
}: {
  className?: string;
  spinnerClassName?: string;
  /** Accessible name for screen readers (not shown). */
  label?: string;
  fullPage?: boolean;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-slot="loading-state"
      className={cn(
        'flex w-full items-center justify-center py-10',
        fullPage && 'min-h-[60vh]',
        className
      )}>
      <Loader2 className={cn('text-primary size-12 animate-spin', spinnerClassName)} aria-hidden />
    </div>
  );
}

export { LoadingState };
