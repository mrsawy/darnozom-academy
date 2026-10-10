'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@/lib/utils';
import type { InfiniteData } from '@/lib/utils';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import {
  createCategory,
  getAllCategories,
  deleteCategory,
  updateCategory,
  getCategory,
  filterCategories,
  getAllFlatCategories,
  getAllApprovedCategories,
  getOneApprovedCategory,
} from '@/lib/actions/category/category.action';
import { Paginated, PaginationOptions } from '@/lib/types/Paginated';
import { ICategory } from '@/lib/types/category/ICategory';
import { useDebounce } from '@/lib/hooks/use-debounce';

// Query keys for categories
export const categoryKeys = {
  all: ['categories'] as const,
  organization: (organizationId: string) =>
    [...categoryKeys.all, 'organization', organizationId] as const,
  category: (categoryId: string) => [...categoryKeys.all, 'category', categoryId] as const,
  approvedOne: (id: string) => [...categoryKeys.all, 'approved-one', id] as const,
  flat: ['flat-categories'] as const,
  filtered: (search: string) => [...categoryKeys.all, 'filtered', search] as const,
  approved: (search: string) => [...categoryKeys.all, 'approved', search] as const,
};

export function useSingleCategory(categoryId: string) {
  return useQuery<ICategory>({
    queryKey: categoryKeys.category(categoryId),
    queryFn: () => getCategory(categoryId),
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch paginated categories by organization
export function useCategoriesByOrganization(
  options: PaginationOptions<{ organizationId: string }>
) {
  return useQuery<Paginated<ICategory>>({
    queryKey: [...categoryKeys.organization(options.organizationId), options],
    queryFn: () => getAllCategories(options),
    enabled: !!options.organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// Create a new category
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('CategoryHook');

  return useMutation({
    mutationFn: (
      data: PaginationOptions<{ organizationId: string; name: string; parentId?: string | null }>
    ) => createCategory(data),
    onSuccess: (_data, variables) => {
      toast.success(t('createSuccess'));

      if (variables.organizationId) {
        void queryClient.invalidateQueries({
          queryKey: categoryKeys.organization(variables.organizationId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: () => {
      toast.error(t('createError'));
    },
  });
}

// Update a category
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('CategoryHook');

  return useMutation({
    mutationFn: (data: {
      organizationId?: string;
      categoryId: string;
      data: { name?: string; description?: string; parentId?: string | null };
    }) => updateCategory(data),
    onSuccess: (_data, variables) => {
      toast.success(t('updateSuccess'));
      if (variables.organizationId) {
        void queryClient.invalidateQueries({
          queryKey: categoryKeys.organization(variables.organizationId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: categoryKeys.category(variables.categoryId) });
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: () => {
      toast.error(t('updateError'));
    },
  });
}

// Delete a category
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('CategoryHook');

  return useMutation({
    mutationFn: (data: { organizationId: string; categoryId: string }) => deleteCategory(data),
    onSuccess: (_data, variables) => {
      toast.success(t('deleteSuccess'));
      void queryClient.invalidateQueries({
        queryKey: categoryKeys.organization(variables.organizationId),
      });
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: () => {
      toast.error(t('deleteError'));
    },
  });
}

/**
 * Infinite-scroll hook for category search/filter.
 * Replaces the old useMutation-based useFilteredCategories.
 */
export function useInfiniteFilteredCategories(search: string, limit = 20) {
  const debouncedSearch = useDebounce(search, 400);
  return useInfiniteQuery<Paginated<ICategory>, Error, InfiniteData<Paginated<ICategory>>>({
    queryKey: [...categoryKeys.filtered(debouncedSearch), limit],
    queryFn: async ({ pageParam = 1 }) => {
      return (await filterCategories({
        search: debouncedSearch,
        page: typeof pageParam === 'number' ? pageParam : 1,
        limit,
      })) as Paginated<ICategory>;
    },
    getNextPageParam: (last) => (last.hasNextPage ? last.nextPage : undefined),
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Infinite-scroll hook for all approved categories (public, no auth required).
 */
export function useInfiniteApprovedCategories(search: string, limit = 20) {
  const debouncedSearch = useDebounce(search, 400);
  return useInfiniteQuery<Paginated<ICategory>, Error, InfiniteData<Paginated<ICategory>>>({
    queryKey: [...categoryKeys.approved(debouncedSearch), limit],
    queryFn: async ({ pageParam = 1 }) => {
      return await getAllApprovedCategories({
        search: debouncedSearch,
        page: typeof pageParam === 'number' ? pageParam : 1,
        limit,
      });
    },
    getNextPageParam: (last) => (last.hasNextPage ? last.nextPage : undefined),
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches a single approved category by ID for pre-selection display.
 * Only fires when `id` is non-empty and the label isn't available from local state.
 */
export function useApprovedCategoryById(id: string, enabled = true) {
  return useQuery<ICategory>({
    queryKey: categoryKeys.approvedOne(id),
    queryFn: () => getOneApprovedCategory(id),
    enabled: !!id && enabled,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Paginated query for the "All Categories" dashboard tab.
 */
export function useAllApprovedCategories(options: PaginationOptions) {
  return useQuery<Paginated<ICategory>>({
    queryKey: [...categoryKeys.approved(options.search ?? ''), options],
    queryFn: () => getAllApprovedCategories(options),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlatCategories() {
  return useQuery<ICategory[]>({
    queryKey: categoryKeys.flat,
    queryFn: async () => {
      const flatCategories = (await getAllFlatCategories({
        limit: 150,
        page: 1,
      })) as Paginated<ICategory>;
      return flatCategories.docs;
    },
  });
}
