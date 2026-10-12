import { AcademicsErrors, GroupStatus } from '@darnozom/shared-types';

/** Null when the user-requested change is allowed, otherwise the error key to throw. */
export function checkStatusTransition(from: GroupStatus, to: GroupStatus, ctx: { ready: boolean; reason?: string }): AcademicsErrors | null {
  if (from === GroupStatus.CANCELLED) return AcademicsErrors.GROUP_CANCELLED;
  if (from === GroupStatus.COMPLETED) return AcademicsErrors.GROUP_COMPLETED;
  if (from === GroupStatus.RUNNING) return AcademicsErrors.INVALID_STATUS_TRANSITION;
  if (to === GroupStatus.READY_TO_START) {
    if (from === GroupStatus.READY_TO_START) return null;
    return ctx.ready ? null : AcademicsErrors.GROUP_NOT_READY;
  }
  if (to === GroupStatus.CANCELLED) {
    return ctx.reason !== undefined && ctx.reason.trim().length > 0 ? null : AcademicsErrors.CANCEL_REASON_REQUIRED;
  }
  return AcademicsErrors.INVALID_STATUS_TRANSITION;
}

/** System-only READY_TO_START → FORMING when an edit breaks readiness. */
export function shouldRevertToForming(status: GroupStatus, ready: boolean): boolean {
  return status === GroupStatus.READY_TO_START && !ready;
}
