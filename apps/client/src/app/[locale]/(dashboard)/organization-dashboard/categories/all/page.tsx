'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { IconSearch } from '@tabler/icons-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAllApprovedCategories } from '@/lib/hooks/category/use-category.hook';
import { ICategory } from '@/lib/types/category/ICategory';
import { useTranslations } from 'next-intl';

export default function AllCategoriesPage() {
  const t = useTranslations('AllCategoriesPage');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useAllApprovedCategories({ search, page, limit });

  const columns: ColumnDef<ICategory>[] = [
    {
      accessorKey: 'name',
      header: t('name'),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'description',
      header: t('description'),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description ?? t('noDescription')}
        </span>
      ),
    },
    {
      accessorKey: 'coursesCount',
      header: t('coursesCount'),
      cell: ({ row }) => <span className="text-center">{row.original.coursesCount ?? 0}</span>,
    },
    {
      accessorKey: 'instructorsCount',
      header: t('instructorsCount'),
      cell: ({ row }) => <span className="text-center">{row.original.instructorsCount ?? 0}</span>,
    },
  ];

  if (error) {
    return <div className="p-8 text-red-500">{t('error')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-5">
        <div>
          <h2 className="text-xl font-medium">{t('title')}</h2>
          <p className="mt-1 text-sm text-gray-600">{t('description')}</p>
        </div>
      </div>

      <div className="px-5">
        <div className="relative max-w-sm">
          <IconSearch className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      <DataTable<ICategory>
        data={data?.docs ?? []}
        columns={columns}
        getRowId={(row) => row._id}
        isLoading={isLoading}
      />

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-5 pb-5">
        <p className="text-muted-foreground text-sm">
          {t('total', { count: data?.totalDocs ?? 0 })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.hasPrevPage}>
            <ChevronLeft className="h-4 w-4" />
            {t('previous')}
          </Button>
          <span className="text-muted-foreground text-sm">
            {t('pageOf', { page, totalPages: data?.totalPages ?? 1 })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.hasNextPage}>
            {t('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
