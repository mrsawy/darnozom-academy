'use client';

import type { QuizIntegrityEventDto } from '@/lib/types/course/DTO/quizSubmission.dto';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

function pushEvent(ref: { current: QuizIntegrityEventDto[] }, type: string, detail?: string) {
  ref.current.push({ type, at: new Date().toISOString(), ...(detail ? { detail } : {}) });
}

export function useQuizIntegrity(
  sessionActive: boolean,
  containerRef: RefObject<HTMLElement | null>
) {
  const eventsRef = useRef<QuizIntegrityEventDto[]>([]);
  const hasEnteredFullscreenRef = useRef(false);

  const reset = useCallback(() => {
    eventsRef.current = [];
    hasEnteredFullscreenRef.current = false;
  }, []);

  const getIntegrityEvents = useCallback(() => [...eventsRef.current], []);

  useEffect(() => {
    if (!sessionActive) return;

    const el = containerRef.current;
    const onFullscreenChange = () => {
      const full = document.fullscreenElement;
      if (el && full === el) {
        hasEnteredFullscreenRef.current = true;
        pushEvent(eventsRef, 'fullscreen_enter');
      } else if (hasEnteredFullscreenRef.current && el && full !== el) {
        pushEvent(eventsRef, 'fullscreen_exit');
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pushEvent(eventsRef, 'visibility_hidden');
      } else {
        pushEvent(eventsRef, 'visibility_visible');
      }
    };

    const onBlur = () => {
      pushEvent(eventsRef, 'window_blur');
    };

    const onCopy = () => {
      pushEvent(eventsRef, 'copy_attempt');
    };

    const onPaste = () => {
      pushEvent(eventsRef, 'paste_attempt');
    };

    const onCut = () => {
      pushEvent(eventsRef, 'cut_attempt');
    };

    const onContextMenu = () => {
      pushEvent(eventsRef, 'context_menu');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'c' || k === 'v' || k === 'x') {
          pushEvent(eventsRef, `keydown_${k}_modifier`);
        }
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('cut', onCut);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sessionActive, containerRef]);

  return { getIntegrityEvents, resetIntegrity: reset };
}
