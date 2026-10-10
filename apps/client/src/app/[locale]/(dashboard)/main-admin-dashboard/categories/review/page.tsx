'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  usePendingCategories,
  useApproveCategory,
  useRejectCategory,
  useBulkApproveCategories,
  useBulkRejectCategories,
  useBulkDeleteCategories,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ReviewTable } from '../../__components/ReviewTable';
import type { IReviewableCategory } from '@/lib/types/admin-review/admin-review.interface';

export default function CategoriesReviewPage() {
  const t = useTranslations('AdminDashboard');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, isLoading, isError, refetch } = usePendingCategories({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const approve = useApproveCategory();
  const reject = useRejectCategory();
  const bulkApprove = useBulkApproveCategories();
  const bulkReject = useBulkRejectCategories();
  const bulkDelete = useBulkDeleteCategories();

  const columns = [
    { header: t('table.name'), accessor: (item: IReviewableCategory) => item.name },
    {
      header: t('table.description'),
      accessor: (item: IReviewableCategory) => item.description ?? '—',
    },
    {
      header: t('table.organization'),
      accessor: (item: IReviewableCategory) => item.organization?.name ?? item.organizationId,
    },
    {
      header: t('table.created'),
      accessor: (item: IReviewableCategory) => new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('categoriesTitle')}</h1>
        <p className="text-muted-foreground">{t('categoriesDescription')}</p>
      </div>

      <ReviewTable
        data={data}
        columns={columns}
        nameAccessor={(item) => item.name}
        currentDataAccessor={(item) => ({ name: item.name, description: item.description })}
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
