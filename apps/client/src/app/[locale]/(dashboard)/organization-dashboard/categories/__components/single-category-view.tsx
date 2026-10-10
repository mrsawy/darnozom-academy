'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { ICategory } from '@/lib/types/category/ICategory';
import { CategoryWithChildren, convertToCategoryWithChildren } from './types';
import { CategoryHeader } from './category-header';
import { CategoryInfoCard } from './category-info-card';
import { ParentCategoryCard } from './parent-category-card';
import { ChildCategoriesSection } from './child-categories-section';
import { CategoryTree } from '@/components/molecules/category-tree';
import {
  useCreateCategory,
  useDeleteCategory,
  useSingleCategory,
  useUpdateCategory,
} from '@/lib/hooks/category/use-category.hook';

interface CategoryDetailPageProps {
  categoryData: ICategory;
}

export default function CategoryDetailPage({ categoryData }: CategoryDetailPageProps) {
  const t = useTranslations('SingleCategoryView');

  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const updateCategoryMutation = useUpdateCategory();
  const { data: refreshedCategory, refetch: refetchCategory } = useSingleCategory(categoryData._id);

  // Use refreshed data if available, otherwise fall back to initial data
  const currentCategoryData = refreshedCategory ?? categoryData;

  const [category, setCategory] = useState(currentCategoryData);
  const [parentCategory, setParentCategory] = useState(currentCategoryData?.parentCategory);
  const [childCategories, setChildCategories] = useState<CategoryWithChildren[]>(
    currentCategoryData?.childCategories?.map((child) => convertToCategoryWithChildren(child)) ?? []
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: category?.name ?? '',
    description: category?.description ?? '',
  });

  // Update state when refreshed data is available
  useEffect(() => {
    if (refreshedCategory && refreshedCategory._id === category._id) {
      setCategory(refreshedCategory);
      setParentCategory(refreshedCategory.parentCategory);
      setChildCategories(
        refreshedCategory?.childCategories?.map((child) => convertToCategoryWithChildren(child)) ??
          []
      );
    }
  }, [refreshedCategory, category._id]);

  // Edit category handlers
  const handleEditCategory = () => {
    setIsEditing(true);
    setEditForm({
      name: category.name,
      description: category.description ?? '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await updateCategoryMutation.mutateAsync({
        organizationId: category?.organizationId,
        categoryId: category._id,
        data: { name: editForm.name, description: editForm.description },
      });
      setCategory({ ...category, ...editForm });
      setIsEditing(false);
      await refetchCategory();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('errorUpdate'));
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: category.name,
      description: category.description ?? '',
    });
  };

  // Child category handlers
  const handleAddChild = async (name: string, _description: string) => {
    if (!category.organizationId) {
      toast.error('Organization ID is missing');
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        organizationId: category.organizationId,
        name,
        parentId: category._id,
      });

      await refetchCategory();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message ?? 'Something went wrong !');
      }
    }
  };

  const handleAddChildToCategory = async (parentId: string, name: string) => {
    if (!category.organizationId) {
      toast.error('Organization ID is missing');
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        organizationId: category.organizationId,
        name,
        parentId,
      });

      // Refresh the category data to get updated child categories
      await refetchCategory();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message ?? 'Something went wrong !');
      }
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!globalThis.confirm(t('deleteConfirm'))) {
      return;
    }

    if (!category.organizationId) {
      toast.error('Organization ID is missing');
      return;
    }

    try {
      await deleteCategoryMutation.mutateAsync({
        organizationId: category.organizationId,
        categoryId: childId,
      });

      // Refresh the category data to get updated child categories
      await refetchCategory();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message ?? 'Something went wrong !');
      }
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <CategoryHeader parentCategory={parentCategory ?? undefined} categoryName={category.name} />

        <div className="grid grid-cols-1 gap-8">
          {/* Main Category Info */}
          <div>
            <CategoryInfoCard
              category={category}
              isEditing={isEditing}
              editForm={editForm}
              onEditClick={handleEditCategory}
              onNameChange={(name) => setEditForm({ ...editForm, name })}
              onDescriptionChange={(description) => setEditForm({ ...editForm, description })}
              onSave={() => void handleSaveEdit()}
              onCancel={handleCancelEdit}
            />
          </div>

          {/* Category Hierarchy Tree */}
          <div>
            <CategoryTree
              currentCategory={category}
              parentCategory={parentCategory ?? null}
              childCategories={childCategories}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parent Category */}
            {parentCategory ? <ParentCategoryCard parentCategory={parentCategory} /> : null}

            {/* Child Categories */}
            <ChildCategoriesSection
              childCategories={childCategories}
              onAddChild={handleAddChild}
              onAddChildToCategory={handleAddChildToCategory}
              onDeleteChild={handleDeleteChild}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
