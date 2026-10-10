import { ICategory } from '@/lib/types/category/ICategory';

// Extended category type for tree view with children array
export interface CategoryWithChildren extends Omit<ICategory, 'childCategories'> {
  children?: CategoryWithChildren[];
  childrenCount?: number;
}

// Helper function to convert ICategory to CategoryWithChildren
export function convertToCategoryWithChildren(category: ICategory): CategoryWithChildren {
  return {
    ...category,
    children: category.childCategories?.map((child) => convertToCategoryWithChildren(child)),
    childrenCount: category.childCategories?.length ?? 0,
  };
}
