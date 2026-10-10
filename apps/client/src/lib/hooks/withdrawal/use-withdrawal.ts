'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { WithdrawalRequestStatus } from '@lms-organization/shared-types';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import {
  createWithdrawalRequest,
  getMyWithdrawalRequests,
  getWithdrawalRequest,
  updateWithdrawalRequest,
  cancelWithdrawalRequest,
  getAllWithdrawalRequests,
  processWithdrawalRequest,
} from '@/lib/actions/withdrawal/withdrawal.action';
import {
  CreateWithdrawalRequestPayload,
  UpdateWithdrawalRequestPayload,
  ProcessWithdrawalRequestPayload,
} from '@/lib/types/withdrawal/withdrawal-request.interface';
import { walletKeys } from '@/lib/hooks/wallet/use-wallet';

const ERRORS_NS = 'errors';

export const withdrawalKeys = {
  all: ['withdrawalRequests'] as const,
  myList: (page?: number, limit?: number) => [...withdrawalKeys.all, 'my', page, limit] as const,
  adminList: (page?: number, limit?: number, status?: string) =>
    [...withdrawalKeys.all, 'admin', page, limit, status] as const,
  detail: (id: string) => [...withdrawalKeys.all, 'detail', id] as const,
};

export function useMyWithdrawalRequests(page = 1, limit = 10) {
  return useQuery({
    queryKey: withdrawalKeys.myList(page, limit),
    queryFn: () => getMyWithdrawalRequests(page, limit),
  });
}

export function useWithdrawalRequest(id: string) {
  return useQuery({
    queryKey: withdrawalKeys.detail(id),
    queryFn: () => getWithdrawalRequest(id),
    enabled: !!id,
  });
}

export function useCreateWithdrawalRequest() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations(ERRORS_NS);

  return useMutation({
    mutationFn: (data: CreateWithdrawalRequestPayload) => createWithdrawalRequest(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
      void queryClient.invalidateQueries({ queryKey: walletKeys.wallet() });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useUpdateWithdrawalRequest() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations(ERRORS_NS);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWithdrawalRequestPayload }) =>
      updateWithdrawalRequest(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: withdrawalKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...withdrawalKeys.all, 'my'] });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useCancelWithdrawalRequest() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations(ERRORS_NS);

  return useMutation({
    mutationFn: (id: string) => cancelWithdrawalRequest(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: withdrawalKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...withdrawalKeys.all, 'my'] });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useAllWithdrawalRequests(page = 1, limit = 10, status?: WithdrawalRequestStatus) {
  return useQuery({
    queryKey: withdrawalKeys.adminList(page, limit, status),
    queryFn: () => getAllWithdrawalRequests(page, limit, status),
  });
}

export function useProcessWithdrawalRequest() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations(ERRORS_NS);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProcessWithdrawalRequestPayload }) =>
      processWithdrawalRequest(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: withdrawalKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...withdrawalKeys.all, 'admin'] });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}
