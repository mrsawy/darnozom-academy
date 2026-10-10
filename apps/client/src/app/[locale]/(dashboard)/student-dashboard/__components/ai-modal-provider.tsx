'use client';

import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { usePersistedChatRuntime } from '@/lib/hooks/ai/use-persisted-chat-runtime';
import { AssistantModal } from '@/components/assistant-modal';
import { TooltipProvider } from '@/components/atoms/tooltip';

interface AiModalProviderProps {
  contentId?: string;
}

export function AiModalProvider({ contentId }: AiModalProviderProps) {
  const { runtime } = usePersistedChatRuntime({ contentId });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <TooltipProvider>
        <AssistantModal />
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}
