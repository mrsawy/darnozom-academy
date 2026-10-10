'use client';

import { useEffect } from 'react';
import useUserStore from '@/lib/store/userStore';

/** Clears any stale user data from the Zustand store on mount.
 *  Rendered on /login and /signup so that arriving at these pages
 *  (via proxy redirect, manual navigation, or cleanup route)
 *  always wipes leftover localStorage state. */
export default function ClearAuthState() {
  useEffect(() => {
    useUserStore.getState().clearUser();
  }, []);

  return null;
}
