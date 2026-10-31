import {
  Actions,
  hasAnyRole,
  hasRole,
  Roles,
  Subjects,
  type RoleHolder,
} from '@darnozom/shared-types';
import { canUser } from '@/lib/utils/permissions/can';
import type { IUser } from '@/lib/types/user/user.interface';

/** Any nav item; the index signature lets items without role gates pass TypeScript's weak-type check. */
export interface RoleGatedNavItem {
  requiredRoles?: readonly Roles[];
  requiredPermission?: { action: Actions; subject: Subjects };
  instructorOnly?: boolean;
  [key: string]: unknown;
}

export function isNavItemVisible(
  item: RoleGatedNavItem,
  user?: (RoleHolder & Partial<Pick<IUser, 'role'>>) | null
): boolean {
  const allRoles = [
    ...(user?.roleName ? [user.roleName] : []),
    ...((user?.additionalRoles as Roles[] | undefined) ?? []),
  ];
  const isInstructorOnly = allRoles.length > 0 && allRoles.every((r) => r === Roles.INSTRUCTOR);

  if (isInstructorOnly && !item.instructorOnly) {
    return false;
  }
  if (item.instructorOnly && !hasRole(user, Roles.INSTRUCTOR)) return false;
  if (item.requiredRoles && !hasAnyRole(user, item.requiredRoles)) return false;
  if (
    item.requiredPermission &&
    !canUser(user, item.requiredPermission.action, item.requiredPermission.subject)
  )
    return false;
  return true;
}
