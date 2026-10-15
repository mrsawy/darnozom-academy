'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as templateApi from '@/lib/actions/message-template/message-template.action';
import type {
  IMessageTemplate,
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
  RenderMessageTemplateDto,
  RenderTemplateResult,
} from '@/lib/types/message-template/message-template';

const ROOT = 'messageTemplates';

export const messageTemplateKeys = {
  all: [ROOT] as const,
  list: () => [ROOT, 'list'] as const,
};

export const useMessageTemplates = (enabled = true) =>
  useQuery({
    queryKey: messageTemplateKeys.list(),
    queryFn: async (): Promise<IMessageTemplate[]> =>
      unwrap(await templateApi.listMessageTemplates()),
    enabled,
  });

function useTemplateMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  successMessageKey: string,
) {
  const queryClient = useQueryClient();
  const t = useTranslations('MessageTemplates');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t(successMessageKey));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const useCreateTemplate = () =>
  useTemplateMutation(
    async (data: CreateMessageTemplateDto) => unwrap(await templateApi.createMessageTemplate(data)),
    'created',
  );

export const useUpdateTemplate = () =>
  useTemplateMutation(
    async ({ id, data }: { id: string; data: UpdateMessageTemplateDto }) =>
      unwrap(await templateApi.updateMessageTemplate(id, data)),
    'updated',
  );

export const useDeleteTemplate = () =>
  useTemplateMutation(
    async (id: string) => unwrap(await templateApi.deleteMessageTemplate(id)),
    'deleted',
  );

export function useRenderTemplate() {
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: RenderMessageTemplateDto;
    }): Promise<RenderTemplateResult> =>
      unwrap(await templateApi.renderMessageTemplate(id, data)),
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}
