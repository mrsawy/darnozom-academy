'use client';

import { useEffect } from 'react';
import { ErrorPage } from '@/components/molecules/error-page';

/**
 * Route error boundary for student-dashboard. Uses the shared ErrorPage UI.
 */
export default function StudentDashboardError({
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

  return <ErrorPage reset={reset} className="min-h-[min(60vh,28rem)]" />;
}
