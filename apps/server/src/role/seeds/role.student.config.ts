import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const STUDENT_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.COURSE },
  { action: Actions.READ, subject: Subjects.CONTENT },
  { action: Actions.READ, subject: Subjects.CATEGORY },
  { action: Actions.READ, subject: Subjects.USER },
  { action: Actions.CREATE, subject: Subjects.ENROLLMENT },
  { action: Actions.READ, subject: Subjects.ENROLLMENT },
  { action: Actions.CREATE, subject: Subjects.REVIEW },
  { action: Actions.UPDATE, subject: Subjects.REVIEW },
  { action: Actions.DELETE, subject: Subjects.REVIEW },
  { action: Actions.CREATE, subject: Subjects.FILE },
  { action: Actions.READ, subject: Subjects.WALLET },
  { action: Actions.CREATE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.READ, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.UPDATE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.DELETE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.READ, subject: Subjects.PRIVATE_SESSION },
  { action: Actions.CREATE, subject: Subjects.SESSION_BOOKING },
  { action: Actions.READ, subject: Subjects.SESSION_BOOKING },
  { action: Actions.UPDATE, subject: Subjects.SESSION_BOOKING },
  { action: Actions.READ, subject: Subjects.STUDENT_REPORT },
  { action: Actions.READ, subject: Subjects.ORGANIZATION_MEMBER_REPORT },
  { action: Actions.READ, subject: Subjects.GROUP },
];

export const STUDENT_SEED: RoleSeedEntry = {
  name: Roles.STUDENT,
  permissions: STUDENT_PERMISSIONS,
};
