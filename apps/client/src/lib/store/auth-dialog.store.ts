import { create } from 'zustand';

export interface OpenAuthDialogOptions {
  title?: string;
  description?: string;
  onAuthenticated?: () => void;
}

interface AuthDialogState {
  open: boolean;
  title?: string;
  description?: string;
  onAuthenticated?: () => void;
  openAuthDialog: (options?: OpenAuthDialogOptions) => void;
  closeAuthDialog: () => void;
}

/**
 * Global auth dialog — opened when a session becomes invalid mid-action
 * (e.g. single-session kick) or when a guest must sign in.
 */
export const useAuthDialogStore = create<AuthDialogState>((set) => ({
  open: false,
  title: undefined,
  description: undefined,
  onAuthenticated: undefined,
  openAuthDialog: (options) =>
    set((state) => ({
      open: true,
      title: options?.title ?? state.title,
      description: options?.description ?? state.description,
      onAuthenticated: options?.onAuthenticated ?? state.onAuthenticated,
    })),
  closeAuthDialog: () =>
    set({
      open: false,
      title: undefined,
      description: undefined,
      onAuthenticated: undefined,
    }),
}));
