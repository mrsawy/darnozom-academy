'use client';

import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import {
  ensureConversation,
  getChatUnreadTotal,
  getConversation,
  getConversations,
  getMessages,
  markConversationAsRead,
  sendMessage,
  type IChatAttachment,
  type IChatMessage,
  type PaginatedResponse,
} from '@/lib/actions/chat/chat.action';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: (params?: { page?: number; limit?: number }) =>
    [...chatKeys.all, 'conversations', params] as const,
  conversation: (id: string) => [...chatKeys.all, 'conversation', id] as const,
  messages: (conversationId: string, params?: { page?: number }) =>
    [...chatKeys.all, 'messages', conversationId, params] as const,
  unread: () => [...chatKeys.all, 'unread'] as const,
};

export function useConversations(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: chatKeys.conversations(params),
    queryFn: () => getConversations(params),
    staleTime: 30 * 1000,
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId ?? ''),
    queryFn: () => {
      if (!conversationId) throw new Error('conversationId is required');
      return getConversation(conversationId);
    },
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string | undefined, page = 1) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? '', { page }),
    queryFn: () => {
      if (!conversationId) throw new Error('conversationId is required');
      return getMessages(conversationId, { page, limit: 30 });
    },
    enabled: !!conversationId,
  });
}

export function useChatUnreadTotal() {
  return useQuery({
    queryKey: chatKeys.unread(),
    queryFn: getChatUnreadTotal,
    staleTime: 30 * 1000,
  });
}

export function useEnsureConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ensureConversation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}

interface SendMessageVariables {
  recipientId: string;
  content?: string;
  attachments?: IChatAttachment[];
  /** Active conversation id — required for optimistic insertion into the messages cache. */
  conversationId?: string;
  /** Current user's id — used as senderId on the optimistic message. */
  senderId?: string;
}

interface SendMessageContext {
  conversationId?: string;
  messagesKey?: ReturnType<typeof chatKeys.messages>;
  optimisticId?: string;
  previousMessages?: PaginatedResponse<IChatMessage>;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation<IChatMessage, Error, SendMessageVariables, SendMessageContext>({
    mutationFn: (payload) =>
      sendMessage({
        recipientId: payload.recipientId,
        content: payload.content,
        attachments: payload.attachments,
      }) as Promise<IChatMessage>,

    onMutate: async (variables) => {
      const { conversationId, senderId } = variables;
      if (!conversationId || !senderId) return {};

      const messagesKey = chatKeys.messages(conversationId, { page: 1 });
      await queryClient.cancelQueries({ queryKey: messagesKey });

      const previousMessages =
        queryClient.getQueryData<PaginatedResponse<IChatMessage>>(messagesKey);

      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: IChatMessage = {
        _id: optimisticId,
        conversationId,
        senderId,
        content: variables.content ?? '',
        attachments: variables.attachments ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<PaginatedResponse<IChatMessage>>(messagesKey, (old) => {
        if (!old) {
          return {
            docs: [optimistic],
            totalDocs: 1,
            totalPages: 1,
            page: 1,
            limit: 30,
            hasNextPage: false,
            hasPrevPage: false,
          };
        }
        return { ...old, docs: [optimistic, ...old.docs] };
      });

      return { conversationId, messagesKey, optimisticId, previousMessages };
    },

    onError: (_err, _variables, context) => {
      if (!context?.messagesKey) return;
      // Rollback to the snapshot taken before the mutation
      if (context.previousMessages === undefined) {
        queryClient.removeQueries({ queryKey: context.messagesKey });
      } else {
        queryClient.setQueryData(context.messagesKey, context.previousMessages);
      }
    },

    onSuccess: (result, _variables, context) => {
      if (!result || !context?.messagesKey || !context.optimisticId) {
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
        return;
      }
      // Replace the optimistic message with the real one returned from the server
      queryClient.setQueryData<PaginatedResponse<IChatMessage>>(context.messagesKey, (old) => {
        if (!old) return old;
        const exists = old.docs.some((m) => m._id === result._id);
        const docs = old.docs
          .filter((m) => m._id !== context.optimisticId)
          .filter((m, i, arr) => arr.findIndex((x) => x._id === m._id) === i);
        return { ...old, docs: exists ? docs : [result, ...docs] };
      });
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markConversationAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}
