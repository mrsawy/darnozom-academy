import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const INSTRUCTOR_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.COURSE },
  { action: Actions.UPDATE, subject: Subjects.COURSE },
  { action: Actions.DELETE, subject: Subjects.COURSE },
  { action: Actions.READ, subject: Subjects.CATEGORY },
  { action: Actions.READ, subject: Subjects.USER },
  { action: Actions.READ, subject: Subjects.REVIEW },
  { action: Actions.READ, subject: Subjects.CONTENT },
  { action: Actions.UPDATE, subject: Subjects.CONTENT },
  { action: Actions.CREATE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.READ, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.UPDATE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.DELETE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.CREATE, subject: Subjects.PRIVATE_SESSION },
  { action: Actions.READ, subject: Subjects.PRIVATE_SESSION },
  { action: Actions.UPDATE, subject: Subjects.PRIVATE_SESSION },
  { action: Actions.DELETE, subject: Subjects.PRIVATE_SESSION },
  { action: Actions.READ, subject: Subjects.SESSION_BOOKING },
  { action: Actions.UPDATE, subject: Subjects.SESSION_BOOKING },
  { action: Actions.READ, subject: Subjects.INSTRUCTOR_REPORT },
  { action: Actions.READ, subject: Subjects.STUDENT_REPORT },
  { action: Actions.READ, subject: Subjects.GROUP },
  { action: Actions.MANAGE, subject: Subjects.TEACHER_AVAILABILITY },
];

export const INSTRUCTOR_SEED: RoleSeedEntry = {
  name: Roles.INSTRUCTOR,
  permissions: INSTRUCTOR_PERMISSIONS,
};
