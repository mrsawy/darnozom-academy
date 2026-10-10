import type { IContent } from '@/lib/types/course/content.interface';

/** Aligns with server `quiz.service` / aggregation: missing `maxAttempts` defaults to 1. */
export function getQuizAttemptState(content: IContent, submissionsCount: number) {
  const maxAttempts = content.maxAttempts ?? 1;
  const attemptsUsed = submissionsCount;
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
  const hasAttemptsLeft = attemptsLeft > 0;
  return { maxAttempts, attemptsUsed, attemptsLeft, hasAttemptsLeft };
}
