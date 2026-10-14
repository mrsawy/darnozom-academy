import { Roles, SessionStatus, SUPERVISION_EDIT_WINDOW_HOURS } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { areScoresValid, canEvaluate, isHeldSession, isWithinEditWindow } from './supervision-rules';

const valid = { commitment: 5, teaching: 4, pedagogy: 3, contentAdherence: 2, technicalQuality: 1 };
const actor = (id: string, roleName: Roles, additionalRoles: Roles[] = []) => ({ _id: id, roleName, additionalRoles });

describe('isHeldSession', () => {
  it('accepts a session that has been held', () => {
    expect(isHeldSession(SessionStatus.REPORT_PENDING)).toBe(true);
    expect(isHeldSession(SessionStatus.COMPLETED)).toBe(true);
  });

  it('refuses a session that has not happened yet', () => {
    expect(isHeldSession(SessionStatus.SCHEDULED)).toBe(false);
  });

  it('refuses a cancelled session, which is closed but was never held', () => {
    expect(isHeldSession(SessionStatus.CANCELLED)).toBe(false);
  });
});

describe('areScoresValid', () => {
  it('accepts five integers inside the scale', () => {
    expect(areScoresValid(valid)).toBe(true);
    expect(areScoresValid({ ...valid, commitment: 1 })).toBe(true);
    expect(areScoresValid({ ...valid, commitment: 5 })).toBe(true);
  });

  it('refuses a missing criterion rather than defaulting it', () => {
    const { technicalQuality, ...incomplete } = valid;
    expect(areScoresValid(incomplete)).toBe(false);
  });

  it('refuses a score outside the scale', () => {
    expect(areScoresValid({ ...valid, teaching: 0 })).toBe(false);
    expect(areScoresValid({ ...valid, teaching: 6 })).toBe(false);
    expect(areScoresValid({ ...valid, teaching: -1 })).toBe(false);
  });

  it('refuses a fractional score rather than rounding a judgment about a teacher', () => {
    expect(areScoresValid({ ...valid, pedagogy: 4.5 })).toBe(false);
  });

  it('refuses a score that is not a number', () => {
    expect(areScoresValid({ ...valid, pedagogy: '3' })).toBe(false);
    expect(areScoresValid({ ...valid, pedagogy: null })).toBe(false);
    expect(areScoresValid({ ...valid, pedagogy: Number.NaN })).toBe(false);
  });
});

describe('canEvaluate', () => {
  const supervisorId = new Types.ObjectId();

  it('accepts the group’s own supervisor', () => {
    expect(canEvaluate(actor(String(supervisorId), Roles.SUPERVISOR), { supervisorId })).toBe(true);
  });

  it('refuses a supervisor of some other group', () => {
    expect(canEvaluate(actor(String(new Types.ObjectId()), Roles.SUPERVISOR), { supervisorId })).toBe(false);
  });

  it('accepts a manager or an owner, whichever group it is', () => {
    expect(canEvaluate(actor(String(new Types.ObjectId()), Roles.MANAGER), { supervisorId })).toBe(true);
    expect(canEvaluate(actor(String(new Types.ObjectId()), Roles.OWNER), { supervisorId })).toBe(true);
  });

  it('refuses a teacher, an accountant and a parent', () => {
    for (const role of [Roles.INSTRUCTOR, Roles.ACCOUNTANT, Roles.PARENT]) {
      expect(canEvaluate(actor(String(new Types.ObjectId()), role), { supervisorId })).toBe(false);
    }
  });

  it('refuses everyone when the group has no supervisor, unless they manage', () => {
    expect(canEvaluate(actor(String(supervisorId), Roles.SUPERVISOR), { supervisorId: null })).toBe(false);
    expect(canEvaluate(actor(String(supervisorId), Roles.MANAGER), { supervisorId: null })).toBe(true);
  });
});

describe('isWithinEditWindow', () => {
  const createdAt = new Date('2026-03-01T00:00:00.000Z');

  it('is open immediately after writing', () => {
    expect(isWithinEditWindow(createdAt, new Date('2026-03-01T00:00:01.000Z'))).toBe(true);
  });

  it('is open on the last second of the window', () => {
    const last = new Date(createdAt.getTime() + SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000 - 1000);
    expect(isWithinEditWindow(createdAt, last)).toBe(true);
  });

  it('is closed one second past the window', () => {
    const past = new Date(createdAt.getTime() + SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000 + 1000);
    expect(isWithinEditWindow(createdAt, past)).toBe(false);
  });

  it('measures hours, so a daylight-saving shift cannot lengthen or shorten it', () => {
    // 2026-03-29 is the European DST change; 168 hours from the 26th lands the same either way.
    const beforeDst = new Date('2026-03-26T12:00:00.000Z');
    const exactly = new Date(beforeDst.getTime() + 168 * 3600 * 1000);
    expect(isWithinEditWindow(beforeDst, new Date(exactly.getTime() - 1))).toBe(true);
    expect(isWithinEditWindow(beforeDst, exactly)).toBe(false);
  });
});
