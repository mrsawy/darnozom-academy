import { Actions, Subjects, Roles } from '@islamic-academy/shared-types';
import { RoleSeedEntry } from './role.types';

/** Super admin: full platform control, unrestricted by organization. */
export const SUPER_ADMIN_SEED: RoleSeedEntry = {
  name: Roles.SUPER_ADMIN,
  permissions: [{ action: Actions.MANAGE, subject: Subjects.ALL }],
};
