'use client';

import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from '@assistant-ui/react';
import { ArchiveIcon, MoreHorizontalIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { type FC, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/atoms/button';
import { Skeleton } from '@/components/atoms/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/atoms/tooltip';

interface ThreadListProps {
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const ThreadList: FC<ThreadListProps> = ({
  loadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  return (
    <ThreadListPrimitive.Root className="flex h-full flex-col gap-1 p-2">
      <ThreadListNew />

      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>

      <AuiIf condition={(s) => !s.threads.isLoading}>
        <div className="flex-1 overflow-y-auto">
          <ThreadListPrimitive.Items>{() => <ThreadListItem />}</ThreadListPrimitive.Items>

          {(hasMore || isLoadingMore) && loadMore ? (
            <ThreadListLoadMore
              loadMore={loadMore}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
            />
          ) : null}
        </div>
      </AuiIf>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  const t = useTranslations('AssistantUi.threadList');
  return (
    <ThreadListPrimitive.New asChild>
      <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-sm">
        <PlusIcon className="size-4" />
        {t('newThread')}
      </Button>
    </ThreadListPrimitive.New>
  );
};

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  );
};

interface ThreadListLoadMoreProps {
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;
  hasMore: boolean;
}

const ThreadListLoadMore: FC<ThreadListLoadMoreProps> = ({ loadMore, isLoadingMore, hasMore }) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(isLoadingMore);
  isLoadingRef.current = isLoadingMore;

  const handleIntersect = useCallback(() => {
    if (!isLoadingRef.current && hasMore) {
      void loadMore();
    }
  }, [loadMore, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleIntersect();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  return (
    <div ref={sentinelRef} className="flex flex-col gap-1.5 pt-1 pb-2">
      {isLoadingMore ? (
        <>
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-3/4 rounded-md" />
        </>
      ) : null}
    </div>
  );
};

/** Dropdown rows: @assistant-ui/react v0.12 uses Item, not Archive/Delete primitives. */
const ThreadListItemMoreMenuItems: FC = () => {
  const t = useTranslations('AssistantUi.threadList');
  const api = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);

  return (
    <>
      <ThreadListItemMorePrimitive.Item
        className="hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none"
        onSelect={() => {
          if (!threadId) return;
          void api.threads().item({ id: threadId }).archive();
        }}>
        <ArchiveIcon className="size-4" />
        {t('archive')}
      </ThreadListItemMorePrimitive.Item>
      <ThreadListItemMorePrimitive.Item
        className="hover:bg-destructive/10 text-destructive flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none"
        onSelect={() => {
          if (!threadId) return;
          void api.threads().item({ id: threadId }).delete();
        }}>
        <TrashIcon className="size-4" />
        {t('delete')}
      </ThreadListItemMorePrimitive.Item>
    </>
  );
};

const ThreadListItem: FC = () => {
  const t = useTranslations('AssistantUi.threadList');
  return (
    <ThreadListItemPrimitive.Root className="group hover:bg-muted/50 data-active:bg-muted flex items-center gap-1 rounded-md transition-colors">
      <ThreadListItemPrimitive.Trigger className="flex-1 truncate px-3 py-2 text-start text-sm">
        <ThreadListItemPrimitive.Title fallback={t('newThread')} />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMore />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemMore: FC = () => {
  const t = useTranslations('AssistantUi.threadList');
  return (
    <ThreadListItemMorePrimitive.Root>
      {/*
        Do not use TooltipIconButton with asChild here: our TooltipIconButton always renders
        two nodes inside Button (Slottable + sr-only span), which breaks Radix Slot (Children.only).
      */}
      <Tooltip>
        <TooltipTrigger asChild>
          <ThreadListItemMorePrimitive.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="aui-button-icon mr-1 size-6 p-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">{t('moreOptions')}</span>
            </Button>
          </ThreadListItemMorePrimitive.Trigger>
        </TooltipTrigger>
        <TooltipContent side="right">{t('moreOptions')}</TooltipContent>
      </Tooltip>

      <ThreadListItemMorePrimitive.Content className="bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md">
        <ThreadListItemMoreMenuItems />
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};
