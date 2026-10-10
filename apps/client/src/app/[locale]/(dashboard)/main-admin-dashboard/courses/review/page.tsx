'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  usePendingCourses,
  useApproveCourse,
  useRejectCourse,
  useBulkApproveCourses,
  useBulkRejectCourses,
  useBulkDeleteCourses,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ReviewTable } from '../../__components/ReviewTable';
import { CourseDetailsDialog } from '../../__components/CourseDetailsDialog';
import { Button } from '@/components/atoms/button';
import type { IReviewableCourse } from '@/lib/types/admin-review/admin-review.interface';
import { useSetCoursePublishStatus } from '@/lib/hooks/course/usePublishStatus';
import { PublishToggle } from '@/components/molecules/publish-toggle';

export default function CoursesReviewPage() {
  const t = useTranslations('AdminDashboard');
  const tPublish = useTranslations('PublishStatus');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [detailsCourse, setDetailsCourse] = useState<IReviewableCourse | null>(null);
  const debouncedSearch = useDebounce(search);
  const { data, isLoading, isError, refetch } = usePendingCourses({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const approve = useApproveCourse();
  const reject = useRejectCourse();
  const bulkApprove = useBulkApproveCourses();
  const bulkReject = useBulkRejectCourses();
  const bulkDelete = useBulkDeleteCourses();
  const {
    mutate: setPublishStatus,
    isPending: isPublishPending,
    variables: publishVariables,
  } = useSetCoursePublishStatus();

  const columns = [
    { header: t('table.name'), accessor: (item: IReviewableCourse) => item.name },
    {
      header: t('table.organization'),
      accessor: (item: IReviewableCourse) => item.organization?.name ?? item.organizationId,
    },
    {
      header: t('table.instructor'),
      accessor: (item: IReviewableCourse) =>
        item.instructor ? `${item.instructor.firstName} ${item.instructor.lastName}` : '—',
    },
    {
      header: t('table.paid'),
      accessor: (item: IReviewableCourse) => (item.isPaid ? t('paidYes') : t('paidFree')),
    },
    {
      header: t('table.created'),
      accessor: (item: IReviewableCourse) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      header: tPublish('published'),
      accessor: (item: IReviewableCourse) => (
        <PublishToggle
          publishStatus={item.publishStatus}
          approvalStatus={item.approvalStatus}
          isPending={isPublishPending ? publishVariables?.courseId === item._id : null}
          onToggle={(status) => setPublishStatus({ courseId: item._id, publishStatus: status })}
        />
      ),
    },
    {
      header: t('courseDetails.detailsColumn'),
      accessor: (item: IReviewableCourse) => (
        <Button size="sm" variant="secondary" onClick={() => setDetailsCourse(item)}>
          {t('buttons.viewDetails')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReviewTable
        data={data}
        columns={columns}
        nameAccessor={(item) => item.name}
        coursePendingChanges
        currentDataAccessor={(item) => ({
          name: item.name,
          description: item.description,
          shortDescription: item.shortDescription,
          isPaid: item.isPaid,
          pricing: item.pricing,
          settings: item.settings,
          attendanceSettings: item.attendanceSettings,
          learningObjectives: item.learningObjectives,
          thumbnailKey: item.thumbnailKey,
          trailerKey: item.trailerKey,
          categories: item.categories?.map((c) => ({ _id: c._id, name: c.name })),
          instructor: item.instructor,
          coInstructors: item.coInstructors?.map((u) => ({
            _id: u._id,
            firstName: u.firstName,
            lastName: u.lastName,
            username: u.username,
          })),
        })}
        onApprove={(id) => approve.mutateAsync(id)}
        onReject={(id, comment, deleteFiles) =>
          reject.mutateAsync({ itemId: id, comment, deleteFiles })
        }
        isApproving={approve.isPending}
        isRejecting={reject.isPending}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        page={page}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onBulkApprove={(ids) => bulkApprove.mutateAsync(ids)}
        onBulkReject={(ids, comment, deleteFiles) =>
          bulkReject.mutateAsync({ itemIds: ids, comment, deleteFiles })
        }
        onBulkDelete={(ids) => bulkDelete.mutateAsync(ids)}
        isBulkApproving={bulkApprove.isPending}
        isBulkRejecting={bulkReject.isPending}
        isBulkDeleting={bulkDelete.isPending}
      />

      <CourseDetailsDialog course={detailsCourse} onClose={() => setDetailsCourse(null)} />
    </div>
  );
}
