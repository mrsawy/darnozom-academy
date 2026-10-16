import { hasAnyRole, hasRole, Roles, type RoleHolder } from '@darnozom/shared-types';

/** Any nav item; the index signature lets items without role gates pass TypeScript's weak-type check. */
export interface RoleGatedNavItem {
  requiredRoles?: readonly Roles[];
  instructorOnly?: boolean;
  [key: string]: unknown;
}

export function isNavItemVisible(item: RoleGatedNavItem, user?: RoleHolder | null): boolean {
  const allRoles = [
    ...(user?.roleName ? [user.roleName] : []),
    ...((user?.additionalRoles as Roles[] | undefined) ?? []),
  ];
  const isInstructorOnly =
    allRoles.length > 0 && allRoles.every((r) => r === Roles.INSTRUCTOR);

  if (isInstructorOnly && !item.instructorOnly) {
    return false;
  }
  if (item.instructorOnly && !hasRole(user, Roles.INSTRUCTOR)) return false;
  if (item.requiredRoles && !hasAnyRole(user, item.requiredRoles)) return false;
  return true;
}
