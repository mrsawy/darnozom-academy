'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  usePendingContents,
  useApproveContent,
  useRejectContent,
  useBulkApproveContents,
  useBulkRejectContents,
  useBulkDeleteContents,
  useAdminSetContentActiveStatus,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ReviewTable } from '../__components/ReviewTable';
import type { IReviewableContent } from '@/lib/types/admin-review/admin-review.interface';
import { buildContentReviewSnapshot } from '@/lib/utils/admin/build-content-review-snapshot';
import { useSetContentPublishStatus } from '@/lib/hooks/course/usePublishStatus';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { ActiveToggle } from '@/components/molecules/active-toggle';
import { DiscussionDialog } from '@/components';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';

export default function ContentReviewPage() {
  const t = useTranslations('AdminDashboard');
  const tPublish = useTranslations('PublishStatus');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, isLoading, isError, refetch } = usePendingContents({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const approve = useApproveContent();
  const reject = useRejectContent();
  const bulkApprove = useBulkApproveContents();
  const bulkReject = useBulkRejectContents();
  const bulkDelete = useBulkDeleteContents();
  const {
    mutate: setContentPublish,
    isPending: isPublishPending,
    variables: publishVariables,
  } = useSetContentPublishStatus();
  const setContentActiveStatus = useAdminSetContentActiveStatus();

  const columns = [
    { header: t('table.title'), accessor: (item: IReviewableContent) => item.title },
    { header: t('table.type'), accessor: (item: IReviewableContent) => item.type },
    {
      header: t('table.organization'),
      accessor: (item: IReviewableContent) => item.organization?.name ?? item.organizationId,
    },
    {
      header: t('table.course'),
      accessor: (item: IReviewableContent) => item.course?.name ?? item.courseId,
    },
    {
      header: t('table.module'),
      accessor: (item: IReviewableContent) => item.module?.title ?? item.moduleId,
    },
    {
      header: t('table.created'),
      accessor: (item: IReviewableContent) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      header: t('table.discussions'),
      accessor: (item: IReviewableContent) => (
        <DiscussionDialog
          type={DiscussionType.CONTENT}
          contentId={item._id}
          courseId={item.courseId}
          moduleId={item.moduleId}
          entityTitle={item.title}
          canDeleteAny
        />
      ),
    },
    {
      header: tPublish('published'),
      accessor: (item: IReviewableContent) => (
        <PublishToggle
          publishStatus={item.publishStatus}
          approvalStatus={item.approvalStatus}
          isPending={isPublishPending ? publishVariables?.contentId === item._id : null}
          onToggle={(status) => setContentPublish({ contentId: item._id, publishStatus: status })}
        />
      ),
    },
    {
      header: t('table.activeStatus'),
      accessor: (item: IReviewableContent) => (
        <ActiveToggle
          activeStatus={item.activeStatus}
          isPending={
            setContentActiveStatus.isPending
              ? setContentActiveStatus.variables?.contentId === item._id
              : null
          }
          onToggle={(newStatus) =>
            void setContentActiveStatus.mutateAsync({
              contentId: item._id,
              activeStatus: newStatus,
            })
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('contentTitle')}</h1>
        <p className="text-muted-foreground">{t('contentDescription')}</p>
      </div>

      <ReviewTable
        data={data}
        columns={columns}
        nameAccessor={(item) => item.title}
        currentDataAccessor={(item) => buildContentReviewSnapshot(item)}
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
    </div>
  );
}
