import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const PLATFORM_ADMIN_PERMISSIONS: RolePermissionRule[] = Object.values(Subjects).map((subject) => ({
  action: Actions.MANAGE,
  subject,
}));

export const PLATFORM_ADMIN_SEED: RoleSeedEntry = {
  name: Roles.PLATFORM_ADMIN,
  permissions: PLATFORM_ADMIN_PERMISSIONS,
};
