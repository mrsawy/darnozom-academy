import { Actions, ICondition, Roles, Subjects } from '@islamic-academy/shared-types';

export interface RolePermissionRule {
  action: Actions;
  subject: Subjects;
  conditions?: ICondition | ICondition[];
}

export interface RoleSeedEntry {
  name: Roles;
  permissions: RolePermissionRule[];
}
