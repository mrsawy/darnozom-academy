'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { Badge } from '@/components/atoms/badge';
import {
  useOrganizationModuleContents,
  useSuspendContent,
  useUnsuspendContent,
  useAdminSetContentActiveStatus,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ActiveToggle } from '@/components/molecules/active-toggle';
import type { IAdminContent } from '@/lib/types/admin-review/admin-review.interface';
import { ApprovalStatusBadge } from '../../../../../../../__components/ApprovalStatusBadge';
import { ResourceTable } from '../../../../../__components/resource-table';
import { SuspendButton } from '../../../../../__components/suspend-button';
import { EntityStatusBadge } from '../../../../../__components/entity-status-badge';

interface ModuleContentsTableProps {
  orgId: string;
  courseId: string;
  moduleId: string;
}

export function ModuleContentsTable({ orgId, courseId, moduleId }: ModuleContentsTableProps) {
  const t = useTranslations('AdminDashboard');
  const [page, setPage] = useState(1);
  const options = { page, limit: 10 };

  const { data: contents, isLoading } = useOrganizationModuleContents(orgId, moduleId, options);
  const suspendContent = useSuspendContent(orgId);
  const unsuspendContent = useUnsuspendContent(orgId);
  const setContentActiveStatus = useAdminSetContentActiveStatus({ orgId, moduleId });

  return (
    <ResourceTable
      isLoading={isLoading}
      isEmpty={!contents || contents.docs.length === 0}
      emptyKey="noModuleContents"
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
      paginationKey="paginationModuleContents"
      onPrev={() => setPage((p) => p - 1)}
      onNext={() => setPage((p) => p + 1)}>
      <TableHeader>
        <TableRow>
          <TableHead>{t('table.title')}</TableHead>
          <TableHead>{t('table.type')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.approvalStatus')}</TableHead>
          <TableHead>{t('table.activeStatus')}</TableHead>
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
              <EntityStatusBadge status={content.status} />
            </TableCell>
            <TableCell>
              <ApprovalStatusBadge status={content.approvalStatus} />
            </TableCell>
            <TableCell>
              <ActiveToggle
                activeStatus={content.activeStatus}
                isPending={
                  setContentActiveStatus.isPending
                    ? setContentActiveStatus.variables?.contentId === content._id
                    : null
                }
                onToggle={(newStatus) =>
                  void setContentActiveStatus.mutateAsync({
                    contentId: content._id,
                    activeStatus: newStatus,
                  })
                }
              />
            </TableCell>
            <TableCell>{new Date(content.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <SuspendButton
                isSuspended={content.status === 'SUSPENDED'}
                onSuspend={() => suspendContent.mutate(content._id)}
                onUnsuspend={() => unsuspendContent.mutate(content._id)}
                isPending={suspendContent.isPending || unsuspendContent.isPending}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResourceTable>
  );
}
