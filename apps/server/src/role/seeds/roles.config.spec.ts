import { Actions, GROUP_EDITOR_ROLES, GROUP_PAYMENT_EDITOR_ROLES, Roles, Subjects } from '@darnozom/shared-types';
import { ROLE_SEED_DEFINITIONS } from './roles.config';

const rulesOf = (role: Roles) => ROLE_SEED_DEFINITIONS.find((r) => r.name === role)?.permissions ?? [];
const has = (role: Roles, action: Actions, subject: Subjects) => rulesOf(role).some((p) => p.action === action && p.subject === subject);

describe('ROLE_SEED_DEFINITIONS', () => {
  it('seeds every concept role', () => {
    const names = ROLE_SEED_DEFINITIONS.map((r) => r.name);
    for (const role of [
      Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR, Roles.CONTENT_OFFICER,
      Roles.SHARIA_REVIEWER, Roles.HR, Roles.ACCOUNTANT, Roles.INSTRUCTOR, Roles.PARENT, Roles.STUDENT,
    ]) {
      expect(names).toContain(role);
    }
  });

  it('gives OWNER full access like ADMIN (deviation D5)', () => {
    expect(has(Roles.OWNER, Actions.MANAGE, Subjects.ALL)).toBe(true);
  });

  it('gives MANAGER academics management', () => {
    for (const s of [Subjects.PROGRAM, Subjects.LEVEL, Subjects.COHORT, Subjects.GROUP, Subjects.GROUP_PAYMENT_STATUS]) {
      expect(has(Roles.MANAGER, Actions.MANAGE, s)).toBe(true);
    }
    expect(has(Roles.MANAGER, Actions.READ, Subjects.TEACHER_AVAILABILITY)).toBe(true);
  });

  it('gives COORDINATOR group management but read-only structure', () => {
    expect(has(Roles.COORDINATOR, Actions.MANAGE, Subjects.GROUP)).toBe(true);
    expect(has(Roles.COORDINATOR, Actions.READ, Subjects.PROGRAM)).toBe(true);
    expect(has(Roles.COORDINATOR, Actions.MANAGE, Subjects.PROGRAM)).toBe(false);
    expect(has(Roles.COORDINATOR, Actions.MANAGE, Subjects.GROUP_PAYMENT_STATUS)).toBe(false);
  });

  it('keeps SUPERVISOR read-only and ACCOUNTANT on payment status', () => {
    expect(has(Roles.SUPERVISOR, Actions.READ, Subjects.GROUP)).toBe(true);
    expect(rulesOf(Roles.SUPERVISOR).some((p) => p.action !== Actions.READ)).toBe(false);
    expect(has(Roles.ACCOUNTANT, Actions.MANAGE, Subjects.GROUP_PAYMENT_STATUS)).toBe(true);
    expect(has(Roles.ACCOUNTANT, Actions.READ, Subjects.GROUP)).toBe(true);
  });

  it('gives INSTRUCTOR, PARENT and STUDENT group read, and INSTRUCTOR their availability', () => {
    expect(has(Roles.INSTRUCTOR, Actions.READ, Subjects.GROUP)).toBe(true);
    expect(has(Roles.INSTRUCTOR, Actions.MANAGE, Subjects.TEACHER_AVAILABILITY)).toBe(true);
    expect(has(Roles.PARENT, Actions.READ, Subjects.GROUP)).toBe(true);
    expect(has(Roles.STUDENT, Actions.READ, Subjects.GROUP)).toBe(true);
  });

  it('gives CONTENT_OFFICER, SHARIA_REVIEWER and HR no permissions yet', () => {
    expect(rulesOf(Roles.CONTENT_OFFICER)).toEqual([]);
    expect(rulesOf(Roles.SHARIA_REVIEWER)).toEqual([]);
    expect(rulesOf(Roles.HR)).toEqual([]);
  });

  it.each([
    ['GROUP_EDITOR_ROLES', GROUP_EDITOR_ROLES, Subjects.GROUP],
    ['GROUP_PAYMENT_EDITOR_ROLES', GROUP_PAYMENT_EDITOR_ROLES, Subjects.GROUP_PAYMENT_STATUS],
  ] as const)('%s lists exactly the roles seeded with UPDATE on its subject', (_name, roles, subject) => {
    const canUpdate = (role: Roles) =>
      [Actions.MANAGE, Actions.UPDATE].some((action) => has(role, action, subject) || has(role, action, Subjects.ALL));
    const seeded = ROLE_SEED_DEFINITIONS.map((r) => r.name as Roles).filter(canUpdate).sort();
    expect([...roles].sort()).toEqual(seeded);
  });

  it('seeds SESSION permissions: teachers update, staff manage, others read', () => {
    expect(has(Roles.INSTRUCTOR, Actions.READ, Subjects.SESSION)).toBe(true);
    expect(has(Roles.INSTRUCTOR, Actions.UPDATE, Subjects.SESSION)).toBe(true);
    expect(has(Roles.COORDINATOR, Actions.MANAGE, Subjects.SESSION)).toBe(true);
    expect(has(Roles.MANAGER, Actions.MANAGE, Subjects.SESSION)).toBe(true);
    for (const role of [Roles.SUPERVISOR, Roles.ACCOUNTANT, Roles.PARENT, Roles.STUDENT]) {
      expect({ role, read: has(role, Actions.READ, Subjects.SESSION) }).toEqual({ role, read: true });
      expect({ role, update: has(role, Actions.UPDATE, Subjects.SESSION) }).toEqual({ role, update: false });
    }
    expect(has(Roles.CONTENT_OFFICER, Actions.READ, Subjects.SESSION)).toBe(false);
  });
});
