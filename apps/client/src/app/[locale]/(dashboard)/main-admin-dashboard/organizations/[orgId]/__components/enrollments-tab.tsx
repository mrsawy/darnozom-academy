'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { Badge } from '@/components/atoms/badge';
import {
  useOrganizationEnrollments,
  useDeleteOrganizationEnrollment,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type { IAdminEnrollment } from '@/lib/types/admin-review/admin-review.interface';
import { ResourceTable } from './resource-table';
import { DeleteButton } from './delete-button';

interface EnrollmentsTabProps {
  orgId: string;
}

export function EnrollmentsTab({ orgId }: EnrollmentsTabProps) {
  const t = useTranslations('AdminDashboard');
  const [page, setPage] = useState(1);
  const options = { page, limit: 10 };

  const { data: enrollments, isLoading } = useOrganizationEnrollments(orgId, options);
  const deleteEnrollment = useDeleteOrganizationEnrollment(orgId);

  return (
    <ResourceTable
      isLoading={isLoading}
      isEmpty={!enrollments || enrollments.docs.length === 0}
      emptyKey="noEnrollments"
      pagination={
        enrollments
          ? {
              page: enrollments.page,
              totalPages: enrollments.totalPages,
              totalDocs: enrollments.totalDocs,
              hasPrevPage: enrollments.hasPrevPage,
              hasNextPage: enrollments.hasNextPage,
            }
          : null
      }
      paginationKey="paginationEnrollments"
      onPrev={() => setPage((p) => p - 1)}
      onNext={() => setPage((p) => p + 1)}>
      <TableHeader>
        <TableRow>
          <TableHead>{t('table.student')}</TableHead>
          <TableHead>{t('table.course')}</TableHead>
          <TableHead>{t('table.accessType')}</TableHead>
          <TableHead>{t('table.progress')}</TableHead>
          <TableHead>{t('table.enrolledAt')}</TableHead>
          <TableHead>{t('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments?.docs.map((enrollment: IAdminEnrollment) => (
          <TableRow key={enrollment._id}>
            <TableCell className="font-medium">
              {typeof enrollment.userId === 'object' && enrollment.userId
                ? `${enrollment.userId.firstName} ${enrollment.userId.lastName}`
                : '—'}
            </TableCell>
            <TableCell>
              {typeof enrollment.courseId === 'object' && enrollment.courseId
                ? enrollment.courseId.name
                : '—'}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{enrollment.accessType}</Badge>
            </TableCell>
            <TableCell>{enrollment.progressPercentage}%</TableCell>
            <TableCell>{new Date(enrollment.enrolledAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <DeleteButton
                onConfirm={() => deleteEnrollment.mutate(enrollment._id)}
                isPending={deleteEnrollment.isPending}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResourceTable>
  );
}
