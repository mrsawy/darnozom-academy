import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const ACCOUNTANT_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.GROUP },
  { action: Actions.READ, subject: Subjects.SESSION },
  { action: Actions.MANAGE, subject: Subjects.GROUP_PAYMENT_STATUS },
];

export const ACCOUNTANT_SEED: RoleSeedEntry = { name: Roles.ACCOUNTANT, permissions: ACCOUNTANT_PERMISSIONS };
