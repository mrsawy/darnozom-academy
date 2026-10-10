'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { IconEdit } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/atoms/skeleton';
import { EditChildDialog } from './edit-child-dialog';
import type { IChild } from '@/lib/types/parent/parent-children.interface';

interface ChildrenTableProps {
  items: IChild[];
  isLoading: boolean;
}

function ChildrenTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ChildrenTable({ items, isLoading }: ChildrenTableProps) {
  const t = useTranslations('ParentDashboard.children');
  const [editChild, setEditChild] = useState<IChild | null>(null);

  const columns: ColumnDef<IChild>[] = [
    {
      accessorKey: 'firstName',
      header: t('table.name'),
      cell: ({ row }) => (
        <span>
          {row.original.firstName ?? ''} {row.original.lastName ?? ''}
        </span>
      ),
    },
    {
      accessorKey: 'username',
      header: t('table.username'),
    },
    {
      accessorKey: 'email',
      header: t('table.email'),
    },
    {
      accessorKey: 'phone',
      header: t('table.phone'),
    },
    {
      accessorKey: 'status',
      header: t('table.status'),
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setEditChild(row.original)}>
          <IconEdit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading) return <ChildrenTableSkeleton />;

  return (
    <>
      <DataTable columns={columns} data={items} />
      <EditChildDialog open={!!editChild} child={editChild} onClose={() => setEditChild(null)} />
    </>
  );
}
