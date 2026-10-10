'use client';

import { Clock, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ICategory } from '@/lib/types/category/ICategory';

interface CategoryDisplayProps {
  category: ICategory;
}

export function CategoryDisplay({ category }: CategoryDisplayProps) {
  const t = useTranslations('SingleCategoryView');

  const pendingUpdate = category.pendingUpdate as { name?: string; description?: string } | null;
  const hasPendingUpdate =
    category.approvalStatus === 'PENDING_UPDATE' &&
    pendingUpdate != null &&
    Object.keys(pendingUpdate).length > 0;
  const hasRejectionComment = category.approvalStatus === 'REJECTED' && !!category.approvalComment;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">{category.name}</h2>
        <p className="leading-relaxed">{category.description ?? t('noDescription')}</p>
      </div>

      {hasPendingUpdate ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              {t('pendingChanges')}
            </span>
          </div>
          <p className="mb-3 text-xs text-yellow-700 dark:text-yellow-400">
            {t('pendingChangesDescription')}
          </p>
          <div className="space-y-2">
            {pendingUpdate?.name !== undefined && (
              <div className="flex flex-wrap gap-1 text-sm">
                <span className="font-medium text-yellow-800 dark:text-yellow-300">
                  {t('proposedName')}:
                </span>
                <span className="text-yellow-900 dark:text-yellow-200">{pendingUpdate.name}</span>
              </div>
            )}
            {pendingUpdate?.description !== undefined && (
              <div className="flex flex-wrap gap-1 text-sm">
                <span className="font-medium text-yellow-800 dark:text-yellow-300">
                  {t('proposedDescription')}:
                </span>
                <span className="text-yellow-900 dark:text-yellow-200">
                  {pendingUpdate.description || t('noDescription')}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {hasRejectionComment ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950">
          <div className="mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              {t('rejectionComment')}
            </span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">{category.approvalComment}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div>
          <span className="text-sm font-medium">{t('created')}</span>
          <p>{new Date(category.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <span className="text-sm font-medium">{t('lastUpdated')}</span>
          <p>{new Date(category.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
