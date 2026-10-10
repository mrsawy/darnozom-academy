'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ACCESS_TOKEN_NAME } from '@lms-organization/shared-types';
import { useQueryClient } from '@/lib/utils';
import { chatKeys } from './use-chat.hook';
import type { IChatMessage, PaginatedResponse } from '@/lib/actions/chat/chat.action';

function getTokenFromCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [cookieName, ...valueParts] = part.trim().split('=');
    if (cookieName === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

function resolveSocketBaseUrl(): string {
  const wsBase = process.env.NEXT_PUBLIC_WS_BASE_URL;
  if (wsBase && wsBase.trim().length > 0) return wsBase;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && apiUrl.trim().length > 0) return apiUrl;
  return 'http://localhost:5000';
}

interface UseChatSocketOptions {
  activeConversationId?: string;
  onMessage?: (message: IChatMessage) => void;
  onTyping?: (payload: { conversationId: string; fromUserId: string }) => void;
  onRead?: (payload: { conversationId: string; readerId: string }) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const token = getTokenFromCookie(ACCESS_TOKEN_NAME);
    const endpoint = `${resolveSocketBaseUrl().replace(/\/+$/, '')}/chat`;
    // eslint-disable-next-line no-console
    console.log(
      '[chat socket] connecting to',
      endpoint,
      token ? '(token via auth)' : '(token via cookie)'
    );

    const socket = io(endpoint, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('[chat socket] connected', socket.id);
    });

    socket.on('connect_error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[chat socket] connect_error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      // eslint-disable-next-line no-console
      console.warn('[chat socket] disconnected:', reason);
    });

    socket.on('chat.message.created', (payload: IChatMessage) => {
      // eslint-disable-next-line no-console
      console.log('[chat socket] chat.message.created', payload);

      const { activeConversationId } = optionsRef.current;

      // Prepend the new message into the active conversation's cache (flex-col-reverse → newest first in DOM)
      if (activeConversationId && payload.conversationId === activeConversationId) {
        const key = chatKeys.messages(activeConversationId, { page: 1 });
        queryClient.setQueryData(key, (old: PaginatedResponse<IChatMessage> | undefined) => {
          if (!old) {
            // No cached page yet — trigger a fetch instead of fabricating one
            void queryClient.invalidateQueries({
              queryKey: chatKeys.messages(activeConversationId),
            });
            return old;
          }
          if (old.docs.some((m) => m._id === payload._id)) return old;
          return { ...old, docs: [payload, ...old.docs] };
        });
        socket.emit('chat.markRead', { conversationId: activeConversationId });
      } else if (payload.conversationId) {
        // Not currently viewing this conversation — refetch its cache so badge updates if opened
        void queryClient.invalidateQueries({ queryKey: chatKeys.messages(payload.conversationId) });
      }

      // Always refresh conversations list (unread counts, last preview)
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      void queryClient.invalidateQueries({ queryKey: chatKeys.unread() });

      optionsRef.current.onMessage?.(payload);
    });

    socket.on('chat.typing', (payload: { conversationId: string; fromUserId: string }) => {
      optionsRef.current.onTyping?.(payload);
    });

    socket.on('chat.conversation.read', (payload: { conversationId: string; readerId: string }) => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      optionsRef.current.onRead?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  const emitTyping = (conversationId: string, recipientId: string) => {
    socketRef.current?.emit('chat.typing', { conversationId, recipientId });
  };

  const emitMarkRead = (conversationId: string) => {
    socketRef.current?.emit('chat.markRead', { conversationId });
  };

  return { emitTyping, emitMarkRead };
}
