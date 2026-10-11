import { Roles } from './roles.enum';

export interface RoleHolder {
  roleName: Roles | string;
  additionalRoles?: readonly (Roles | string)[] | null;
}

/** Roles that may appear in User.additionalRoles (staff roles + INSTRUCTOR). */
export const ADDITIONAL_ROLE_OPTIONS: readonly Roles[] = [
  Roles.OWNER,
  Roles.MANAGER,
  Roles.COORDINATOR,
  Roles.SUPERVISOR,
  Roles.CONTENT_OFFICER,
  Roles.SHARIA_REVIEWER,
  Roles.HR,
  Roles.ACCOUNTANT,
  Roles.INSTRUCTOR,
];

/** Holders of any of these roles read every group in their organization. */
export const ORG_WIDE_GROUP_READER_ROLES: readonly Roles[] = [
  Roles.SUPER_ADMIN,
  Roles.ADMIN,
  Roles.OWNER,
  Roles.MANAGER,
  Roles.COORDINATOR,
  Roles.SUPERVISOR,
  Roles.ACCOUNTANT,
];

export function hasRole(user: RoleHolder | null | undefined, role: Roles): boolean {
  if (!user) return false;
  return user.roleName === role || (user.additionalRoles ?? []).includes(role);
}

export function hasAnyRole(user: RoleHolder | null | undefined, roles: readonly Roles[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

export type AdditionalRolesViolation = 'NOT_ALLOWED_FOR_PRIMARY_ROLE' | 'DUPLICATE_ROLE' | 'PRIMARY_ROLE_REPEATED' | 'ROLE_NOT_ALLOWED';

export function getAdditionalRolesViolation(roleName: string, additionalRoles: readonly string[]): AdditionalRolesViolation | null {
  if (additionalRoles.length === 0) return null;
  if (roleName === Roles.STUDENT || roleName === Roles.PARENT) return 'NOT_ALLOWED_FOR_PRIMARY_ROLE';
  if (new Set(additionalRoles).size !== additionalRoles.length) return 'DUPLICATE_ROLE';
  if (additionalRoles.includes(roleName)) return 'PRIMARY_ROLE_REPEATED';
  const allowed = ADDITIONAL_ROLE_OPTIONS as readonly string[];
  if (additionalRoles.some((role) => !allowed.includes(role))) return 'ROLE_NOT_ALLOWED';
  return null;
}
