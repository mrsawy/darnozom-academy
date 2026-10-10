'use client';

import type { TooltipRenderProps } from 'react-joyride';

import { Button } from '@/components/atoms/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import { cn } from '@/lib/utils';

export function JoyrideOnboardingTooltip({
  backProps,
  continuous,
  index,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
  size,
}: TooltipRenderProps) {
  const isCentered = step.placement === 'center' || step.target === 'body';
  const isHeaderCta =
    typeof step.target === 'string' &&
    (step.target.includes('org-create-user') || step.target.includes('org-create-course'));

  return (
    <div
      {...tooltipProps}
      className={cn(
        'outline-none',
        isCentered
          ? 'w-[min(100vw-2rem,28rem)]'
          : isHeaderCta
            ? 'w-[min(100vw-2rem,24rem)]'
            : 'w-[min(100vw-2rem,22rem)]'
      )}>
      <Card
        className={cn(
          'border-border bg-card text-card-foreground gap-0 overflow-hidden py-0 shadow-2xl',
          isCentered && 'ring-border/60 ring-1',
          isHeaderCta && 'border-primary/40 ring-primary/25 shadow-primary/20 ring-2'
        )}>
        <CardHeader className={cn('gap-2 px-6 pt-6', isCentered || isHeaderCta ? 'pb-4' : 'pb-3')}>
          {step.title ? (
            <CardTitle
              className={cn(
                'text-card-foreground leading-snug font-semibold',
                isCentered || isHeaderCta ? 'text-lg' : 'text-base'
              )}>
              {step.title}
            </CardTitle>
          ) : null}
          {step.content ? (
            <CardDescription
              className={cn(
                'text-muted-foreground leading-relaxed',
                isHeaderCta ? 'text-[0.9375rem]' : 'text-sm'
              )}>
              {step.content}
            </CardDescription>
          ) : null}
        </CardHeader>

        <CardContent className="px-6 pb-3">
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-300"
              style={{ width: `${((index + 1) / size) * 100}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs tabular-nums">
            {index + 1} / {size}
          </p>
        </CardContent>

        <CardFooter className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-t px-6 py-4">
          <Button type="button" variant="ghost" size="sm" {...skipProps}>
            {skipProps.title}
          </Button>

          <div className="flex items-center gap-2">
            {index > 0 ? (
              <Button type="button" variant="outline" size="sm" {...backProps}>
                {backProps.title}
              </Button>
            ) : null}
            {continuous ? (
              <Button type="button" size="sm" {...primaryProps}>
                {primaryProps.title}
              </Button>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
