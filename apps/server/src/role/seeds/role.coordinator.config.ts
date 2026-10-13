import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const COORDINATOR_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.PROGRAM },
  { action: Actions.READ, subject: Subjects.LEVEL },
  { action: Actions.READ, subject: Subjects.COHORT },
  { action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY },
  { action: Actions.MANAGE, subject: Subjects.GROUP },
  { action: Actions.MANAGE, subject: Subjects.SESSION },
  { action: Actions.READ, subject: Subjects.TASK },
  { action: Actions.UPDATE, subject: Subjects.TASK },
];

export const COORDINATOR_SEED: RoleSeedEntry = { name: Roles.COORDINATOR, permissions: COORDINATOR_PERMISSIONS };
