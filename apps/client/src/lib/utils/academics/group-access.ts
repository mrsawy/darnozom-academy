import {
  GROUP_EDITOR_ROLES,
  GROUP_PAYMENT_EDITOR_ROLES,
  GroupStatus,
  hasAnyRole,
  type RoleHolder,
} from '@darnozom/shared-types';

/** What the formation screen lets this user change; mirrors the server's UPDATE GROUP / GROUP_PAYMENT_STATUS seeds. */
export function groupScreenAccess(user: RoleHolder | null | undefined, status: GroupStatus) {
  const cancelled = status === GroupStatus.CANCELLED;
  return {
    locked: cancelled || !hasAnyRole(user, GROUP_EDITOR_ROLES),
    paymentLocked: cancelled || !hasAnyRole(user, GROUP_PAYMENT_EDITOR_ROLES),
  };
}
