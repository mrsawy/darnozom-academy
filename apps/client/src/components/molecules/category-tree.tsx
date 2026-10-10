'use client';

import { useMemo } from 'react';
import { Tree, Folder, File, type TreeViewElement } from '@/components/atoms/file-tree';
import { CategoryWithChildren } from '@/app/[locale]/(dashboard)/organization-dashboard/categories/__components/types';
import { ICategory } from '@/lib/types/category/ICategory';
import { useTranslations } from 'next-intl';

interface CategoryTreeProps {
  currentCategory: ICategory;
  parentCategory?: ICategory | null;
  childCategories?: CategoryWithChildren[];
  className?: string;
}

function convertToTreeViewElement(
  category: ICategory | CategoryWithChildren,
  childCategories?: CategoryWithChildren[]
): TreeViewElement {
  const categoryWithChildren = category as CategoryWithChildren;
  const categoryChildren = categoryWithChildren.children;
  const hasChildren = (childCategories?.length ?? 0) > 0 || (categoryChildren?.length ?? 0) > 0;
  const children = childCategories ?? categoryChildren;

  return {
    id: category._id,
    name: category.name,
    isSelectable: true,
    children:
      hasChildren && children
        ? children.map((child) => convertToTreeViewElement(child, child.children))
        : undefined,
  };
}

function buildTreeElements(
  currentCategory: ICategory,
  parentCategory?: ICategory | null,
  childCategories?: CategoryWithChildren[]
): TreeViewElement[] {
  return parentCategory
    ? [
        {
          id: parentCategory._id,
          name: parentCategory.name,
          isSelectable: true,
          children: [convertToTreeViewElement(currentCategory, childCategories)],
        },
      ]
    : [convertToTreeViewElement(currentCategory, childCategories)];
}

function renderTreeItem(element: TreeViewElement): React.ReactNode {
  const hasChildren = element.children && element.children.length > 0;

  return hasChildren ? (
    <Folder
      key={element.id}
      value={element.id}
      element={element.name}
      isSelectable={element.isSelectable}>
      {element.children?.map((child) => renderTreeItem(child))}
    </Folder>
  ) : (
    <File key={element.id} value={element.id} isSelectable={element.isSelectable}>
      {element.name}
    </File>
  );
}

export function CategoryTree({
  currentCategory,
  parentCategory,
  childCategories,
  className,
}: CategoryTreeProps) {
  const t = useTranslations('SingleCategoryView');
  const treeElements = useMemo(
    () => buildTreeElements(currentCategory, parentCategory, childCategories),
    [currentCategory, parentCategory, childCategories]
  );

  return (
    <div className={`bg-card rounded-lg border ${className ?? ''}`}>
      <div className="border-b px-4 py-3">
        <h3 className="text-lg font-semibold">{t('categoryHierarchy')}</h3>
      </div>
      <div className="p-4">
        <Tree
          elements={treeElements}
          initialExpandedItems={treeElements.map((el) => el.id)}
          className="h-auto">
          {treeElements.map((element) => renderTreeItem(element))}
        </Tree>
      </div>
    </div>
  );
}
