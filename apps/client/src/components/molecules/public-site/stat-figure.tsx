import { cn } from '@/lib/utils';

interface StatFigureProps {
  value: string;
  label: string;
  className?: string;
  /** Cocoa bands need the lighter label tone. */
  onDark?: boolean;
}

/** Big Naskh numeral over a quiet caption — the hero's proof strip. */
function StatFigure({ value, label, className, onDark = false }: StatFigureProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="font-display text-[2.125rem] leading-[1.2] font-bold">{value}</div>
      <div className={cn('text-[13px]', onDark ? 'text-dz-cocoa-soft' : 'text-dz-ink-soft')}>
        {label}
      </div>
    </div>
  );
}

export default StatFigure;
