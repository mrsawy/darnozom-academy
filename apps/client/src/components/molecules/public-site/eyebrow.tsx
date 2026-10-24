import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EyebrowProps {
  children: ReactNode;
  className?: string;
  /** Cocoa bands swap the terracotta label for the lighter tan. */
  onDark?: boolean;
}

/** The small coloured kicker that labels every section in the design. */
function Eyebrow({ children, className, onDark = false }: EyebrowProps) {
  return (
    <p
      className={cn(
        'text-sm font-semibold',
        onDark ? 'text-dz-tan' : 'text-dz-terracotta',
        className
      )}>
      {children}
    </p>
  );
}

export default Eyebrow;
