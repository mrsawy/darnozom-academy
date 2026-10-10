'use client';

import { logout } from '@/lib/actions/auth/auth.action';
import useUserStore from '@/lib/store/userStore';
import { useAuthDialogStore, type OpenAuthDialogOptions } from '@/lib/store/auth-dialog.store';

/** Prevents concurrent logout + dialog floods when many queries fail at once. */
let clearingSession: Promise<void> | null = null;

/**
 * Clears stale client/server auth state and opens the global sign-in dialog.
 * Call when an action/query returns an unauthenticated NATS/auth error
 * (e.g. session replaced on another device).
 */
export function handleUnauthenticatedSession(options?: OpenAuthDialogOptions): void {
  if (globalThis.window === undefined) return;

  useAuthDialogStore.getState().openAuthDialog(options);

  if (clearingSession) return;

  useUserStore.getState().clearUser();

  clearingSession = (async () => {
    try {
      await logout(false);
    } catch {
      // logout(false) should not redirect; ignore unexpected failures
    }
  })().finally(() => {
    clearingSession = null;
  });
}
