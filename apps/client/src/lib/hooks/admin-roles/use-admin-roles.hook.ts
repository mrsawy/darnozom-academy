'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  type RoleResponse,
  type CreateRolePayload,
  type UpdateRolePayload,
} from '@/lib/actions/role/role.action';

export const adminRoleKeys = {
  all: ['admin-roles'] as const,
  list: () => ['admin-roles', 'list'] as const,
};

const ERRORS_NS = 'errors';

export function useAdminRoles() {
  return useQuery<RoleResponse[]>({
    queryKey: adminRoleKeys.list(),
    queryFn: getRoles,
    staleTime: 60 * 1000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminRoles.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: (data: CreateRolePayload) => createRole(data),
    onSuccess: () => {
      toast.success(t('created'));
      void queryClient.invalidateQueries({ queryKey: adminRoleKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminRoles.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRolePayload }) => updateRole(id, data),
    onSuccess: () => {
      toast.success(t('updated'));
      void queryClient.invalidateQueries({ queryKey: adminRoleKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminRoles.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      toast.success(t('deleted'));
      void queryClient.invalidateQueries({ queryKey: adminRoleKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}
