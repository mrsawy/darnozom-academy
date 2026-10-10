'use client';

import { Card, CardContent } from '@/components/atoms/card';
import { InfoCardSkeleton } from './infocard.skeleton';
import { cn } from '@/lib/utils';

export interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  isLoading?: boolean;
  countClassName?: string;
  iconClassName?: string;
}

export function InfoCard({
  title,
  icon,
  count,
  isLoading = false,
  countClassName,
  iconClassName,
}: InfoCardProps) {
  if (isLoading) {
    return <InfoCardSkeleton />;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className={cn('text-2xl font-bold', countClassName)}>{count ?? 0}</p>
          </div>
          <span className={cn('flex shrink-0 [&>svg]:h-8 [&>svg]:w-8', iconClassName)}>{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}
