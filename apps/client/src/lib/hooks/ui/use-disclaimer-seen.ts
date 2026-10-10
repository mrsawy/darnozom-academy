'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isDisclaimerSeen,
  markDisclaimerSeen,
  type DisclaimerId,
} from '@/lib/utils/disclaimers/disclaimer-storage';

/**
 * Tracks whether a UI disclaimer was dismissed in localStorage.
 * Pass a stable `userId` so accounts on the same browser keep separate state.
 */
export function useDisclaimerSeen(disclaimerId: DisclaimerId, userId?: string) {
  // null = not hydrated yet (avoid flashing a dismissed modal)
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    setSeen(isDisclaimerSeen(disclaimerId, userId));
  }, [disclaimerId, userId]);

  const markSeen = useCallback(() => {
    markDisclaimerSeen(disclaimerId, userId);
    setSeen(true);
  }, [disclaimerId, userId]);

  return { seen, markSeen, isReady: seen !== null };
}
