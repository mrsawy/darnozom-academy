import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const MANAGER_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.MANAGE, subject: Subjects.PROGRAM },
  { action: Actions.MANAGE, subject: Subjects.LEVEL },
  { action: Actions.MANAGE, subject: Subjects.COHORT },
  { action: Actions.MANAGE, subject: Subjects.GROUP },
  { action: Actions.MANAGE, subject: Subjects.GROUP_PAYMENT_STATUS },
  { action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY },
];

export const MANAGER_SEED: RoleSeedEntry = { name: Roles.MANAGER, permissions: MANAGER_PERMISSIONS };
