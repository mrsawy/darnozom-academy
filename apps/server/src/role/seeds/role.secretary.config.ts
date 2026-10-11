import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const SECRETARY_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.COURSE },
  { action: Actions.READ, subject: Subjects.USER },
  { action: Actions.CREATE, subject: Subjects.USER },
  { action: Actions.UPDATE, subject: Subjects.USER },
  { action: Actions.READ, subject: Subjects.ORGANIZATION },
  { action: Actions.READ, subject: Subjects.ORGANIZATION_MEMBER_REPORT },
];

export const SECRETARY_SEED: RoleSeedEntry = {
  name: Roles.SECRETARY,
  permissions: SECRETARY_PERMISSIONS,
};
