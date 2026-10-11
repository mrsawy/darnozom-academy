import { Actions, Roles, Subjects } from '@darnozom/shared-types';

export interface RolePermissionRule {
  action: Actions;
  subject: Subjects;
}

export interface RoleSeedEntry {
  name: Roles;
  permissions: RolePermissionRule[];
}
