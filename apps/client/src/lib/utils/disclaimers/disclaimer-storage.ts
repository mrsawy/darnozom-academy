/**
 * Client-only storage for one-time UI disclaimers / tips.
 * Add new ids here as you introduce more disclaimers — no backend needed.
 */
export const DISCLAIMER_IDS = {
  COURSES_HIERARCHY: 'courses-hierarchy',
  CREATE_COURSE_NEEDS_INSTRUCTOR: 'create-course-needs-instructor',
} as const;

export type DisclaimerId = (typeof DISCLAIMER_IDS)[keyof typeof DISCLAIMER_IDS];

const STORAGE_PREFIX = 'lms-disclaimer-seen';

function storageKey(disclaimerId: string, userId?: string): string {
  return userId
    ? `${STORAGE_PREFIX}:${disclaimerId}:${userId}`
    : `${STORAGE_PREFIX}:${disclaimerId}`;
}

export function isDisclaimerSeen(disclaimerId: string, userId?: string): boolean {
  if (globalThis.window === undefined) return false;
  try {
    return localStorage.getItem(storageKey(disclaimerId, userId)) === '1';
  } catch {
    return false;
  }
}

export function markDisclaimerSeen(disclaimerId: string, userId?: string): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(storageKey(disclaimerId, userId), '1');
  } catch {
    // Silent fail for localStorage (private mode, quota, etc.)
  }
}
