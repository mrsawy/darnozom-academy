import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

/**
 * Reviews the academy's own material. Deliberately holds no financial subject: the concept's rule
 * is that content staff cannot see financial data.
 */
export const SHARIA_REVIEWER_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW },
  { action: Actions.READ, subject: Subjects.CONTENT },
  { action: Actions.READ, subject: Subjects.MODULE },
  { action: Actions.READ, subject: Subjects.COURSE },
];

export const SHARIA_REVIEWER_SEED: RoleSeedEntry = { name: Roles.SHARIA_REVIEWER, permissions: SHARIA_REVIEWER_PERMISSIONS };
