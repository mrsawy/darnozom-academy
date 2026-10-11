import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

/**
 * GUEST role -- assigned to new OAuth users before they complete onboarding.
 * Intentionally minimal: only course enrollment is allowed so a GUEST can
 * purchase a course and be promoted to STUDENT without going through the
 * onboarding wizard first.
 */
export const GUEST_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.CREATE, subject: Subjects.ENROLLMENT },
  { action: Actions.READ, subject: Subjects.ORGANIZATION_MEMBER_REPORT },
];

export const GUEST_SEED: RoleSeedEntry = {
  name: Roles.GUEST,
  permissions: GUEST_PERMISSIONS,
};
