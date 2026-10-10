'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { Badge } from '@/components/atoms/badge';
import {
  useOrganizationUsers,
  useDeleteOrganizationUser,
  useSuspendUser,
  useUnsuspendUser,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type { IAdminUser } from '@/lib/types/admin-review/admin-review.interface';
import { ResourceTable } from './resource-table';
import { DeleteButton } from './delete-button';
import { SuspendButton } from './suspend-button';

interface UsersTabProps {
  orgId: string;
}

export function UsersTab({ orgId }: UsersTabProps) {
  const t = useTranslations('AdminDashboard');
  const [page, setPage] = useState(1);
  const options = { page, limit: 10 };

  const { data: users, isLoading, error } = useOrganizationUsers(orgId, options);
  const deleteUser = useDeleteOrganizationUser(orgId);
  const suspendUser = useSuspendUser(orgId);
  const unsuspendUser = useUnsuspendUser(orgId);

  return (
    <ResourceTable
      isLoading={isLoading}
      error={error}
      isEmpty={!users || users.docs.length === 0}
      emptyKey="noUsers"
      pagination={
        users
          ? {
              page: users.page,
              totalPages: users.totalPages,
              totalDocs: users.totalDocs,
              hasPrevPage: users.hasPrevPage,
              hasNextPage: users.hasNextPage,
            }
          : null
      }
      paginationKey="paginationUsers"
      onPrev={() => setPage((p) => p - 1)}
      onNext={() => setPage((p) => p + 1)}>
      <TableHeader>
        <TableRow>
          <TableHead>{t('table.name')}</TableHead>
          <TableHead>{t('table.email')}</TableHead>
          <TableHead>{t('table.role')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.joined')}</TableHead>
          <TableHead>{t('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users?.docs.map((user: IAdminUser) => (
          <TableRow key={user._id}>
            <TableCell className="font-medium">
              {user.firstName} {user.lastName}
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant="outline">{user.roleName}</Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  user.status === 'SUSPENDED'
                    ? 'destructive'
                    : user.status === 'ACTIVE'
                      ? 'default'
                      : 'secondary'
                }>
                {user.status}
              </Badge>
            </TableCell>
            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <SuspendButton
                  isSuspended={user.status === 'SUSPENDED'}
                  onSuspend={() => suspendUser.mutate(user._id)}
                  onUnsuspend={() => unsuspendUser.mutate(user._id)}
                  isPending={suspendUser.isPending || unsuspendUser.isPending}
                />
                <DeleteButton
                  onConfirm={() => deleteUser.mutate(user._id)}
                  isPending={deleteUser.isPending}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResourceTable>
  );
}
