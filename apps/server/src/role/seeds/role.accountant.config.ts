import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const ACCOUNTANT_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.GROUP },
  { action: Actions.READ, subject: Subjects.SESSION },
  { action: Actions.MANAGE, subject: Subjects.BILLING },
  { action: Actions.MANAGE, subject: Subjects.FAMILY_PAYMENT },
  { action: Actions.MANAGE, subject: Subjects.PAYROLL },
  { action: Actions.MANAGE, subject: Subjects.CERTIFICATE },
];

export const ACCOUNTANT_SEED: RoleSeedEntry = { name: Roles.ACCOUNTANT, permissions: ACCOUNTANT_PERMISSIONS };
