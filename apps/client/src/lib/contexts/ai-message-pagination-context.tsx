'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface AiMessagePaginationState {
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  loadOlder: () => Promise<void>;
}

const AiMessagePaginationContext = createContext<{
  state: AiMessagePaginationState | null;
  register: (next: AiMessagePaginationState | null) => void;
} | null>(null);

export function AiMessagePaginationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AiMessagePaginationState | null>(null);
  const register = useCallback((next: AiMessagePaginationState | null) => {
    setState(next);
  }, []);
  const value = useMemo(() => ({ state, register }), [state, register]);
  return (
    <AiMessagePaginationContext.Provider value={value}>
      {children}
    </AiMessagePaginationContext.Provider>
  );
}

export function useAiMessagePagination() {
  const ctx = useContext(AiMessagePaginationContext);
  if (!ctx) {
    return {
      state: null as AiMessagePaginationState | null,
      register: (_next: AiMessagePaginationState | null) => {
        void _next;
      },
    };
  }
  return ctx;
}
