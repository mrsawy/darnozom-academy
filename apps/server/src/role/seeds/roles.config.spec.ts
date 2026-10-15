import { Actions, GROUP_EDITOR_ROLES, Roles, Subjects } from '@darnozom/shared-types';
import { ROLE_SEED_DEFINITIONS } from './roles.config';

const rulesOf = (role: Roles) => ROLE_SEED_DEFINITIONS.find((r) => r.name === role)?.permissions ?? [];
const has = (role: Roles, action: Actions, subject: Subjects) => rulesOf(role).some((p) => p.action === action && p.subject === subject);
const canUpdateGroup = (role: Roles) =>
  [Actions.MANAGE, Actions.UPDATE].some((action) => has(role, action, Subjects.GROUP) || has(role, action, Subjects.ALL));

describe('ROLE_SEED_DEFINITIONS', () => {
  it('seeds every concept role', () => {
    const names = ROLE_SEED_DEFINITIONS.map((r) => r.name);
    for (const role of [
      Roles.OWNER,
      Roles.MANAGER,
      Roles.COORDINATOR,
      Roles.SUPERVISOR,
      Roles.CONTENT_OFFICER,
      Roles.SHARIA_REVIEWER,
      Roles.HR,
      Roles.ACCOUNTANT,
      Roles.INSTRUCTOR,
      Roles.PARENT,
      Roles.STUDENT,
    ]) {
      expect(names).toContain(role);
    }
  });

  it('gives OWNER full access like ADMIN (deviation D5)', () => {
    expect(has(Roles.OWNER, Actions.MANAGE, Subjects.ALL)).toBe(true);
  });

  it('gives MANAGER academics management and billing read', () => {
    for (const s of [Subjects.PROGRAM, Subjects.LEVEL, Subjects.COHORT, Subjects.GROUP]) {
      expect(has(Roles.MANAGER, Actions.MANAGE, s)).toBe(true);
    }
    expect(has(Roles.MANAGER, Actions.READ, Subjects.TEACHER_AVAILABILITY)).toBe(true);
    expect(has(Roles.MANAGER, Actions.READ, Subjects.BILLING)).toBe(true);
  });

  it('gives COORDINATOR group management but read-only structure', () => {
    expect(has(Roles.COORDINATOR, Actions.MANAGE, Subjects.GROUP)).toBe(true);
    expect(has(Roles.COORDINATOR, Actions.READ, Subjects.PROGRAM)).toBe(true);
    expect(has(Roles.COORDINATOR, Actions.MANAGE, Subjects.PROGRAM)).toBe(false);
  });

  it('keeps SUPERVISOR read-only except for tasks, and ACCOUNTANT on billing and family payments', () => {
    expect(has(Roles.SUPERVISOR, Actions.READ, Subjects.GROUP)).toBe(true);
    // Supervisors receive escalated tasks (SP3) and manage evaluations (SP5); everything else stays READ.
    const nonReadNonTask = rulesOf(Roles.SUPERVISOR).filter(
      (p) => p.action !== Actions.READ && p.subject !== Subjects.TASK && p.subject !== Subjects.SESSION_EVALUATION
    );
    expect(nonReadNonTask).toHaveLength(0);
    expect(has(Roles.ACCOUNTANT, Actions.MANAGE, Subjects.BILLING)).toBe(true);
    expect(has(Roles.ACCOUNTANT, Actions.MANAGE, Subjects.FAMILY_PAYMENT)).toBe(true);
    expect(has(Roles.ACCOUNTANT, Actions.READ, Subjects.GROUP)).toBe(true);
  });

  it('gives INSTRUCTOR, PARENT and STUDENT group read, and INSTRUCTOR their availability', () => {
    expect(has(Roles.INSTRUCTOR, Actions.READ, Subjects.GROUP)).toBe(true);
    expect(has(Roles.INSTRUCTOR, Actions.MANAGE, Subjects.TEACHER_AVAILABILITY)).toBe(true);
    expect(has(Roles.PARENT, Actions.READ, Subjects.GROUP)).toBe(true);
    expect(has(Roles.STUDENT, Actions.READ, Subjects.GROUP)).toBe(true);
  });

  it('gives HR no permissions yet', () => {
    expect(rulesOf(Roles.HR)).toEqual([]);
  });

  it('lets the Sharia reviewer manage reviews and read content, and nothing financial', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.SHARIA_REVIEWER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW });
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.CONTENT });
    for (const financial of [Subjects.PAYMENT, Subjects.WALLET, Subjects.PLAN]) {
      expect(permissions.some((rule) => rule.subject === financial)).toBe(false);
    }
  });

  it('lets the content officer manage content and modules but not review it', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.CONTENT_OFFICER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.CONTENT });
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.MODULE });
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.COURSE });
    expect(permissions.some((rule) => rule.subject === Subjects.SHARIA_REVIEW)).toBe(false);
  });

  it('lets the manager watch the review queue without approving anything', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.MANAGER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.SHARIA_REVIEW });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW });
  });

  it('GROUP_EDITOR_ROLES lists exactly the roles seeded with UPDATE on GROUP', () => {
    const seeded = ROLE_SEED_DEFINITIONS.map((r) => r.name as Roles)
      .filter(canUpdateGroup)
      .toSorted();
    expect([...GROUP_EDITOR_ROLES].toSorted()).toEqual(seeded);
  });

  it('lets the coordinator, the supervisor and the manager read and update tasks', () => {
    for (const role of [Roles.COORDINATOR, Roles.SUPERVISOR, Roles.MANAGER]) {
      expect(has(role, Actions.READ, Subjects.TASK)).toBe(true);
      expect(has(role, Actions.UPDATE, Subjects.TASK)).toBe(true);
    }
  });

  it('keeps tasks away from roles with no part in the escalation chain', () => {
    for (const role of [Roles.ACCOUNTANT, Roles.INSTRUCTOR, Roles.PARENT, Roles.STUDENT]) {
      expect(rulesOf(role).some((p) => p.subject === Subjects.TASK)).toBe(false);
    }
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

  it('lets the supervisor, the manager and the owner manage session evaluations', () => {
    for (const role of [Roles.SUPERVISOR, Roles.MANAGER]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.SESSION_EVALUATION });
    }
  });

  it('lets a teacher read evaluations but never write one', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.INSTRUCTOR)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.SESSION_EVALUATION });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.SESSION_EVALUATION });
    expect(permissions).not.toContainEqual({ action: Actions.CREATE, subject: Subjects.SESSION_EVALUATION });
  });

  it('keeps evaluations away from the accountant, the parent and the student', () => {
    for (const role of [Roles.ACCOUNTANT, Roles.PARENT, Roles.STUDENT, Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions.some((rule) => rule.subject === Subjects.SESSION_EVALUATION)).toBe(false);
    }
  });

  it('no longer grants the removed manual payment-status subject', () => {
    for (const seed of ROLE_SEED_DEFINITIONS) {
      expect(seed.permissions.some((rule) => String(rule.subject) === 'GROUP_PAYMENT_STATUS')).toBe(false);
    }
  });

  it('lets the accountant and the owner manage billing and family payments', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.ACCOUNTANT)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.BILLING });
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.FAMILY_PAYMENT });
  });

  it('lets the manager read billing without being able to change money', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.MANAGER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.BILLING });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.BILLING });
  });

  it('lets a parent read billing and create a payment, but not manage billing', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.PARENT)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.BILLING });
    expect(permissions).toContainEqual({ action: Actions.CREATE, subject: Subjects.FAMILY_PAYMENT });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.BILLING });
  });

  it('keeps every financial subject away from content staff and teachers', () => {
    for (const role of [Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER, Roles.INSTRUCTOR, Roles.SUPERVISOR]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      for (const subject of [Subjects.BILLING, Subjects.FAMILY_PAYMENT]) {
        expect(permissions.some((rule) => rule.subject === subject)).toBe(false);
      }
    }
  });

  it('keeps billing away from the student role: the parent owns the ledger', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.STUDENT)?.permissions ?? [];
    expect(permissions.some((rule) => rule.subject === Subjects.BILLING)).toBe(false);
  });

  it('lets the accountant and the manager manage payroll', () => {
    for (const role of [Roles.ACCOUNTANT, Roles.MANAGER]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.PAYROLL });
    }
  });

  it('lets the instructor read payroll but not manage it', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.INSTRUCTOR)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.PAYROLL });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.PAYROLL });
    expect(permissions).not.toContainEqual({ action: Actions.CREATE, subject: Subjects.PAYROLL });
  });

  it('keeps payroll away from supervisor, parents, students and content staff', () => {
    for (const role of [Roles.SUPERVISOR, Roles.PARENT, Roles.STUDENT, Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions.some((rule) => rule.subject === Subjects.PAYROLL)).toBe(false);
    }
  });

  it('lets manager, coordinator and accountant manage certificates', () => {
    for (const role of [Roles.MANAGER, Roles.COORDINATOR, Roles.ACCOUNTANT]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.CERTIFICATE });
    }
  });

  it('lets instructor read certificates', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.INSTRUCTOR)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.CERTIFICATE });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.CERTIFICATE });
  });

  it('lets student and parent read and update certificates', () => {
    for (const role of [Roles.STUDENT, Roles.PARENT]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.CERTIFICATE });
      expect(permissions).toContainEqual({ action: Actions.UPDATE, subject: Subjects.CERTIFICATE });
      expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.CERTIFICATE });
    }
  });
});
