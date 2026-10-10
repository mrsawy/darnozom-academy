'use client';

import { AuthDialog } from '@/components/organs/auth-dialog/auth-dialog';
import { useAuthDialogStore } from '@/lib/store/auth-dialog.store';

/**
 * App-wide auth dialog host. Opened by {@link handleUnauthenticatedSession}
 * when tokens are invalid / session was replaced.
 */
export function GlobalAuthDialog() {
  const open = useAuthDialogStore((s) => s.open);
  const title = useAuthDialogStore((s) => s.title);
  const description = useAuthDialogStore((s) => s.description);
  const onAuthenticated = useAuthDialogStore((s) => s.onAuthenticated);
  const closeAuthDialog = useAuthDialogStore((s) => s.closeAuthDialog);

  return (
    <AuthDialog
      open={open}
      onClose={closeAuthDialog}
      title={title}
      description={description}
      onAuthenticated={onAuthenticated}
    />
  );
}
