import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const PARENT_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.COURSE },
  { action: Actions.READ, subject: Subjects.CATEGORY },
  { action: Actions.READ, subject: Subjects.USER },
  { action: Actions.CREATE, subject: Subjects.REVIEW },
  { action: Actions.READ, subject: Subjects.PARENT },
  { action: Actions.CREATE, subject: Subjects.ENROLLMENT },
  { action: Actions.READ, subject: Subjects.ENROLLMENT },
  { action: Actions.READ, subject: Subjects.WALLET },
  { action: Actions.UPDATE, subject: Subjects.WALLET },
  { action: Actions.CREATE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.READ, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.UPDATE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.DELETE, subject: Subjects.WITHDRAWAL_REQUEST },
  { action: Actions.CREATE, subject: Subjects.WISHLIST },
  { action: Actions.READ, subject: Subjects.WISHLIST },
  { action: Actions.DELETE, subject: Subjects.WISHLIST },
  { action: Actions.CREATE, subject: Subjects.FILE },
  { action: Actions.CREATE, subject: Subjects.ENROLLMENT_FOR_OTHER },
  { action: Actions.READ, subject: Subjects.PRIVATE_SESSION },
  { action: Actions.CREATE, subject: Subjects.SESSION_BOOKING },
  { action: Actions.READ, subject: Subjects.SESSION_BOOKING },
  { action: Actions.UPDATE, subject: Subjects.SESSION_BOOKING },
  { action: Actions.READ, subject: Subjects.ORGANIZATION_MEMBER_REPORT },
  { action: Actions.READ, subject: Subjects.GROUP },
  { action: Actions.READ, subject: Subjects.SESSION },
  { action: Actions.READ, subject: Subjects.BILLING },
  { action: Actions.CREATE, subject: Subjects.FAMILY_PAYMENT },
  { action: Actions.READ, subject: Subjects.FAMILY_PAYMENT },
  { action: Actions.READ, subject: Subjects.CERTIFICATE },
  { action: Actions.UPDATE, subject: Subjects.CERTIFICATE },
];

export const PARENT_SEED: RoleSeedEntry = {
  name: Roles.PARENT,
  permissions: PARENT_PERMISSIONS,
};
