import { Actions, Roles, Subjects } from '@lms-organization/shared-types';

export interface RolePermissionRule {
  action: Actions;
  subject: Subjects;
}

export interface RoleSeedEntry {
  name: Roles;
  permissions: RolePermissionRule[];
}
