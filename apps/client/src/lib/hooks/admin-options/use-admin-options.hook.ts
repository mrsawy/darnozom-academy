'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
  getPlatformOptions,
  upsertPlatformOption,
  type OptionResponse,
} from '@/lib/actions/options/options.action';

// ─── Query Keys ─────────────────────────────────────────────────────

export const adminOptionsKeys = {
  all: ['admin-options'] as const,
  platform: () => ['admin-options', 'platform'] as const,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'An unexpected error occurred';
}

// ─── Queries ────────────────────────────────────────────────────────

export function usePlatformOptions() {
  return useQuery<OptionResponse[]>({
    queryKey: adminOptionsKeys.platform(),
    queryFn: getPlatformOptions,
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────

export function useUpsertPlatformOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      upsertPlatformOption(key, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminOptionsKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpsertPlatformOptions() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminPlatformOptions.toasts');
  return useMutation({
    mutationFn: async (entries: { key: string; value: unknown }[]) => {
      await Promise.all(entries.map(({ key, value }) => upsertPlatformOption(key, value)));
    },
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: adminOptionsKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
