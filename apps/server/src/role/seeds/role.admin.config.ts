import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const ADMIN_MANAGE_SUBJECTS: Subjects[] = [
  Subjects.COURSE,
  Subjects.CATEGORY,
  Subjects.USER,
  Subjects.ORGANIZATION,
  Subjects.ROLE,
  Subjects.REVIEW,
  Subjects.MODULE,
  Subjects.CONTENT,
  Subjects.ATTENDANCE,
  Subjects.ENROLLMENT,
  Subjects.PAYMENT,
  Subjects.NOTIFICATION,
  Subjects.MESSAGE,
  Subjects.FEEDBACK,
  Subjects.REPORT,
  Subjects.SETTING,
  Subjects.LOG,
  Subjects.ASSIGNMENT,
  Subjects.PROJECT,
  Subjects.LIVE_SESSION,
  Subjects.TASK,
  Subjects.FILE,
  Subjects.GALLERY,
  Subjects.PAGE,
  Subjects.PLAN,
  Subjects.WALLET,
  Subjects.PARENT,
  Subjects.ADMIN_REVIEW,
  Subjects.WITHDRAWAL_REQUEST,
  Subjects.STUDENT_REPORT,
  Subjects.ORGANIZATION_REPORT,
  Subjects.ORGANIZATION_MEMBER_REPORT,
  Subjects.INSTRUCTOR_REPORT,
  Subjects.PARENT_REPORT,
  Subjects.BILLING,
  Subjects.FAMILY_PAYMENT,
];

export const ADMIN_PERMISSIONS: RolePermissionRule[] = [
  ...ADMIN_MANAGE_SUBJECTS.map((subject) => ({ action: Actions.MANAGE, subject })),
  { action: Actions.MANAGE, subject: Subjects.ALL },
];

export const ADMIN_SEED: RoleSeedEntry = {
  name: Roles.ADMIN,
  permissions: ADMIN_PERMISSIONS,
};
