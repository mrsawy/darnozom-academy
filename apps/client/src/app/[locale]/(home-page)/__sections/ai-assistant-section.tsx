'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import PillTab from '@/components/molecules/public-site/pill-tab';
import { cn } from '@/lib/utils';
import { ANCHOR_HOME_AI_ASSISTANT } from '@/lib/data/constants/routes.constants';

const STEP_MS = 1400;
const BETWEEN_CHATS_MS = 2800;
const RESTART_PAUSE_MS = 3200;
const CAPABILITY_INDEXES = [0, 1, 2, 3] as const;

interface ChatMessage {
  role: 'user' | 'assistant';
  author: string;
  text: string;
}

interface Conversation {
  context: string;
  sources: string[];
  messages: ChatMessage[];
}

/**
 * Grounded-assistant proof: a transcript that types itself out, with the source
 * documents it answered from pinned above the thread.
 */
function AiAssistantSection() {
  const t = useTranslations('AiAssistantSection');
  const conversations = t.raw('conversations') as Conversation[];
  const chatCount = conversations.length;

  const [chatIndex, setChatIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  const activeChat = conversations[chatIndex] ?? conversations[0];
  const messageCount = activeChat?.messages.length ?? 0;

  const selectChat = (index: number) => {
    setChatIndex(index);
    setVisibleCount(0);
  };

  useEffect(() => {
    if (!activeChat || messageCount === 0) return;

    // Finished thread: hold it, then roll into the next conversation.
    if (visibleCount >= messageCount) {
      const isLastChat = chatIndex >= chatCount - 1;
      const pause = isLastChat ? RESTART_PAUSE_MS : BETWEEN_CHATS_MS;

      const switchTimer = globalThis.setTimeout(() => {
        setChatIndex((current) => (current + 1) % chatCount);
        setVisibleCount(0);
      }, pause);

      return () => globalThis.clearTimeout(switchTimer);
    }

    const timer = globalThis.setTimeout(() => {
      setVisibleCount((current) => current + 1);
    }, STEP_MS);

    return () => globalThis.clearTimeout(timer);
  }, [activeChat, chatCount, chatIndex, messageCount, visibleCount]);

  if (!activeChat) return null;

  return (
    <SectionShell
      id={ANCHOR_HOME_AI_ASSISTANT.slice(1)}
      tone="sand"
      innerClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-14">
      <div className="flex flex-col gap-5">
        <Eyebrow className="text-dz-terracotta-deep">{t('badge')}</Eyebrow>
        <DisplayHeading>{t('title')}</DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description')}</p>

        <div className="border-dz-line-strong flex flex-col border-t">
          {CAPABILITY_INDEXES.map((index) => (
            <div key={index} className="border-dz-line-strong border-b py-4">
              <div className="font-semibold">{t(`capabilities.${index}.title`)}</div>
              <div className="text-dz-ink-soft text-sm">
                {t(`capabilities.${index}.description`)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-dz-paper-raised overflow-hidden rounded-3xl shadow-[0_30px_60px_-36px_rgba(58,37,25,0.55)]">
        <div className="border-dz-line flex flex-wrap gap-1.5 border-b p-3.5" role="tablist">
          {conversations.map((conversation, index) => (
            <PillTab
              key={conversation.context}
              variant="soft"
              size="sm"
              isActive={index === chatIndex}
              onClick={() => selectChat(index)}>
              {conversation.context}
            </PillTab>
          ))}
        </div>

        <div className="flex min-h-[380px] flex-col gap-3.5 p-5.5">
          <div className="text-dz-ink-soft flex flex-wrap items-center gap-1.5 text-xs">
            <span>{t('chat.sourcesLabel')}</span>
            {activeChat.sources.map((source) => (
              <span
                key={source}
                className="bg-dz-paper border-dz-line rounded-md border px-2 py-0.5">
                {source}
              </span>
            ))}
          </div>

          {activeChat.messages.map((message, index) => {
            const isAssistant = message.role === 'assistant';
            const isVisible = index < visibleCount;
            return (
              <div
                key={`${chatIndex}-${index}`}
                aria-hidden={!isVisible}
                className={cn(
                  'max-w-[84%] rounded-[18px] px-4 py-3 text-[15px] leading-[1.65] transition-all duration-500 ease-out',
                  isAssistant
                    ? 'bg-dz-paper text-dz-ink self-start'
                    : 'bg-dz-terracotta text-dz-paper-raised self-end',
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                )}>
                <div className="mb-0.5 text-xs font-semibold opacity-75">{message.author}</div>
                {message.text}
              </div>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}

export default AiAssistantSection;
