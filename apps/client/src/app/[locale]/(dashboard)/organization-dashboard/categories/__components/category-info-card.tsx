'use client';

import { Edit, FolderOpen } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { useTranslations } from 'next-intl';
import { ICategory } from '@/lib/types/category/ICategory';
import { ApprovalStatusBadge } from '@/app/[locale]/(dashboard)/main-admin-dashboard/__components/ApprovalStatusBadge';
import { CategoryEditForm } from './category-edit-form';
import { CategoryDisplay } from './category-display';

interface CategoryInfoCardProps {
  category: ICategory;
  isEditing: boolean;
  editForm: {
    name: string;
    description: string;
  };
  onEditClick: () => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CategoryInfoCard({
  category,
  isEditing,
  editForm,
  onEditClick,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel,
}: CategoryInfoCardProps) {
  const t = useTranslations('SingleCategoryView');

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="flex items-center text-2xl font-bold">
          <FolderOpen className="mr-3 h-8 w-8 text-blue-600" />
          {t('categoryDetails')}
        </h1>
        <div className="flex items-center gap-3">
          {category.approvalStatus ? (
            <ApprovalStatusBadge status={category.approvalStatus} />
          ) : null}
          {!isEditing &&
            (!category.approvalStatus ||
              category.approvalStatus === 'PENDING' ||
              category.approvalStatus === 'REJECTED') && (
              <Button type="button" onClick={onEditClick} variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                {t('edit')}
              </Button>
            )}
        </div>
      </div>

      <div className="p-6">
        {isEditing ? (
          <CategoryEditForm
            name={editForm.name}
            description={editForm.description}
            onNameChange={onNameChange}
            onDescriptionChange={onDescriptionChange}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : (
          <CategoryDisplay category={category} />
        )}
      </div>
    </div>
  );
}
