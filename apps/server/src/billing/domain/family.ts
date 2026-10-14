import { Types } from 'mongoose';

/**
 * A family is identified by its parent user; a student with no linked parent is their own family.
 * No collection is needed — `user.parentUserId` already carries the link, and it exists only on a
 * student, which the user schema enforces.
 */
export function familyIdOf(user: { _id: Types.ObjectId | string; parentUserId?: Types.ObjectId | string | null }): string {
  return String(user.parentUserId ?? user._id);
}
