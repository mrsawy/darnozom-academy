import { AcademicsErrors, GroupStatus } from '@darnozom/shared-types';
import { checkStatusTransition, shouldRevertToForming } from './group-status';

describe('checkStatusTransition', () => {
  it('allows FORMING → READY_TO_START only when ready', () => {
    expect(checkStatusTransition(GroupStatus.FORMING, GroupStatus.READY_TO_START, { ready: true })).toBeNull();
    expect(checkStatusTransition(GroupStatus.FORMING, GroupStatus.READY_TO_START, { ready: false })).toBe(AcademicsErrors.GROUP_NOT_READY);
  });
  it('treats READY_TO_START → READY_TO_START as a no-op', () => {
    expect(checkStatusTransition(GroupStatus.READY_TO_START, GroupStatus.READY_TO_START, { ready: true })).toBeNull();
  });
  it('requires a non-blank reason to cancel', () => {
    expect(checkStatusTransition(GroupStatus.FORMING, GroupStatus.CANCELLED, { ready: false, reason: 'no teacher' })).toBeNull();
    expect(checkStatusTransition(GroupStatus.READY_TO_START, GroupStatus.CANCELLED, { ready: true, reason: '  ' })).toBe(
      AcademicsErrors.CANCEL_REASON_REQUIRED
    );
  });
  it('rejects every change out of CANCELLED', () => {
    for (const to of Object.values(GroupStatus)) {
      expect(checkStatusTransition(GroupStatus.CANCELLED, to, { ready: true, reason: 'x' })).toBe(AcademicsErrors.GROUP_CANCELLED);
    }
  });
  it('does not allow users to move a group back to FORMING', () => {
    expect(checkStatusTransition(GroupStatus.READY_TO_START, GroupStatus.FORMING, { ready: false })).toBe(AcademicsErrors.INVALID_STATUS_TRANSITION);
  });
});

describe('shouldRevertToForming', () => {
  it('reverts only a READY_TO_START group that lost readiness', () => {
    expect(shouldRevertToForming(GroupStatus.READY_TO_START, false)).toBe(true);
    expect(shouldRevertToForming(GroupStatus.READY_TO_START, true)).toBe(false);
    expect(shouldRevertToForming(GroupStatus.FORMING, false)).toBe(false);
    expect(shouldRevertToForming(GroupStatus.CANCELLED, false)).toBe(false);
  });
});

describe('checkStatusTransition out of started groups', () => {
  it('refuses user-driven transitions out of RUNNING and COMPLETED', () => {
    expect(checkStatusTransition(GroupStatus.RUNNING, GroupStatus.CANCELLED, { ready: true, reason: 'x' })).toBe(AcademicsErrors.INVALID_STATUS_TRANSITION);
    expect(checkStatusTransition(GroupStatus.RUNNING, GroupStatus.READY_TO_START, { ready: true })).toBe(AcademicsErrors.INVALID_STATUS_TRANSITION);
    expect(checkStatusTransition(GroupStatus.COMPLETED, GroupStatus.CANCELLED, { ready: true, reason: 'x' })).toBe(AcademicsErrors.GROUP_COMPLETED);
  });
});
