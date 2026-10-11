export type { RolePermissionRule, RoleSeedEntry } from './role.types';

import { PLATFORM_ADMIN_SEED } from './role.platform-admin.config';
import { SUPER_ADMIN_SEED } from './role.super-admin.config';
import { ADMIN_SEED } from './role.admin.config';
import { INSTRUCTOR_SEED } from './role.instructor.config';
import { STUDENT_SEED } from './role.student.config';
import { PARENT_SEED } from './role.parent.config';
import { SECRETARY_SEED } from './role.secretary.config';
import { GUEST_SEED } from './role.guest.config';
import { OWNER_SEED } from './role.owner.config';
import { MANAGER_SEED } from './role.manager.config';
import { COORDINATOR_SEED } from './role.coordinator.config';
import { SUPERVISOR_SEED } from './role.supervisor.config';
import { ACCOUNTANT_SEED } from './role.accountant.config';
import { CONTENT_OFFICER_SEED } from './role.content-officer.config';
import { SHARIA_REVIEWER_SEED } from './role.sharia-reviewer.config';
import { HR_SEED } from './role.hr.config';
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
  OWNER_SEED,
  MANAGER_SEED,
  COORDINATOR_SEED,
  SUPERVISOR_SEED,
  ACCOUNTANT_SEED,
  CONTENT_OFFICER_SEED,
  SHARIA_REVIEWER_SEED,
  HR_SEED,
];

export { PLATFORM_ADMIN_SEED } from './role.platform-admin.config';
export { SUPER_ADMIN_MANAGE_SUBJECTS, SUPER_ADMIN_PERMISSIONS, SUPER_ADMIN_SEED } from './role.super-admin.config';
export { ADMIN_MANAGE_SUBJECTS, ADMIN_PERMISSIONS, ADMIN_SEED } from './role.admin.config';
export { INSTRUCTOR_PERMISSIONS, INSTRUCTOR_SEED } from './role.instructor.config';
export { STUDENT_PERMISSIONS, STUDENT_SEED } from './role.student.config';
export { PARENT_PERMISSIONS, PARENT_SEED } from './role.parent.config';
export { SECRETARY_PERMISSIONS, SECRETARY_SEED } from './role.secretary.config';
export { GUEST_SEED } from './role.guest.config';
export { OWNER_SEED } from './role.owner.config';
export { MANAGER_PERMISSIONS, MANAGER_SEED } from './role.manager.config';
export { COORDINATOR_PERMISSIONS, COORDINATOR_SEED } from './role.coordinator.config';
export { SUPERVISOR_PERMISSIONS, SUPERVISOR_SEED } from './role.supervisor.config';
export { ACCOUNTANT_PERMISSIONS, ACCOUNTANT_SEED } from './role.accountant.config';
export { CONTENT_OFFICER_SEED } from './role.content-officer.config';
export { SHARIA_REVIEWER_SEED } from './role.sharia-reviewer.config';
export { HR_SEED } from './role.hr.config';
