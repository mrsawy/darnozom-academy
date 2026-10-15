'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  IMessageTemplate,
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
  RenderMessageTemplateDto,
  RenderTemplateResult,
} from '@/lib/types/message-template/message-template';

export async function listMessageTemplates() {
  return createAuthorizedNatsRequest<IMessageTemplate[]>('messageTemplates.list', {});
}

export async function createMessageTemplate(data: CreateMessageTemplateDto) {
  return createAuthorizedNatsRequest<IMessageTemplate>('messageTemplates.create', data);
}

export async function updateMessageTemplate(id: string, data: UpdateMessageTemplateDto) {
  return createAuthorizedNatsRequest<IMessageTemplate>('messageTemplates.update', { id, ...data });
}

export async function deleteMessageTemplate(id: string) {
  return createAuthorizedNatsRequest<void>('messageTemplates.remove', { id });
}

export async function renderMessageTemplate(id: string, data: RenderMessageTemplateDto) {
  return createAuthorizedNatsRequest<RenderTemplateResult>('messageTemplates.render', { id, ...data });
}
