'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRemoteThreadListRuntime } from '@assistant-ui/react';
import type {
  RemoteThreadListAdapter,
  ThreadHistoryAdapter,
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
} from '@assistant-ui/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { useAuiState } from '@assistant-ui/store';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { createAssistantStream } from 'assistant-stream';
import {
  listAiThreads,
  initializeAiThread,
  fetchAiThread,
  renameAiThread,
  archiveAiThread,
  unarchiveAiThread,
  deleteAiThread,
  getAiThreadMessages,
  type AiThreadMetadata,
} from '@/lib/actions/ai/ai-thread.action';
import { useAiMessagePagination } from '@/lib/contexts/ai-message-pagination-context';
import {
  AI_CHAT_MAX_REQUEST_BYTES,
  AI_CHAT_MAX_REQUEST_SIZE_MB,
} from '@/lib/data/constants/ai-chat.constants';

const THREADS_PER_PAGE = 20;

/** Initial + per-scroll page size for AI thread message history (HTTP + UI). */
export const AI_THREAD_MESSAGE_PAGE_SIZE = 12;

function streamStaticLabel(label: string) {
  return createAssistantStream((ctrl) => {
    ctrl.appendText(label);
    ctrl.close();
  });
}

function getHttpBodyByteSize(body: BodyInit | null | undefined): number | null {
  if (body == null) return 0;
  if (typeof body === 'string') return new TextEncoder().encode(body).length;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size;
  return null;
}

interface MessagePaginationSink {
  setHasMore: (v: boolean) => void;
}

/** Avoid duplicate sidebar rows when the same remoteId appears twice in list payloads. */
function dedupeThreadsByRemoteId(threads: AiThreadMetadata[]): AiThreadMetadata[] {
  const seen = new Set<string>();
  const out: AiThreadMetadata[] = [];
  for (const t of threads) {
    if (seen.has(t.remoteId)) continue;
    seen.add(t.remoteId);
    out.push(t);
  }
  return out;
}

// ─── Shared per-mount thread cache ──────────────────────────────────────────

interface ThreadCache {
  threads: AiThreadMetadata[];
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;
}

// ─── History adapter ────────────────────────────────────────────────────────

function createHistoryAdapter(remoteId: string, sink: MessagePaginationSink): ThreadHistoryAdapter {
  return {
    // Required by the ThreadHistoryAdapter type, but useAISDKRuntime always goes
    // through withFormat() instead — these are intentional no-ops.
    async load() {
      return { headId: null, messages: [] };
    },
    async append() {
      return;
    },

    withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
      _formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>
    ): GenericThreadHistoryAdapter<TMessage> {
      return {
        async load() {
          const result = await getAiThreadMessages(remoteId, {
            limit: AI_THREAD_MESSAGE_PAGE_SIZE,
          });
          if ('err' in result) {
            sink.setHasMore(false);
            return { headId: null, messages: [] };
          }

          sink.setHasMore(result.hasMore);

          const msgs = result.messages ?? [];
          if (msgs.length === 0) return { headId: null, messages: [] };

          return {
            headId: msgs.at(-1)?.id ?? null,
            messages: msgs.map(
              (msg, i): MessageFormatItem<TMessage> => ({
                parentId: msgs[i - 1]?.id ?? null,
                // useAISDKRuntime always passes aiSDKV6FormatAdapter so
                // TMessage = UIMessage at runtime — the cast is safe.
                message: msg as unknown as TMessage,
              })
            ),
          };
        },
        async append() {
          // Messages are saved server-side inside /api/chat — no-op here.
        },
      };
    },
  };
}

// ─── Thread list adapter ─────────────────────────────────────────────────────

class PersistedThreadListAdapter implements RemoteThreadListAdapter {
  constructor(private readonly cache: ThreadCache) {}

  async list() {
    if (this.cache.threads.length === 0 && !this.cache.isLoading) {
      await this._fetchPage(1);
    }
    return { threads: dedupeThreadsByRemoteId(this.cache.threads) };
  }

  /** Returns true if new threads were fetched. */
  async loadNextPage(): Promise<boolean> {
    if (!this.cache.hasMore || this.cache.isLoading) return false;
    await this._fetchPage(this.cache.currentPage + 1);
    return true;
  }

  private async _fetchPage(page: number) {
    this.cache.isLoading = true;
    try {
      const result = await listAiThreads({ page, limit: THREADS_PER_PAGE });
      if ('err' in result) return;
      if (page === 1) {
        this.cache.threads = dedupeThreadsByRemoteId(result.threads);
      } else {
        // Deduplicate: a thread whose updatedAt changed between page fetches can
        // appear in multiple pages (sort-by-updatedAt pagination drift).
        const seen = new Set(this.cache.threads.map((t) => t.remoteId));
        const fresh = dedupeThreadsByRemoteId(result.threads).filter((t) => !seen.has(t.remoteId));
        this.cache.threads = [...this.cache.threads, ...fresh];
      }
      this.cache.hasMore = result.hasMore;
      this.cache.currentPage = page;
    } finally {
      this.cache.isLoading = false;
    }
  }

  async initialize(_threadId: string) {
    const result = await initializeAiThread();
    if ('err' in result) return { remoteId: _threadId, externalId: undefined };
    return { remoteId: result.remoteId, externalId: undefined };
  }

  async fetch(threadId: string) {
    const result = await fetchAiThread(threadId);
    if ('err' in result) throw new Error('Thread not found');
    return result;
  }

  async rename(remoteId: string, newTitle: string) {
    await renameAiThread(remoteId, newTitle);
  }

  async archive(remoteId: string) {
    await archiveAiThread(remoteId);
  }

  async unarchive(remoteId: string) {
    await unarchiveAiThread(remoteId);
  }

  async delete(remoteId: string) {
    await deleteAiThread(remoteId);
  }

  generateTitle(
    _remoteId: string,
    messages: Parameters<RemoteThreadListAdapter['generateTitle']>[1]
  ) {
    const firstUser = messages.find((m) => m.role === 'user');
    const firstUserText = firstUser
      ? firstUser.content
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('')
          .trim()
      : '';

    if (!firstUserText) return Promise.resolve(streamStaticLabel('New Thread'));

    return fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: firstUserText }),
    }).then((res) => {
      if (!res.ok || !res.body) return streamStaticLabel(firstUserText.slice(0, 50));

      // The NestJS endpoint returns a plain-text byte stream (toTextStreamResponse).
      // Pipe each decoded chunk into an AssistantStream via appendText so the
      // runtime receives AssistantStreamChunk objects, not raw Uint8Arrays.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      return createAssistantStream(async (ctrl) => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            ctrl.appendText(decoder.decode(value, { stream: true }));
          }
        } finally {
          ctrl.close();
        }
      });
    });
  }
}

// ─── Runtime hook ─────────────────────────────────────────────────────────────

export interface PersistedChatRuntimeOptions {
  initialThreadId?: string;
  onThreadChange?: (remoteId: string | undefined) => void;
  contentId?: string;
}

export interface PersistedChatRuntimeResult {
  runtime: ReturnType<typeof useRemoteThreadListRuntime>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function usePersistedChatRuntime(
  options?: PersistedChatRuntimeOptions
): PersistedChatRuntimeResult {
  const contentIdRef = useRef(options?.contentId);
  contentIdRef.current = options?.contentId;

  const cacheRef = useRef<ThreadCache>({
    threads: [],
    currentPage: 0,
    hasMore: true,
    isLoading: false,
  });

  const [adapter, setAdapter] = useState(() => new PersistedThreadListAdapter(cacheRef.current));
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cacheRef.current.hasMore || cacheRef.current.isLoading || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const fetched = await adapter.loadNextPage();
      if (fetched) {
        setAdapter(new PersistedThreadListAdapter(cacheRef.current));
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [adapter, isLoadingMore]);

  const onThreadChangeRef = useRef(options?.onThreadChange);
  onThreadChangeRef.current = options?.onThreadChange;

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      const remoteId = useAuiState((s) => s.threadListItem.remoteId);
      const threadLocalId = useAuiState((s) => s.threadListItem.id);
      const t = useTranslations('AssistantUi.thread');
      const tRef = useRef(t);
      tRef.current = t;
      const { register } = useAiMessagePagination();

      const [hasMoreOlder, setHasMoreOlder] = useState(false);
      const [loadingOlder, setLoadingOlder] = useState(false);
      const loadingOlderLockRef = useRef(false);

      useEffect(() => {
        onThreadChangeRef.current?.(remoteId ?? undefined);
      }, [remoteId]);

      // Capture remoteId at mount time only. If we let this memo re-run when
      // remoteId changes (undefined → id on a brand-new thread), useAISDKRuntime
      // will call history.load() mid-stream and setMessages([]) wipes the active
      // stream, producing "Unsupported chunk type: undefined".
      // Existing threads always mount with remoteId already set (from the list),
      // so history loads correctly. New threads mount with remoteId=undefined and
      // never need a history load (there is nothing to load).
      const mountRemoteIdRef = useRef(remoteId);
      const paginationSinkRef = useRef<MessagePaginationSink>({
        setHasMore: (_v: boolean) => {
          void _v;
        },
      });
      paginationSinkRef.current.setHasMore = setHasMoreOlder;

      const historyAdapter = useMemo(
        () =>
          mountRemoteIdRef.current
            ? createHistoryAdapter(mountRemoteIdRef.current, paginationSinkRef.current)
            : undefined,
        []
      );

      const remoteIdRef = useRef(remoteId);
      remoteIdRef.current = remoteId;

      const transport = useMemo(
        () =>
          new DefaultChatTransport({
            api: '/api/chat',
            body: () => ({
              threadId: remoteIdRef.current ?? undefined,
              ...(contentIdRef.current ? { contentId: contentIdRef.current } : {}),
            }),
            fetch: (input, init) => {
              const size = getHttpBodyByteSize(init?.body as BodyInit | undefined);
              if (size != null && size > AI_CHAT_MAX_REQUEST_BYTES) {
                toast.error(
                  tRef.current('payloadTooLarge', {
                    maxSize: AI_CHAT_MAX_REQUEST_SIZE_MB,
                  })
                );
                return Promise.reject(new Error('AI_CHAT_PAYLOAD_TOO_LARGE'));
              }
              return fetch(input, init);
            },
          }),
        []
      );

      const chat = useChat({
        id: threadLocalId,
        transport,
      });

      const chatRef = useRef(chat);
      chatRef.current = chat;

      const hasMoreOlderRef = useRef(hasMoreOlder);
      hasMoreOlderRef.current = hasMoreOlder;

      const loadOlderMessages = useCallback(async () => {
        const rid = remoteIdRef.current;
        if (!rid || loadingOlderLockRef.current || !hasMoreOlderRef.current) return;

        const current = chatRef.current.messages;
        if (current.length === 0) return;
        const oldestId = current[0]?.id;
        if (!oldestId) return;

        const prevScrollHeight =
          document.querySelector<HTMLElement>('[data-ai-thread-viewport]')?.scrollHeight ?? 0;

        loadingOlderLockRef.current = true;
        setLoadingOlder(true);
        try {
          const result = await getAiThreadMessages(rid, {
            limit: AI_THREAD_MESSAGE_PAGE_SIZE,
            before: oldestId,
          });
          if ('err' in result) return;

          const older = result.messages ?? [];
          setHasMoreOlder(result.hasMore);
          if (older.length === 0) {
            setHasMoreOlder(false);
            return;
          }

          chatRef.current.setMessages((prev) => [...older, ...prev]);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const vp = document.querySelector('[data-ai-thread-viewport]');
              if (vp) {
                vp.scrollTop += vp.scrollHeight - prevScrollHeight;
              }
            });
          });
        } finally {
          loadingOlderLockRef.current = false;
          setLoadingOlder(false);
        }
      }, []);

      useEffect(() => {
        if (!remoteId) {
          setHasMoreOlder(false);
          register(null);
          return;
        }
        register({
          hasMoreOlder,
          loadingOlder,
          loadOlder: loadOlderMessages,
        });
      }, [remoteId, register, hasMoreOlder, loadingOlder, loadOlderMessages]);

      useEffect(() => {
        return () => {
          register(null);
        };
      }, [register]);

      return useAISDKRuntime(chat, {
        adapters: { history: historyAdapter },
      });
    },
    adapter,
    allowNesting: true,
  });

  const initialThreadId = options?.initialThreadId;
  useEffect(() => {
    if (!initialThreadId) return;
    let cancelled = false;
    void (async () => {
      try {
        // Core returns a Promise; AssistantRuntime typings omit the return type.
        await runtime.threads.getLoadThreadsPromise();
      } catch {
        // List may fail; switchToThread can still fetch thread metadata via the adapter.
      }
      if (cancelled) return;
      try {
        await runtime.threads.switchToThread(initialThreadId);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runtime, initialThreadId]);

  return {
    runtime,
    loadMore,
    hasMore: cacheRef.current.hasMore,
    isLoadingMore,
  };
}
