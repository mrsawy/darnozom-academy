'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { PanelLeftIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Thread } from '@/components/assistant-ui/thread';
import { ThreadList } from '@/components/assistant-ui/thread-list';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { AiMessagePaginationProvider } from '@/lib/contexts/ai-message-pagination-context';
import { usePersistedChatRuntime } from '@/lib/hooks/ai/use-persisted-chat-runtime';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';

export function AiAssistantChat() {
  const t = useTranslations('AssistantUi.threadList');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [initialThreadId] = useState(() => searchParams.get('thread') ?? undefined);

  const onThreadChange = useCallback(
    (remoteId: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (remoteId) {
        params.set('thread', remoteId);
      } else {
        params.delete('thread');
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const { runtime, loadMore, hasMore, isLoadingMore } = usePersistedChatRuntime({
    initialThreadId,
    onThreadChange,
  });

  const [mobileThreadListOpen, setMobileThreadListOpen] = useState(false);
  const threadParam = searchParams.get('thread');

  useEffect(() => {
    setMobileThreadListOpen(false);
  }, [threadParam]);

  return (
    <AiMessagePaginationProvider>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="relative flex h-[calc(100vh-var(--header-height))] overflow-hidden">
          {mobileThreadListOpen ? (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              aria-hidden
              onClick={() => setMobileThreadListOpen(false)}
            />
          ) : null}

          <aside
            className={cn(
              'bg-sidebar flex w-64 shrink-0 flex-col overflow-hidden border-r transition-transform duration-300 ease-in-out',
              'fixed start-0 top-(--header-height) z-50 h-[calc(100vh-var(--header-height))]',
              '-translate-x-full rounded-tl-2xl border md:relative md:start-auto md:top-auto md:z-auto md:h-full md:translate-x-0 rtl:translate-x-full rtl:md:translate-x-0',
              mobileThreadListOpen && 'translate-x-0 rtl:translate-x-0'
            )}>
            <ThreadList loadMore={loadMore} hasMore={hasMore} isLoadingMore={isLoadingMore} />
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="bg-background flex shrink-0 items-center border-b px-2 py-2 md:hidden">
              <Button type="button" variant="outline" onClick={() => setMobileThreadListOpen(true)}>
                <PanelLeftIcon className="size-4" />
                {t('openThreadList')}
              </Button>
            </div>
            <Thread />
          </main>
        </div>
      </AssistantRuntimeProvider>
    </AiMessagePaginationProvider>
  );
}
