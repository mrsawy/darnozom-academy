import { RoleSeedEntry } from './role.types';
import { SUPER_ADMIN_SEED } from './role.super-admin.config';
import { ORGANIZATION_ADMIN_SEED } from './role.organization-admin.config';
import { TEACHER_SEED } from './role.teacher.config';
import { STUDENT_SEED } from './role.student.config';
import { PARENT_SEED } from './role.parent.config';
import { GUEST_SEED } from './role.guest.config';

export const ROLE_SEED_DEFINITIONS: RoleSeedEntry[] = [
  SUPER_ADMIN_SEED,
  ORGANIZATION_ADMIN_SEED,
  TEACHER_SEED,
  STUDENT_SEED,
  PARENT_SEED,
  GUEST_SEED,
];
