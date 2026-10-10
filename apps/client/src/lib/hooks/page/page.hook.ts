'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { Paginated, PaginationOptions } from '@/lib/types/Paginated';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { toast } from 'react-toastify';
import { IPage } from '@/lib/types/page/page.interface';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';

// Query keys
export const pageKeys = {
  all: ['pages'] as const,
  organization: (options?: PaginationOptions) =>
    [...pageKeys.all, 'organization', options] as const,
  detail: (slug: string) => [...pageKeys.all, 'detail', slug] as const,
};

// Hook for fetching pages by organization
export function usePagesByOrganization(options?: PaginationOptions) {
  return useQuery({
    queryKey: pageKeys.organization(options),
    queryFn: async () => {
      const pages = await createAuthorizedNatsRequest<Paginated<IPage>>('pages.findAllPages', {
        options,
      });
      return pages;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });
}

// Hook for fetching a single page by slug
export function usePageBySlug(slug: string, enabled = true) {
  return useQuery({
    queryKey: pageKeys.detail(slug),
    queryFn: async () => {
      const page = await createAuthorizedNatsRequest<IPage>('pages.findOnePage', { slug }, true);
      return page as IPage;
    },
    enabled: !!slug && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for creating a page
export function useCreatePage() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (createPageDto: {
      title: string;
      slug: string;
      published: boolean;
      pageData?: Record<string, unknown>;
    }) => {
      const page = await createAuthorizedNatsRequest('pages.createPage', createPageDto);
      return page;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pageKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['activeSubscription'] });
      toast.success('Page created successfully');
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error?.message, tErrors));
    },
  });
}

// Hook for updating a page
export function useUpdatePage() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (updatePageDto: {
      slug: string;
      title?: string;
      published?: boolean;
      pageData?: Record<string, unknown>;
    }) => {
      const page = await createAuthorizedNatsRequest('pages.updatePage', updatePageDto);
      return page;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: pageKeys.all });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.detail(variables.slug),
      });
      toast.success('Page updated successfully');
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error?.message, tErrors));
    },
  });
}

// Hook for toggling page published status
export function useTogglePageStatus() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async ({ slug, published }: { slug: string; published: boolean }) => {
      const page = await createAuthorizedNatsRequest('pages.updatePage', {
        slug,
        published,
      });
      return page;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pageKeys.all });
      toast.success('Page status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error?.message, tErrors));
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (_id: string) => {
      const page = await createAuthorizedNatsRequest('pages.deletePage', {
        _id,
      });
      return page;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pageKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['activeSubscription'] });
      toast.success('Page Deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error?.message, tErrors));
    },
  });
}
