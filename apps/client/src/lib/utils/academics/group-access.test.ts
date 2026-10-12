import { describe, expect, it } from 'vitest';
import { GroupStatus, Roles } from '@darnozom/shared-types';
import { groupScreenAccess } from './group-access';

describe('groupScreenAccess', () => {
  it('lets a coordinator edit the group but not toggle payments', () => {
    expect(groupScreenAccess({ roleName: Roles.COORDINATOR }, GroupStatus.FORMING)).toEqual({
      locked: false,
      paymentLocked: true,
    });
  });
  it('lets an accountant toggle payments only', () => {
    expect(groupScreenAccess({ roleName: Roles.ACCOUNTANT }, GroupStatus.FORMING)).toEqual({
      locked: true,
      paymentLocked: false,
    });
  });
  it('gives a supervisor a read-only screen', () => {
    expect(groupScreenAccess({ roleName: Roles.SUPERVISOR }, GroupStatus.FORMING)).toEqual({
      locked: true,
      paymentLocked: true,
    });
  });
  it('counts additional roles', () => {
    expect(
      groupScreenAccess(
        { roleName: Roles.SUPERVISOR, additionalRoles: [Roles.ACCOUNTANT] },
        GroupStatus.FORMING
      )
    ).toEqual({ locked: true, paymentLocked: false });
  });
  it('locks everything on a cancelled group and while the user is unknown', () => {
    expect(groupScreenAccess({ roleName: Roles.MANAGER }, GroupStatus.CANCELLED)).toEqual({
      locked: true,
      paymentLocked: true,
    });
    expect(groupScreenAccess(undefined, GroupStatus.FORMING)).toEqual({
      locked: true,
      paymentLocked: true,
    });
  });
});
