'use client';

import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { createChild, getChildren, updateChild } from '@/lib/actions/parent/parent-children.action';
import type {
  ICreateChildDto,
  IUpdateChildDto,
} from '@/lib/types/parent/parent-children.interface';

export const parentKeys = {
  all: ['parent'] as const,
  children: () => [...parentKeys.all, 'children'] as const,
};

export function useChildren() {
  return useQuery({
    queryKey: parentKeys.children(),
    queryFn: () => getChildren(),
  });
}

export function useCreateChild(opts?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ICreateChildDto) => {
      const response = await createChild(dto);
      if ('err' in response) {
        throw new Error(response.err.message);
      }
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: parentKeys.children() });
      opts?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateChild(opts?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: IUpdateChildDto }) =>
      updateChild(childId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: parentKeys.children() });
      opts?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
