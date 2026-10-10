'use client';

import { useEffect } from 'react';
import { ErrorPage } from '@/components/molecules/error-page';

/**
 * Locale-wide route error boundary. Catches errors from child segments
 * that do not define their own error.tsx.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- Next.js error boundary diagnostic
    console.error(error);
  }, [error]);

  return <ErrorPage reset={reset} />;
}
