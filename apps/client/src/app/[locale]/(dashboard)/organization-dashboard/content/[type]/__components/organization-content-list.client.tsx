'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { CourseContentType } from '@darnozom/shared-types';
import { Link } from '@/i18n/navigation';
import { useOrganizationContentsList } from '@/lib/hooks/course/content/use-organization-contents-list';
import { ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT } from '@/lib/data/constants/routes.constants';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import type { IContent } from '@/lib/types/course/content.interface';

export function OrganizationContentListSection({
  contentType,
}: {
  contentType: CourseContentType;
}) {
  const t = useTranslations('OrgContentList');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [contentType]);

  const { data, isLoading, isError, error, refetch } = useOrganizationContentsList({
    type: contentType,
    page,
    limit: pageSize,
  });

  const title = t(`typeTitles.${contentType}`);

  const columns: ColumnDef<IContent>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: t('columns.title'),
        cell: ({ row }) => (
          <span className="max-w-[min(100%,320px)] truncate font-medium">{row.original.title}</span>
        ),
        enableHiding: false,
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.created'),
        cell: ({ row }) => {
          const created = row.original.createdAt;
          return (
            <span className="text-muted-foreground">
              {created ? format(new Date(created), 'PP', { locale: dateLocale }) : '—'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT(
                row.original.courseId,
                row.original.moduleId,
                row.original._id
              )}
              className="inline-flex items-center gap-1">
              <span>{t('open')}</span>
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </Button>
        ),
        enableHiding: false,
      },
    ],
    [t, dateLocale]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{t('description', { typeLabel: title })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isError ? (
          <div className="text-destructive flex flex-col gap-2 text-sm">
            <p>
              {error instanceof Error
                ? translateApiMessage(error.message, tErrors)
                : t('loadFailed')}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : null}

        <DataTable<IContent>
          data={data?.docs ?? []}
          columns={columns}
          getRowId={(row) => row._id?.toString() ?? ''}
          manualPagination
          pageCount={data?.totalPages ?? 1}
          pagination={{ pageIndex: page - 1, pageSize }}
          onPaginationChange={({ pageIndex, pageSize: newSize }) => {
            setPage(pageIndex + 1);
            setPageSize(newSize);
          }}
          isLoading={isLoading}
          enableRowSelection={false}
        />
      </CardContent>
    </Card>
  );
}
