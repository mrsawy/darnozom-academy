'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ICourseWithModules } from '@/lib/types/course/course.interface';

/**
 * Loads course metadata (including `settings`) for dashboard editing.
 * Uses `courses.getCourseWithModule` — there is no separate `courses.getCourse` RPC.
 *
 * @param requireApproved When false (default), draft / unapproved courses in the org dashboard still load.
 */
export async function getCourse(courseId: string, options?: { requireApproved?: boolean }) {
  try {
    const course = await createAuthorizedNatsRequest<ICourseWithModules>(
      'courses.getCourseWithModule',
      {
        courseId,
        includeContents: false,
        requireApproved: options?.requireApproved ?? false,
      }
    );
    return course;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch course';
    throw new Error(message);
  }
}
