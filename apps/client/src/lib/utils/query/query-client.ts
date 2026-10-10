'use client';

import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { isUnauthenticatedError } from '@lms-organization/shared-types';
import { handleUnauthenticatedSession } from '@/lib/utils/auth/handle-unauthenticated-session';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

function onAuthError(error: unknown) {
  if (isUnauthenticatedError(errorMessage(error))) {
    handleUnauthenticatedSession();
  }
}

/**
 * Shared QueryClient for the client app. Auth failures clear the session and
 * open the global sign-in dialog (see {@link handleUnauthenticatedSession}).
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onAuthError,
  }),
  mutationCache: new MutationCache({
    onError: onAuthError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
});
