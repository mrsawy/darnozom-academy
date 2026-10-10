import type { Schema } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

/**
 * Applies soft-delete defaults on the User schema.
 * @see `src/utils/soft-delete` and `.agents/skills/soft-delete/SKILL.md`
 */
export function applyUserSoftDeleteMiddleware(schema: Schema): void {
  applySoftDeleteMiddleware(schema);
}
