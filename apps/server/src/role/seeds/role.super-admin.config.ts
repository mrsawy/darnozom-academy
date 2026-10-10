import { Actions, Roles, Subjects } from '@lms-organization/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const SUPER_ADMIN_MANAGE_SUBJECTS: Subjects[] = [
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
  Subjects.VERIFICATION,
  Subjects.VERIFICATION_STATUS,
  Subjects.WITHDRAWAL_REQUEST,
  Subjects.STUDENT_REPORT,
  Subjects.ORGANIZATION_REPORT,
  Subjects.ORGANIZATION_MEMBER_REPORT,
  Subjects.INSTRUCTOR_REPORT,
  Subjects.PARENT_REPORT,
];

export const SUPER_ADMIN_PERMISSIONS: RolePermissionRule[] = [
  ...SUPER_ADMIN_MANAGE_SUBJECTS.map((subject) => ({ action: Actions.MANAGE, subject })),
  { action: Actions.MANAGE, subject: Subjects.ALL },
];

export const SUPER_ADMIN_SEED: RoleSeedEntry = {
  name: Roles.SUPER_ADMIN,
  permissions: SUPER_ADMIN_PERMISSIONS,
};
