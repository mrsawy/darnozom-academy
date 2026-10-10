'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconLoader2, IconPlus, IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { DeleteConfirmationModal } from '@/components/molecules/modals';
import {
  useAdminGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
} from '@/lib/hooks/admin-grades/use-admin-grades.hook';
import type { GradeResponse } from '@/lib/actions/grade/grade.action';
import { GradesTable } from './__components/grades-table';
import { GradeFormDialog } from './__components/grade-form-dialog/grade-form-dialog';
import type { GradeFormValues } from './__components/grade-form-dialog/grade-form-dialog.schema';

export default function AdminGradesPage() {
  const t = useTranslations('AdminGrades');

  const { data: grades, isLoading, isError, refetch } = useAdminGrades();
  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const deleteGrade = useDeleteGrade();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeResponse | null>(null);
  const [deletingGrade, setDeletingGrade] = useState<GradeResponse | null>(null);

  const handleCreate = useCallback(() => {
    setEditingGrade(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((grade: GradeResponse) => {
    setEditingGrade(grade);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: GradeFormValues) => {
      await (editingGrade
        ? updateGrade.mutateAsync({ id: editingGrade._id, data: values })
        : createGrade.mutateAsync(values));
      setFormOpen(false);
      setEditingGrade(null);
    },
    [editingGrade, createGrade, updateGrade]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingGrade) return;
    await deleteGrade.mutateAsync(deletingGrade._id);
    setDeletingGrade(null);
  }, [deletingGrade, deleteGrade]);

  const isSubmitting = createGrade.isPending || updateGrade.isPending;

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

    if (grades && grades.length > 0) {
      return <GradesTable grades={grades} onEdit={handleEdit} onDelete={setDeletingGrade} />;
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
          {t('createGrade')}
        </Button>
      </div>

      {renderContent()}

      <GradeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingGrade(null);
        }}
        grade={editingGrade}
        onSubmit={(values) => void handleFormSubmit(values)}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmationModal
        open={!!deletingGrade}
        onOpenChange={(open) => {
          if (!open) setDeletingGrade(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
        isPending={deleteGrade.isPending}
        title={t('deleteConfirm.title')}
        description={t('deleteConfirm.description', {
          name: deletingGrade?.nameEn ?? '',
        })}
      />
    </div>
  );
}
