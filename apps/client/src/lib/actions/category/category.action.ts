'use server';

import { ICategory } from '@/lib/types/category/ICategory';
import { Paginated, PaginationOptions, withDefaults } from '@/lib/types/Paginated';
import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';

export const createCategory = async (options: {
  organizationId: string;
  name: string;
  parentId?: string | null;
}) => {
  return createAuthorizedNatsRequest<ICategory>('category.create', options);
};

export const getAllFlatCategories = async (options: PaginationOptions) => {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<ICategory>>('category.getAllFlat', payload);
};

export const getAllCategories = async (options: PaginationOptions<{ organizationId: string }>) => {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<ICategory>>('category.getAll', payload);
};

export const getCategory = async (categoryId: string) => {
  return createAuthorizedNatsRequest<ICategory, { categoryId: string }>('category.getCategory', {
    categoryId,
  });
};

export const deleteCategory = async (options: { organizationId: string; categoryId: string }) => {
  return createAuthorizedNatsRequest<void>('category.delete', options);
};

export const updateCategory = async (options: {
  organizationId?: string;
  categoryId: string;
  data: { name?: string; description?: string; parentId?: string | null };
}) => {
  return createAuthorizedNatsRequest<ICategory>('category.update', {
    categoryId: options.categoryId,
    data: options.data,
  });
};

export const filterCategories = async (options: PaginationOptions) => {
  const payload = withDefaults(options);
  return createNatsRequest<Paginated<ICategory>>('category.filter', payload);
};

export const getAllApprovedCategories = async (options: PaginationOptions) => {
  const payload = withDefaults(options);
  return createNatsRequest<Paginated<ICategory>>('category.getAllApproved', payload);
};

export const getOneApprovedCategory = async (id: string) => {
  return createNatsRequest<ICategory>('category.getOneApproved', { id });
};
