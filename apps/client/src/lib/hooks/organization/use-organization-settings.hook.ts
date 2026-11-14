'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as orgApi from '@/lib/actions/organization/organization.action';
import type { IOrganizationSettings } from '@/lib/actions/organization/organization.action';

const ROOT = 'organization';

export const organizationKeys = {
  settings: [ROOT, 'settings'] as const,
};

export const useOrganizationSettings = (enabled = true) =>
  useQuery({
    queryKey: organizationKeys.settings,
    queryFn: async (): Promise<IOrganizationSettings> =>
      unwrap(await orgApi.getOrganizationSettings()),
    enabled,
  });

export const useUpdateOrganizationSettings = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations('AcademySettings');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: async (data: Partial<IOrganizationSettings>) =>
      unwrap(await orgApi.updateOrganizationSettings(data)),
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
      // The dashboard layout (server component) injects the theme; re-run it.
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
};
