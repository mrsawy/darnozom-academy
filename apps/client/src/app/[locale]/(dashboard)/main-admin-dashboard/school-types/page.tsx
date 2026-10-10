'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconLoader2, IconPlus, IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { DeleteConfirmationModal } from '@/components/molecules/modals';
import {
  useAdminSchoolTypes,
  useCreateSchoolType,
  useUpdateSchoolType,
  useDeleteSchoolType,
} from '@/lib/hooks/admin-school-types/use-admin-school-types.hook';
import type { SchoolTypeResponse } from '@/lib/actions/school-type/school-type.action';
import { SchoolTypesTable } from './__components/school-types-table';
import { SchoolTypeFormDialog } from './__components/school-type-form-dialog/school-type-form-dialog';
import type { SchoolTypeFormValues } from './__components/school-type-form-dialog/school-type-form-dialog.schema';

export default function AdminSchoolTypesPage() {
  const t = useTranslations('AdminSchoolTypes');

  const { data: schoolTypes, isLoading, isError, refetch } = useAdminSchoolTypes();
  const createSchoolType = useCreateSchoolType();
  const updateSchoolType = useUpdateSchoolType();
  const deleteSchoolType = useDeleteSchoolType();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchoolType, setEditingSchoolType] = useState<SchoolTypeResponse | null>(null);
  const [deletingSchoolType, setDeletingSchoolType] = useState<SchoolTypeResponse | null>(null);

  const handleCreate = useCallback(() => {
    setEditingSchoolType(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((schoolType: SchoolTypeResponse) => {
    setEditingSchoolType(schoolType);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: SchoolTypeFormValues) => {
      await (editingSchoolType
        ? updateSchoolType.mutateAsync({ id: editingSchoolType._id, data: values })
        : createSchoolType.mutateAsync(values));
      setFormOpen(false);
      setEditingSchoolType(null);
    },
    [editingSchoolType, createSchoolType, updateSchoolType]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingSchoolType) return;
    await deleteSchoolType.mutateAsync(deletingSchoolType._id);
    setDeletingSchoolType(null);
  }, [deletingSchoolType, deleteSchoolType]);

  const isSubmitting = createSchoolType.isPending || updateSchoolType.isPending;

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

    if (schoolTypes && schoolTypes.length > 0) {
      return (
        <SchoolTypesTable
          schoolTypes={schoolTypes}
          onEdit={handleEdit}
          onDelete={setDeletingSchoolType}
        />
      );
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
          {t('createSchoolType')}
        </Button>
      </div>

      {renderContent()}

      <SchoolTypeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSchoolType(null);
        }}
        schoolType={editingSchoolType}
        onSubmit={(values) => void handleFormSubmit(values)}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmationModal
        open={!!deletingSchoolType}
        onOpenChange={(open) => {
          if (!open) setDeletingSchoolType(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
        isPending={deleteSchoolType.isPending}
        title={t('deleteConfirm.title')}
        description={t('deleteConfirm.description', {
          name: deletingSchoolType?.nameEn ?? '',
        })}
      />
    </div>
  );
}
