import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const SUPERVISOR_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.PROGRAM },
  { action: Actions.READ, subject: Subjects.LEVEL },
  { action: Actions.READ, subject: Subjects.COHORT },
  { action: Actions.READ, subject: Subjects.GROUP },
  { action: Actions.READ, subject: Subjects.SESSION },
  { action: Actions.READ, subject: Subjects.TASK },
  { action: Actions.UPDATE, subject: Subjects.TASK },
];

export const SUPERVISOR_SEED: RoleSeedEntry = { name: Roles.SUPERVISOR, permissions: SUPERVISOR_PERMISSIONS };
