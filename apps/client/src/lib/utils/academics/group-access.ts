import {
  GROUP_EDITOR_ROLES,
  GROUP_PAYMENT_EDITOR_ROLES,
  GroupStatus,
  hasAnyRole,
  type RoleHolder,
} from '@darnozom/shared-types';

/** What the formation screen lets this user change; mirrors the server's UPDATE GROUP / GROUP_PAYMENT_STATUS seeds and the running-group locks. */
export function groupScreenAccess(user: RoleHolder | null | undefined, status: GroupStatus) {
  const closed = status === GroupStatus.CANCELLED || status === GroupStatus.COMPLETED;
  const canManage = hasAnyRole(user, GROUP_EDITOR_ROLES);
  return {
    locked: closed || !canManage,
    paymentLocked: closed || !hasAnyRole(user, GROUP_PAYMENT_EDITOR_ROLES),
    scheduleLocked: status === GroupStatus.RUNNING,
    canStart: canManage && status === GroupStatus.READY_TO_START,
    canCancel:
      canManage && (status === GroupStatus.FORMING || status === GroupStatus.READY_TO_START),
    canManage,
  };
}
