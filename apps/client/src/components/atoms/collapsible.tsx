'use client';

import * as React from 'react';

import { Collapsible as CollapsiblePrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

const COLLAPSIBLE_MOTION_DEFAULT_MS = 280;

function mergeCollapsibleRootStyle(style?: React.CSSProperties): React.CSSProperties {
  const ms = `${COLLAPSIBLE_MOTION_DEFAULT_MS}ms`;
  const defaults: React.CSSProperties = {
    '--animation-duration': ms,
    '--collapsible-duration': ms,
    '--collapsible-ease-out': 'cubic-bezier(0.33, 1, 0.68, 1)',
    '--collapsible-ease-in': 'cubic-bezier(0.32, 0, 0.67, 0)',
  } as React.CSSProperties;

  if (!style) {
    return defaults;
  }

  const merged = { ...defaults, ...style } as Record<string, string | number | undefined>;
  const animFromUser = style['--animation-duration' as keyof typeof style];
  const durationFromUser = style['--collapsible-duration' as keyof typeof style];
  if (animFromUser != null && durationFromUser == null) {
    merged['--collapsible-duration'] =
      typeof animFromUser === 'number' ? `${animFromUser}ms` : String(animFromUser);
  }

  return merged as React.CSSProperties;
}

const Collapsible = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>(({ style, ...props }, ref) => (
  <CollapsiblePrimitive.Root
    ref={ref}
    {...props}
    data-slot="collapsible"
    data-no-click-spark=""
    style={mergeCollapsibleRootStyle(style)}
  />
));
Collapsible.displayName = 'Collapsible';

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
      className={cn('cursor-pointer', props.className)}
    />
  );
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden ease-out outline-none',
        'data-[state=closed]:animate-collapsible-up',
        'data-[state=open]:animate-collapsible-down',
        'data-[state=closed]:fill-mode-forwards',
        'data-[state=closed]:pointer-events-none',
        'data-[state=open]:duration-(--animation-duration)',
        'data-[state=closed]:duration-(--animation-duration)',
        className
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
