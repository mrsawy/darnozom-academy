'use client';

import { useState } from 'react';
import { Plus, Folder } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { useTranslations } from 'next-intl';
import { CategoryWithChildren } from './types';
import { CategoryTreeItem } from './category-tree-item';
import { AddChildForm } from './add-child-form';
import { toast } from 'react-toastify';

interface ChildCategoriesSectionProps {
  childCategories: CategoryWithChildren[];
  onAddChild: (name: string, description: string) => Promise<void>;
  onAddChildToCategory: (parentId: string, name: string, description: string) => Promise<void>;
  onDeleteChild: (childId: string) => Promise<void>;
}

export function ChildCategoriesSection({
  childCategories,
  onAddChild,
  onAddChildToCategory,
  onDeleteChild,
}: ChildCategoriesSectionProps) {
  const t = useTranslations('SingleCategoryView');
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildForm, setNewChildForm] = useState({
    name: '',
    description: '',
  });

  const handleAddChild = async () => {
    if (!newChildForm.name.trim()) return;

    try {
      await onAddChild(newChildForm.name, newChildForm.description);
      setNewChildForm({ name: '', description: '' });
      setIsAddingChild(false);
    } catch (error: unknown) {
      // Error is handled by parent component
      if (error instanceof Error) {
        toast.error(error.message ?? 'Something went wrong !');
      }
    }
  };

  const handleCancelAddChild = () => {
    setIsAddingChild(false);
    setNewChildForm({ name: '', description: '' });
  };

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h3 className="text-lg font-semibold">
          {t('subcategories', { count: childCategories.length })}
        </h3>
        {!isAddingChild && (
          <Button type="button" onClick={() => setIsAddingChild(true)} variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" />
            {t('add')}
          </Button>
        )}
      </div>

      <div className="divide-y">
        {/* Add Child Form */}
        {isAddingChild ? (
          <AddChildForm
            name={newChildForm.name}
            description={newChildForm.description}
            onNameChange={(name) => setNewChildForm({ ...newChildForm, name })}
            onDescriptionChange={(description) => setNewChildForm({ ...newChildForm, description })}
            onSubmit={() => void handleAddChild()}
            onCancel={handleCancelAddChild}
          />
        ) : null}

        {/* Child Categories List */}
        {childCategories.length === 0 && !isAddingChild ? (
          <div className="p-6 text-center">
            <Folder className="mx-auto mb-3 h-12 w-12" />
            <p>{t('noSubcategories')}</p>
            <Button
              type="button"
              onClick={() => setIsAddingChild(true)}
              variant="link"
              size="sm"
              className="mt-2">
              {t('addFirstSubcategory')}
            </Button>
          </div>
        ) : (
          childCategories.map((child) => (
            <CategoryTreeItem
              key={child._id}
              category={child}
              level={0}
              onDelete={onDeleteChild}
              onAddChild={onAddChildToCategory}
            />
          ))
        )}
      </div>
    </div>
  );
}
