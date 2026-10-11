import { Roles } from '@darnozom/shared-types';
import { ADMIN_PERMISSIONS } from './role.admin.config';
import { RoleSeedEntry } from './role.types';

/** Owner = full organization access, same as ADMIN (plan deviation D5). */
export const OWNER_SEED: RoleSeedEntry = { name: Roles.OWNER, permissions: ADMIN_PERMISSIONS };
