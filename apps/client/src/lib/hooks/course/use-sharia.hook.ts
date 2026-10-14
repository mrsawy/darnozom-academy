'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as shariaApi from '@/lib/actions/course/sharia.action';

const ROOT = 'sharia';

export const shariaKeys = {
  queue: [ROOT, 'queue'] as const,
  versions: (contentId: string) => [ROOT, 'versions', contentId] as const,
};

export const useShariaQueue = (enabled = true) =>
  useQuery({
    queryKey: shariaKeys.queue,
    queryFn: async () => unwrap(await shariaApi.getShariaQueue()),
    enabled,
  });

export const useContentVersions = (contentId: string, enabled = true) =>
  useQuery({
    queryKey: shariaKeys.versions(contentId),
    queryFn: async () => unwrap(await shariaApi.getContentVersions(contentId)),
    enabled: enabled && Boolean(contentId),
  });

function useShariaMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const t = useTranslations('Sharia');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const useApproveShariaVersion = () =>
  useShariaMutation(async (vars: { contentId: string; version: number }) =>
    unwrap(await shariaApi.approveShariaVersion(vars.contentId, vars.version))
  );

export const useRejectShariaVersion = () =>
  useShariaMutation(async (vars: { contentId: string; version: number; comment: string }) =>
    unwrap(await shariaApi.rejectShariaVersion(vars.contentId, vars.version, vars.comment))
  );
