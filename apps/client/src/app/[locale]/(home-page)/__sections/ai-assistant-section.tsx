'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Sparkles } from 'lucide-react';
import { BorderBeam } from '@/components/atoms/border-beam';
import { cn } from '@/lib/utils';

const STEP_MS = 1400;
const BETWEEN_CHATS_MS = 2800;
const RESTART_PAUSE_MS = 3200;

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

function AiAssistantSection() {
  const t = useTranslations('AiAssistantSection');
  const conversations = t.raw('conversations') as Conversation[];
  const chatCount = conversations.length;

  const [chatIndex, setChatIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);

  const activeChat = conversations[chatIndex] ?? conversations[0];
  const messageCount = activeChat?.messages.length ?? 0;

  const selectChat = (index: number) => {
    setChatIndex(index);
    setVisibleCount(0);
    setIsSwitching(false);
  };

  useEffect(() => {
    if (!activeChat || messageCount === 0) return;

    // Hold finished chat, then fade into the next one
    if (visibleCount >= messageCount) {
      const isLastChat = chatIndex >= chatCount - 1;
      const pause = isLastChat ? RESTART_PAUSE_MS : BETWEEN_CHATS_MS;

      const holdTimer = globalThis.setTimeout(() => {
        setIsSwitching(true);
      }, pause - 400);

      const switchTimer = globalThis.setTimeout(() => {
        setChatIndex((current) => (current + 1) % chatCount);
        setVisibleCount(0);
        setIsSwitching(false);
      }, pause);

      return () => {
        globalThis.clearTimeout(holdTimer);
        globalThis.clearTimeout(switchTimer);
      };
    }

    const timer = globalThis.setTimeout(() => {
      setVisibleCount((current) => current + 1);
    }, STEP_MS);

    return () => globalThis.clearTimeout(timer);
  }, [activeChat, chatCount, chatIndex, messageCount, visibleCount]);

  if (!activeChat) return null;

  const showTyping = visibleCount > 0 && visibleCount < messageCount;

  return (
    <section
      id="ai-assistant"
      className="relative overflow-hidden bg-linear-to-b from-transparent via-neutral-50/60 to-transparent py-20 md:py-28 dark:dark:via-white/2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_72%)] [background-size:28px_28px] opacity-[0.35]"
      />

      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Copy */}
          <div>
            <span className="border-primary/20 from-primary/10 text-primary mb-5 inline-flex items-center gap-2 rounded-full border bg-gradient-to-r to-transparent px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              {t('badge')}
            </span>

            <h2 className="text-foreground text-3xl leading-tight font-bold text-balance md:text-5xl">
              {t('title')}
            </h2>
            <p className="text-muted-foreground mt-5 text-base text-pretty md:text-lg">
              {t('description')}
            </p>
          </div>

          {/* Chat mock */}
          <div className="relative">
            <div className="border-border bg-card relative overflow-hidden rounded-3xl border shadow-2xl">
              <BorderBeam duration={9} size={140} />

              {/* Window chrome */}
              <div className="border-border/70 bg-muted/40 flex items-center gap-3 border-b px-5 py-3.5">
                <span className="bg-primary/15 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {t('chat.assistantName')}
                  </p>
                  <p
                    key={activeChat.context}
                    className="text-muted-foreground flex items-center gap-1.5 truncate text-[11px] transition-opacity duration-300">
                    <span className="bg-success h-1.5 w-1.5 shrink-0 rounded-full" />
                    {activeChat.context}
                  </p>
                </div>

                {/* Chat dots */}
                <div
                  className="flex items-center gap-0.5"
                  role="tablist"
                  aria-label={t('chat.assistantName')}>
                  {conversations.map((conversation, index) => (
                    <button
                      key={conversation.context}
                      type="button"
                      role="tab"
                      aria-selected={index === chatIndex}
                      aria-label={conversation.context}
                      onClick={() => selectChat(index)}
                      className="group flex size-4 cursor-pointer items-center justify-center">
                      <span
                        className={cn(
                          'rounded-full transition-all duration-300',
                          index === chatIndex
                            ? 'bg-primary h-1.5 w-3'
                            : 'bg-muted-foreground/35 group-hover:bg-muted-foreground/60 h-1.5 w-1.5'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Thread */}
              <div
                className={cn(
                  'flex min-h-[26rem] flex-col justify-end gap-4 p-5 transition-opacity duration-300',
                  isSwitching ? 'opacity-0' : 'opacity-100'
                )}>
                {activeChat.messages.map((message, index) => {
                  const isAssistant = message.role === 'assistant';
                  const isVisible = index < visibleCount;
                  return (
                    <div
                      key={`${chatIndex}-${index}-${message.text}`}
                      className={cn(
                        'flex transition-all duration-500 ease-out',
                        isAssistant ? 'justify-start' : 'justify-end',
                        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                      )}>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                          isAssistant
                            ? 'bg-muted text-foreground rounded-es-sm'
                            : 'bg-primary text-primary-foreground rounded-ee-sm'
                        )}>
                        <p
                          className={cn(
                            'mb-1 text-[10px] font-bold tracking-widest uppercase',
                            isAssistant ? 'text-muted-foreground' : 'text-white/70'
                          )}>
                          {message.author}
                        </p>
                        {message.text}
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator between turns */}
                <div
                  className={cn(
                    'flex justify-start transition-opacity duration-300',
                    showTyping ? 'opacity-100' : 'opacity-0'
                  )}>
                  <div className="bg-muted flex items-center gap-1.5 rounded-2xl rounded-es-sm px-4 py-3">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: `${dot * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Grounding footer */}
              <div className="border-border/70 bg-muted/30 flex flex-wrap items-center gap-2 border-t px-5 py-3">
                {activeChat.sources.map((source) => (
                  <span
                    key={source}
                    className="border-border bg-card text-muted-foreground rounded-full border px-2.5 py-1 text-[11px] font-medium">
                    {source}
                  </span>
                ))}
              </div>
            </div>

            <div
              aria-hidden
              className="from-primary/20 to-accent/20 absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr blur-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default AiAssistantSection;
