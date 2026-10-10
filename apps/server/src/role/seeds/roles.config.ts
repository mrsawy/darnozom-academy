export type { RolePermissionRule, RoleSeedEntry } from './role.types';

import { PLATFORM_ADMIN_SEED } from './role.platform-admin.config';
import { SUPER_ADMIN_SEED } from './role.super-admin.config';
import { ADMIN_SEED } from './role.admin.config';
import { INSTRUCTOR_SEED } from './role.instructor.config';
import { STUDENT_SEED } from './role.student.config';
import { PARENT_SEED } from './role.parent.config';
import { SECRETARY_SEED } from './role.secretary.config';
import { GUEST_SEED } from './role.guest.config';
import { RoleSeedEntry } from './role.types';

export const ROLE_SEED_DEFINITIONS: RoleSeedEntry[] = [
  PLATFORM_ADMIN_SEED,
  SUPER_ADMIN_SEED,
  ADMIN_SEED,
  INSTRUCTOR_SEED,
  STUDENT_SEED,
  PARENT_SEED,
  SECRETARY_SEED,
  GUEST_SEED,
];

export { PLATFORM_ADMIN_SEED } from './role.platform-admin.config';
export { SUPER_ADMIN_MANAGE_SUBJECTS, SUPER_ADMIN_PERMISSIONS, SUPER_ADMIN_SEED } from './role.super-admin.config';
export { ADMIN_MANAGE_SUBJECTS, ADMIN_PERMISSIONS, ADMIN_SEED } from './role.admin.config';
export { INSTRUCTOR_PERMISSIONS, INSTRUCTOR_SEED } from './role.instructor.config';
export { STUDENT_PERMISSIONS, STUDENT_SEED } from './role.student.config';
export { PARENT_PERMISSIONS, PARENT_SEED } from './role.parent.config';
export { SECRETARY_PERMISSIONS, SECRETARY_SEED } from './role.secretary.config';
export { GUEST_SEED } from './role.guest.config';
