import { describe, expect, it } from 'vitest';
import { GroupStatus, Roles } from '@darnozom/shared-types';
import { groupScreenAccess } from './group-access';

const access = (roleName: Roles, status: GroupStatus, additionalRoles: Roles[] = []) =>
  groupScreenAccess({ roleName, additionalRoles }, status);

describe('groupScreenAccess', () => {
  it('lets a coordinator edit the group, start it and cancel it', () => {
    expect(access(Roles.COORDINATOR, GroupStatus.READY_TO_START)).toEqual({
      locked: false,
      scheduleLocked: false,
      canStart: true,
      canCancel: true,
      canManage: true,
    });
  });

  it('gives an accountant a read-only screen', () => {
    expect(access(Roles.ACCOUNTANT, GroupStatus.FORMING)).toEqual({
      locked: true,
      scheduleLocked: false,
      canStart: false,
      canCancel: false,
      canManage: false,
    });
  });

  it('gives a supervisor a read-only screen', () => {
    expect(access(Roles.SUPERVISOR, GroupStatus.READY_TO_START)).toMatchObject({
      locked: true,
      canStart: false,
      canCancel: false,
      canManage: false,
    });
  });

  it('counts additional roles', () => {
    expect(access(Roles.SUPERVISOR, GroupStatus.FORMING, [Roles.COORDINATOR])).toMatchObject({
      locked: false,
    });
  });

  it('locks the schedule, time zone, session count and teacher while the group runs, but not other fields', () => {
    expect(access(Roles.MANAGER, GroupStatus.RUNNING)).toEqual({
      locked: false,
      scheduleLocked: true,
      canStart: false,
      canCancel: false,
      canManage: true,
    });
  });

  it('locks everything on a cancelled or completed group', () => {
    for (const status of [GroupStatus.CANCELLED, GroupStatus.COMPLETED]) {
      expect(access(Roles.MANAGER, status)).toMatchObject({
        locked: true,
        canStart: false,
        canCancel: false,
      });
    }
  });

  it('locks everything while the user is unknown', () => {
    expect(groupScreenAccess(undefined, GroupStatus.FORMING)).toMatchObject({
      locked: true,
      canStart: false,
      canManage: false,
    });
  });
});
