'use client';

import { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Trash2, Folder } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { useTranslations } from 'next-intl';
import { CategoryWithChildren } from './types';
import { AddChildForm } from './add-child-form';
import { ApprovalStatusBadge } from '@/app/[locale]/(dashboard)/main-admin-dashboard/__components/ApprovalStatusBadge';
import { toast } from 'react-toastify';

interface CategoryTreeItemProps {
  category: CategoryWithChildren;
  level?: number;
  onDelete: (categoryId: string) => Promise<void>;
  onAddChild: (parentId: string, name: string, description: string) => Promise<void>;
}

export function CategoryTreeItem({
  category,
  level = 0,
  onDelete,
  onAddChild,
}: CategoryTreeItemProps) {
  const t = useTranslations('SingleCategoryView');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildForm, setNewChildForm] = useState({
    name: '',
    description: '',
  });

  const hasChildren = (category.childrenCount ?? 0) > 0;
  const paddingLeft = level * 20;

  const handleToggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleAddChild = async () => {
    if (!newChildForm.name.trim()) return;

    try {
      await onAddChild(category._id, newChildForm.name, newChildForm.description);
      setNewChildForm({ name: '', description: '' });
      setIsAddingChild(false);
      setIsExpanded(true);
    } catch (error: unknown) {
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
    <div>
      <div className="group p-4 transition-colors" style={{ paddingLeft: `${16 + paddingLeft}px` }}>
        <div className="flex items-start justify-between">
          <div className="flex flex-1 items-start">
            {!!hasChildren && (
              <Button
                type="button"
                onClick={handleToggleExpand}
                variant="ghost"
                size="icon"
                className="mt-0.5 mr-2 h-5 w-5 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              type="button"
              onClick={handleToggleExpand}
              variant="ghost"
              className="flex h-auto flex-1 items-start justify-start text-left">
              <Folder className="mt-0.5 mr-3 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{category.name}</span>
                  {category.approvalStatus ? (
                    <ApprovalStatusBadge status={category.approvalStatus} />
                  ) : null}
                </div>
                {category.description ? (
                  <div className="mt-1 line-clamp-2 text-sm">{category.description}</div>
                ) : null}
                {(category.childrenCount ?? 0) > 0 && (
                  <div className="mt-1 text-xs">
                    {t('subcategoriesCount', { count: category.childrenCount ?? 0 })}
                  </div>
                )}
              </div>
            </Button>
          </div>

          <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              onClick={() => setIsAddingChild(true)}
              variant="ghost"
              size="icon"
              className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
            {(!category.approvalStatus ||
              category.approvalStatus === 'PENDING' ||
              category.approvalStatus === 'REJECTED') && (
              <Button
                type="button"
                onClick={() => void onDelete(category._id)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-red-600"
                title={t('deleteCategory')}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add Child Form */}
      {isAddingChild ? (
        <div className="border-t" style={{ paddingLeft: `${32 + paddingLeft}px` }}>
          <AddChildForm
            name={newChildForm.name}
            description={newChildForm.description}
            onNameChange={(name) => setNewChildForm({ ...newChildForm, name })}
            onDescriptionChange={(description) => setNewChildForm({ ...newChildForm, description })}
            onSubmit={() => void handleAddChild()}
            onCancel={handleCancelAddChild}
          />
        </div>
      ) : null}

      {/* Expanded Children */}
      {isExpanded && category.children && category.children.length > 0 ? (
        <div className="ml-4 border-l">
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child._id}
              category={child}
              level={level + 1}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
