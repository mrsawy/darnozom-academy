'use client';

import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from '@/components/assistant-ui/attachment';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import { ToolFallback } from '@/components/assistant-ui/tool-fallback';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { AiUpgradeModal, type AiUpgradeReason } from '@/components/assistant-ui/ai-upgrade-modal';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { AiSubscriptionErrors, CommonErrors } from '@darnozom/shared-types';
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
} from 'react';
import { toast } from 'sonner';
import { useAiMessagePagination } from '@/lib/contexts/ai-message-pagination-context';
import { getDir, getDirectionSourceFromMessageParts } from '@/lib/utils/text-direction';

// ─── AI Chat limit context ────────────────────────────────────────────────────

interface AiChatLimitContextValue {
  openUpgradeModal: (reason?: AiUpgradeReason) => void;
}

const AiChatLimitContext = createContext<AiChatLimitContextValue>({
  openUpgradeModal: (_reason?: AiUpgradeReason) => {
    void _reason;
  },
});

export const Thread: FC = () => {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<AiUpgradeReason>('dailyLimit');

  const openUpgradeModal = useCallback((reason: AiUpgradeReason = 'dailyLimit') => {
    setUpgradeReason(reason);
    setUpgradeModalOpen(true);
  }, []);

  return (
    <AiChatLimitContext.Provider value={{ openUpgradeModal }}>
      <ThreadPrimitive.Root
        className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
        style={{
          ['--thread-max-width' as string]: '44rem',
          ['--composer-radius' as string]: '24px',
          ['--composer-padding' as string]: '10px',
        }}>
        <ThreadPrimitive.Viewport
          turnAnchor="top"
          data-ai-thread-viewport
          className="aui-thread-viewport custom-scrollbar relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <ThreadLoadOlderSentinel />

          <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>

          <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pb-4 md:pb-6">
            <ThreadScrollToBottom />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>

      <AiUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason={upgradeReason}
      />
    </AiChatLimitContext.Provider>
  );
};

/** Infinite scroll: load earlier AI thread messages when the user scrolls near the top. */
const ThreadLoadOlderSentinel: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  const { state } = useAiMessagePagination();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const ignoreIORef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const tmr = setTimeout(() => {
      ignoreIORef.current = false;
    }, 400);
    return () => clearTimeout(tmr);
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !state?.hasMoreOlder) return;
    const root = el.parentElement;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const s = stateRef.current;
        if (
          !entries[0]?.isIntersecting ||
          !s?.hasMoreOlder ||
          ignoreIORef.current ||
          s.loadingOlder
        ) {
          return;
        }
        void s.loadOlder();
      },
      { root, rootMargin: '80px 0px 0px 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [state?.hasMoreOlder, state?.loadOlder, state?.loadingOlder]);

  if (!state) return null;
  if (!state.hasMoreOlder && !state.loadingOlder) return null;

  return (
    <div
      ref={sentinelRef}
      className="flex min-h-8 w-full shrink-0 items-center justify-center py-2"
      aria-hidden={!state.hasMoreOlder}>
      {state.loadingOlder ? (
        <span className="text-muted-foreground text-xs">{t('loadOlderLoading')}</span>
      ) : (
        <span className="text-muted-foreground text-xs">{t('loadOlderHint')}</span>
      )}
    </div>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  if (isEditing) return <EditComposer />;
  if (role === 'user') return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip={t('scrollToBottom')}
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible">
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
            {t('welcomeTitle')}
          </h1>
          <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-xl delay-75 duration-200">
            {t('welcomeSubtitle')}
          </p>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full gap-2 pb-4 @md:grid-cols-2">
      <ThreadPrimitive.Suggestions>{() => <ThreadSuggestionItem />}</ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200 nth-[n+3]:hidden @md:nth-[n+3]:block">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion bg-background hover:bg-muted h-auto w-full flex-wrap items-start justify-start gap-1 rounded-3xl border px-4 py-3 text-left text-sm transition-colors @md:flex-col">
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const Composer: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="composer-shell"
          className="bg-background focus-within:border-ring/75 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:bg-accent/50 flex w-full flex-col gap-2 rounded-(--composer-radius) border p-(--composer-padding) transition-shadow focus-within:ring-2 data-[dragging=true]:border-dashed">
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder={t('composerPlaceholder')}
            className="aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none"
            rows={1}
            aria-label={t('messageInputAria')}
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <ComposerAddAttachment />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip={t('sendMessageTooltip')}
            side="bottom"
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-send size-8 rounded-full"
            aria-label={t('sendMessageAria')}>
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-8 rounded-full"
            aria-label={t('stopGeneratingAria')}>
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

/**
 * Intercepts assistant message errors, shows them as toasts, and opens the
 * upgrade modal for subscription-limit errors. Nothing is rendered in chat.
 *
 * `MessagePrimitive.Error` only mounts its children when there is an error on
 * the message, so `MessageErrorToaster` mounts exactly once per error event.
 * The hidden `ErrorPrimitive.Message` span is read via a ref to extract the
 * raw error string (which may be a JSON envelope from the proxy route).
 */
const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <MessageErrorToaster />
    </MessagePrimitive.Error>
  );
};

const MessageErrorToaster: FC = () => {
  const tErrors = useTranslations('errors');
  const { openUpgradeModal } = useContext(AiChatLimitContext);
  const errorSpanRef = useRef<HTMLSpanElement>(null);
  const lastProcessedError = useRef<string | null>(null);

  useLayoutEffect(() => {
    const rawText = errorSpanRef.current?.textContent?.trim() ?? '';
    if (!rawText || rawText === lastProcessedError.current) return;
    lastProcessedError.current = rawText;

    // The proxy passes the NestJS JSON envelope as the error body.
    // Extract the `message` field when present.
    let msgKey = rawText;
    let statusCode: number | undefined;
    try {
      const json = JSON.parse(rawText) as {
        message?: unknown;
        statusCode?: unknown;
      };
      if (typeof json.message === 'string') msgKey = json.message;
      if (typeof json.statusCode === 'number') statusCode = json.statusCode;
    } catch {
      // not JSON – use as-is
    }

    // 429 rate-limit: prefer shared-types key; fall back if body is missing/legacy English
    if (statusCode === 429) {
      const key = msgKey.startsWith(CommonErrors.TOO_MANY_REQUESTS)
        ? msgKey
        : (() => {
            const match = /(\d+)\s*seconds?/i.exec(msgKey);
            return match
              ? `${CommonErrors.TOO_MANY_REQUESTS}|${match[1]}`
              : CommonErrors.TOO_MANY_REQUESTS;
          })();
      toast.error(translateApiMessage(key, tErrors));
      return;
    }

    const translated = translateApiMessage(msgKey, tErrors);

    if (msgKey.startsWith(AiSubscriptionErrors.DAILY_AI_MESSAGE_LIMIT_REACHED)) {
      toast.warning(translated, { id: 'ai-daily-limit' });
      openUpgradeModal('dailyLimit');
    } else if (msgKey.startsWith(AiSubscriptionErrors.NO_ACTIVE_AI_SUBSCRIPTION)) {
      toast.error(translated, { id: 'ai-no-subscription' });
      openUpgradeModal('noSubscription');
    } else if (msgKey.startsWith(AiSubscriptionErrors.AI_SUBSCRIPTION_EXPIRED)) {
      toast.error(translated, { id: 'ai-subscription-expired' });
      openUpgradeModal('expired');
    } else if (msgKey.startsWith(AiSubscriptionErrors.AI_PLAN_FEATURE_NOT_INCLUDED)) {
      toast.error(translated, { id: 'ai-feature-not-included' });
      openUpgradeModal('featureNotIncluded');
    } else {
      toast.error(translated);
    }
  }, [tErrors, openUpgradeModal]);

  return (
    <span ref={errorSpanRef} className="sr-only" aria-hidden="true">
      <ErrorPrimitive.Message />
    </span>
  );
};

const AssistantMessage: FC = () => {
  const locale = useLocale();
  const directionSource = useAuiState((s) => getDirectionSourceFromMessageParts(s.message.content));
  const dir = getDir(directionSource, locale);

  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 animate-in relative mx-auto w-full max-w-(--thread-max-width) py-3 duration-150"
      data-role="assistant">
      <div
        dir={dir}
        className="aui-assistant-message-content text-foreground px-2 leading-relaxed wrap-break-word">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === 'text') return <MarkdownText />;
            if (part.type === 'tool-call') return part.toolUI ?? <ToolFallback {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>
        <MessageError />
      </div>

      <div className="aui-assistant-message-footer mt-1 ml-2 flex min-h-6 items-center">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ml-1 flex gap-1">
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip={t('copyTooltip')}>
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip={t('refreshTooltip')}>
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton tooltip={t('moreTooltip')} className="data-[state=open]:bg-accent">
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md">
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none">
              <DownloadIcon className="size-4" />
              {t('exportMarkdown')}
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  const locale = useLocale();
  const directionSource = useAuiState((s) => getDirectionSourceFromMessageParts(s.message.content));
  const dir = getDir(directionSource, locale);

  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 animate-in mx-auto grid w-full max-w-(--thread-max-width) auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
      data-role="user">
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div
          dir={dir}
          className="aui-user-message-content peer bg-muted text-foreground rounded-2xl px-4 py-2.5 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts />
        </div>
        <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2 peer-empty:hidden">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end">
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip={t('editTooltip')} className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root bg-muted ml-auto flex w-full max-w-[85%] flex-col rounded-2xl">
        <ComposerPrimitive.Input className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent p-4 text-sm outline-none" />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              {t('cancelEdit')}
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">{t('updateEdit')}</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({ className, ...rest }) => {
  const t = useTranslations('AssistantUi.thread');
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        'aui-branch-picker-root text-muted-foreground mr-2 -ml-2 inline-flex items-center text-xs',
        className
      )}
      {...rest}>
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip={t('previousBranch')}>
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip={t('nextBranch')}>
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
