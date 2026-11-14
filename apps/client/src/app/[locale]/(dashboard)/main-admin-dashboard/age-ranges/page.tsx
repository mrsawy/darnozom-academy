'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconLoader2, IconPlus, IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { DeleteConfirmationModal } from '@/components/molecules/modals';
import {
  useAdminAgeRanges,
  useCreateAgeRange,
  useUpdateAgeRange,
  useDeleteAgeRange,
} from '@/lib/hooks/admin-age-ranges/use-admin-age-ranges.hook';
import type { AgeRangeResponse } from '@/lib/actions/age-range/age-range.action';
import { AgeRangesTable } from './__components/age-ranges-table';
import { AgeRangeFormDialog } from './__components/age-range-form-dialog/age-range-form-dialog';
import type { AgeRangeFormValues } from './__components/age-range-form-dialog/age-range-form-dialog.schema';

export default function AdminAgeRangesPage() {
  const t = useTranslations('AdminAgeRanges');

  const { data: ageRanges, isLoading, isError, refetch } = useAdminAgeRanges();
  const createAgeRange = useCreateAgeRange();
  const updateAgeRange = useUpdateAgeRange();
  const deleteAgeRange = useDeleteAgeRange();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgeRange, setEditingAgeRange] = useState<AgeRangeResponse | null>(null);
  const [deletingAgeRange, setDeletingAgeRange] = useState<AgeRangeResponse | null>(null);

  const handleCreate = useCallback(() => {
    setEditingAgeRange(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((ageRange: AgeRangeResponse) => {
    setEditingAgeRange(ageRange);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: AgeRangeFormValues) => {
      await (editingAgeRange
        ? updateAgeRange.mutateAsync({ id: editingAgeRange._id, data: values })
        : createAgeRange.mutateAsync(values));
      setFormOpen(false);
      setEditingAgeRange(null);
    },
    [editingAgeRange, createAgeRange, updateAgeRange]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingAgeRange) return;
    await deleteAgeRange.mutateAsync(deletingAgeRange._id);
    setDeletingAgeRange(null);
  }, [deletingAgeRange, deleteAgeRange]);

  const isSubmitting = createAgeRange.isPending || updateAgeRange.isPending;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-destructive font-medium">{t('loadError')}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <IconRefresh className="mr-2 h-4 w-4" />
            {t('retry')}
          </Button>
        </div>
      );
    }

    if (ageRanges && ageRanges.length > 0) {
      return <AgeRangesTable ageRanges={ageRanges} onEdit={handleEdit} onDelete={setDeletingAgeRange} />;
    }

    return <p className="text-muted-foreground py-12 text-center">{t('empty')}</p>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('createAgeRange')}
        </Button>
      </div>

      {renderContent()}

      <AgeRangeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAgeRange(null);
        }}
        ageRange={editingAgeRange}
        onSubmit={(values) => void handleFormSubmit(values)}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmationModal
        open={!!deletingAgeRange}
        onOpenChange={(open) => {
          if (!open) setDeletingAgeRange(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
        isPending={deleteAgeRange.isPending}
        title={t('deleteConfirm.title')}
        description={t('deleteConfirm.description', { name: deletingAgeRange?.nameEn ?? '' })}
      />
    </div>
  );
}
