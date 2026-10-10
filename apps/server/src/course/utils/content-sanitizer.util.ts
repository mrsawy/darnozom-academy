import { ContentType } from '../enum/contentType.enum';

/**
 * Strips instructor-only and other-students' data from a content object before
 * it is returned to a learner. Mutates and returns the same reference (the
 * content objects come from Mongoose aggregation, i.e. plain POJOs).
 *
 * - QUIZ: removes every question's `correctOption` (the answer key) and the
 *   aggregated `quizSubmissions`.
 * - PROJECT: removes the aggregated `submissions`.
 * - LIVE_SESSION: removes the aggregated `attendance`.
 *
 * Assignment submissions are intentionally left untouched: the single-content
 * path pre-filters them to the requesting student before calling this helper
 * (see CourseContentService.getContent). List/tree paths never include
 * assignment submissions in the first place.
 */
export function sanitizeContentForStudent<T extends object>(content?: T | null): T | null | undefined {
  if (!content || typeof content !== 'object') return content;

  const c = content as Record<string, unknown>;
  switch (c.type) {
    case ContentType.QUIZ: {
      const questions = c.questions;
      if (Array.isArray(questions)) {
        for (const question of questions) {
          if (question && typeof question === 'object') {
            delete (question as Record<string, unknown>).correctOption;
          }
        }
      }
      delete c.quizSubmissions;
      break;
    }
    case ContentType.PROJECT: {
      delete c.submissions;
      break;
    }
    case ContentType.LIVE_SESSION: {
      delete c.attendance;
      break;
    }
  }

  return content;
}

/** Applies {@link sanitizeContentForStudent} to every item in a content list. */
export function sanitizeContentsForStudent(contents?: unknown): void {
  if (!Array.isArray(contents)) return;
  for (const content of contents) {
    sanitizeContentForStudent(content as object | null | undefined);
  }
}
