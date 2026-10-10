'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { useLocale } from 'next-intl';

import { cn } from '@/lib/utils';

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  // For LTR: translateX(-X%) moves from left to right
  // For RTL: translateX(X%) moves from right to left
  const translateValue = 100 - (value ?? 0);
  const transform = isRTL ? `translateX(${translateValue}%)` : `translateX(-${translateValue}%)`;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
