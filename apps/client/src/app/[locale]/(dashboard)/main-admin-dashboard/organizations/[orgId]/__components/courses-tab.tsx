'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import {
  useOrganizationCourses,
  useDeleteOrganizationCourse,
  useApproveCourse,
  useRejectCourse,
  useSuspendCourse,
  useUnsuspendCourse,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type { IAdminCourse } from '@/lib/types/admin-review/admin-review.interface';
import { ReviewDialog } from '../../../__components/ReviewDialog';
import { ApprovalStatusBadge } from '../../../__components/ApprovalStatusBadge';
import { ResourceTable } from './resource-table';
import { DeleteButton } from './delete-button';
import { SuspendButton } from './suspend-button';
import { EntityStatusBadge } from './entity-status-badge';
import { DiscussionDialog } from '@/components';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';
import { ROUTE_MAIN_ADMIN_ORG_COURSE_MODULES } from '@/lib/data/constants/routes.constants';

interface CoursesTabProps {
  orgId: string;
}

export function CoursesTab({ orgId }: CoursesTabProps) {
  const t = useTranslations('AdminDashboard');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [reviewCourse, setReviewCourse] = useState<IAdminCourse | null>(null);
  const options = { page, limit: 10 };

  const { data: courses, isLoading } = useOrganizationCourses(orgId, options);
  const deleteCourse = useDeleteOrganizationCourse(orgId);
  const suspendCourse = useSuspendCourse(orgId);
  const unsuspendCourse = useUnsuspendCourse(orgId);
  const approveCourse = useApproveCourse();
  const rejectCourse = useRejectCourse();

  const handleApprove = async () => {
    if (!reviewCourse) return;
    await approveCourse.mutateAsync(reviewCourse._id);
    setReviewCourse(null);
  };

  const handleReject = async (comment: string, deleteFiles: boolean) => {
    if (!reviewCourse) return;
    await rejectCourse.mutateAsync({ itemId: reviewCourse._id, comment, deleteFiles });
    setReviewCourse(null);
  };

  return (
    <>
      <ResourceTable
        isLoading={isLoading}
        isEmpty={!courses || courses.docs.length === 0}
        emptyKey="noCourses"
        pagination={
          courses
            ? {
                page: courses.page,
                totalPages: courses.totalPages,
                totalDocs: courses.totalDocs,
                hasPrevPage: courses.hasPrevPage,
                hasNextPage: courses.hasNextPage,
              }
            : null
        }
        paginationKey="paginationCourses"
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.name')}</TableHead>
            <TableHead>{t('table.instructor')}</TableHead>
            <TableHead>{t('table.paid')}</TableHead>
            <TableHead>{t('table.status')}</TableHead>
            <TableHead>{t('table.approvalStatus')}</TableHead>
            <TableHead>{t('table.modules')}</TableHead>
            <TableHead>{t('table.discussions')}</TableHead>
            <TableHead>{t('table.created')}</TableHead>
            <TableHead>{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses?.docs.map((course: IAdminCourse) => (
            <TableRow key={course._id}>
              <TableCell className="font-medium">{course.name}</TableCell>
              <TableCell>
                {course.instructor
                  ? `${course.instructor.firstName} ${course.instructor.lastName}`
                  : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={course.isPaid ? 'default' : 'secondary'}>
                  {course.isPaid ? t('paidYes') : t('paidFree')}
                </Badge>
              </TableCell>
              <TableCell>
                <EntityStatusBadge status={course.status} />
              </TableCell>
              <TableCell>
                <ApprovalStatusBadge status={course.approvalStatus} />
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(ROUTE_MAIN_ADMIN_ORG_COURSE_MODULES(orgId, course._id))
                  }>
                  {t('table.viewModules')}
                </Button>
              </TableCell>
              <TableCell>
                <DiscussionDialog
                  type={DiscussionType.COURSE}
                  courseId={course._id}
                  entityTitle={course.name}
                  canDeleteAny
                />
              </TableCell>
              <TableCell>{new Date(course.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReviewCourse(course)}>
                    {t('buttons.review')}
                  </Button>
                  <SuspendButton
                    isSuspended={course.status === 'SUSPENDED'}
                    onSuspend={() => suspendCourse.mutate(course._id)}
                    onUnsuspend={() => unsuspendCourse.mutate(course._id)}
                    isPending={suspendCourse.isPending || unsuspendCourse.isPending}
                  />
                  <DeleteButton
                    onConfirm={() => deleteCourse.mutate(course._id)}
                    isPending={deleteCourse.isPending}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ResourceTable>

      <ReviewDialog
        key={reviewCourse?._id ?? 'closed'}
        open={!!reviewCourse}
        onOpenChange={(open: boolean) => !open && setReviewCourse(null)}
        itemName={reviewCourse?.name ?? ''}
        onApprove={() => void handleApprove()}
        onReject={(comment, deleteFiles) => void handleReject(comment, deleteFiles)}
        isApproving={approveCourse.isPending}
        isRejecting={rejectCourse.isPending}
      />
    </>
  );
}
