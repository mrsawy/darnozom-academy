import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

/** Authors content. Their edits go through the same Sharia gate as anyone else's. */
export const CONTENT_OFFICER_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.MANAGE, subject: Subjects.CONTENT },
  { action: Actions.MANAGE, subject: Subjects.MODULE },
  { action: Actions.READ, subject: Subjects.COURSE },
];

export const CONTENT_OFFICER_SEED: RoleSeedEntry = { name: Roles.CONTENT_OFFICER, permissions: CONTENT_OFFICER_PERMISSIONS };
