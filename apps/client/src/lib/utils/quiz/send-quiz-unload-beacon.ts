import type { SubmitQuizDto } from '@/lib/types/course/DTO/quizSubmission.dto';

/**
 * Best-effort quiz submit when the document is being unloaded (refresh, close tab, navigate away).
 * Uses `fetch(..., { keepalive: true })` to the **same origin** `/api/quiz/submit-unload` so session
 * cookies are sent; the route handler forwards to NATS like `submitQuizAction` (cross-origin
 * calls to `NEXT_PUBLIC_API_URL` fail for unload beacons due to CORS/credentials).
 */
export function sendQuizUnloadBeacon(payload: SubmitQuizDto): boolean {
  try {
    void fetch('/api/quiz/submit-unload', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'same-origin',
    });
    return true;
  } catch {
    return false;
  }
}
