'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { Button } from '@/components/atoms/button';
import {
  useOrganizationCourseModules,
  useSuspendModule,
  useUnsuspendModule,
  useAdminSetModuleActiveStatus,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ActiveToggle } from '@/components/molecules/active-toggle';
import type { IAdminModule } from '@/lib/types/admin-review/admin-review.interface';
import { ApprovalStatusBadge } from '../../../../../__components/ApprovalStatusBadge';
import { ResourceTable } from '../../../__components/resource-table';
import { SuspendButton } from '../../../__components/suspend-button';
import { EntityStatusBadge } from '../../../__components/entity-status-badge';
import { ROUTE_MAIN_ADMIN_ORG_MODULE_CONTENTS } from '@/lib/data/constants/routes.constants';

interface ModulesTableProps {
  orgId: string;
  courseId: string;
}

export function ModulesTable({ orgId, courseId }: ModulesTableProps) {
  const t = useTranslations('AdminDashboard');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const options = { page, limit: 10 };

  const { data: modules, isLoading } = useOrganizationCourseModules(orgId, courseId, options);
  const suspendModule = useSuspendModule(orgId);
  const unsuspendModule = useUnsuspendModule(orgId);
  const setModuleActiveStatus = useAdminSetModuleActiveStatus({ orgId, courseId });

  return (
    <ResourceTable
      isLoading={isLoading}
      isEmpty={!modules || modules.docs.length === 0}
      emptyKey="noModules"
      pagination={
        modules
          ? {
              page: modules.page,
              totalPages: modules.totalPages,
              totalDocs: modules.totalDocs,
              hasPrevPage: modules.hasPrevPage,
              hasNextPage: modules.hasNextPage,
            }
          : null
      }
      paginationKey="paginationModules"
      onPrev={() => setPage((p) => p - 1)}
      onNext={() => setPage((p) => p + 1)}>
      <TableHeader>
        <TableRow>
          <TableHead>{t('table.title')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.approvalStatus')}</TableHead>
          <TableHead>{t('table.activeStatus')}</TableHead>
          <TableHead>{t('table.contents')}</TableHead>
          <TableHead>{t('table.created')}</TableHead>
          <TableHead>{t('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {modules?.docs.map((module: IAdminModule) => (
          <TableRow key={module._id}>
            <TableCell className="font-medium">{module.title}</TableCell>
            <TableCell>
              <EntityStatusBadge status={module.status} />
            </TableCell>
            <TableCell>
              <ApprovalStatusBadge status={module.approvalStatus} />
            </TableCell>
            <TableCell>
              <ActiveToggle
                activeStatus={module.activeStatus}
                isPending={
                  setModuleActiveStatus.isPending
                    ? setModuleActiveStatus.variables?.moduleId === module._id
                    : null
                }
                onToggle={(newStatus) =>
                  void setModuleActiveStatus.mutateAsync({
                    moduleId: module._id,
                    activeStatus: newStatus,
                  })
                }
              />
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(ROUTE_MAIN_ADMIN_ORG_MODULE_CONTENTS(orgId, courseId, module._id))
                }>
                {t('table.viewContents')}
              </Button>
            </TableCell>
            <TableCell>{new Date(module.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <SuspendButton
                isSuspended={module.status === 'SUSPENDED'}
                onSuspend={() => suspendModule.mutate(module._id)}
                onUnsuspend={() => unsuspendModule.mutate(module._id)}
                isPending={suspendModule.isPending || unsuspendModule.isPending}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResourceTable>
  );
}
