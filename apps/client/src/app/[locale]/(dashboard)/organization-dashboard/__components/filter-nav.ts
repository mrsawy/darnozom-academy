import { hasAnyRole, hasRole, Roles, type RoleHolder } from '@darnozom/shared-types';

/** Any nav item; the index signature lets items without role gates pass TypeScript's weak-type check. */
export interface RoleGatedNavItem {
  requiredRoles?: readonly Roles[];
  instructorOnly?: boolean;
  [key: string]: unknown;
}

export function isNavItemVisible(item: RoleGatedNavItem, user?: RoleHolder | null): boolean {
  if (item.instructorOnly && !hasRole(user, Roles.INSTRUCTOR)) return false;
  if (item.requiredRoles && !hasAnyRole(user, item.requiredRoles)) return false;
  return true;
}
