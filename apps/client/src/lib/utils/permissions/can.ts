import { Actions, Subjects } from '@darnozom/shared-types';
import type { IUser } from '@/lib/types/user/user.interface';

/**
 * Client-side mirror of the server's CASL check (apps/server/src/role/permissions.factory.ts),
 * without field conditions: good enough to show/hide UI, the server still enforces the real rule.
 */
export function canUser(
  user: Partial<Pick<IUser, 'role'>> | null | undefined,
  action: Actions,
  subject: Subjects
): boolean {
  const permissions = user?.role?.permissions ?? [];
  return permissions.some(
    (permission) =>
      (permission.action === action || permission.action === Actions.MANAGE) &&
      (permission.subject === subject || permission.subject === Subjects.ALL)
  );
}
