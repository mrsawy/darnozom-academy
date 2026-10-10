'use client';

import { useTranslations } from 'next-intl';
import { Table } from '@/components/atoms/table';
import { Button } from '@/components/atoms/button';

export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalDocs: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

interface ResourceTableProps {
  isLoading: boolean;
  error?: Error | null;
  isEmpty: boolean;
  emptyKey: string;
  pagination: PaginationInfo | null;
  paginationKey: string;
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export function ResourceTable({
  isLoading,
  error,
  isEmpty,
  emptyKey,
  pagination,
  paginationKey,
  onPrev,
  onNext,
  children,
}: ResourceTableProps) {
  const t = useTranslations('AdminDashboard');

  if (isLoading)
    return <div className="text-muted-foreground py-4">{t('emptyStates.loading')}</div>;
  if (error) return <div className="text-destructive py-4">{error.message}</div>;
  if (isEmpty)
    return <div className="text-muted-foreground py-4">{t(`emptyStates.${emptyKey}`)}</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>{children}</Table>
      </div>
      {pagination ? (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t(paginationKey, {
              page: pagination.page,
              totalPages: pagination.totalPages,
              totalDocs: pagination.totalDocs,
            })}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!pagination.hasPrevPage} onClick={onPrev}>
              {t('buttons.previous')}
            </Button>
            <Button size="sm" variant="outline" disabled={!pagination.hasNextPage} onClick={onNext}>
              {t('buttons.next')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
