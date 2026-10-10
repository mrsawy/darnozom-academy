'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

export interface IChatUserLite {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roleName?: string;
  profile?: { avatar?: string };
}

export interface IChatAttachment {
  fileKey: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface IChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: IChatAttachment[];
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IConversation {
  _id: string;
  participantIds: IChatUserLite[];
  lastMessagePreview: string;
  lastMessageSenderId?: string;
  lastMessageAt?: string;
  unreadCount?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export async function getConversations(options?: { page?: number; limit?: number }) {
  return createAuthorizedNatsRequest<PaginatedResponse<IConversation>>(
    'chat.getConversations',
    options ?? {}
  );
}

export async function ensureConversation(recipientId: string) {
  return createAuthorizedNatsRequest<IConversation>('chat.ensureConversation', { recipientId });
}

export async function getConversation(conversationId: string) {
  return createAuthorizedNatsRequest<IConversation>('chat.getConversation', { conversationId });
}

export async function getMessages(
  conversationId: string,
  options?: { page?: number; limit?: number }
) {
  return createAuthorizedNatsRequest<PaginatedResponse<IChatMessage>>('chat.getMessages', {
    conversationId,
    ...options,
  });
}

export async function sendMessage(payload: {
  recipientId: string;
  content?: string;
  attachments?: IChatAttachment[];
}) {
  return createAuthorizedNatsRequest<IChatMessage>('chat.sendMessage', payload);
}

export async function markConversationAsRead(conversationId: string) {
  return createAuthorizedNatsRequest<{ success: true }>('chat.markAsRead', { conversationId });
}

export async function getChatUnreadTotal() {
  return createAuthorizedNatsRequest<number>('chat.getUnreadTotal', {});
}
