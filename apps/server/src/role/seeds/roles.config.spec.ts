import { Actions, Roles, Subjects } from '@darnozom/shared-types';
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
});
