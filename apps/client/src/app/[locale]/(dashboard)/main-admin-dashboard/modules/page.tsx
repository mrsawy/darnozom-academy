'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  usePendingModules,
  useApproveModule,
  useRejectModule,
  useBulkApproveModules,
  useBulkRejectModules,
  useBulkDeleteModules,
  useAdminSetModuleActiveStatus,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ReviewTable } from '../__components/ReviewTable';
import type { IReviewableModule } from '@/lib/types/admin-review/admin-review.interface';
import { useSetModulePublishStatus } from '@/lib/hooks/course/usePublishStatus';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { ActiveToggle } from '@/components/molecules/active-toggle';

export default function ModulesReviewPage() {
  const t = useTranslations('AdminDashboard');
  const tPublish = useTranslations('PublishStatus');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, isLoading, isError, refetch } = usePendingModules({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const approve = useApproveModule();
  const reject = useRejectModule();
  const bulkApprove = useBulkApproveModules();
  const bulkReject = useBulkRejectModules();
  const bulkDelete = useBulkDeleteModules();
  const {
    mutate: setModulePublish,
    isPending: isPublishPending,
    variables: publishVariables,
  } = useSetModulePublishStatus();
  const setModuleActiveStatus = useAdminSetModuleActiveStatus();

  const columns = [
    { header: t('table.title'), accessor: (item: IReviewableModule) => item.title },
    {
      header: t('table.description'),
      accessor: (item: IReviewableModule) => item.description ?? '—',
    },
    {
      header: t('table.organization'),
      accessor: (item: IReviewableModule) => item.organization?.name ?? item.organizationId,
    },
    {
      header: t('table.course'),
      accessor: (item: IReviewableModule) => item.course?.name ?? item.courseId,
    },
    {
      header: t('table.created'),
      accessor: (item: IReviewableModule) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      header: tPublish('published'),
      accessor: (item: IReviewableModule) => (
        <PublishToggle
          publishStatus={item.publishStatus}
          approvalStatus={item.approvalStatus}
          isPending={isPublishPending ? publishVariables?.moduleId === item._id : null}
          onToggle={(status) => setModulePublish({ moduleId: item._id, publishStatus: status })}
        />
      ),
    },
    {
      header: t('table.activeStatus'),
      accessor: (item: IReviewableModule) => (
        <ActiveToggle
          activeStatus={item.activeStatus}
          isPending={
            setModuleActiveStatus.isPending
              ? setModuleActiveStatus.variables?.moduleId === item._id
              : null
          }
          onToggle={(newStatus) =>
            void setModuleActiveStatus.mutateAsync({
              moduleId: item._id,
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
        <h1 className="text-2xl font-bold tracking-tight">{t('modulesTitle')}</h1>
        <p className="text-muted-foreground">{t('modulesDescription')}</p>
      </div>

      <ReviewTable
        data={data}
        columns={columns}
        nameAccessor={(item) => item.title}
        currentDataAccessor={(item) => ({ title: item.title, description: item.description })}
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
