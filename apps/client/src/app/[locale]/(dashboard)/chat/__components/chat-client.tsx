'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { SendIcon, ArrowLeftIcon, MessageCircleIcon } from 'lucide-react';
import {
  Chat,
  ChatHeader,
  ChatHeaderAddon,
  ChatHeaderAvatar,
  ChatHeaderButton,
  ChatHeaderMain,
  ChatMessages,
  ChatToolbar,
  ChatToolbarAddon,
  ChatToolbarAttachment,
  ChatToolbarAttachmentButton,
  ChatToolbarButton,
  ChatToolbarTextarea,
  ChatEvent,
  ChatEventAddon,
  ChatEventAvatar,
  ChatEventBody,
  ChatEventContent,
  ChatEventTime,
  ChatEventTitle,
} from '@/components/chat';
import { cn, isFileImage } from '@/lib/utils/index';
import useUserStore from '@/lib/store/userStore';
import {
  useConversations,
  useEnsureConversation,
  useMarkConversationAsRead,
  useMessages,
  useSendMessage,
} from '@/lib/hooks/chat/use-chat.hook';
import { useChatSocket } from '@/lib/hooks/chat/use-chat-socket.hook';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import type { IChatAttachment, IConversation, IChatUserLite } from '@/lib/actions/chat/chat.action';
import { ROUTE_CHAT } from '@/lib/data/constants/routes.constants';
import { toast } from 'react-toastify';
import { ImageWithPreview } from '@/components/molecules';
import { ShiningText } from '@/components/atoms/shining-text';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';

interface ChatClientProps {
  initialWithUserId?: string;
  initialConversationId?: string;
}

function getOtherParticipant(
  conversation: IConversation,
  currentUserId: string
): IChatUserLite | undefined {
  return conversation.participantIds.find((p) => p._id !== currentUserId);
}

function getInitials(user?: IChatUserLite | null): string {
  if (!user) return '?';
  const first = user.firstName?.[0] ?? '';
  const last = user.lastName?.[0] ?? '';
  const fromNames = first + last;
  const fallback = user.username?.[0] ?? '?';
  return (fromNames === '' ? fallback : fromNames).toUpperCase();
}

function getDisplayName(user: IChatUserLite | undefined | null, unknownLabel: string): string {
  if (!user) return unknownLabel;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name === '' ? (user.username ?? unknownLabel) : name;
}

export function ChatClient({ initialWithUserId, initialConversationId }: ChatClientProps) {
  const locale = useLocale();
  const t = useTranslations('Chat');
  const router = useRouter();
  const currentUser = useUserStore((state) => state.user);
  const currentUserId = currentUser?._id ?? '';

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ensuredConversationForUserRef = useRef<string | undefined>(undefined);

  const { data: conversationsData, isLoading: isLoadingConversations } = useConversations({
    page: 1,
    limit: 50,
  });
  const ensureConversation = useEnsureConversation();
  const { mutate: markConversationAsRead } = useMarkConversationAsRead();
  const sendMessage = useSendMessage();

  useChatSocket({ activeConversationId });

  useEffect(() => {
    if (!initialWithUserId || !currentUserId) return;
    if (ensuredConversationForUserRef.current === initialWithUserId) return;
    ensuredConversationForUserRef.current = initialWithUserId;
    ensureConversation.mutate(initialWithUserId, {
      onSuccess: (result) => {
        if (result && '_id' in result) {
          setActiveConversationId(result._id);
          router.replace(
            `${getDashboardUrl(currentUser?.roleName)}${ROUTE_CHAT}?conversation=${result._id}`
          );
        }
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : t('errors.unableToStartConversation');
        toast.error(message);
      },
    });
  }, [initialWithUserId, currentUserId, currentUser?.roleName, ensureConversation, router, t]);

  const conversations = useMemo<IConversation[]>(() => {
    const raw = conversationsData;
    if (raw && typeof raw === 'object' && 'docs' in raw) {
      return (raw as { docs: IConversation[] }).docs ?? [];
    }
    return [];
  }, [conversationsData]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c._id === activeConversationId),
    [conversations, activeConversationId]
  );
  const otherParticipant = activeConversation
    ? getOtherParticipant(activeConversation, currentUserId)
    : undefined;

  const { data: messagesData } = useMessages(activeConversationId);

  // Messages come back newest-first from the paginated API (sorted by createdAt desc).
  // ChatMessages uses flex-col-reverse so we render them in that order — newest first in DOM,
  // visually newest at the bottom.
  const messages = useMemo(() => {
    const raw = messagesData;
    if (raw && typeof raw === 'object' && 'docs' in raw) {
      return (
        (
          raw as {
            docs: {
              _id: string;
              senderId: string;
              content: string;
              attachments: IChatAttachment[];
              createdAt: string;
            }[];
          }
        ).docs ?? []
      );
    }
    return [];
  }, [messagesData]);

  useEffect(() => {
    if (!activeConversationId) return;
    markConversationAsRead(activeConversationId);
  }, [activeConversationId, markConversationAsRead]);

  // Scroll sentinel: keep a div at the top of the reversed list (= bottom visually).
  // Whenever messages change, scroll it into view.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!otherParticipant) return;
    const trimmed = draft.trim();
    const filesSnapshot = pendingFiles;
    if (!trimmed && filesSnapshot.length === 0) return;

    // Clear input immediately for snappy UX
    setDraft('');
    setPendingFiles([]);

    try {
      const attachments: IChatAttachment[] = [];
      if (filesSnapshot.length > 0) {
        setIsUploading(true);
        try {
          for (const file of filesSnapshot) {
            const fileKey = await uploadFileToS3({
              file,
              isPublic: true,
              customPath: `public/chat/${currentUserId}`,
            });
            attachments.push({
              fileKey,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            });
          }
        } finally {
          setIsUploading(false);
        }
      }

      const result = await sendMessage.mutateAsync({
        recipientId: otherParticipant._id,
        content: trimmed || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        conversationId: activeConversationId,
        senderId: currentUserId,
      });

      if (result && typeof result === 'object' && 'conversationId' in result) {
        const newId = (result as { conversationId: string }).conversationId;
        if (!activeConversationId) setActiveConversationId(newId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.failedToSend');
      toast.error(message);
      // Restore draft on failure
      setDraft(trimmed);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    router.replace(
      `${getDashboardUrl(currentUser?.roleName)}${ROUTE_CHAT}?conversation=${conversationId}`
    );
  };

  return (
    <div className="flex h-[calc(100vh-60px)] w-full overflow-hidden">
      {/* Conversations sidebar */}
      <aside
        className={cn(
          'bg-background flex w-full flex-col border-e border-r md:w-72 lg:w-80',
          activeConversationId && 'hidden md:flex'
        )}>
        <div className="flex items-center gap-2 border-b px-4 py-3.5">
          <MessageCircleIcon className="text-primary size-5" />
          <h2 className="text-base font-semibold">{t('title')}</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted flex animate-pulse items-center gap-3 rounded-lg p-3">
                  <div className="bg-muted-foreground/20 size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="bg-muted-foreground/20 h-3 w-3/4 rounded" />
                    <div className="bg-muted-foreground/20 h-2.5 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!isLoadingConversations && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <MessageCircleIcon className="text-muted-foreground/40 size-10" />
              <p className="text-muted-foreground text-sm font-medium">{t('emptyState.title')}</p>
              <p className="text-muted-foreground/70 text-xs">{t('emptyState.subtitle')}</p>
            </div>
          )}

          <ul className="space-y-0.5 p-1.5">
            {conversations.map((conversation) => {
              const other = getOtherParticipant(conversation, currentUserId);
              const unread = conversation.unreadCount?.[currentUserId] ?? 0;
              const isActive = conversation._id === activeConversationId;
              return (
                <li key={conversation._id} className="mb-3 cursor-pointer rounded-lg border p-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectConversation(conversation._id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
                    )}>
                    <div className="relative shrink-0">
                      <ChatHeaderAvatar
                        src={
                          other?.profile?.avatar ? getFileFullUrl(other.profile.avatar) : undefined
                        }
                        fallback={getInitials(other)}
                        className="size-10"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            'truncate text-sm font-medium',
                            isActive && 'text-primary'
                          )}>
                          {getDisplayName(other, t('unknownUser'))}
                        </span>
                        {unread > 0 && (
                          <span className="bg-primary text-primary-foreground flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 truncate text-xs',
                          unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}>
                        {conversation.lastMessagePreview || t('sayHi')}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Active conversation */}
      <section
        className={cn('flex min-w-0 flex-1 flex-col', !activeConversationId && 'hidden md:flex')}>
        {activeConversationId ? (
          <Chat className="h-full">
            <ChatHeader className="border-b">
              <ChatHeaderAddon>
                <ChatHeaderButton
                  className="md:hidden"
                  aria-label={t('aria.back')}
                  onClick={() => {
                    setActiveConversationId(undefined);
                    router.replace(getDashboardUrl(currentUser?.roleName) + ROUTE_CHAT);
                  }}>
                  <ArrowLeftIcon />
                </ChatHeaderButton>
                <div className="relative">
                  <ChatHeaderAvatar
                    src={
                      otherParticipant?.profile?.avatar
                        ? getFileFullUrl(otherParticipant.profile.avatar)
                        : undefined
                    }
                    fallback={getInitials(otherParticipant)}
                    className="size-9"
                  />
                </div>
              </ChatHeaderAddon>
              <ChatHeaderMain>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">
                    {getDisplayName(otherParticipant, t('unknownUser'))}
                  </span>
                  {otherParticipant?.roleName ? (
                    <span className="text-muted-foreground text-xs capitalize">
                      {otherParticipant.roleName.toLowerCase()}
                    </span>
                  ) : null}
                </div>
              </ChatHeaderMain>
            </ChatHeader>

            <ChatMessages>
              {/* Sentinel div — lives at DOM top = visual bottom because of flex-col-reverse */}
              <div ref={messagesEndRef} />

              {messages.map((msg, index) => {
                const isOwn = msg.senderId === currentUserId;
                const sender = isOwn ? currentUser : otherParticipant;

                // Group consecutive messages from same sender
                const prevMsg = messages[index + 1]; // +1 because list is reversed
                const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                  <ChatEvent
                    key={msg._id}
                    className={cn(
                      isOwn && 'flex-row-reverse',
                      !isFirstInGroup && (isOwn ? 'pr-12' : 'pl-12')
                    )}>
                    {isFirstInGroup ? (
                      <ChatEventAddon className={cn(!isOwn && '', isOwn && 'items-end')}>
                        <ChatEventAvatar
                          src={
                            sender?.profile?.avatar
                              ? getFileFullUrl(sender.profile.avatar)
                              : undefined
                          }
                          fallback={getInitials(sender)}
                        />
                      </ChatEventAddon>
                    ) : (
                      <div className="w-12 shrink-0" />
                    )}

                    <ChatEventBody className={cn(isOwn && 'items-end')}>
                      {isFirstInGroup ? (
                        <ChatEventTitle className={cn(isOwn && 'flex-row-reverse')}>
                          <span className="text-xs font-medium">
                            {isOwn ? t('you') : getDisplayName(otherParticipant, t('unknownUser'))}
                          </span>
                          <ChatEventTime
                            timestamp={new Date(msg.createdAt)}
                            format="time"
                            locale={locale}
                          />
                        </ChatEventTitle>
                      ) : null}

                      {msg.content ? (
                        <ChatEventContent
                          className={cn(
                            'w-fit rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted rounded-tl-sm'
                          )}>
                          {msg.content}
                        </ChatEventContent>
                      ) : null}

                      {msg.attachments && msg.attachments.length > 0 ? (
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {msg.attachments.map((att) => (
                            <li key={att.fileKey}>
                              {isFileImage(att.fileName) ? (
                                <ImageWithPreview
                                  src={getFileFullUrl(att.fileKey)}
                                  alt={att.fileName}
                                  width={100}
                                  height={100}
                                />
                              ) : (
                                <a
                                  href={getFileFullUrl(att.fileKey)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="border-border hover:bg-muted/80 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs underline-offset-2 transition-colors hover:underline">
                                  {att.fileName}
                                  <span className="text-muted-foreground">
                                    ({t('fileSizeKb', { size: Math.round(att.size / 1024) })})
                                  </span>
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </ChatEventBody>
                  </ChatEvent>
                );
              })}
            </ChatMessages>

            <ChatToolbar>
              {pendingFiles.length > 0 || isUploading ? (
                <ChatToolbarAddon align="block-start">
                  {pendingFiles.map((file, index) => (
                    <ChatToolbarAttachment
                      key={`${file.name}-${index}`}
                      fileName={file.name}
                      onRemove={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                    />
                  ))}
                  {isUploading ? (
                    <div
                      className="text-muted-foreground flex items-center px-1 py-1"
                      role="status"
                      aria-live="polite">
                      <ShiningText text={t('toolbar.uploading')} />
                    </div>
                  ) : null}
                </ChatToolbarAddon>
              ) : null}
              <ChatToolbarAddon align="inline-start">
                <ChatToolbarAttachmentButton
                  onFilesSelected={(files) => setPendingFiles((prev) => [...prev, ...files])}
                />
              </ChatToolbarAddon>
              <ChatToolbarTextarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onSubmit={() => {
                  void handleSend();
                }}
                disabled={sendMessage.isPending || isUploading}
              />
              <ChatToolbarAddon align="inline-end">
                <ChatToolbarButton
                  aria-label={t('aria.send')}
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={
                    sendMessage.isPending ||
                    isUploading ||
                    (!draft.trim() && pendingFiles.length === 0)
                  }>
                  <SendIcon />
                </ChatToolbarButton>
              </ChatToolbarAddon>
            </ChatToolbar>
          </Chat>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-muted flex size-16 items-center justify-center rounded-full">
              <MessageCircleIcon className="text-muted-foreground size-8" />
            </div>
            <p className="text-muted-foreground text-sm">{t('selectConversationHint')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
