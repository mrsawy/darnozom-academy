import { describe, expect, it } from 'vitest';
import { GroupStatus, Roles } from '@darnozom/shared-types';
import { groupScreenAccess } from './group-access';

const access = (roleName: Roles, status: GroupStatus, additionalRoles: Roles[] = []) =>
  groupScreenAccess({ roleName, additionalRoles }, status);

describe('groupScreenAccess', () => {
  it('lets a coordinator edit the group, start it and cancel it, but not toggle payments', () => {
    expect(access(Roles.COORDINATOR, GroupStatus.READY_TO_START)).toEqual({
      locked: false,
      paymentLocked: true,
      scheduleLocked: false,
      canStart: true,
      canCancel: true,
      canManage: true,
    });
  });

  it('lets an accountant toggle payments only', () => {
    expect(access(Roles.ACCOUNTANT, GroupStatus.FORMING)).toEqual({
      locked: true,
      paymentLocked: false,
      scheduleLocked: false,
      canStart: false,
      canCancel: false,
      canManage: false,
    });
  });

  it('gives a supervisor a read-only screen', () => {
    expect(access(Roles.SUPERVISOR, GroupStatus.READY_TO_START)).toMatchObject({ locked: true, paymentLocked: true, canStart: false, canCancel: false, canManage: false });
  });

  it('counts additional roles', () => {
    expect(access(Roles.SUPERVISOR, GroupStatus.FORMING, [Roles.ACCOUNTANT])).toMatchObject({ locked: true, paymentLocked: false });
  });

  it('locks the schedule, time zone, session count and teacher while the group runs, but not other fields', () => {
    expect(access(Roles.MANAGER, GroupStatus.RUNNING)).toEqual({
      locked: false,
      paymentLocked: false,
      scheduleLocked: true,
      canStart: false,
      canCancel: false,
      canManage: true,
    });
  });

  it('locks everything on a cancelled or completed group', () => {
    for (const status of [GroupStatus.CANCELLED, GroupStatus.COMPLETED]) {
      expect(access(Roles.MANAGER, status)).toMatchObject({ locked: true, paymentLocked: true, canStart: false, canCancel: false });
    }
  });

  it('locks everything while the user is unknown', () => {
    expect(groupScreenAccess(undefined, GroupStatus.FORMING)).toMatchObject({ locked: true, paymentLocked: true, canStart: false, canManage: false });
  });
});
