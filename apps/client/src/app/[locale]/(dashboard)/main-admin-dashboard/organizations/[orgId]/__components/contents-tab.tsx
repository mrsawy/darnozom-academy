'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { Badge } from '@/components/atoms/badge';
import {
  useOrganizationContents,
  useDeleteOrganizationContent,
  useSuspendContent,
  useUnsuspendContent,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type { IAdminContent } from '@/lib/types/admin-review/admin-review.interface';
import { ApprovalStatusBadge } from '../../../__components/ApprovalStatusBadge';
import { ResourceTable } from './resource-table';
import { DeleteButton } from './delete-button';
import { SuspendButton } from './suspend-button';
import { EntityStatusBadge } from './entity-status-badge';

interface ContentsTabProps {
  orgId: string;
}

export function ContentsTab({ orgId }: ContentsTabProps) {
  const t = useTranslations('AdminDashboard');
  const [page, setPage] = useState(1);
  const options = { page, limit: 10 };

  const { data: contents, isLoading } = useOrganizationContents(orgId, options);
  const deleteContent = useDeleteOrganizationContent(orgId);
  const suspendContent = useSuspendContent(orgId);
  const unsuspendContent = useUnsuspendContent(orgId);

  return (
    <ResourceTable
      isLoading={isLoading}
      isEmpty={!contents || contents.docs.length === 0}
      emptyKey="noContents"
      pagination={
        contents
          ? {
              page: contents.page,
              totalPages: contents.totalPages,
              totalDocs: contents.totalDocs,
              hasPrevPage: contents.hasPrevPage,
              hasNextPage: contents.hasNextPage,
            }
          : null
      }
      paginationKey="paginationContents"
      onPrev={() => setPage((p) => p - 1)}
      onNext={() => setPage((p) => p + 1)}>
      <TableHeader>
        <TableRow>
          <TableHead>{t('table.title')}</TableHead>
          <TableHead>{t('table.type')}</TableHead>
          <TableHead>{t('table.course')}</TableHead>
          <TableHead>{t('table.module')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.approvalStatus')}</TableHead>
          <TableHead>{t('table.created')}</TableHead>
          <TableHead>{t('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contents?.docs.map((content: IAdminContent) => (
          <TableRow key={content._id}>
            <TableCell className="font-medium">{content.title}</TableCell>
            <TableCell>
              <Badge variant="secondary">{content.type}</Badge>
            </TableCell>
            <TableCell>
              {typeof content.courseId === 'object' && content.courseId
                ? content.courseId.name
                : '—'}
            </TableCell>
            <TableCell>
              {typeof content.moduleId === 'object' && content.moduleId
                ? content.moduleId.title
                : '—'}
            </TableCell>
            <TableCell>
              <EntityStatusBadge status={content.status} />
            </TableCell>
            <TableCell>
              <ApprovalStatusBadge status={content.approvalStatus} />
            </TableCell>
            <TableCell>{new Date(content.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <SuspendButton
                  isSuspended={content.status === 'SUSPENDED'}
                  onSuspend={() => suspendContent.mutate(content._id)}
                  onUnsuspend={() => unsuspendContent.mutate(content._id)}
                  isPending={suspendContent.isPending || unsuspendContent.isPending}
                />
                <DeleteButton
                  onConfirm={() => deleteContent.mutate(content._id)}
                  isPending={deleteContent.isPending}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResourceTable>
  );
}
