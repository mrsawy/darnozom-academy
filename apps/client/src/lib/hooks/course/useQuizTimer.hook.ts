import { useState, useEffect, useCallback, useRef } from 'react';

interface QuizTimerState {
  startTime: number;
  durationInMinutes: number;
}

function normalizeDurationMinutes(value: number | string | undefined | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function useQuizTimer(
  quizId: string,
  durationInMinutes: number | string | undefined | null
) {
  const durationMins = normalizeDurationMinutes(durationInMinutes);
  const durationSeconds = durationMins * 60;

  const [timeRemaining, setTimeRemaining] = useState<number>(() => durationSeconds);
  const [hasStarted, setHasStarted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const storageKey = `quiz_timer_${quizId}`;

  const loadTimerState = useCallback((): QuizTimerState | null => {
    if (globalThis.window === undefined) return null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      return JSON.parse(saved) as QuizTimerState;
    } catch {
      return null;
    }
  }, [storageKey]);

  const saveTimerState = useCallback(
    (state: QuizTimerState) => {
      if (globalThis.window === undefined) return;

      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // Silent fail for localStorage operations
      }
    },
    [storageKey]
  );

  const clearTimer = useCallback(() => {
    if (globalThis.window === undefined) return;

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Silent fail for localStorage operations
    }
  }, [storageKey]);

  const getElapsedSeconds = useCallback((): number => {
    const state = loadTimerState();
    if (!state) return 0;

    const stateDurationMins = normalizeDurationMinutes(state.durationInMinutes);
    const cap = stateDurationMins * 60;
    const now = Date.now();
    const elapsed = Math.floor((now - state.startTime) / 1000);
    return Math.min(elapsed, cap);
  }, [loadTimerState]);

  useEffect(() => {
    if (hasStarted) return;
    setTimeRemaining(durationSeconds);
    setIsExpired(false);
  }, [durationSeconds, hasStarted]);

  const startTimer = useCallback(() => {
    if (durationMins <= 0) return;

    setIsExpired(false);

    let state = loadTimerState();
    const savedMins = state ? normalizeDurationMinutes(state.durationInMinutes) : 0;

    if (!state || savedMins !== durationMins) {
      state = {
        startTime: Date.now(),
        durationInMinutes: durationMins,
      };
      saveTimerState(state);
    }

    setHasStarted(true);

    const elapsed = getElapsedSeconds();
    const remaining = Math.max(0, durationSeconds - elapsed);
    setTimeRemaining(remaining);

    if (remaining <= 0) {
      setIsExpired(true);
    }
  }, [durationMins, durationSeconds, loadTimerState, saveTimerState, getElapsedSeconds]);

  useEffect(() => {
    if (!hasStarted || durationMins <= 0 || isExpired) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const elapsed = getElapsedSeconds();
      const remaining = Math.max(0, durationSeconds - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasStarted, durationMins, durationSeconds, isExpired, getElapsedSeconds]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasStarted && !isExpired) {
        const elapsed = getElapsedSeconds();
        const remaining = Math.max(0, durationSeconds - elapsed);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          setIsExpired(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasStarted, isExpired, durationSeconds, getElapsedSeconds]);

  return {
    timeRemaining,
    hasStarted,
    isExpired,
    startTimer,
    getElapsedSeconds,
    clearTimer,
  };
}
