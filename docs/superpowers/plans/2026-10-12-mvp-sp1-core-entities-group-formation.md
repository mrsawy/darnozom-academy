# MVP Sub-project 1: Core Entities & Group Formation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An academy can define Program → Course → Level → Cohort → Group and form a group:
- add students and track their payment and WhatsApp status
- assign a teacher whose availability fits and who has no time conflict
- move the group to READY_TO_START only when the 5-item readiness checklist is complete

**Architecture:**
- **Server:** a new NestJS `academics` module (MongoDB/Mongoose), exposed only through NATS message patterns, because that is how the Next.js client talks to the server. All business rules live in pure functions with thorough unit tests: readiness, status transitions, schedule validation, teacher fit and read scope. Services are thin: they load data, call the rules, and persist with atomic updates.
- **Multiple roles:** an `additionalRoles` array on `User`. The CASL ability factory takes the union of permissions from all of a user's roles.
- **Client:** new pages in the existing dashboards, built with the existing react-query hooks → server actions → NATS pattern.

**Tech Stack:** NestJS 11, Mongoose 8, CASL 6, luxon 3.7.2, Jest 29 (server), Next.js 16, next-intl, @tanstack/react-query, Vitest 2 + Testing Library (client and shared-types), pnpm + Nx monorepo.

**Spec:** `docs/superpowers/specs/2026-10-11-mvp-sp1-core-entities-group-formation-design.md`

## Global Constraints

- **Scope rule (from the spec):** nothing outside the concept document's MVP scope. No hiring pipeline, no course approval workflow, and no group states beyond `FORMING`, `READY_TO_START` and `CANCELLED`.
- **Readiness:** exactly 5 items: `TEACHER_ASSIGNED`, `MINIMUM_STUDENTS`, `PAYMENTS_MADE`, `CONTENT_SENT`, `MEETING_LINK`. All are mandatory and computed, never stored.
- **Organization scoping:** every new document has a required `organizationId`. Every query filters by the actor's `organizationId`; the PARENT/STUDENT scopes filter by membership instead.
- **User-facing errors:** use `AcademicsErrors` keys from `@darnozom/shared-types`, with `errors.<key>` in **both** `apps/client/messages/en.json` and `ar.json`. Never hard-code English in an exception.
- **Client ↔ server:** NATS message patterns only (`createAuthorizedNatsRequest`). Do not add HTTP controllers.
- **Permissions:** `@RequirePermissionsGuard({ action, subject })` with a concrete action (`CREATE`/`READ`/`UPDATE`/`DELETE`). The CASL factory expands `MANAGE` into concrete actions and never grants `MANAGE` itself, so never *require* `Actions.MANAGE`.
- **Soft delete:** `deletedAt`/`deletedById` through `src/utils/soft-delete` (`withNotDeletedFilter`, `buildSoftDeleteSet`, `applySoftDeleteMiddleware`).
- **Time:** `dayOfWeek` is 0 = Sunday … 6 = Saturday. `startTime` is `"HH:mm"` (24 h). Availability `endTime` may also be `"24:00"`. Timezones are IANA names. All conversions use luxon (already a server dependency).
- **Dependencies:** none new.
- **UI strings:** English and Arabic for every one.
- **Type-check baseline:** server and client `tsc` already have pre-existing errors. Task 1 Step 1 saves the baselines, and every later tsc check must show **no errors beyond the baseline**.
- **Bracketed paths on the command line:** paths that contain `[locale]` or `(dashboard)` are always quoted. If ESLint answers "No files matching the pattern", escape the brackets (`src/app/\[locale\]/\(dashboard\)/...`). Vitest commands in this plan filter by file name (e.g. `vitest run readiness-panel`) to avoid this problem.
- **Shared-types builds:** server Jest maps `@darnozom/shared-types` to its source, so server tests need no rebuild. The client and the server dev build use `lib/shared-types/dist`, so run `pnpm --filter @darnozom/shared-types run build` after changing shared-types and before any client step.

## Deviations from the spec (decided while planning, reported to the user)

| ID | Spec says | Plan does | Why |
|---|---|---|---|
| D1 | §6: HTTP endpoints | NATS message patterns `academics.*` | The client talks only through NATS (`createAuthorizedNatsRequest`); HTTP routes would be unused. |
| D2 | §3.3: every staff rule carries `OWN_ORG` | Organization scoping in service queries | `RolePermissionRule` has no `conditions` field, and the existing seeds scope in services. |
| D3 | §4.2: the course DTOs accept `programId` | `academics.programs.linkCourse` / `unlinkCourse` | Leaves the large course service untouched, and the program page is where linking happens. |
| D4 | §3.2: the existing user update endpoint accepts `additionalRoles` | A dedicated `users.setAdditionalRoles` pattern | The generic `users.organizationUpdateUser` has no role validation or permission check. |
| D5 | §3.3: OWNER gets academics subjects only | OWNER = `MANAGE ALL`, like ADMIN | The approved brainstorm (Section 1) said "Owner: everything in the org"; an owner unable to manage users or courses can't run the academy. |
| D6 | §4.6: availability slots never cross midnight | Kept, plus `endTime` may be `"24:00"` and adjacent slots are merged | Otherwise no teacher could ever be assigned to a group that runs across midnight (e.g. 23:30 + 60 min). |
| D7 | §8: cross-timezone test uses `Africa/Cairo` | Uses `Asia/Riyadh` (no DST) | Gives fixed expected UTC values; DST is covered by its own test. |
| D8 | §5.2/§5.4: the `409` lists missing items or reasons | `GROUP_NOT_READY` and `TEACHER_NOT_ASSIGNABLE` carry the key only; `AVAILABILITY_CONFLICTS_WITH_GROUPS` carries the group names as `key\|names` | The readiness panel and the teacher-candidate picker already show the items and reasons; group names are the only detail the UI doesn't have. |
| D10 | §7: the groups list filters by cohort, status and teacher | Cohort (from the program page link) and status only | Sub-project 1 has no endpoint for staff to list teachers outside a group context; the teacher filter is not needed for group formation. `GroupQuery`/`FindGroupsPayload` already accept `teacherId`, so adding it later is UI-only. |
| D9 | §5.6: parents and students read the group | They also get only their own (children's) `students` entries and an empty `statusHistory`; `findOne` adds `people` display names | Otherwise a parent would see every other child's payment status, which breaks the concept rule "Parents see only their own children". The formation screen needs names, and a group stores only ids. |

## Review Focus

1. **Two coordinators add the last free seat at the same moment.** The group must never exceed `maxStudents`: the add is one conditional `updateOne` with a `$size < maxStudents` guard. Test: Task 10, "rejects when the conditional push matches nothing because the group is full".
2. **A group slot crossing local midnight** (Saturday 23:30 + 60 min, or Monday 23:30 + 60 min) must be judged correctly against availability split over two days. Test: Task 7, "fits a slot that crosses midnight when availability is split at 24:00 / 00:00".
3. **Student search text with regex characters** (`a.*`, `(`, `+`) must be matched literally and must never throw. Test: Task 10, "escapes regex characters in the search text".
4. **A parent sending another family's `childId`** gets `ParentErrors.CHILD_NOT_LINKED`, never data. Test: Task 9, "parent filtering by a child that is not theirs is rejected".
5. **A parent opens a child's group.** The response must not reveal other children's payment or WhatsApp status, or the status history. Test: Task 9, "parents only see their own children entries and no status history". The missing-role-document crash is covered separately by Task 2, "ignores missing additional role documents".

## File Structure

**Shared types (`lib/shared-types/src/lib/`)**
- `types/role/role/roles.enum.ts`: modify (8 roles added or enabled)
- `types/role/role/role-helpers.ts` (+ `.spec.ts`): `hasRole`, `hasAnyRole`, `ADDITIONAL_ROLE_OPTIONS`, `ORG_WIDE_GROUP_READER_ROLES`, `getAdditionalRolesViolation`
- `types/role/subject/subjects.enum.ts`: modify (6 subjects)
- `types/academics/academics.types.ts`, `types/academics/index.ts`: enums and interfaces shared with the client
- `messages/academics-errors.enum.ts`: `AcademicsErrors`, `AcademicsSuccessMessages`

**Server (`apps/server/src/`)**
- `user/entities/user.entity.ts`: `additionalRoles` field plus the `additionalRoleDocs` virtual
- `auth/constants/user-populate.constant.ts`: populate `additionalRoleDocs`
- `role/permissions.factory.ts`: union of permissions
- `role/seeds/role.{owner,manager,coordinator,supervisor,accountant,content-officer,sharia-reviewer,hr}.config.ts`: new; `role.{instructor,parent,student}.config.ts` and `roles.config.ts` modified
- `role/enum/Roles.enum.ts`: delete; `user/services/instructor.service.ts`: fix its import
- `user/services/user.service.ts`: `roleCounts`, `setAdditionalRoles`; `user/controllers/message/user.controller.message.ts`: the `users.setAdditionalRoles` pattern
- `academics/academics.module.ts`: registers everything below
- `academics/common/`:
  - `actor.ts`: an `AcademicsActor` built from the NATS context
  - `mock-query.ts`: test helper
  - `escape-regex.ts`
- `academics/domain/` (pure, each with `.spec.ts`):
  - `time.ts`: parsing and validation for `HH:mm`, schedules and availability slots
  - `readiness.ts`
  - `group-status.ts`: transitions
  - `teacher-fit.ts`: UTC minutes-of-week, containment, conflicts
  - `group-scope.ts`
- `academics/program/`, `academics/level/`, `academics/cohort/`, `academics/teacher-availability/`, `academics/group/`. Each has:
  - `entities/*.entity.ts`
  - `dto/*.dto.ts`
  - `*.service.ts` + `.spec.ts`
  - `*.controller.message.ts`

  The group module also has `group-students.service.ts` and `group-teacher.service.ts`.
- `course/entities/course.entity.ts`: `programId`
- `app.module.ts`: import `AcademicsModule`

**Client (`apps/client/`)**
- `messages/en.json`, `messages/ar.json`: role labels, `errors.*`, `Academics` namespace, `OrgSidebar` keys
- `src/lib/utils/errors/translateApiMessage.ts`: `AVAILABILITY_CONFLICTS_WITH_GROUPS` parameter
- `src/lib/types/user/user.interface.ts`: `additionalRoles`
- `src/lib/types/academics/academics.ts`: client types
- `src/lib/actions/academics/*.action.ts`, `src/lib/hooks/academics/*.hook.ts`
- `src/lib/data/constants/routes.constants.ts`: academics routes
- `src/app/[locale]/(dashboard)/organization-dashboard/`:
  - `data.ts`: nav entries
  - `__components/filter-nav.ts` (+ test)
  - `__components/OrgSidebar.tsx`
  - `academics/programs/**`, `academics/groups/**`, `my-availability/**`, `my-groups/**`
  - `users/[id]/__components/additional-roles-card.tsx`
- `parent-dashboard/children/__components/child-groups.tsx`, `student-dashboard/my-groups/page.tsx`

---

### Task 1: Shared types: roles, subjects, academics enums, error keys

**Files:**
- Modify: `lib/shared-types/src/lib/types/role/role/roles.enum.ts`
- Create: `lib/shared-types/src/lib/types/role/role/role-helpers.ts`
- Test: `lib/shared-types/src/lib/types/role/role/role-helpers.spec.ts`
- Modify: `lib/shared-types/src/lib/types/role/index.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Create: `lib/shared-types/src/lib/types/academics/academics.types.ts`, `lib/shared-types/src/lib/types/academics/index.ts`
- Modify: `lib/shared-types/src/lib/types/index.ts`
- Create: `lib/shared-types/src/lib/messages/academics-errors.enum.ts`
- Modify: `lib/shared-types/src/lib/messages/index.ts`
- Modify: `apps/server/src/user/services/user.service.ts` (the `roleCounts` literal, around line 277)
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json`
- Modify: `apps/client/src/lib/utils/errors/translateApiMessage.ts`

**Interfaces:**
- Produces:
  - `Roles.{MANAGER, OWNER, COORDINATOR, SUPERVISOR, CONTENT_OFFICER, SHARIA_REVIEWER, HR, ACCOUNTANT}`
  - `interface RoleHolder { roleName: Roles | string; additionalRoles?: readonly (Roles | string)[] | null }`
  - `hasRole(user: RoleHolder | null | undefined, role: Roles): boolean`
  - `hasAnyRole(user: RoleHolder | null | undefined, roles: readonly Roles[]): boolean`
  - `ADDITIONAL_ROLE_OPTIONS: readonly Roles[]`, `ORG_WIDE_GROUP_READER_ROLES: readonly Roles[]`
  - `getAdditionalRolesViolation(roleName: string, additionalRoles: readonly string[]): AdditionalRolesViolation | null`
  - `Subjects.{PROGRAM, LEVEL, COHORT, GROUP, TEACHER_AVAILABILITY, GROUP_PAYMENT_STATUS}`
  - `GroupStatus`, `GroupPaymentStatus`, `ReadinessKey`, `TeacherFitReason`
  - `ScheduleSlot`, `AvailabilitySlot`, `ReadinessItem`, `Readiness`
  - `AcademicsErrors`, `AcademicsSuccessMessages`

- [ ] **Step 1: Save type-check baselines (before any change)**

Run from the repo root:
```bash
mkdir -p .superpowers
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-baseline-server.txt 2>&1; echo "exit $?"
pnpm --filter client run tsc --noEmit -p tsconfig.json > .superpowers/tsc-baseline-client.txt 2>&1; echo "exit $?"
grep -c "error TS" .superpowers/tsc-baseline-server.txt .superpowers/tsc-baseline-client.txt
```
Expected: two counts are printed. Note them; later tsc runs compare against these files. A non-zero count is fine, because the errors already exist.

- [ ] **Step 2: Write the failing test**

Create `lib/shared-types/src/lib/types/role/role/role-helpers.spec.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { Roles } from './roles.enum';
import { ADDITIONAL_ROLE_OPTIONS, getAdditionalRolesViolation, hasAnyRole, hasRole, ORG_WIDE_GROUP_READER_ROLES } from './role-helpers';

describe('hasRole', () => {
  it('matches the primary role', () => {
    expect(hasRole({ roleName: Roles.COORDINATOR }, Roles.COORDINATOR)).toBe(true);
  });
  it('matches an additional role', () => {
    expect(hasRole({ roleName: Roles.COORDINATOR, additionalRoles: [Roles.INSTRUCTOR] }, Roles.INSTRUCTOR)).toBe(true);
  });
  it('is false for a role the user does not hold', () => {
    expect(hasRole({ roleName: Roles.COORDINATOR, additionalRoles: [] }, Roles.ACCOUNTANT)).toBe(false);
  });
  it('is false for null/undefined users and null additionalRoles', () => {
    expect(hasRole(null, Roles.ADMIN)).toBe(false);
    expect(hasRole(undefined, Roles.ADMIN)).toBe(false);
    expect(hasRole({ roleName: Roles.ADMIN, additionalRoles: null }, Roles.INSTRUCTOR)).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('is true when one of the roles matches', () => {
    expect(hasAnyRole({ roleName: Roles.STUDENT }, [Roles.PARENT, Roles.STUDENT])).toBe(true);
  });
  it('is false when none match', () => {
    expect(hasAnyRole({ roleName: Roles.STUDENT }, ORG_WIDE_GROUP_READER_ROLES)).toBe(false);
  });
});

describe('getAdditionalRolesViolation', () => {
  it('accepts an empty list for any primary role', () => {
    expect(getAdditionalRolesViolation(Roles.STUDENT, [])).toBeNull();
  });
  it('accepts staff roles plus INSTRUCTOR on a staff primary role', () => {
    expect(getAdditionalRolesViolation(Roles.COORDINATOR, [Roles.INSTRUCTOR, Roles.SUPERVISOR])).toBeNull();
  });
  it('rejects any additional role for STUDENT and PARENT', () => {
    expect(getAdditionalRolesViolation(Roles.STUDENT, [Roles.INSTRUCTOR])).toBe('NOT_ALLOWED_FOR_PRIMARY_ROLE');
    expect(getAdditionalRolesViolation(Roles.PARENT, [Roles.ACCOUNTANT])).toBe('NOT_ALLOWED_FOR_PRIMARY_ROLE');
  });
  it('rejects duplicates', () => {
    expect(getAdditionalRolesViolation(Roles.ADMIN, [Roles.HR, Roles.HR])).toBe('DUPLICATE_ROLE');
  });
  it('rejects repeating the primary role', () => {
    expect(getAdditionalRolesViolation(Roles.MANAGER, [Roles.MANAGER])).toBe('PRIMARY_ROLE_REPEATED');
  });
  it('rejects roles outside ADDITIONAL_ROLE_OPTIONS', () => {
    expect(getAdditionalRolesViolation(Roles.MANAGER, [Roles.PLATFORM_ADMIN])).toBe('ROLE_NOT_ALLOWED');
    expect(getAdditionalRolesViolation(Roles.MANAGER, ['NOT_A_ROLE'])).toBe('ROLE_NOT_ALLOWED');
  });
  it('lists exactly the 8 staff roles plus INSTRUCTOR as options', () => {
    expect([...ADDITIONAL_ROLE_OPTIONS].sort()).toEqual(
      [Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR, Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER, Roles.HR, Roles.ACCOUNTANT, Roles.INSTRUCTOR].sort()
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @darnozom/shared-types exec vitest run src/lib/types/role/role/role-helpers.spec.ts`
Expected: FAIL, with `Failed to resolve import "./role-helpers"`.

- [ ] **Step 4: Implement the roles and helpers**

Replace the whole of `lib/shared-types/src/lib/types/role/role/roles.enum.ts` with:
```ts
export enum Roles {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  MANAGER = 'MANAGER',
  SECRETARY = 'SECRETARY',
  GUEST = 'GUEST',
  OWNER = 'OWNER',
  COORDINATOR = 'COORDINATOR',
  SUPERVISOR = 'SUPERVISOR',
  CONTENT_OFFICER = 'CONTENT_OFFICER',
  SHARIA_REVIEWER = 'SHARIA_REVIEWER',
  HR = 'HR',
  ACCOUNTANT = 'ACCOUNTANT',
}
```

Create `lib/shared-types/src/lib/types/role/role/role-helpers.ts`:
```ts
import { Roles } from './roles.enum';

export interface RoleHolder {
  roleName: Roles | string;
  additionalRoles?: readonly (Roles | string)[] | null;
}

/** Roles that may appear in User.additionalRoles (staff roles + INSTRUCTOR). */
export const ADDITIONAL_ROLE_OPTIONS: readonly Roles[] = [
  Roles.OWNER,
  Roles.MANAGER,
  Roles.COORDINATOR,
  Roles.SUPERVISOR,
  Roles.CONTENT_OFFICER,
  Roles.SHARIA_REVIEWER,
  Roles.HR,
  Roles.ACCOUNTANT,
  Roles.INSTRUCTOR,
];

/** Holders of any of these roles read every group in their organization. */
export const ORG_WIDE_GROUP_READER_ROLES: readonly Roles[] = [
  Roles.SUPER_ADMIN,
  Roles.ADMIN,
  Roles.OWNER,
  Roles.MANAGER,
  Roles.COORDINATOR,
  Roles.SUPERVISOR,
  Roles.ACCOUNTANT,
];

export function hasRole(user: RoleHolder | null | undefined, role: Roles): boolean {
  if (!user) return false;
  return user.roleName === role || (user.additionalRoles ?? []).includes(role);
}

export function hasAnyRole(user: RoleHolder | null | undefined, roles: readonly Roles[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

export type AdditionalRolesViolation = 'NOT_ALLOWED_FOR_PRIMARY_ROLE' | 'DUPLICATE_ROLE' | 'PRIMARY_ROLE_REPEATED' | 'ROLE_NOT_ALLOWED';

export function getAdditionalRolesViolation(roleName: string, additionalRoles: readonly string[]): AdditionalRolesViolation | null {
  if (additionalRoles.length === 0) return null;
  if (roleName === Roles.STUDENT || roleName === Roles.PARENT) return 'NOT_ALLOWED_FOR_PRIMARY_ROLE';
  if (new Set(additionalRoles).size !== additionalRoles.length) return 'DUPLICATE_ROLE';
  if (additionalRoles.includes(roleName)) return 'PRIMARY_ROLE_REPEATED';
  const allowed = ADDITIONAL_ROLE_OPTIONS as readonly string[];
  if (additionalRoles.some((role) => !allowed.includes(role))) return 'ROLE_NOT_ALLOWED';
  return null;
}
```

In `lib/shared-types/src/lib/types/role/index.ts`, add a line after `export * from './role/roles.enum';`:
```ts
export * from './role/role-helpers';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @darnozom/shared-types exec vitest run src/lib/types/role/role/role-helpers.spec.ts`
Expected: PASS, 12 tests.

- [ ] **Step 6: Add subjects, academics types and error keys**

In `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`, insert these lines immediately before `ALL = '*',`:
```ts
  PROGRAM = 'PROGRAM',
  LEVEL = 'LEVEL',
  COHORT = 'COHORT',
  GROUP = 'GROUP',
  TEACHER_AVAILABILITY = 'TEACHER_AVAILABILITY',
  GROUP_PAYMENT_STATUS = 'GROUP_PAYMENT_STATUS',
```

Create `lib/shared-types/src/lib/types/academics/academics.types.ts`:
```ts
export enum GroupStatus {
  FORMING = 'FORMING',
  READY_TO_START = 'READY_TO_START',
  CANCELLED = 'CANCELLED',
}

export enum GroupPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export enum ReadinessKey {
  TEACHER_ASSIGNED = 'TEACHER_ASSIGNED',
  MINIMUM_STUDENTS = 'MINIMUM_STUDENTS',
  PAYMENTS_MADE = 'PAYMENTS_MADE',
  CONTENT_SENT = 'CONTENT_SENT',
  MEETING_LINK = 'MEETING_LINK',
}

export enum TeacherFitReason {
  NOT_INSTRUCTOR = 'NOT_INSTRUCTOR',
  NO_AVAILABILITY = 'NO_AVAILABILITY',
  OUTSIDE_AVAILABILITY = 'OUTSIDE_AVAILABILITY',
  CONFLICT = 'CONFLICT',
}

/** statusHistory reason used when the system reverts READY_TO_START → FORMING. */
export const READINESS_LOST_REASON = 'READINESS_LOST';

/** One weekly meeting of a group. dayOfWeek: 0 = Sunday … 6 = Saturday; startTime "HH:mm". */
export interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
}

/** One weekly availability window. endTime "HH:mm" or "24:00"; endTime > startTime. */
export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ReadinessItem {
  key: ReadinessKey;
  done: boolean;
}

export interface Readiness {
  ready: boolean;
  items: ReadinessItem[];
}
```

Create `lib/shared-types/src/lib/types/academics/index.ts`:
```ts
export * from './academics.types';
```

In `lib/shared-types/src/lib/types/index.ts`, append:
```ts
export * from './academics/index';
```

Create `lib/shared-types/src/lib/messages/academics-errors.enum.ts`:
```ts
/**
 * Academics (programs, levels, cohorts, groups, teacher availability) message keys.
 */
export enum AcademicsErrors {
  PROGRAM_NOT_FOUND = 'programNotFound',
  PROGRAM_NAME_ALREADY_EXISTS = 'programNameAlreadyExists',
  LEVEL_NOT_FOUND = 'levelNotFound',
  LEVEL_ORDER_ALREADY_EXISTS = 'levelOrderAlreadyExists',
  COHORT_NOT_FOUND = 'cohortNotFound',
  COURSE_NOT_FOUND_IN_ORGANIZATION = 'courseNotFoundInOrganization',
  HAS_DEPENDENTS = 'academicsHasDependents',
  GROUP_NOT_FOUND = 'groupNotFound',
  GROUP_NOT_READY = 'groupNotReady',
  GROUP_CANCELLED = 'groupCancelled',
  GROUP_DELETE_NOT_ALLOWED = 'groupDeleteNotAllowed',
  INVALID_STATUS_TRANSITION = 'invalidGroupStatusTransition',
  CANCEL_REASON_REQUIRED = 'cancelReasonRequired',
  INVALID_SCHEDULE = 'invalidGroupSchedule',
  INVALID_STUDENT_LIMITS = 'invalidStudentLimits',
  STUDENT_NOT_FOUND_IN_ORGANIZATION = 'studentNotFoundInOrganization',
  STUDENT_ALREADY_IN_GROUP = 'studentAlreadyInGroup',
  STUDENT_NOT_IN_GROUP = 'studentNotInGroup',
  GROUP_FULL = 'groupFull',
  TEACHER_NOT_FOUND_IN_ORGANIZATION = 'teacherNotFoundInOrganization',
  TEACHER_NOT_ASSIGNABLE = 'teacherNotAssignable',
  INVALID_AVAILABILITY = 'invalidTeacherAvailability',
  AVAILABILITY_CONFLICTS_WITH_GROUPS = 'availabilityConflictsWithGroups',
  NOT_AN_INSTRUCTOR = 'notAnInstructor',
  ADDITIONAL_ROLES_INVALID = 'additionalRolesInvalid',
  USER_NOT_FOUND_IN_ORGANIZATION = 'userNotFoundInOrganization',
}

export enum AcademicsSuccessMessages {
  DELETED = 'academicsDeletedSuccessfully',
}
```

In `lib/shared-types/src/lib/messages/index.ts`:
- after `export * from './payment-errors.enum';` add `export * from './academics-errors.enum';`
- after `import { PaymentErrors } from './payment-errors.enum';` add `import { AcademicsErrors, AcademicsSuccessMessages } from './academics-errors.enum';`
- inside `ALL_ERROR_KEYS`, after `...Object.values(PaymentErrors),` add:
```ts
  ...Object.values(AcademicsErrors),
  ...Object.values(AcademicsSuccessMessages),
```

- [ ] **Step 7: Build shared-types**

Run: `pnpm --filter @darnozom/shared-types run build`
Expected: exits 0.

- [ ] **Step 8: Fix the exhaustive `Record<Roles, number>` in the server**

In `apps/server/src/user/services/user.service.ts`, the `roleCounts` literal (around line 277) must list every role. Replace it with:
```ts
    const roleCounts = Object.fromEntries(Object.values(Roles).map((role) => [role, 0])) as Record<Roles, number>;
```

Run:
```bash
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task1-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task1-server.txt | sort)
```
Expected: no `>` lines (no new errors).

- [ ] **Step 9: Translations (role labels, error keys) and the parameterized message**

In `apps/client/messages/en.json`, find every object that contains `"SECRETARY": "Secretary"`. There are 3 (`grep -n '"SECRETARY"' apps/client/messages/en.json`). Add these keys right after `"SECRETARY"` in each one; add `"MANAGER"` only where that object doesn't already have it:
```json
"MANAGER": "Academy manager",
"OWNER": "Owner",
"COORDINATOR": "Coordinator",
"SUPERVISOR": "Supervisor",
"CONTENT_OFFICER": "Content officer",
"SHARIA_REVIEWER": "Sharia reviewer",
"HR": "HR officer",
"ACCOUNTANT": "Accountant",
```
Do the same in `apps/client/messages/ar.json` (find the objects with `grep -n '"SECRETARY"' apps/client/messages/ar.json`):
```json
"MANAGER": "مدير الأكاديمية",
"OWNER": "المالك",
"COORDINATOR": "المنسق الإداري",
"SUPERVISOR": "المشرف التربوي",
"CONTENT_OFFICER": "مسؤول المحتوى",
"SHARIA_REVIEWER": "المراجع الشرعي",
"HR": "مسؤول الموارد البشرية",
"ACCOUNTANT": "المحاسب",
```

Add these keys to the **root** `"errors"` object in `en.json` (the top-level key, `grep -n '^  "errors"' apps/client/messages/en.json`):
```json
"programNotFound": "Program not found.",
"programNameAlreadyExists": "A program with this name already exists.",
"levelNotFound": "Level not found.",
"levelOrderAlreadyExists": "This course already has a level with that order.",
"cohortNotFound": "Cohort not found.",
"courseNotFoundInOrganization": "Course not found in your academy.",
"academicsHasDependents": "This item cannot be deleted because other items still depend on it.",
"groupNotFound": "Group not found.",
"groupNotReady": "The group is not ready yet. Complete every readiness item first.",
"groupCancelled": "This group is cancelled and can no longer be changed.",
"groupDeleteNotAllowed": "Only forming or cancelled groups can be deleted.",
"invalidGroupStatusTransition": "This status change is not allowed.",
"cancelReasonRequired": "Please enter a reason for cancelling.",
"invalidGroupSchedule": "The schedule is invalid. Check the days, times, durations and overlaps.",
"invalidStudentLimits": "Student limits are invalid. The minimum must be at least 1, the maximum must not be below the minimum or the current number of students.",
"studentNotFoundInOrganization": "Student not found in your academy.",
"studentAlreadyInGroup": "This student is already in the group.",
"studentNotInGroup": "This student is not in the group.",
"groupFull": "The group is full.",
"teacherNotFoundInOrganization": "Teacher not found in your academy.",
"teacherNotAssignable": "This teacher cannot be assigned to this group. Check availability and schedule conflicts.",
"invalidTeacherAvailability": "The availability is invalid. Check the days, times and overlaps.",
"availabilityConflictsWithGroups": "This availability no longer covers these groups: {details}",
"notAnInstructor": "Only teachers can do this.",
"additionalRolesInvalid": "These additional roles are not allowed for this user.",
"userNotFoundInOrganization": "User not found in your academy.",
"academicsDeletedSuccessfully": "Deleted successfully."
```
And the same keys in the root `"errors"` object in `ar.json`:
```json
"programNotFound": "البرنامج غير موجود.",
"programNameAlreadyExists": "يوجد برنامج بهذا الاسم بالفعل.",
"levelNotFound": "المستوى غير موجود.",
"levelOrderAlreadyExists": "توجد في هذه الدورة مستوى بنفس الترتيب.",
"cohortNotFound": "الدفعة غير موجودة.",
"courseNotFoundInOrganization": "الدورة غير موجودة في أكاديميتك.",
"academicsHasDependents": "لا يمكن حذف هذا العنصر لوجود عناصر أخرى مرتبطة به.",
"groupNotFound": "المجموعة غير موجودة.",
"groupNotReady": "المجموعة ليست جاهزة بعد. أكمل جميع بنود الجاهزية أولًا.",
"groupCancelled": "هذه المجموعة ملغاة ولا يمكن تعديلها.",
"groupDeleteNotAllowed": "لا يمكن حذف إلا المجموعات قيد التشكيل أو الملغاة.",
"invalidGroupStatusTransition": "تغيير الحالة هذا غير مسموح.",
"cancelReasonRequired": "يرجى كتابة سبب الإلغاء.",
"invalidGroupSchedule": "الجدول غير صالح. تحقق من الأيام والأوقات والمدد والتداخلات.",
"invalidStudentLimits": "حدود الطلاب غير صالحة. يجب ألا يقل الحد الأدنى عن 1، وألا يقل الحد الأقصى عن الحد الأدنى أو عن عدد الطلاب الحالي.",
"studentNotFoundInOrganization": "الطالب غير موجود في أكاديميتك.",
"studentAlreadyInGroup": "هذا الطالب موجود في المجموعة بالفعل.",
"studentNotInGroup": "هذا الطالب ليس في المجموعة.",
"groupFull": "المجموعة مكتملة.",
"teacherNotFoundInOrganization": "المعلم غير موجود في أكاديميتك.",
"teacherNotAssignable": "لا يمكن تعيين هذا المعلم لهذه المجموعة. تحقق من أوقات التوفر وتعارض المواعيد.",
"invalidTeacherAvailability": "أوقات التوفر غير صالحة. تحقق من الأيام والأوقات والتداخلات.",
"availabilityConflictsWithGroups": "أوقات التوفر هذه لم تعد تغطي المجموعات التالية: {details}",
"notAnInstructor": "هذا الإجراء متاح للمعلمين فقط.",
"additionalRolesInvalid": "هذه الأدوار الإضافية غير مسموحة لهذا المستخدم.",
"userNotFoundInOrganization": "المستخدم غير موجود في أكاديميتك.",
"academicsDeletedSuccessfully": "تم الحذف بنجاح."
```

In `apps/client/src/lib/utils/errors/translateApiMessage.ts`:
- add `AcademicsErrors,` to the import list from `@darnozom/shared-types`
- insert this immediately before `const errorKey = key as VerificationErrors | AuthErrors;`:
```ts
  if ((key as AcademicsErrors) === AcademicsErrors.AVAILABILITY_CONFLICTS_WITH_GROUPS && param !== undefined) {
    return t(key, { details: param });
  }
```

Run: `pnpm --filter client run i18n:check-keys`
Expected: exits 0 (en/ar key parity).

- [ ] **Step 10: Commit**

```bash
git add lib/shared-types/src apps/server/src/user/services/user.service.ts apps/client/messages/en.json apps/client/messages/ar.json apps/client/src/lib/utils/errors/translateApiMessage.ts
git commit -m "feat(shared-types): academics roles, subjects, enums and error keys"
```

---

### Task 2: Server multi-role: `additionalRoles`, union of permissions, setAdditionalRoles

**Files:**
- Modify: `apps/server/src/user/entities/user.entity.ts` (add a prop near `roleName`, around line 130; add a virtual near line 417)
- Modify: `apps/server/src/auth/constants/user-populate.constant.ts`
- Modify: `apps/server/src/role/permissions.factory.ts:47-50`
- Test: `apps/server/src/role/permissions.factory.spec.ts` (create)
- Delete: `apps/server/src/role/enum/Roles.enum.ts`
- Modify: `apps/server/src/user/services/instructor.service.ts:6`
- Modify: `apps/server/src/user/services/user.service.ts` (add `setAdditionalRoles`)
- Test: `apps/server/src/user/services/user.set-additional-roles.spec.ts` (create)
- Modify: `apps/server/src/user/controllers/message/user.controller.message.ts`

**Interfaces:**
- Consumes: `getAdditionalRolesViolation`, `AcademicsErrors.ADDITIONAL_ROLES_INVALID`, `AcademicsErrors.USER_NOT_FOUND_IN_ORGANIZATION` (Task 1)
- Produces:
  - `User.additionalRoles: Roles[]`, and the virtual `additionalRoleDocs: Role[]` (populated by `USER_POPULATE`)
  - `CaslAbilityFactory.createForUser(user)` grants the union of `role.permissions` and every `additionalRoleDocs[i].permissions`
  - `UserService.setAdditionalRoles(organizationId: string, userId: string, additionalRoles: string[]): Promise<{ additionalRoles: Roles[] }>`
  - NATS `users.setAdditionalRoles` with payload `{ userId: string; additionalRoles: string[] }`

- [ ] **Step 1: Write the failing permissions test**

Create `apps/server/src/role/permissions.factory.spec.ts`:
```ts
import { Actions, Subjects } from '@darnozom/shared-types';
import { CaslAbilityFactory } from './permissions.factory';

type AnyUser = Parameters<CaslAbilityFactory['createForUser']>[0];

function user(partial: Record<string, unknown>): AnyUser {
  return { _id: 'u1', organizationId: 'o1', ...partial } as unknown as AnyUser;
}

describe('CaslAbilityFactory (multi-role)', () => {
  const factory = new CaslAbilityFactory();

  it('grants permissions from the primary role only when there are no additional roles', () => {
    const ability = factory.createForUser(user({ role: { permissions: [{ action: Actions.READ, subject: Subjects.GROUP }] } }));
    expect(ability.can(Actions.READ, Subjects.GROUP)).toBe(true);
    expect(ability.can(Actions.UPDATE, Subjects.TEACHER_AVAILABILITY)).toBe(false);
  });

  it('grants the union of primary and additional role permissions', () => {
    const ability = factory.createForUser(
      user({
        role: { permissions: [{ action: Actions.MANAGE, subject: Subjects.GROUP }] },
        additionalRoleDocs: [{ permissions: [{ action: Actions.MANAGE, subject: Subjects.TEACHER_AVAILABILITY }] }],
      })
    );
    expect(ability.can(Actions.UPDATE, Subjects.GROUP)).toBe(true);
    expect(ability.can(Actions.UPDATE, Subjects.TEACHER_AVAILABILITY)).toBe(true);
  });

  it('ignores missing additional role documents', () => {
    const ability = factory.createForUser(
      user({
        role: { permissions: [{ action: Actions.READ, subject: Subjects.GROUP }] },
        additionalRoleDocs: [null, { permissions: undefined }, { permissions: [{ action: Actions.READ, subject: Subjects.COHORT }] }],
      })
    );
    expect(ability.can(Actions.READ, Subjects.GROUP)).toBe(true);
    expect(ability.can(Actions.READ, Subjects.COHORT)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest src/role/permissions.factory.spec.ts`
Expected: FAIL. The test "grants the union of primary and additional role permissions" fails at `expect(ability.can(Actions.UPDATE, Subjects.TEACHER_AVAILABILITY)).toBe(true)`, receiving `false`.

- [ ] **Step 3: Implement the union in the factory**

In `apps/server/src/role/permissions.factory.ts`, replace:
```ts
    const permissions: Role['permissions'] = user.role?.permissions ?? [];
```
with:
```ts
    const additionalRoleDocs = (user as { additionalRoleDocs?: (Partial<Role> | null)[] }).additionalRoleDocs ?? [];
    const permissions: Role['permissions'] = [
      ...(user.role?.permissions ?? []),
      ...additionalRoleDocs.flatMap((doc) => doc?.permissions ?? []),
    ];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest src/role/permissions.factory.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Add the field, the virtual and the populate entry**

In `apps/server/src/user/entities/user.entity.ts`, add right after the `roleName` prop (`@Prop({ type: String, enum: Roles, required: true }) roleName: Roles;`):
```ts
  /** Extra roles held in addition to the primary `roleName` (staff roles + INSTRUCTOR only). */
  @Prop({ type: [{ type: String, enum: Object.values(Roles) }], default: [] })
  additionalRoles: Roles[];
```
Add right after the existing `UserSchema.virtual('role', {...});` block:
```ts
UserSchema.virtual('additionalRoleDocs', {
  ref: 'Role',
  localField: 'additionalRoles',
  foreignField: 'name',
  justOne: false,
});
```
Replace `apps/server/src/auth/constants/user-populate.constant.ts` content's array with:
```ts
export const USER_POPULATE = [
  { path: 'role', model: 'Role', localField: 'roleName', foreignField: 'name', select: 'name _id permissions' },
  { path: 'additionalRoleDocs', select: 'name _id permissions' },
  { path: 'organization', select: 'name _id slug' },
] as const;
```
Keep any import lines above the array exactly as they are.

- [ ] **Step 6: Delete the stale server Roles enum**

```bash
git rm apps/server/src/role/enum/Roles.enum.ts
```
In `apps/server/src/user/services/instructor.service.ts`, replace `import { Roles } from '../../role/enum/Roles.enum';` with `import { Roles } from '@darnozom/shared-types';`.
Then run `grep -rn "enum/Roles.enum" apps/server/src`. Expected: no output.

- [ ] **Step 7: Write the failing test for setAdditionalRoles**

Create `apps/server/src/user/services/user.set-additional-roles.spec.ts`:
```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { UserService } from './user.service';

function serviceWith(found: unknown) {
  const userModel = {
    findOne: jest.fn().mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(found) }) }),
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ matchedCount: 1 }) }),
  };
  const service = Object.create(UserService.prototype) as UserService;
  (service as unknown as { userModel: unknown }).userModel = userModel;
  return { service, userModel };
}

describe('UserService.setAdditionalRoles', () => {
  const orgId = '64b000000000000000000001';
  const userId = '64b000000000000000000002';

  it('saves valid additional roles for a user in the same organization', async () => {
    const { service, userModel } = serviceWith({ _id: userId, roleName: Roles.COORDINATOR });
    await expect(service.setAdditionalRoles(orgId, userId, [Roles.INSTRUCTOR])).resolves.toEqual({ additionalRoles: [Roles.INSTRUCTOR] });
    expect(userModel.findOne.mock.calls[0][0]).toMatchObject({ deletedAt: null });
    expect(String(userModel.findOne.mock.calls[0][0].organizationId)).toBe(orgId);
    expect(userModel.updateOne.mock.calls[0][1]).toEqual({ $set: { additionalRoles: [Roles.INSTRUCTOR] } });
  });

  it('rejects users outside the organization', async () => {
    const { service } = serviceWith(null);
    await expect(service.setAdditionalRoles(orgId, userId, [])).rejects.toThrow(new NotFoundException(AcademicsErrors.USER_NOT_FOUND_IN_ORGANIZATION));
  });

  it('rejects invalid combinations', async () => {
    const { service, userModel } = serviceWith({ _id: userId, roleName: Roles.STUDENT });
    await expect(service.setAdditionalRoles(orgId, userId, [Roles.INSTRUCTOR])).rejects.toThrow(new BadRequestException(AcademicsErrors.ADDITIONAL_ROLES_INVALID));
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `pnpm --filter server exec jest src/user/services/user.set-additional-roles.spec.ts`
Expected: FAIL with `service.setAdditionalRoles is not a function`.

- [ ] **Step 9: Implement setAdditionalRoles and the message pattern**

In `apps/server/src/user/services/user.service.ts`:
- add `AcademicsErrors`, `getAdditionalRolesViolation` and `Roles` to the existing `@darnozom/shared-types` import (`Roles` may already be imported; don't duplicate it)
- make sure `BadRequestException` and `NotFoundException` are imported from `@nestjs/common`
- add this method inside the class:
```ts
  async setAdditionalRoles(organizationId: string, userId: string, additionalRoles: string[]): Promise<{ additionalRoles: Roles[] }> {
    const target = await this.userModel
      .findOne({ _id: new mongoose.Types.ObjectId(userId), organizationId: new mongoose.Types.ObjectId(organizationId), deletedAt: null })
      .lean()
      .exec();
    if (!target) throw new NotFoundException(AcademicsErrors.USER_NOT_FOUND_IN_ORGANIZATION);
    if (getAdditionalRolesViolation(target.roleName, additionalRoles) !== null) {
      throw new BadRequestException(AcademicsErrors.ADDITIONAL_ROLES_INVALID);
    }
    await this.userModel.updateOne({ _id: target._id }, { $set: { additionalRoles } }).exec();
    return { additionalRoles: additionalRoles as Roles[] };
  }
```
In `apps/server/src/user/controllers/message/user.controller.message.ts`:
- add `RequirePermissionsGuard` (from `src/role/permission.decorator`) and `Actions`, `Subjects` (from `@darnozom/shared-types`; extend the existing import)
- add this handler after `organizationUpdateUser`:
```ts
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.ROLE })
  @MessagePattern('users.setAdditionalRoles')
  @UseGuards(AuthGuard)
  async setAdditionalRoles(@Ctx() context: IUserContext, @Payload() payload: { userId: string; additionalRoles: string[] }) {
    return this.userService.setAdditionalRoles(
      String(context.userPayload.organizationId),
      payload.userId,
      Array.isArray(payload.additionalRoles) ? payload.additionalRoles : []
    );
  }
```

- [ ] **Step 10: Run the tests and the type-check**

Run: `pnpm --filter server exec jest src/user/services/user.set-additional-roles.spec.ts src/role/permissions.factory.spec.ts`
Expected: PASS, 6 tests.

Run:
```bash
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task2-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task2-server.txt | sort)
```
Expected: no `>` lines.

- [ ] **Step 11: Commit**

```bash
git add -A apps/server/src/role apps/server/src/user apps/server/src/auth/constants/user-populate.constant.ts
git commit -m "feat(server): additional roles with union permissions"
```

---

### Task 3: Role seeds for the 11 concept roles

**Files:**
- Create: `apps/server/src/role/seeds/role.owner.config.ts`, `role.manager.config.ts`, `role.coordinator.config.ts`, `role.supervisor.config.ts`, `role.accountant.config.ts`, `role.content-officer.config.ts`, `role.sharia-reviewer.config.ts`, `role.hr.config.ts`
- Modify: `apps/server/src/role/seeds/role.instructor.config.ts`, `role.parent.config.ts`, `role.student.config.ts`, `roles.config.ts`
- Test: `apps/server/src/role/seeds/roles.config.spec.ts` (create)

**Interfaces:**
- Consumes: the new `Roles` and `Subjects` (Task 1)
- Produces: `ROLE_SEED_DEFINITIONS` containing every concept role. Running the seeder upserts them; the existing `RoleSeeder.seed()` is idempotent (`findOneAndUpdate … upsert`).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/role/seeds/roles.config.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest src/role/seeds/roles.config.spec.ts`
Expected: FAIL in "seeds every concept role": `expect(received).toContain(expected)`, with expected `"OWNER"`.

- [ ] **Step 3: Create the 8 role configs**

`apps/server/src/role/seeds/role.owner.config.ts`:
```ts
import { Roles } from '@darnozom/shared-types';
import { ADMIN_PERMISSIONS } from './role.admin.config';
import { RoleSeedEntry } from './role.types';

/** Owner = full organization access, same as ADMIN (plan deviation D5). */
export const OWNER_SEED: RoleSeedEntry = { name: Roles.OWNER, permissions: ADMIN_PERMISSIONS };
```
`role.manager.config.ts`:
```ts
import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const MANAGER_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.MANAGE, subject: Subjects.PROGRAM },
  { action: Actions.MANAGE, subject: Subjects.LEVEL },
  { action: Actions.MANAGE, subject: Subjects.COHORT },
  { action: Actions.MANAGE, subject: Subjects.GROUP },
  { action: Actions.MANAGE, subject: Subjects.GROUP_PAYMENT_STATUS },
  { action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY },
];

export const MANAGER_SEED: RoleSeedEntry = { name: Roles.MANAGER, permissions: MANAGER_PERMISSIONS };
```
`role.coordinator.config.ts`:
```ts
import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const COORDINATOR_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.PROGRAM },
  { action: Actions.READ, subject: Subjects.LEVEL },
  { action: Actions.READ, subject: Subjects.COHORT },
  { action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY },
  { action: Actions.MANAGE, subject: Subjects.GROUP },
];

export const COORDINATOR_SEED: RoleSeedEntry = { name: Roles.COORDINATOR, permissions: COORDINATOR_PERMISSIONS };
```
`role.supervisor.config.ts`:
```ts
import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const SUPERVISOR_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.PROGRAM },
  { action: Actions.READ, subject: Subjects.LEVEL },
  { action: Actions.READ, subject: Subjects.COHORT },
  { action: Actions.READ, subject: Subjects.GROUP },
];

export const SUPERVISOR_SEED: RoleSeedEntry = { name: Roles.SUPERVISOR, permissions: SUPERVISOR_PERMISSIONS };
```
`role.accountant.config.ts`:
```ts
import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

export const ACCOUNTANT_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.READ, subject: Subjects.GROUP },
  { action: Actions.MANAGE, subject: Subjects.GROUP_PAYMENT_STATUS },
];

export const ACCOUNTANT_SEED: RoleSeedEntry = { name: Roles.ACCOUNTANT, permissions: ACCOUNTANT_PERMISSIONS };
```
`role.content-officer.config.ts`:
```ts
import { Roles } from '@darnozom/shared-types';
import { RoleSeedEntry } from './role.types';

/** Permissions arrive with sub-project 4 (content with basic Sharia review). */
export const CONTENT_OFFICER_SEED: RoleSeedEntry = { name: Roles.CONTENT_OFFICER, permissions: [] };
```
`role.sharia-reviewer.config.ts`:
```ts
import { Roles } from '@darnozom/shared-types';
import { RoleSeedEntry } from './role.types';

/** Permissions arrive with sub-project 4 (content with basic Sharia review). */
export const SHARIA_REVIEWER_SEED: RoleSeedEntry = { name: Roles.SHARIA_REVIEWER, permissions: [] };
```
`role.hr.config.ts`:
```ts
import { Roles } from '@darnozom/shared-types';
import { RoleSeedEntry } from './role.types';

export const HR_SEED: RoleSeedEntry = { name: Roles.HR, permissions: [] };
```

- [ ] **Step 4: Extend the existing configs and register the seeds**

Append to the arrays (before the closing `];`):
- in `INSTRUCTOR_PERMISSIONS`:
```ts
  { action: Actions.READ, subject: Subjects.GROUP },
  { action: Actions.MANAGE, subject: Subjects.TEACHER_AVAILABILITY },
```
- in `PARENT_PERMISSIONS`, and in `STUDENT_PERMISSIONS` (`role.student.config.ts`):
```ts
  { action: Actions.READ, subject: Subjects.GROUP },
```
In `roles.config.ts`:
- add the imports:
```ts
import { OWNER_SEED } from './role.owner.config';
import { MANAGER_SEED } from './role.manager.config';
import { COORDINATOR_SEED } from './role.coordinator.config';
import { SUPERVISOR_SEED } from './role.supervisor.config';
import { ACCOUNTANT_SEED } from './role.accountant.config';
import { CONTENT_OFFICER_SEED } from './role.content-officer.config';
import { SHARIA_REVIEWER_SEED } from './role.sharia-reviewer.config';
import { HR_SEED } from './role.hr.config';
```
- add `OWNER_SEED, MANAGER_SEED, COORDINATOR_SEED, SUPERVISOR_SEED, ACCOUNTANT_SEED, CONTENT_OFFICER_SEED, SHARIA_REVIEWER_SEED, HR_SEED,` to the end of `ROLE_SEED_DEFINITIONS`
- add the matching re-exports at the bottom:
```ts
export { OWNER_SEED } from './role.owner.config';
export { MANAGER_PERMISSIONS, MANAGER_SEED } from './role.manager.config';
export { COORDINATOR_PERMISSIONS, COORDINATOR_SEED } from './role.coordinator.config';
export { SUPERVISOR_PERMISSIONS, SUPERVISOR_SEED } from './role.supervisor.config';
export { ACCOUNTANT_PERMISSIONS, ACCOUNTANT_SEED } from './role.accountant.config';
export { CONTENT_OFFICER_SEED } from './role.content-officer.config';
export { SHARIA_REVIEWER_SEED } from './role.sharia-reviewer.config';
export { HR_SEED } from './role.hr.config';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest src/role`
Expected: PASS for `roles.config.spec.ts` (7 tests) and `permissions.factory.spec.ts`. Any other suite in `src/role` must give the same pass/fail result it gave before this task (`git stash` + rerun to compare if unsure).

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/role/seeds
git commit -m "feat(server): seed the 11 concept roles with academics permissions"
```

---

### Task 4: Academics module, common helpers, Program (with course linking)

**Files:**
- Create: `apps/server/__test__/academics/mock-query.ts`
- Create: `apps/server/src/academics/common/actor.ts`, `apps/server/src/academics/common/escape-regex.ts`, `apps/server/src/academics/common/payloads.ts`
- Test: `apps/server/src/academics/common/escape-regex.spec.ts`
- Create: `apps/server/src/academics/program/entities/program.entity.ts`, `apps/server/src/academics/program/dto/program.dto.ts`, `apps/server/src/academics/program/program.service.ts`, `apps/server/src/academics/program/program.controller.message.ts`
- Test: `apps/server/src/academics/program/program.service.spec.ts`
- Modify: `apps/server/src/course/entities/course.entity.ts` (add `programId` after the `organizationId` prop, around line 139)
- Create: `apps/server/src/academics/academics.module.ts`
- Modify: `apps/server/src/app.module.ts` (import and register `AcademicsModule` next to `GradeModule`)

**Interfaces:**
- Consumes: `AcademicsErrors`, `AcademicsSuccessMessages`, `Subjects.PROGRAM` (Task 1)
- Produces:
  - `interface AcademicsActor { _id: string; organizationId: string; roleName: Roles; additionalRoles: Roles[] }`
  - `actorFromContext(context: IUserContext): AcademicsActor`
  - `escapeRegex(text: string): string`
  - `class IdPayload { id: string }`
  - `mockQuery<T>(value: T)`: a test helper whose builder methods (`lean`, `sort`, `select`, `limit`) return itself and whose `exec()` resolves to `value`. **Every service query in this plan ends with `.exec()`** so that this helper works.
  - `ProgramService` methods: `findAll(actor)`, `findOne(actor, id)`, `create(actor, dto)`, `update(actor, id, dto)`, `remove(actor, id)`, `findCourses(actor, programId)`, `courseOptions(actor)`, `linkCourse(actor, programId, courseId)`, `unlinkCourse(actor, courseId)`
  - NATS patterns `academics.programs.{findAll, findOne, create, update, delete, findCourses, courseOptions, linkCourse, unlinkCourse}`
  - `Course.programId?: Types.ObjectId | null`
  - `AcademicsModule`: later tasks add their models, providers and controllers to it

- [ ] **Step 1: Create the test helper and the common files**

`apps/server/__test__/academics/mock-query.ts`:
```ts
/** Chainable stand-in for a Mongoose Query: builder methods return the query, exec() resolves `value`. */
export function mockQuery<T>(value: T) {
  const query = {
    lean: jest.fn(),
    sort: jest.fn(),
    select: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.lean.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}
```
`apps/server/src/academics/common/actor.ts`:
```ts
import { Roles } from '@darnozom/shared-types';
import { IUserContext } from 'src/utils/types/IUserContext.interface';

export interface AcademicsActor {
  _id: string;
  organizationId: string;
  roleName: Roles;
  additionalRoles: Roles[];
}

export function actorFromContext(context: IUserContext): AcademicsActor {
  const user = context.userPayload;
  return {
    _id: String(user._id),
    organizationId: user.organizationId ? String(user.organizationId) : '',
    roleName: user.roleName,
    additionalRoles: (user as { additionalRoles?: Roles[] }).additionalRoles ?? [],
  };
}
```
`apps/server/src/academics/common/escape-regex.ts`:
```ts
/** Escapes RegExp metacharacters so user text is matched literally. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```
`apps/server/src/academics/common/payloads.ts`:
```ts
import { IsMongoId } from 'class-validator';

export class IdPayload {
  @IsMongoId()
  id!: string;
}
```
`apps/server/src/academics/common/escape-regex.spec.ts`:
```ts
import { escapeRegex } from './escape-regex';

describe('escapeRegex', () => {
  it('escapes every metacharacter so the text matches literally', () => {
    const raw = 'a.*+?^${}()|[]\\b';
    expect(new RegExp(escapeRegex(raw)).test(raw)).toBe(true);
    expect(new RegExp(escapeRegex('a.c')).test('abc')).toBe(false);
  });
  it('never throws on an unbalanced parenthesis', () => {
    expect(() => new RegExp(escapeRegex('('))).not.toThrow();
  });
});
```
Run: `pnpm --filter server exec jest src/academics/common`
Expected: PASS, 2 tests.

- [ ] **Step 2: Write the failing Program service test**

`apps/server/src/academics/program/program.service.spec.ts`:
```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { ProgramService } from './program.service';

const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: Roles.MANAGER, additionalRoles: [] };
const programId = '64b0000000000000000000cc';
const courseId = '64b0000000000000000000dd';

function setup() {
  const programModel = { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const courseModel = { find: jest.fn(), findOne: jest.fn(), countDocuments: jest.fn(), updateOne: jest.fn() };
  const service = new ProgramService(programModel as never, courseModel as never);
  return { service, programModel, courseModel };
}

describe('ProgramService', () => {
  it('creates a program in the actor organization with a trimmed name', async () => {
    const { service, programModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery(null));
    programModel.create.mockResolvedValue({ toObject: () => ({ _id: programId, name: 'Quran' }) });

    await expect(service.create(actor, { name: ' Quran ' })).resolves.toEqual({ _id: programId, name: 'Quran' });
    const created = programModel.create.mock.calls[0][0];
    expect(String(created.organizationId)).toBe(actor.organizationId);
    expect(created.name).toBe('Quran');
  });

  it('rejects a duplicate name in the same organization', async () => {
    const { service, programModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: 'other' }));
    await expect(service.create(actor, { name: 'Quran' })).rejects.toThrow(new ConflictException(AcademicsErrors.PROGRAM_NAME_ALREADY_EXISTS));
    expect(programModel.create).not.toHaveBeenCalled();
  });

  it('scopes updates to the actor organization and 404s otherwise', async () => {
    const { service, programModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery(null));
    programModel.findOneAndUpdate.mockReturnValue(mockQuery(null));
    await expect(service.update(actor, programId, { name: 'New' })).rejects.toThrow(new NotFoundException(AcademicsErrors.PROGRAM_NOT_FOUND));
    expect(String(programModel.findOneAndUpdate.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
  });

  it('refuses to delete a program that still has courses', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.countDocuments.mockReturnValue(mockQuery(2));
    await expect(service.remove(actor, programId)).rejects.toThrow(new ConflictException(AcademicsErrors.HAS_DEPENDENTS));
    expect(programModel.updateOne).not.toHaveBeenCalled();
  });

  it('soft-deletes a program without courses', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.countDocuments.mockReturnValue(mockQuery(0));
    programModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await expect(service.remove(actor, programId)).resolves.toEqual({ message: 'academicsDeletedSuccessfully' });
    expect(programModel.updateOne.mock.calls[0][1].$set.deletedAt).toBeInstanceOf(Date);
  });

  it('links only courses of the same organization', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.linkCourse(actor, programId, courseId)).rejects.toThrow(new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION));
    expect(String(courseModel.findOne.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
    expect(courseModel.updateOne).not.toHaveBeenCalled();
  });

  it('links a course of the same organization', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId }));
    courseModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await expect(service.linkCourse(actor, programId, courseId)).resolves.toEqual({ programId, courseId });
    expect(String(courseModel.updateOne.mock.calls[0][1].$set.programId)).toBe(programId);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter server exec jest src/academics/program`
Expected: FAIL with `Cannot find module './program.service'`.

- [ ] **Step 4: Implement the entity, DTOs and service**

`apps/server/src/academics/program/entities/program.entity.ts`:
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class Program extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const ProgramSchema = SchemaFactory.createForClass(Program);
ProgramSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null }, name: 'org_name_unique_if_not_deleted' }
);
applySoftDeleteMiddleware(ProgramSchema);
```
`apps/server/src/academics/program/dto/program.dto.ts`:
```ts
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateProgramDto extends PartialType(CreateProgramDto) {}

export class UpdateProgramPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateProgramDto)
  data!: UpdateProgramDto;
}

export class LinkCoursePayload {
  @IsMongoId()
  programId!: string;

  @IsMongoId()
  courseId!: string;
}

export class CourseIdPayload {
  @IsMongoId()
  courseId!: string;
}
```
`apps/server/src/academics/program/program.service.ts`:
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages } from '@darnozom/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { Program } from './entities/program.entity';

const oid = (id: string) => new Types.ObjectId(id);

@Injectable()
export class ProgramService {
  constructor(
    @InjectModel(Program.name) private readonly programModel: Model<Program>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>
  ) {}

  private async assertNameAvailable(actor: AcademicsActor, name: string, excludeId?: string) {
    const filter: FilterQuery<Program> = withNotDeletedFilter({ organizationId: oid(actor.organizationId), name });
    if (excludeId) filter._id = { $ne: oid(excludeId) };
    const existing = await this.programModel.findOne(filter).lean().exec();
    if (existing) throw new ConflictException(AcademicsErrors.PROGRAM_NAME_ALREADY_EXISTS);
  }

  async findAll(actor: AcademicsActor) {
    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    return this.programModel.find(withNotDeletedFilter({ organizationId: oid(actor.organizationId) })).sort({ name: 1 }).lean().exec();
  }

  async findOne(actor: AcademicsActor, id: string) {
    const program = await this.programModel
      .findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) }))
      .lean()
      .exec();
    if (!program) throw new NotFoundException(AcademicsErrors.PROGRAM_NOT_FOUND);
    return program;
  }

  async create(actor: AcademicsActor, dto: CreateProgramDto) {
    const name = dto.name.trim();
    await this.assertNameAvailable(actor, name);
    const created = await this.programModel.create({ ...dto, name, organizationId: oid(actor.organizationId) });
    return created.toObject();
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateProgramDto) {
    const changes: UpdateProgramDto = { ...dto };
    if (changes.name !== undefined) {
      changes.name = changes.name.trim();
      await this.assertNameAvailable(actor, changes.name, id);
    }
    const updated = await this.programModel
      .findOneAndUpdate(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) }), { $set: changes }, { new: true, runValidators: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException(AcademicsErrors.PROGRAM_NOT_FOUND);
    return updated;
  }

  async remove(actor: AcademicsActor, id: string) {
    const program = await this.findOne(actor, id);
    const courses = await this.courseModel.countDocuments({ programId: program._id, deletedAt: null }).exec();
    if (courses > 0) throw new ConflictException(AcademicsErrors.HAS_DEPENDENTS);
    await this.programModel.updateOne({ _id: program._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }

  async findCourses(actor: AcademicsActor, programId: string) {
    const program = await this.findOne(actor, programId);
    return this.courseModel
      .find({ organizationId: oid(actor.organizationId), programId: program._id, deletedAt: null })
      .select('_id name programId')
      .lean()
      .exec();
  }

  async courseOptions(actor: AcademicsActor) {
    return (
      this.courseModel
        .find({ organizationId: oid(actor.organizationId), deletedAt: null })
        .select('_id name programId')
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ name: 1 })
        .lean()
        .exec()
    );
  }

  private async findCourseInOrg(actor: AcademicsActor, courseId: string) {
    const course = await this.courseModel
      .findOne({ _id: oid(courseId), organizationId: oid(actor.organizationId), deletedAt: null })
      .select('_id')
      .lean()
      .exec();
    if (!course) throw new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION);
    return course;
  }

  async linkCourse(actor: AcademicsActor, programId: string, courseId: string) {
    const program = await this.findOne(actor, programId);
    const course = await this.findCourseInOrg(actor, courseId);
    await this.courseModel.updateOne({ _id: course._id }, { $set: { programId: program._id } }).exec();
    return { programId, courseId };
  }

  async unlinkCourse(actor: AcademicsActor, courseId: string) {
    const course = await this.findCourseInOrg(actor, courseId);
    await this.courseModel.updateOne({ _id: course._id }, { $set: { programId: null } }).exec();
    return { courseId };
  }
}
```
In `apps/server/src/course/entities/course.entity.ts`, add directly after the `organizationId!: Types.ObjectId;` prop:
```ts
  /** Program this course belongs to (academics); null for courses outside any program. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Program', required: false, default: null, index: true })
  programId?: Types.ObjectId | null;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest src/academics/program`
Expected: PASS, 7 tests.

- [ ] **Step 6: Message controller, module and registration**

`apps/server/src/academics/program/program.controller.message.ts`:
```ts
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CourseIdPayload, CreateProgramDto, LinkCoursePayload, UpdateProgramPayload } from './dto/program.dto';
import { ProgramService } from './program.service';

@Controller()
@ApplyRpcErrorHandling
export class ProgramControllerMessage {
  constructor(private readonly programService: ProgramService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.findAll')
  findAll(@Ctx() context: IUserContext) {
    return this.programService.findAll(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.programService.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateProgramDto, @Ctx() context: IUserContext) {
    return this.programService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateProgramPayload, @Ctx() context: IUserContext) {
    return this.programService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.programService.remove(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.findCourses')
  findCourses(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.programService.findCourses(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.courseOptions')
  courseOptions(@Ctx() context: IUserContext) {
    return this.programService.courseOptions(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.linkCourse')
  linkCourse(@Payload(new RpcValidationPipe()) payload: LinkCoursePayload, @Ctx() context: IUserContext) {
    return this.programService.linkCourse(actorFromContext(context), payload.programId, payload.courseId);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.unlinkCourse')
  unlinkCourse(@Payload(new RpcValidationPipe()) payload: CourseIdPayload, @Ctx() context: IUserContext) {
    return this.programService.unlinkCourse(actorFromContext(context), payload.courseId);
  }
}
```
`apps/server/src/academics/academics.module.ts`:
```ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { Program, ProgramSchema } from './program/entities/program.entity';
import { ProgramService } from './program/program.service';
import { ProgramControllerMessage } from './program/program.controller.message';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Program.name, schema: ProgramSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [ProgramControllerMessage],
  providers: [ProgramService],
})
export class AcademicsModule {}
```
In `apps/server/src/app.module.ts`, add `import { AcademicsModule } from './academics/academics.module';` next to the `GradeModule` import, and add `AcademicsModule,` right after `GradeModule,` in the `imports` array.

- [ ] **Step 7: Type-check and run the tests**

Run:
```bash
pnpm --filter server exec jest src/academics
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task4-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task4-server.txt | sort)
```
Expected: jest PASS (9 tests); the diff shows no `>` lines.

- [ ] **Step 8: Commit**

```bash
git add apps/server/__test__/academics apps/server/src/academics apps/server/src/course/entities/course.entity.ts apps/server/src/app.module.ts
git commit -m "feat(academics): program module with course linking"
```

---

### Task 5: Level, Cohort, and the Group entity

**Files:**
- Create: `apps/server/src/academics/level/entities/level.entity.ts`, `apps/server/src/academics/level/dto/level.dto.ts`, `apps/server/src/academics/level/level.service.ts`, `apps/server/src/academics/level/level.controller.message.ts`
- Test: `apps/server/src/academics/level/level.service.spec.ts`
- Create: `apps/server/src/academics/cohort/entities/cohort.entity.ts`, `apps/server/src/academics/cohort/dto/cohort.dto.ts`, `apps/server/src/academics/cohort/cohort.service.ts`, `apps/server/src/academics/cohort/cohort.controller.message.ts`
- Test: `apps/server/src/academics/cohort/cohort.service.spec.ts`
- Create: `apps/server/src/academics/group/entities/group.entity.ts` (schema only; services come in Task 9)
- Modify: `apps/server/src/academics/academics.module.ts`

**Interfaces:**
- Consumes: `AcademicsActor`, `IdPayload`, `mockQuery` (Task 4); `GroupStatus`, `GroupPaymentStatus` (Task 1)
- Produces:
  - `LevelService` methods: `findAll(actor, courseId)`, `findOne(actor, id)`, `create(actor, { courseId, name, order })`, `update(actor, id, { name?, order? })`, `remove(actor, id)`
  - `CohortService` methods: `findAll(actor, levelId)`, `findOne(actor, id)`, `create(actor, { levelId, name, startDate })`, `update(actor, id, { name?, startDate? })`, `remove(actor, id)`. Task 11 adds a teacher re-check to `update`.
  - NATS patterns `academics.levels.{findAll, create, update, delete}` and `academics.cohorts.{findAll, findOne, create, update, delete}`
  - `Group` entity, exported as `Group`, `GroupSchema`. Shape:
    - `organizationId`, `cohortId`, `levelId`, `courseId`
    - `name`, `teacherId: Types.ObjectId | null`
    - `schedule: { dayOfWeek; startTime; durationMinutes }[]`, `timezone`
    - `minStudents`, `maxStudents`, `meetingLink?`, `whatsappGroupLink?`
    - `contentSent: { done; by?; at? }`
    - `students: { studentId; paymentStatus; whatsappAdded; addedAt; addedBy? }[]`
    - `status: GroupStatus`, `statusHistory: { from; to; by; at; reason? }[]`
    - `deletedAt`, `deletedById`

- [ ] **Step 1: Write the failing tests**

`apps/server/src/academics/level/level.service.spec.ts`:
```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { LevelService } from './level.service';

const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: Roles.MANAGER, additionalRoles: [] };
const courseId = '64b0000000000000000000dd';
const levelId = '64b0000000000000000000ee';

function setup() {
  const levelModel = { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const courseModel = { findOne: jest.fn() };
  const cohortModel = { countDocuments: jest.fn() };
  const service = new LevelService(levelModel as never, courseModel as never, cohortModel as never);
  return { service, levelModel, courseModel, cohortModel };
}

describe('LevelService', () => {
  it('rejects a course from another organization', async () => {
    const { service, courseModel, levelModel } = setup();
    courseModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.create(actor, { courseId, name: 'Level 1', order: 1 })).rejects.toThrow(new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION));
    expect(levelModel.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate order within the same course', async () => {
    const { service, courseModel, levelModel } = setup();
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId }));
    levelModel.findOne.mockReturnValue(mockQuery({ _id: 'existing' }));
    await expect(service.create(actor, { courseId, name: 'Level 1', order: 1 })).rejects.toThrow(new ConflictException(AcademicsErrors.LEVEL_ORDER_ALREADY_EXISTS));
  });

  it('creates a level for a course in the organization', async () => {
    const { service, courseModel, levelModel } = setup();
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId }));
    levelModel.findOne.mockReturnValue(mockQuery(null));
    levelModel.create.mockResolvedValue({ toObject: () => ({ _id: levelId }) });
    await expect(service.create(actor, { courseId, name: 'Level 1', order: 1 })).resolves.toEqual({ _id: levelId });
    expect(String(levelModel.create.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
  });

  it('refuses to delete a level that has cohorts', async () => {
    const { service, levelModel, cohortModel } = setup();
    levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
    cohortModel.countDocuments.mockReturnValue(mockQuery(1));
    await expect(service.remove(actor, levelId)).rejects.toThrow(new ConflictException(AcademicsErrors.HAS_DEPENDENTS));
  });
});
```
`apps/server/src/academics/cohort/cohort.service.spec.ts`:
```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { CohortService } from './cohort.service';

const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: Roles.MANAGER, additionalRoles: [] };
const levelId = '64b0000000000000000000ee';
const cohortId = '64b0000000000000000000ff';

function setup() {
  const cohortModel = { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const levelModel = { findOne: jest.fn() };
  const groupModel = { countDocuments: jest.fn() };
  const service = new CohortService(cohortModel as never, levelModel as never, groupModel as never);
  return { service, cohortModel, levelModel, groupModel };
}

describe('CohortService', () => {
  it('rejects a level from another organization', async () => {
    const { service, levelModel } = setup();
    levelModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.create(actor, { levelId, name: 'Oct 2026', startDate: '2026-10-20' })).rejects.toThrow(new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND));
  });

  it('creates a cohort with a Date startDate', async () => {
    const { service, levelModel, cohortModel } = setup();
    levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId }));
    cohortModel.create.mockResolvedValue({ toObject: () => ({ _id: cohortId }) });
    await service.create(actor, { levelId, name: 'Oct 2026', startDate: '2026-10-20' });
    expect(cohortModel.create.mock.calls[0][0].startDate).toBeInstanceOf(Date);
  });

  it('refuses to delete a cohort that has groups', async () => {
    const { service, cohortModel, groupModel } = setup();
    cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId }));
    groupModel.countDocuments.mockReturnValue(mockQuery(3));
    await expect(service.remove(actor, cohortId)).rejects.toThrow(new ConflictException(AcademicsErrors.HAS_DEPENDENTS));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter server exec jest src/academics/level src/academics/cohort`
Expected: FAIL with `Cannot find module './level.service'` and `Cannot find module './cohort.service'`.

- [ ] **Step 3: Implement the entities**

`apps/server/src/academics/level/entities/level.entity.ts`:
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class Level extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true, min: 1 })
  order: number;

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const LevelSchema = SchemaFactory.createForClass(Level);
LevelSchema.index({ courseId: 1, order: 1 }, { unique: true, partialFilterExpression: { deletedAt: null }, name: 'course_order_unique_if_not_deleted' });
applySoftDeleteMiddleware(LevelSchema);
```
`apps/server/src/academics/cohort/entities/cohort.entity.ts`:
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class Cohort extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Level', required: true, index: true })
  levelId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const CohortSchema = SchemaFactory.createForClass(Cohort);
applySoftDeleteMiddleware(CohortSchema);
```
`apps/server/src/academics/group/entities/group.entity.ts`:
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GroupPaymentStatus, GroupStatus } from '@darnozom/shared-types';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ _id: false })
export class GroupScheduleSlot {
  @Prop({ type: Number, required: true, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: Number, required: true, min: 15, max: 480 })
  durationMinutes: number;
}
export const GroupScheduleSlotSchema = SchemaFactory.createForClass(GroupScheduleSlot);

@Schema({ _id: false })
export class GroupStudent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(GroupPaymentStatus), default: GroupPaymentStatus.UNPAID })
  paymentStatus: GroupPaymentStatus;

  @Prop({ type: Boolean, default: false })
  whatsappAdded: boolean;

  @Prop({ type: Date, default: () => new Date() })
  addedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  addedBy?: Types.ObjectId;
}
export const GroupStudentSchema = SchemaFactory.createForClass(GroupStudent);

@Schema({ _id: false })
export class GroupStatusChange {
  @Prop({ type: String, required: false, default: null })
  from: GroupStatus | null;

  @Prop({ type: String, required: true })
  to: GroupStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  by: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  at: Date;

  @Prop({ type: String, required: false })
  reason?: string;
}
export const GroupStatusChangeSchema = SchemaFactory.createForClass(GroupStatusChange);

@Schema({ _id: false })
export class ContentSent {
  @Prop({ type: Boolean, default: false })
  done: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  by?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  at?: Date;
}
export const ContentSentSchema = SchemaFactory.createForClass(ContentSent);

@Schema({ timestamps: true })
export class Group extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Cohort', required: true })
  cohortId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Level', required: true })
  levelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  teacherId: Types.ObjectId | null;

  @Prop({ type: [GroupScheduleSlotSchema], required: true })
  schedule: GroupScheduleSlot[];

  @Prop({ type: String, required: true })
  timezone: string;

  @Prop({ type: Number, required: true, min: 1 })
  minStudents: number;

  @Prop({ type: Number, required: true, min: 1 })
  maxStudents: number;

  @Prop({ type: String, required: false, trim: true })
  meetingLink?: string;

  @Prop({ type: String, required: false, trim: true })
  whatsappGroupLink?: string;

  @Prop({ type: ContentSentSchema, default: () => ({ done: false }) })
  contentSent: ContentSent;

  @Prop({ type: [GroupStudentSchema], default: [] })
  students: GroupStudent[];

  @Prop({ type: String, enum: Object.values(GroupStatus), default: GroupStatus.FORMING })
  status: GroupStatus;

  @Prop({ type: [GroupStatusChangeSchema], default: [] })
  statusHistory: GroupStatusChange[];

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ organizationId: 1, status: 1 });
GroupSchema.index({ teacherId: 1, status: 1 });
GroupSchema.index({ cohortId: 1 });
GroupSchema.index({ 'students.studentId': 1 });
applySoftDeleteMiddleware(GroupSchema);
```

- [ ] **Step 4: Implement the DTOs and services**

`apps/server/src/academics/level/dto/level.dto.ts`:
```ts
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateLevelDto {
  @IsMongoId()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class UpdateLevelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class UpdateLevelPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateLevelDto)
  data!: UpdateLevelDto;
}

export class FindLevelsPayload {
  @IsMongoId()
  courseId!: string;
}
```
`apps/server/src/academics/level/level.service.ts`:
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages } from '@darnozom/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { CreateLevelDto, UpdateLevelDto } from './dto/level.dto';
import { Level } from './entities/level.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class LevelService {
  constructor(
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>
  ) {}

  private async assertOrderFree(courseId: Types.ObjectId, order: number, excludeId?: string) {
    const filter: FilterQuery<Level> = withNotDeletedFilter({ courseId, order });
    if (excludeId) filter._id = { $ne: oid(excludeId) };
    const existing = await this.levelModel.findOne(filter).lean().exec();
    if (existing) throw new ConflictException(AcademicsErrors.LEVEL_ORDER_ALREADY_EXISTS);
  }

  async findAll(actor: AcademicsActor, courseId: string) {
    return (
      this.levelModel
        .find(withNotDeletedFilter({ organizationId: oid(actor.organizationId), courseId: oid(courseId) }))
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ order: 1 })
        .lean()
        .exec()
    );
  }

  async findOne(actor: AcademicsActor, id: string) {
    const level = await this.levelModel.findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) })).lean().exec();
    if (!level) throw new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND);
    return level;
  }

  async create(actor: AcademicsActor, dto: CreateLevelDto) {
    const course = await this.courseModel
      .findOne({ _id: oid(dto.courseId), organizationId: oid(actor.organizationId), deletedAt: null })
      .select('_id')
      .lean()
      .exec();
    if (!course) throw new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION);
    await this.assertOrderFree(oid(dto.courseId), dto.order);
    const created = await this.levelModel.create({
      organizationId: oid(actor.organizationId),
      courseId: oid(dto.courseId),
      name: dto.name.trim(),
      order: dto.order,
    });
    return created.toObject();
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateLevelDto) {
    const level = await this.findOne(actor, id);
    if (dto.order !== undefined) await this.assertOrderFree(level.courseId, dto.order, id);
    const changes: UpdateLevelDto = { ...dto, ...(dto.name === undefined ? {} : { name: dto.name.trim() }) };
    return this.levelModel.findOneAndUpdate({ _id: level._id }, { $set: changes }, { new: true, runValidators: true }).lean().exec();
  }

  async remove(actor: AcademicsActor, id: string) {
    const level = await this.findOne(actor, id);
    const cohorts = await this.cohortModel.countDocuments({ levelId: level._id, deletedAt: null }).exec();
    if (cohorts > 0) throw new ConflictException(AcademicsErrors.HAS_DEPENDENTS);
    await this.levelModel.updateOne({ _id: level._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }
}
```
`apps/server/src/academics/cohort/dto/cohort.dto.ts`:
```ts
import { Type } from 'class-transformer';
import { IsDateString, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateCohortDto {
  @IsMongoId()
  levelId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /** ISO date, e.g. "2026-10-20" */
  @IsDateString()
  startDate!: string;
}

export class UpdateCohortDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class UpdateCohortPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateCohortDto)
  data!: UpdateCohortDto;
}

export class FindCohortsPayload {
  @IsMongoId()
  levelId!: string;
}
```
`apps/server/src/academics/cohort/cohort.service.ts`:
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages } from '@darnozom/shared-types';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Group } from '../group/entities/group.entity';
import { Level } from '../level/entities/level.entity';
import { CreateCohortDto, UpdateCohortDto } from './dto/cohort.dto';
import { Cohort } from './entities/cohort.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class CohortService {
  constructor(
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  async findAll(actor: AcademicsActor, levelId: string) {
    return (
      this.cohortModel
        .find(withNotDeletedFilter({ organizationId: oid(actor.organizationId), levelId: oid(levelId) }))
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ startDate: -1 })
        .lean()
        .exec()
    );
  }

  async findOne(actor: AcademicsActor, id: string) {
    const cohort = await this.cohortModel.findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) })).lean().exec();
    if (!cohort) throw new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND);
    return cohort;
  }

  async create(actor: AcademicsActor, dto: CreateCohortDto) {
    const level = await this.levelModel
      .findOne(withNotDeletedFilter({ _id: oid(dto.levelId), organizationId: oid(actor.organizationId) }))
      .select('_id')
      .lean()
      .exec();
    if (!level) throw new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND);
    const created = await this.cohortModel.create({
      organizationId: oid(actor.organizationId),
      levelId: oid(dto.levelId),
      name: dto.name.trim(),
      startDate: new Date(dto.startDate),
    });
    return created.toObject();
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateCohortDto) {
    const cohort = await this.findOne(actor, id);
    const changes: { name?: string; startDate?: Date } = {};
    if (dto.name !== undefined) changes.name = dto.name.trim();
    if (dto.startDate !== undefined) changes.startDate = new Date(dto.startDate);
    return this.cohortModel.findOneAndUpdate({ _id: cohort._id }, { $set: changes }, { new: true, runValidators: true }).lean().exec();
  }

  async remove(actor: AcademicsActor, id: string) {
    const cohort = await this.findOne(actor, id);
    const groups = await this.groupModel.countDocuments({ cohortId: cohort._id, deletedAt: null }).exec();
    if (groups > 0) throw new ConflictException(AcademicsErrors.HAS_DEPENDENTS);
    await this.cohortModel.updateOne({ _id: cohort._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest src/academics/level src/academics/cohort`
Expected: PASS, 7 tests.

- [ ] **Step 6: Controllers and module wiring**

`apps/server/src/academics/level/level.controller.message.ts`:
```ts
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CreateLevelDto, FindLevelsPayload, UpdateLevelPayload } from './dto/level.dto';
import { LevelService } from './level.service';

@Controller()
@ApplyRpcErrorHandling
export class LevelControllerMessage {
  constructor(private readonly levelService: LevelService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindLevelsPayload, @Ctx() context: IUserContext) {
    return this.levelService.findAll(actorFromContext(context), payload.courseId);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateLevelDto, @Ctx() context: IUserContext) {
    return this.levelService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateLevelPayload, @Ctx() context: IUserContext) {
    return this.levelService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.levelService.remove(actorFromContext(context), payload.id);
  }
}
```
`apps/server/src/academics/cohort/cohort.controller.message.ts`:
```ts
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CohortService } from './cohort.service';
import { CreateCohortDto, FindCohortsPayload, UpdateCohortPayload } from './dto/cohort.dto';

@Controller()
@ApplyRpcErrorHandling
export class CohortControllerMessage {
  constructor(private readonly cohortService: CohortService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindCohortsPayload, @Ctx() context: IUserContext) {
    return this.cohortService.findAll(actorFromContext(context), payload.levelId);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.cohortService.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateCohortDto, @Ctx() context: IUserContext) {
    return this.cohortService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateCohortPayload, @Ctx() context: IUserContext) {
    return this.cohortService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.cohortService.remove(actorFromContext(context), payload.id);
  }
}
```
In `apps/server/src/academics/academics.module.ts`:
- add the imports for `Level`/`LevelSchema`, `Cohort`/`CohortSchema`, `Group`/`GroupSchema`, `LevelService`, `CohortService`, `LevelControllerMessage` and `CohortControllerMessage`
- extend `MongooseModule.forFeature([...])` with:
```ts
      { name: Level.name, schema: LevelSchema },
      { name: Cohort.name, schema: CohortSchema },
      { name: Group.name, schema: GroupSchema },
```
- set `controllers: [ProgramControllerMessage, LevelControllerMessage, CohortControllerMessage]` and `providers: [ProgramService, LevelService, CohortService]`

- [ ] **Step 7: Run the tests and the type-check**

Run:
```bash
pnpm --filter server exec jest src/academics
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task5-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task5-server.txt | sort)
```
Expected: jest PASS (16 tests); no `>` lines.

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/academics
git commit -m "feat(academics): levels, cohorts and the group schema"
```

---

### Task 6: Pure rules: time parsing, schedule and availability validation, readiness, status transitions, read scope

**Files:**
- Create: `apps/server/src/academics/domain/time.ts`, `readiness.ts`, `group-status.ts`, `group-scope.ts`
- Test: `apps/server/src/academics/domain/time.spec.ts`, `readiness.spec.ts`, `group-status.spec.ts`, `group-scope.spec.ts`

**Interfaces:**
- Consumes: `ScheduleSlot`, `AvailabilitySlot`, `Readiness`, `ReadinessKey`, `GroupStatus`, `GroupPaymentStatus`, `AcademicsErrors`, `hasRole`, `hasAnyRole`, `ORG_WIDE_GROUP_READER_ROLES` (Task 1)
- Produces:
  - from `time.ts`:
    - `MINUTES_PER_DAY = 1440`, `MINUTES_PER_WEEK = 10080`
    - `parseHHmm(value: string, allowEndOfDay?: boolean): number | null`
    - `splitWeek(start: number, end: number): [number, number][]`
    - `hasOverlap(intervals: [number, number][]): boolean`
    - `mergeIntervals(intervals: [number, number][]): [number, number][]`
    - `isValidSchedule(slots: ScheduleSlot[]): boolean`
    - `isValidAvailability(slots: AvailabilitySlot[]): boolean`
  - from `readiness.ts`: `interface ReadinessInput { teacherId?: unknown; minStudents: number; students?: { paymentStatus: string }[]; contentSent?: { done?: boolean } | null; meetingLink?: string | null }` and `computeReadiness(group: ReadinessInput): Readiness`
  - from `group-status.ts`:
    - `checkStatusTransition(from: GroupStatus, to: GroupStatus, ctx: { ready: boolean; reason?: string }): AcademicsErrors | null`
    - `shouldRevertToForming(status: GroupStatus, ready: boolean): boolean`
  - from `group-scope.ts`: `type GroupScope` and `resolveGroupScope(actor: { _id: string; roleName: string; additionalRoles?: readonly string[] }): GroupScope`

- [ ] **Step 1: Write the failing tests**

`apps/server/src/academics/domain/time.spec.ts`:
```ts
import { hasOverlap, isValidAvailability, isValidSchedule, mergeIntervals, parseHHmm, splitWeek } from './time';

describe('parseHHmm', () => {
  it('parses 24-hour times', () => {
    expect(parseHHmm('00:00')).toBe(0);
    expect(parseHHmm('09:30')).toBe(570);
    expect(parseHHmm('23:59')).toBe(1439);
  });
  it('rejects malformed times', () => {
    for (const bad of ['9:30', '24:00', '12:60', 'ab:cd', '']) expect(parseHHmm(bad)).toBeNull();
  });
  it('accepts 24:00 only as an end of day', () => {
    expect(parseHHmm('24:00', true)).toBe(1440);
  });
});

describe('interval helpers', () => {
  it('splits an interval that passes the end of the week', () => {
    expect(splitWeek(10050, 10110)).toEqual([[10050, 10080], [0, 30]]);
    expect(splitWeek(100, 200)).toEqual([[100, 200]]);
  });
  it('detects overlap even when a long interval hides behind a short one', () => {
    expect(hasOverlap([[0, 100], [10, 20], [50, 60]])).toBe(true);
    expect(hasOverlap([[0, 10], [10, 20]])).toBe(false);
  });
  it('merges touching and overlapping intervals', () => {
    expect(mergeIntervals([[2880, 2940], [2820, 2880], [0, 10]])).toEqual([[0, 10], [2820, 2940]]);
  });
});

describe('isValidSchedule', () => {
  it('requires at least one slot', () => {
    expect(isValidSchedule([])).toBe(false);
  });
  it('validates day, time and duration bounds', () => {
    expect(isValidSchedule([{ dayOfWeek: 7, startTime: '10:00', durationMinutes: 60 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 10 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 481 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:0', durationMinutes: 60 }])).toBe(false);
  });
  it('rejects overlapping slots, including across the week boundary', () => {
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }, { dayOfWeek: 1, startTime: '10:30', durationMinutes: 60 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }, { dayOfWeek: 0, startTime: '00:00', durationMinutes: 15 }])).toBe(false);
  });
  it('accepts two separate weekly slots', () => {
    expect(isValidSchedule([{ dayOfWeek: 6, startTime: '17:00', durationMinutes: 60 }, { dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 }])).toBe(true);
  });
});

describe('isValidAvailability', () => {
  it('accepts an empty list', () => {
    expect(isValidAvailability([])).toBe(true);
  });
  it('accepts 24:00 as an end time', () => {
    expect(isValidAvailability([{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }])).toBe(true);
  });
  it('rejects end <= start and same-day overlap', () => {
    expect(isValidAvailability([{ dayOfWeek: 1, startTime: '10:00', endTime: '10:00' }])).toBe(false);
    expect(isValidAvailability([{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }, { dayOfWeek: 1, startTime: '11:00', endTime: '13:00' }])).toBe(false);
  });
});
```
`apps/server/src/academics/domain/readiness.spec.ts`:
```ts
import { GroupPaymentStatus, ReadinessKey } from '@darnozom/shared-types';
import { computeReadiness } from './readiness';

const complete = {
  teacherId: 'teacher',
  minStudents: 2,
  students: [{ paymentStatus: GroupPaymentStatus.PAID }, { paymentStatus: GroupPaymentStatus.PAID }],
  contentSent: { done: true },
  meetingLink: 'https://meet.example/abc',
};

const doneOf = (group: Parameters<typeof computeReadiness>[0], key: ReadinessKey) => computeReadiness(group).items.find((i) => i.key === key)?.done;

describe('computeReadiness', () => {
  it('is ready when all five items are done, in the concept order', () => {
    const result = computeReadiness(complete);
    expect(result.ready).toBe(true);
    expect(result.items.map((i) => i.key)).toEqual([
      ReadinessKey.TEACHER_ASSIGNED, ReadinessKey.MINIMUM_STUDENTS, ReadinessKey.PAYMENTS_MADE, ReadinessKey.CONTENT_SENT, ReadinessKey.MEETING_LINK,
    ]);
  });
  it('flags each missing item', () => {
    expect(doneOf({ ...complete, teacherId: null }, ReadinessKey.TEACHER_ASSIGNED)).toBe(false);
    expect(doneOf({ ...complete, minStudents: 3 }, ReadinessKey.MINIMUM_STUDENTS)).toBe(false);
    expect(doneOf({ ...complete, students: [{ paymentStatus: GroupPaymentStatus.PAID }, { paymentStatus: GroupPaymentStatus.UNPAID }] }, ReadinessKey.PAYMENTS_MADE)).toBe(false);
    expect(doneOf({ ...complete, contentSent: { done: false } }, ReadinessKey.CONTENT_SENT)).toBe(false);
    expect(doneOf({ ...complete, meetingLink: '   ' }, ReadinessKey.MEETING_LINK)).toBe(false);
    expect(computeReadiness({ ...complete, meetingLink: undefined }).ready).toBe(false);
  });
  it('does not count payments as made when there are no students', () => {
    expect(doneOf({ ...complete, students: [] }, ReadinessKey.PAYMENTS_MADE)).toBe(false);
  });
});
```
`apps/server/src/academics/domain/group-status.spec.ts`:
```ts
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
    expect(checkStatusTransition(GroupStatus.READY_TO_START, GroupStatus.CANCELLED, { ready: true, reason: '  ' })).toBe(AcademicsErrors.CANCEL_REASON_REQUIRED);
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
```
`apps/server/src/academics/domain/group-scope.spec.ts`:
```ts
import { Roles } from '@darnozom/shared-types';
import { resolveGroupScope } from './group-scope';

describe('resolveGroupScope', () => {
  it('gives org-wide scope to staff readers', () => {
    for (const roleName of [Roles.ADMIN, Roles.SUPER_ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR, Roles.ACCOUNTANT]) {
      expect(resolveGroupScope({ _id: 'u', roleName })).toEqual({ kind: 'ORG' });
    }
  });
  it('prefers org-wide scope when a teacher also holds a staff role', () => {
    expect(resolveGroupScope({ _id: 'u', roleName: Roles.INSTRUCTOR, additionalRoles: [Roles.SUPERVISOR] })).toEqual({ kind: 'ORG' });
  });
  it('limits teachers, parents and students to their own groups', () => {
    expect(resolveGroupScope({ _id: 't', roleName: Roles.INSTRUCTOR })).toEqual({ kind: 'TEACHER', teacherId: 't' });
    expect(resolveGroupScope({ _id: 'p', roleName: Roles.PARENT })).toEqual({ kind: 'PARENT', parentId: 'p' });
    expect(resolveGroupScope({ _id: 's', roleName: Roles.STUDENT })).toEqual({ kind: 'STUDENT', studentId: 's' });
  });
  it('gives no scope to roles without group access', () => {
    expect(resolveGroupScope({ _id: 'u', roleName: Roles.CONTENT_OFFICER })).toEqual({ kind: 'NONE' });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter server exec jest src/academics/domain`
Expected: FAIL. Four suites can't find the modules `./time`, `./readiness`, `./group-status` and `./group-scope`.

- [ ] **Step 3: Implement the rules**

`apps/server/src/academics/domain/time.ts`:
```ts
import { AvailabilitySlot, ScheduleSlot } from '@darnozom/shared-types';

export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes after midnight for "HH:mm"; "24:00" (= 1440) only when allowEndOfDay. Null when invalid. */
export function parseHHmm(value: string, allowEndOfDay = false): number | null {
  if (allowEndOfDay && value === '24:00') return MINUTES_PER_DAY;
  const match = HH_MM.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const isDay = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;

/** Normalises [start, end) onto the week; an interval passing Saturday 24:00 is split in two. */
export function splitWeek(start: number, end: number): [number, number][] {
  const s = ((start % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
  const e = s + (end - start);
  if (e <= MINUTES_PER_WEEK) return [[s, e]];
  return [
    [s, MINUTES_PER_WEEK],
    [0, e - MINUTES_PER_WEEK],
  ];
}

const byStart = (intervals: [number, number][]) => {
  const copy = [...intervals];
  // eslint-disable-next-line unicorn/no-array-sort -- sorting a local copy
  copy.sort((a, b) => a[0] - b[0]);
  return copy;
};

export function hasOverlap(intervals: [number, number][]): boolean {
  let maxEnd = -1;
  for (const [start, end] of byStart(intervals)) {
    if (start < maxEnd) return true;
    maxEnd = Math.max(maxEnd, end);
  }
  return false;
}

export function mergeIntervals(intervals: [number, number][]): [number, number][] {
  const merged: [number, number][] = [];
  for (const [start, end] of byStart(intervals)) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function isValidSchedule(slots: ScheduleSlot[]): boolean {
  if (!Array.isArray(slots) || slots.length === 0) return false;
  const intervals: [number, number][] = [];
  for (const slot of slots) {
    const start = parseHHmm(slot.startTime);
    const duration = slot.durationMinutes;
    if (!isDay(slot.dayOfWeek) || start === null || !Number.isInteger(duration) || duration < 15 || duration > 480) return false;
    const begin = slot.dayOfWeek * MINUTES_PER_DAY + start;
    intervals.push(...splitWeek(begin, begin + duration));
  }
  return !hasOverlap(intervals);
}

export function isValidAvailability(slots: AvailabilitySlot[]): boolean {
  if (!Array.isArray(slots)) return false;
  const intervals: [number, number][] = [];
  for (const slot of slots) {
    const start = parseHHmm(slot.startTime);
    const end = parseHHmm(slot.endTime, true);
    if (!isDay(slot.dayOfWeek) || start === null || end === null || end <= start) return false;
    const dayStart = slot.dayOfWeek * MINUTES_PER_DAY;
    intervals.push([dayStart + start, dayStart + end]);
  }
  return !hasOverlap(intervals);
}
```
`apps/server/src/academics/domain/readiness.ts`:
```ts
import { GroupPaymentStatus, Readiness, ReadinessKey } from '@darnozom/shared-types';

export interface ReadinessInput {
  teacherId?: unknown;
  minStudents: number;
  students?: { paymentStatus: string }[];
  contentSent?: { done?: boolean } | null;
  meetingLink?: string | null;
}

/** The concept's five mandatory readiness items, computed from group data. */
export function computeReadiness(group: ReadinessInput): Readiness {
  const students = group.students ?? [];
  const items = [
    { key: ReadinessKey.TEACHER_ASSIGNED, done: group.teacherId != null },
    { key: ReadinessKey.MINIMUM_STUDENTS, done: students.length >= group.minStudents },
    { key: ReadinessKey.PAYMENTS_MADE, done: students.length > 0 && students.every((s) => s.paymentStatus === GroupPaymentStatus.PAID) },
    { key: ReadinessKey.CONTENT_SENT, done: group.contentSent?.done === true },
    { key: ReadinessKey.MEETING_LINK, done: typeof group.meetingLink === 'string' && group.meetingLink.trim().length > 0 },
  ];
  return { ready: items.every((item) => item.done), items };
}
```
`apps/server/src/academics/domain/group-status.ts`:
```ts
import { AcademicsErrors, GroupStatus } from '@darnozom/shared-types';

/** Null when the user-requested change is allowed, otherwise the error key to throw. */
export function checkStatusTransition(from: GroupStatus, to: GroupStatus, ctx: { ready: boolean; reason?: string }): AcademicsErrors | null {
  if (from === GroupStatus.CANCELLED) return AcademicsErrors.GROUP_CANCELLED;
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
```
`apps/server/src/academics/domain/group-scope.ts`:
```ts
import { hasAnyRole, hasRole, ORG_WIDE_GROUP_READER_ROLES, Roles } from '@darnozom/shared-types';

export type GroupScope =
  | { kind: 'ORG' }
  | { kind: 'TEACHER'; teacherId: string }
  | { kind: 'PARENT'; parentId: string }
  | { kind: 'STUDENT'; studentId: string }
  | { kind: 'NONE' };

/** First matching rule wins: org-wide staff, then teacher, parent, student. */
export function resolveGroupScope(actor: { _id: string; roleName: string; additionalRoles?: readonly string[] }): GroupScope {
  if (hasAnyRole(actor, ORG_WIDE_GROUP_READER_ROLES)) return { kind: 'ORG' };
  if (hasRole(actor, Roles.INSTRUCTOR)) return { kind: 'TEACHER', teacherId: actor._id };
  if (hasRole(actor, Roles.PARENT)) return { kind: 'PARENT', parentId: actor._id };
  if (hasRole(actor, Roles.STUDENT)) return { kind: 'STUDENT', studentId: actor._id };
  return { kind: 'NONE' };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest src/academics/domain`
Expected: PASS. 4 suites: time 13 tests, readiness 3, group-status 6, group-scope 4.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/academics/domain
git commit -m "feat(academics): pure rules for schedules, readiness, status and scope"
```

---

### Task 7: Teacher fit (availability coverage and conflicts across timezones)

**Files:**
- Create: `apps/server/src/academics/domain/teacher-fit.ts`
- Test: `apps/server/src/academics/domain/teacher-fit.spec.ts`

**Interfaces:**
- Consumes: `parseHHmm`, `splitWeek`, `mergeIntervals`, `MINUTES_PER_DAY` (Task 6); `ScheduleSlot`, `AvailabilitySlot`, `TeacherFitReason` (Task 1)
- Produces:
  - `toUtcMinuteOfWeek(dayOfWeek: number, minutesAfterMidnight: number, timezone: string, referenceDate: Date): number`
  - `interface TeacherFitInput { isInstructor: boolean; groupSchedule: ScheduleSlot[]; groupTimezone: string; referenceDate: Date; availability: { timezone: string; slots: AvailabilitySlot[] } | null; otherGroups: { _id: string; name: string; timezone: string; schedule: ScheduleSlot[] }[] }`
  - `interface TeacherFitResult { ok: boolean; reasons: TeacherFitReason[]; conflictingGroups: { _id: string; name: string }[] }`
  - `checkTeacherFit(input: TeacherFitInput): TeacherFitResult`

- [ ] **Step 1: Write the failing test**

`apps/server/src/academics/domain/teacher-fit.spec.ts`:
```ts
import { TeacherFitReason } from '@darnozom/shared-types';
import { checkTeacherFit, TeacherFitInput, toUtcMinuteOfWeek } from './teacher-fit';

const WINTER = new Date('2027-01-04T00:00:00Z'); // Monday; London on GMT (UTC+0)
const SUMMER = new Date('2027-07-05T00:00:00Z'); // Monday; London on BST (UTC+1)

const base = (over: Partial<TeacherFitInput> = {}): TeacherFitInput => ({
  isInstructor: true,
  groupSchedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
  groupTimezone: 'UTC',
  referenceDate: WINTER,
  availability: { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] },
  otherGroups: [],
  ...over,
});

describe('toUtcMinuteOfWeek', () => {
  it('converts a Riyadh local time to UTC minutes of the week', () => {
    // Monday 18:00 Asia/Riyadh (UTC+3) = Monday 15:00 UTC = 1440 + 900
    expect(toUtcMinuteOfWeek(1, 18 * 60, 'Asia/Riyadh', WINTER)).toBe(2340);
  });
});

describe('checkTeacherFit', () => {
  it('fits a slot fully inside availability', () => {
    expect(checkTeacherFit(base())).toEqual({ ok: true, reasons: [], conflictingGroups: [] });
  });

  it('rejects a slot partially outside availability', () => {
    const result = checkTeacherFit(base({ groupSchedule: [{ dayOfWeek: 1, startTime: '11:30', durationMinutes: 60 }] }));
    expect(result.reasons).toEqual([TeacherFitReason.OUTSIDE_AVAILABILITY]);
  });

  it('reports missing availability and non-instructors', () => {
    expect(checkTeacherFit(base({ availability: null })).reasons).toEqual([TeacherFitReason.NO_AVAILABILITY]);
    expect(checkTeacherFit(base({ isInstructor: false })).reasons).toEqual([TeacherFitReason.NOT_INSTRUCTOR]);
  });

  it('reports overlapping groups of the same teacher, but not back-to-back ones', () => {
    const overlapping = { _id: 'g2', name: 'Group B', timezone: 'UTC', schedule: [{ dayOfWeek: 1, startTime: '10:30', durationMinutes: 60 }] };
    const adjacent = { _id: 'g3', name: 'Group C', timezone: 'UTC', schedule: [{ dayOfWeek: 1, startTime: '11:00', durationMinutes: 60 }] };
    const result = checkTeacherFit(base({ otherGroups: [overlapping, adjacent] }));
    expect(result.reasons).toEqual([TeacherFitReason.CONFLICT]);
    expect(result.conflictingGroups).toEqual([{ _id: 'g2', name: 'Group B' }]);
  });

  it('compares across timezones (Riyadh group, London teacher, winter)', () => {
    // Group Mon 18:00 Riyadh = 15:00–16:00 UTC; teacher Mon 14:00–17:00 London (GMT) = 14:00–17:00 UTC
    const result = checkTeacherFit(base({
      groupTimezone: 'Asia/Riyadh',
      groupSchedule: [{ dayOfWeek: 1, startTime: '18:00', durationMinutes: 60 }],
      availability: { timezone: 'Europe/London', slots: [{ dayOfWeek: 1, startTime: '14:00', endTime: '17:00' }] },
    }));
    expect(result.ok).toBe(true);
  });

  it('applies the daylight-saving offset of the reference date', () => {
    // Group Sun 11:00 Riyadh = 08:00 UTC. Teacher Sun 09:00–12:00 London: GMT → 09:00 UTC (outside); BST → 08:00 UTC (inside).
    const input = {
      groupTimezone: 'Asia/Riyadh',
      groupSchedule: [{ dayOfWeek: 0, startTime: '11:00', durationMinutes: 60 }],
      availability: { timezone: 'Europe/London', slots: [{ dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }] },
    };
    expect(checkTeacherFit(base({ ...input, referenceDate: WINTER })).reasons).toEqual([TeacherFitReason.OUTSIDE_AVAILABILITY]);
    expect(checkTeacherFit(base({ ...input, referenceDate: SUMMER })).ok).toBe(true);
  });

  it('fits a slot that crosses midnight when availability is split at 24:00 / 00:00', () => {
    const saturdayLate = base({
      groupSchedule: [{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }, { dayOfWeek: 0, startTime: '00:00', endTime: '01:00' }] },
    });
    expect(checkTeacherFit(saturdayLate).ok).toBe(true);

    const mondayLate = base({
      groupSchedule: [{ dayOfWeek: 1, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '23:00', endTime: '24:00' }, { dayOfWeek: 2, startTime: '00:00', endTime: '01:00' }] },
    });
    expect(checkTeacherFit(mondayLate).ok).toBe(true);

    const missingSunday = base({
      groupSchedule: [{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }] },
    });
    expect(checkTeacherFit(missingSunday).reasons).toEqual([TeacherFitReason.OUTSIDE_AVAILABILITY]);
  });

  it('detects a conflict across the week boundary', () => {
    const result = checkTeacherFit(base({
      groupSchedule: [{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }],
      availability: { timezone: 'UTC', slots: [{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }, { dayOfWeek: 0, startTime: '00:00', endTime: '01:00' }] },
      otherGroups: [{ _id: 'g9', name: 'Early Sunday', timezone: 'UTC', schedule: [{ dayOfWeek: 0, startTime: '00:00', durationMinutes: 15 }] }],
    }));
    expect(result.reasons).toEqual([TeacherFitReason.CONFLICT]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec jest src/academics/domain/teacher-fit.spec.ts`
Expected: FAIL with `Cannot find module './teacher-fit'`.

- [ ] **Step 3: Implement**

`apps/server/src/academics/domain/teacher-fit.ts`:
```ts
import { DateTime } from 'luxon';
import { AvailabilitySlot, ScheduleSlot, TeacherFitReason } from '@darnozom/shared-types';
import { mergeIntervals, MINUTES_PER_DAY, parseHHmm, splitWeek } from './time';

type Interval = [number, number];

/**
 * UTC minutes-of-week (Sunday 00:00 UTC = 0) for a local weekly time, taken in the week that
 * starts at `referenceDate` so that each zone's DST offset for that week is used.
 */
export function toUtcMinuteOfWeek(dayOfWeek: number, minutesAfterMidnight: number, timezone: string, referenceDate: Date): number {
  const reference = DateTime.fromJSDate(referenceDate, { zone: timezone }).startOf('day');
  const targetWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const day = reference.plus({ days: (targetWeekday - reference.weekday + 7) % 7 });
  const local =
    minutesAfterMidnight >= MINUTES_PER_DAY
      ? day.plus({ days: 1 }).startOf('day')
      : day.set({ hour: Math.floor(minutesAfterMidnight / 60), minute: minutesAfterMidnight % 60 });
  const utc = local.toUTC();
  return (utc.weekday % 7) * MINUTES_PER_DAY + utc.hour * 60 + utc.minute;
}

function scheduleToUtc(schedule: ScheduleSlot[], timezone: string, referenceDate: Date): Interval[] {
  return schedule.flatMap((slot) => {
    const start = toUtcMinuteOfWeek(slot.dayOfWeek, parseHHmm(slot.startTime) ?? 0, timezone, referenceDate);
    return splitWeek(start, start + slot.durationMinutes);
  });
}

function availabilityToUtc(slots: AvailabilitySlot[], timezone: string, referenceDate: Date): Interval[] {
  const intervals = slots.flatMap((slot) => {
    const startLocal = parseHHmm(slot.startTime) ?? 0;
    const endLocal = parseHHmm(slot.endTime, true) ?? startLocal;
    const start = toUtcMinuteOfWeek(slot.dayOfWeek, startLocal, timezone, referenceDate);
    return splitWeek(start, start + (endLocal - startLocal));
  });
  return mergeIntervals(intervals);
}

export interface TeacherFitInput {
  isInstructor: boolean;
  groupSchedule: ScheduleSlot[];
  groupTimezone: string;
  referenceDate: Date;
  availability: { timezone: string; slots: AvailabilitySlot[] } | null;
  otherGroups: { _id: string; name: string; timezone: string; schedule: ScheduleSlot[] }[];
}

export interface TeacherFitResult {
  ok: boolean;
  reasons: TeacherFitReason[];
  conflictingGroups: { _id: string; name: string }[];
}

export function checkTeacherFit(input: TeacherFitInput): TeacherFitResult {
  const reasons: TeacherFitReason[] = [];
  if (!input.isInstructor) reasons.push(TeacherFitReason.NOT_INSTRUCTOR);

  const groupIntervals = scheduleToUtc(input.groupSchedule, input.groupTimezone, input.referenceDate);

  if (input.availability) {
    const available = availabilityToUtc(input.availability.slots, input.availability.timezone, input.referenceDate);
    const covered = groupIntervals.every(([start, end]) => available.some(([aStart, aEnd]) => aStart <= start && end <= aEnd));
    if (!covered) reasons.push(TeacherFitReason.OUTSIDE_AVAILABILITY);
  } else {
    reasons.push(TeacherFitReason.NO_AVAILABILITY);
  }

  const conflictingGroups = input.otherGroups
    .filter((other) => {
      const otherIntervals = scheduleToUtc(other.schedule, other.timezone, input.referenceDate);
      return groupIntervals.some(([start, end]) => otherIntervals.some(([oStart, oEnd]) => start < oEnd && oStart < end));
    })
    .map((other) => ({ _id: other._id, name: other.name }));
  if (conflictingGroups.length > 0) reasons.push(TeacherFitReason.CONFLICT);

  return { ok: reasons.length === 0, reasons, conflictingGroups };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest src/academics/domain/teacher-fit.spec.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/academics/domain/teacher-fit.ts apps/server/src/academics/domain/teacher-fit.spec.ts
git commit -m "feat(academics): teacher fit across timezones, DST and week boundaries"
```

---

### Task 8: Teacher availability module

**Files:**
- Create: `apps/server/src/academics/teacher-availability/entities/teacher-availability.entity.ts`, `apps/server/src/academics/teacher-availability/dto/teacher-availability.dto.ts`, `apps/server/src/academics/teacher-availability/teacher-availability.service.ts`, `apps/server/src/academics/teacher-availability/teacher-availability.controller.message.ts`
- Test: `apps/server/src/academics/teacher-availability/teacher-availability.service.spec.ts`
- Modify: `apps/server/src/academics/academics.module.ts`

**Interfaces:**
- Consumes: `isValidAvailability` (Task 6); `checkTeacherFit` (Task 7); `Group`, `Cohort` models (Task 5); `hasRole`, `hasAnyRole`, `ORG_WIDE_GROUP_READER_ROLES`, `Roles` (Task 1)
- Produces:
  - the `TeacherAvailability` entity: `{ organizationId, teacherId (unique), timezone, slots: AvailabilitySlot[] }`
  - `TeacherAvailabilityService` methods: `getMine(actor)`, `putMine(actor, { timezone, slots })`, `getForTeacher(actor, teacherId)`. Each returns `{ teacherId: string; timezone: string | null; slots: AvailabilitySlot[] }`.
  - NATS patterns `academics.teacherAvailability.{getMine, putMine, getForTeacher}`

- [ ] **Step 1: Write the failing test**

`apps/server/src/academics/teacher-availability/teacher-availability.service.spec.ts`:
```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, GroupStatus, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { TeacherAvailabilityService } from './teacher-availability.service';

const teacher: AcademicsActor = { _id: '64b0000000000000000000a1', organizationId: '64b0000000000000000000bb', roleName: Roles.INSTRUCTOR, additionalRoles: [] };
const cohortId = '64b0000000000000000000c1';

function setup() {
  const availabilityModel = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
  const groupModel = { find: jest.fn() };
  const cohortModel = { find: jest.fn() };
  const service = new TeacherAvailabilityService(availabilityModel as never, groupModel as never, cohortModel as never);
  return { service, availabilityModel, groupModel, cohortModel };
}

const monday9to12 = { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] };

describe('TeacherAvailabilityService', () => {
  it('returns an empty availability when none is saved', async () => {
    const { service, availabilityModel } = setup();
    availabilityModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.getMine(teacher)).resolves.toEqual({ teacherId: teacher._id, timezone: null, slots: [] });
  });

  it('only lets instructors save availability', async () => {
    const { service } = setup();
    await expect(service.putMine({ ...teacher, roleName: Roles.COORDINATOR }, monday9to12)).rejects.toThrow(new ForbiddenException(AcademicsErrors.NOT_AN_INSTRUCTOR));
  });

  it('rejects invalid slots', async () => {
    const { service } = setup();
    await expect(service.putMine(teacher, { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '12:00', endTime: '09:00' }] })).rejects.toThrow(new BadRequestException(AcademicsErrors.INVALID_AVAILABILITY));
  });

  it('rejects availability that no longer covers an assigned group, naming the group', async () => {
    const { service, groupModel, cohortModel, availabilityModel } = setup();
    groupModel.find.mockReturnValue(mockQuery([
      { _id: 'g1', name: 'Group A', timezone: 'UTC', cohortId, status: GroupStatus.FORMING, schedule: [{ dayOfWeek: 2, startTime: '10:00', durationMinutes: 60 }] },
    ]));
    cohortModel.find.mockReturnValue(mockQuery([{ _id: cohortId, startDate: new Date('2027-01-04T00:00:00Z') }]));
    await expect(service.putMine(teacher, monday9to12)).rejects.toThrow(new ConflictException(`${AcademicsErrors.AVAILABILITY_CONFLICTS_WITH_GROUPS}|Group A`));
    expect(availabilityModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('saves availability that still covers every assigned group', async () => {
    const { service, groupModel, cohortModel, availabilityModel } = setup();
    groupModel.find.mockReturnValue(mockQuery([
      { _id: 'g1', name: 'Group A', timezone: 'UTC', cohortId, status: GroupStatus.FORMING, schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }] },
    ]));
    cohortModel.find.mockReturnValue(mockQuery([{ _id: cohortId, startDate: new Date('2027-01-04T00:00:00Z') }]));
    availabilityModel.findOneAndUpdate.mockReturnValue(mockQuery({ teacherId: teacher._id, ...monday9to12 }));
    await expect(service.putMine(teacher, monday9to12)).resolves.toEqual({ teacherId: teacher._id, ...monday9to12 });
    expect(availabilityModel.findOneAndUpdate.mock.calls[0][2]).toMatchObject({ upsert: true });
  });

  it('hides other teachers availability from non-staff', async () => {
    const { service } = setup();
    await expect(service.getForTeacher(teacher, '64b0000000000000000000a2')).rejects.toThrow(new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec jest src/academics/teacher-availability`
Expected: FAIL with `Cannot find module './teacher-availability.service'`.

- [ ] **Step 3: Implement the entity, DTO and service**

`apps/server/src/academics/teacher-availability/entities/teacher-availability.entity.ts`:
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class AvailabilityWindow {
  @Prop({ type: Number, required: true, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: String, required: true })
  endTime: string;
}
export const AvailabilityWindowSchema = SchemaFactory.createForClass(AvailabilityWindow);

@Schema({ timestamps: true })
export class TeacherAvailability extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  teacherId: Types.ObjectId;

  @Prop({ type: String, required: true })
  timezone: string;

  @Prop({ type: [AvailabilityWindowSchema], default: [] })
  slots: AvailabilityWindow[];
}

export const TeacherAvailabilitySchema = SchemaFactory.createForClass(TeacherAvailability);
```
`apps/server/src/academics/teacher-availability/dto/teacher-availability.dto.ts`:
```ts
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsMongoId, Matches, Max, Min, ValidateNested } from 'class-validator';
import { IsIanaTimeZone } from 'src/utils/validators/is-iana-timezone.validator';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/)
  endTime!: string;
}

export class PutAvailabilityDto {
  @IsIanaTimeZone()
  timezone!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}

export class TeacherIdPayload {
  @IsMongoId()
  teacherId!: string;
}
```
`apps/server/src/academics/teacher-availability/teacher-availability.service.ts`:
```ts
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AvailabilitySlot, GroupStatus, hasAnyRole, hasRole, ORG_WIDE_GROUP_READER_ROLES, Roles } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { checkTeacherFit } from '../domain/teacher-fit';
import { isValidAvailability } from '../domain/time';
import { Group } from '../group/entities/group.entity';
import { PutAvailabilityDto } from './dto/teacher-availability.dto';
import { TeacherAvailability } from './entities/teacher-availability.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface AvailabilityView {
  teacherId: string;
  timezone: string | null;
  slots: AvailabilitySlot[];
}

@Injectable()
export class TeacherAvailabilityService {
  constructor(
    @InjectModel(TeacherAvailability.name) private readonly availabilityModel: Model<TeacherAvailability>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>
  ) {}

  private toView(teacherId: string, doc: { timezone: string; slots: AvailabilitySlot[] } | null): AvailabilityView {
    if (!doc) return { teacherId, timezone: null, slots: [] };
    return { teacherId, timezone: doc.timezone, slots: doc.slots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })) };
  }

  async getMine(actor: AcademicsActor): Promise<AvailabilityView> {
    const doc = await this.availabilityModel.findOne({ teacherId: oid(actor._id) }).lean().exec();
    return this.toView(actor._id, doc);
  }

  async getForTeacher(actor: AcademicsActor, teacherId: string): Promise<AvailabilityView> {
    if (teacherId !== actor._id && !hasAnyRole(actor, ORG_WIDE_GROUP_READER_ROLES)) {
      throw new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION);
    }
    const doc = await this.availabilityModel.findOne({ teacherId: oid(teacherId), organizationId: oid(actor.organizationId) }).lean().exec();
    return this.toView(teacherId, doc);
  }

  async putMine(actor: AcademicsActor, dto: PutAvailabilityDto): Promise<AvailabilityView> {
    if (!hasRole(actor, Roles.INSTRUCTOR)) throw new ForbiddenException(AcademicsErrors.NOT_AN_INSTRUCTOR);
    if (!isValidAvailability(dto.slots)) throw new BadRequestException(AcademicsErrors.INVALID_AVAILABILITY);

    const groups = await this.groupModel
      .find({ teacherId: oid(actor._id), status: { $ne: GroupStatus.CANCELLED }, deletedAt: null })
      .select('_id name schedule timezone cohortId status')
      .lean()
      .exec();
    if (groups.length > 0) {
      const cohorts = await this.cohortModel
        .find({ _id: { $in: groups.map((g) => g.cohortId) } })
        .select('_id startDate')
        .lean()
        .exec();
      const startDates = new Map(cohorts.map((c) => [String(c._id), c.startDate]));
      const uncovered = groups.filter(
        (group) =>
          !checkTeacherFit({
            isInstructor: true,
            groupSchedule: group.schedule,
            groupTimezone: group.timezone,
            referenceDate: startDates.get(String(group.cohortId)) ?? new Date(),
            availability: { timezone: dto.timezone, slots: dto.slots },
            otherGroups: [],
          }).ok
      );
      if (uncovered.length > 0) {
        throw new ConflictException(`${AcademicsErrors.AVAILABILITY_CONFLICTS_WITH_GROUPS}|${uncovered.map((g) => g.name).join(', ')}`);
      }
    }

    const saved = await this.availabilityModel
      .findOneAndUpdate(
        { teacherId: oid(actor._id) },
        { $set: { organizationId: oid(actor.organizationId), timezone: dto.timezone, slots: dto.slots } },
        { upsert: true, new: true, runValidators: true }
      )
      .lean()
      .exec();
    return this.toView(actor._id, saved);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest src/academics/teacher-availability`
Expected: PASS, 6 tests.

- [ ] **Step 5: Controller and module wiring**

`apps/server/src/academics/teacher-availability/teacher-availability.controller.message.ts`:
```ts
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { PutAvailabilityDto, TeacherIdPayload } from './dto/teacher-availability.dto';
import { TeacherAvailabilityService } from './teacher-availability.service';

@Controller()
@ApplyRpcErrorHandling
export class TeacherAvailabilityControllerMessage {
  constructor(private readonly availabilityService: TeacherAvailabilityService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY })
  @MessagePattern('academics.teacherAvailability.getMine')
  getMine(@Ctx() context: IUserContext) {
    return this.availabilityService.getMine(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.TEACHER_AVAILABILITY })
  @MessagePattern('academics.teacherAvailability.putMine')
  putMine(@Payload(new RpcValidationPipe()) payload: PutAvailabilityDto, @Ctx() context: IUserContext) {
    return this.availabilityService.putMine(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY })
  @MessagePattern('academics.teacherAvailability.getForTeacher')
  getForTeacher(@Payload(new RpcValidationPipe()) payload: TeacherIdPayload, @Ctx() context: IUserContext) {
    return this.availabilityService.getForTeacher(actorFromContext(context), payload.teacherId);
  }
}
```
In `academics.module.ts`:
- add `{ name: TeacherAvailability.name, schema: TeacherAvailabilitySchema }` to `forFeature`
- add `TeacherAvailabilityControllerMessage` to `controllers` and `TeacherAvailabilityService` to `providers`
- add the matching imports

- [ ] **Step 6: Run the tests and the type-check, then commit**

Run:
```bash
pnpm --filter server exec jest src/academics
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task8-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task8-server.txt | sort)
```
Expected: jest PASS (all academics suites so far); no `>` lines.
```bash
git add apps/server/src/academics
git commit -m "feat(academics): teacher weekly availability"
```

---

### Task 9: Group core: state service, create/read/update/delete, ready, cancel, content sent

**Files:**
- Create: `apps/server/src/academics/group/group.types.ts`, `apps/server/src/academics/group/dto/group.dto.ts`, `apps/server/src/academics/group/group-state.service.ts`, `apps/server/src/academics/group/group.service.ts`, `apps/server/src/academics/group/group.controller.message.ts`
- Test: `apps/server/src/academics/group/group-state.service.spec.ts`, `apps/server/src/academics/group/group.service.spec.ts`
- Modify: `apps/server/src/academics/academics.module.ts`

**Interfaces:**
- Consumes:
  - `computeReadiness`, `checkStatusTransition`, `shouldRevertToForming`, `resolveGroupScope`, `isValidSchedule` (Task 6)
  - the `Group`, `Cohort` and `Level` models (Task 5)
  - `ParentService.validateParentChildLink(parentId: Types.ObjectId, childId: Types.ObjectId): Promise<void>`, which throws `ForbiddenException(ParentErrors.CHILD_NOT_LINKED)`
- Produces:
  - `GroupLean` (the plain group document type) and `GroupView = GroupLean & { readiness: Readiness }`
  - `GroupStateService` methods:
    - `toView(group): GroupView`
    - `loadInOrg(actor, id): Promise<GroupLean>`: 404 `GROUP_NOT_FOUND`
    - `loadForWrite(actor, id): Promise<GroupLean>`: also 409 `GROUP_CANCELLED`
    - `syncReadiness(groupId): Promise<GroupView>`: automatically reverts READY_TO_START → FORMING when readiness is lost
  - `GroupService` methods:
    - `findAll(actor, query): Promise<GroupView[]>`
    - `findOne(actor, id): Promise<GroupDetailView>`
    - `create(actor, dto)`, `update(actor, id, dto)`, `remove(actor, id)`, `markReady(actor, id)`, `cancel(actor, id, reason)`, `setContentSent(actor, id, done)`
    - PARENT and STUDENT readers get only their own children's (or their own) `students` entries and an empty `statusHistory`.
  - NATS patterns `academics.groups.{findAll, findOne, create, update, delete, markReady, cancel, setContentSent}`. Every group response is a `GroupView`; `findOne` returns a `GroupDetailView`.

- [ ] **Step 1: Types and DTOs**

`apps/server/src/academics/group/group.types.ts`:
```ts
import { Types } from 'mongoose';
import { GroupPaymentStatus, GroupStatus, Readiness, ScheduleSlot } from '@darnozom/shared-types';

export interface GroupStudentLean {
  studentId: Types.ObjectId;
  paymentStatus: GroupPaymentStatus;
  whatsappAdded: boolean;
  addedAt: Date;
  addedBy?: Types.ObjectId;
}

export interface GroupLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  cohortId: Types.ObjectId;
  levelId: Types.ObjectId;
  courseId: Types.ObjectId;
  name: string;
  teacherId: Types.ObjectId | null;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  meetingLink?: string | null;
  whatsappGroupLink?: string | null;
  contentSent: { done: boolean; by?: Types.ObjectId; at?: Date };
  students: GroupStudentLean[];
  status: GroupStatus;
  statusHistory: { from: GroupStatus | null; to: GroupStatus; by: Types.ObjectId | null; at: Date; reason?: string }[];
}

export type GroupView = GroupLean & { readiness: Readiness };

/** findOne adds display names (id → "First Last") for the teacher and every visible student. */
export type GroupDetailView = GroupView & { people: Record<string, string> };
```
`apps/server/src/academics/group/dto/group.dto.ts`:
```ts
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, IsUrl,
  Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { GroupPaymentStatus, GroupStatus } from '@darnozom/shared-types';
import { IsIanaTimeZone } from 'src/utils/validators/is-iana-timezone.validator';

export class ScheduleSlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes!: number;
}

export class CreateGroupDto {
  @IsMongoId()
  cohortId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule!: ScheduleSlotDto[];

  @IsIanaTimeZone()
  timezone!: string;

  @IsInt()
  @Min(1)
  @Max(500)
  minStudents!: number;

  @IsInt()
  @Min(1)
  @Max(500)
  maxStudents!: number;

  /** null clears the link */
  @IsOptional()
  @IsUrl()
  meetingLink?: string | null;

  /** null clears the link */
  @IsOptional()
  @IsUrl()
  whatsappGroupLink?: string | null;
}

export class UpdateGroupDto extends PartialType(OmitType(CreateGroupDto, ['cohortId'] as const)) {}

export class UpdateGroupPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateGroupDto)
  data!: UpdateGroupDto;
}

export class FindGroupsPayload {
  @IsOptional()
  @IsMongoId()
  cohortId?: string;

  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsMongoId()
  childId?: string;
}

export class CancelGroupPayload {
  @IsMongoId()
  id!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ContentSentPayload {
  @IsMongoId()
  id!: string;

  @IsBoolean()
  done!: boolean;
}

export class StudentCandidatesPayload {
  @IsMongoId()
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class GroupStudentPayload {
  @IsMongoId()
  id!: string;

  @IsMongoId()
  studentId!: string;
}

export class PaymentStatusPayload extends GroupStudentPayload {
  @IsEnum(GroupPaymentStatus)
  paymentStatus!: GroupPaymentStatus;
}

export class WhatsappPayload extends GroupStudentPayload {
  @IsBoolean()
  whatsappAdded!: boolean;
}

export class AssignTeacherPayload {
  @IsMongoId()
  id!: string;

  @IsMongoId()
  teacherId!: string;
}
```

- [ ] **Step 2: Write the failing state-service test**

`apps/server/src/academics/group/group-state.service.spec.ts`:
```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, READINESS_LOST_REASON, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupStateService } from './group-state.service';

const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: Roles.COORDINATOR, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');

const group = (over: Record<string, unknown> = {}) => ({
  _id: groupId, status: GroupStatus.FORMING, teacherId: null, minStudents: 1, students: [], contentSent: { done: false }, meetingLink: null, ...over,
});

function setup() {
  const groupModel = { findOne: jest.fn(), updateOne: jest.fn() };
  return { service: new GroupStateService(groupModel as never), groupModel };
}

describe('GroupStateService', () => {
  it('404s for groups outside the actor organization', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.loadInOrg(actor, String(groupId))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
    expect(String(groupModel.findOne.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
  });

  it('refuses writes to cancelled groups', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(group({ status: GroupStatus.CANCELLED })));
    await expect(service.loadForWrite(actor, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_CANCELLED));
  });

  it('reverts a READY_TO_START group that lost readiness', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(group({ status: GroupStatus.READY_TO_START })));
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));

    const view = await service.syncReadiness(groupId);

    expect(view.status).toBe(GroupStatus.FORMING);
    expect(view.readiness.ready).toBe(false);
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: groupId, status: GroupStatus.READY_TO_START });
    expect(update.$set).toEqual({ status: GroupStatus.FORMING });
    expect(update.$push.statusHistory).toMatchObject({ from: GroupStatus.READY_TO_START, to: GroupStatus.FORMING, by: null, reason: READINESS_LOST_REASON });
  });

  it('leaves a group that is still ready alone', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(group({
      status: GroupStatus.READY_TO_START, teacherId: new Types.ObjectId(), students: [{ paymentStatus: 'PAID' }], contentSent: { done: true }, meetingLink: 'https://m.example/x',
    })));
    const view = await service.syncReadiness(groupId);
    expect(view.status).toBe(GroupStatus.READY_TO_START);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter server exec jest src/academics/group/group-state.service.spec.ts`
Expected: FAIL with `Cannot find module './group-state.service'`.

- [ ] **Step 4: Implement GroupStateService**

`apps/server/src/academics/group/group-state.service.ts`:
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, READINESS_LOST_REASON } from '@darnozom/shared-types';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { shouldRevertToForming } from '../domain/group-status';
import { computeReadiness } from '../domain/readiness';
import { Group } from './entities/group.entity';
import { GroupLean, GroupView } from './group.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class GroupStateService {
  constructor(@InjectModel(Group.name) private readonly groupModel: Model<Group>) {}

  toView(group: GroupLean): GroupView {
    return { ...group, readiness: computeReadiness(group) };
  }

  async loadInOrg(actor: AcademicsActor, id: string): Promise<GroupLean> {
    const group = await this.groupModel
      .findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) }))
      .lean<GroupLean>()
      .exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    return group;
  }

  async loadForWrite(actor: AcademicsActor, id: string): Promise<GroupLean> {
    const group = await this.loadInOrg(actor, id);
    if (group.status === GroupStatus.CANCELLED) throw new ConflictException(AcademicsErrors.GROUP_CANCELLED);
    return group;
  }

  /** Call after every write that can affect readiness. */
  async syncReadiness(groupId: string | Types.ObjectId): Promise<GroupView> {
    const group = await this.groupModel.findOne({ _id: oid(groupId) }).lean<GroupLean>().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const readiness = computeReadiness(group);
    if (!shouldRevertToForming(group.status, readiness.ready)) return { ...group, readiness };

    await this.groupModel
      .updateOne(
        { _id: group._id, status: GroupStatus.READY_TO_START },
        {
          $set: { status: GroupStatus.FORMING },
          $push: { statusHistory: { from: GroupStatus.READY_TO_START, to: GroupStatus.FORMING, by: null, at: new Date(), reason: READINESS_LOST_REASON } },
        }
      )
      .exec();
    return { ...group, status: GroupStatus.FORMING, readiness };
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm --filter server exec jest src/academics/group/group-state.service.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write the failing GroupService test**

`apps/server/src/academics/group/group.service.spec.ts`:
```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupPaymentStatus, GroupStatus, ParentErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { computeReadiness } from '../domain/readiness';
import { GroupService } from './group.service';

const ORG = '64b0000000000000000000bb';
const staff: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const teacher: AcademicsActor = { _id: '64b0000000000000000000a1', organizationId: ORG, roleName: Roles.INSTRUCTOR, additionalRoles: [] };
const parent: AcademicsActor = { _id: '64b0000000000000000000a2', organizationId: ORG, roleName: Roles.PARENT, additionalRoles: [] };
const contentOfficer: AcademicsActor = { _id: '64b0000000000000000000a3', organizationId: ORG, roleName: Roles.CONTENT_OFFICER, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const cohortId = '64b000000000000000000022';
const levelId = new Types.ObjectId('64b000000000000000000033');
const courseId = new Types.ObjectId('64b000000000000000000044');

const baseGroup = (over: Record<string, unknown> = {}) => ({
  _id: groupId, organizationId: new Types.ObjectId(ORG), name: 'G', status: GroupStatus.FORMING, teacherId: null, minStudents: 1, maxStudents: 2,
  students: [], contentSent: { done: false }, meetingLink: null, schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }], timezone: 'UTC', ...over,
});

const validDto = {
  cohortId, name: ' Group A ', schedule: [{ dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 }], timezone: 'Asia/Riyadh', minStudents: 3, maxStudents: 8,
};

function setup() {
  const groupModel = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const cohortModel = { findOne: jest.fn() };
  const levelModel = { findOne: jest.fn() };
  const userModel = { findOne: jest.fn(), find: jest.fn() };
  const state = {
    toView: jest.fn((g) => ({ ...g, readiness: computeReadiness(g) })),
    loadInOrg: jest.fn(),
    loadForWrite: jest.fn(),
    syncReadiness: jest.fn(async (id) => ({ _id: id, synced: true })),
  };
  const parentService = { validateParentChildLink: jest.fn() };
  const groupTeacher = { assertScheduleChangeFits: jest.fn().mockResolvedValue(undefined) };
  const service = new GroupService(groupModel as never, cohortModel as never, levelModel as never, userModel as never, state as never, parentService as never, groupTeacher as never);
  return { service, groupModel, cohortModel, levelModel, userModel, state, parentService, groupTeacher };
}

describe('GroupService', () => {
  describe('create', () => {
    it('404s when the cohort is not in the organization', async () => {
      const { service, cohortModel } = setup();
      cohortModel.findOne.mockReturnValue(mockQuery(null));
      await expect(service.create(staff, validDto)).rejects.toThrow(new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND));
    });

    it('rejects an invalid schedule and max below min', async () => {
      const { service, cohortModel, levelModel, groupModel } = setup();
      cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, levelId }));
      levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
      const overlapping = [{ dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 }, { dayOfWeek: 1, startTime: '17:30', durationMinutes: 60 }];
      await expect(service.create(staff, { ...validDto, schedule: overlapping })).rejects.toThrow(new BadRequestException(AcademicsErrors.INVALID_SCHEDULE));
      await expect(service.create(staff, { ...validDto, minStudents: 5, maxStudents: 4 })).rejects.toThrow(new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS));
      expect(groupModel.create).not.toHaveBeenCalled();
    });

    it('copies level and course from the cohort and returns readiness', async () => {
      const { service, cohortModel, levelModel, groupModel } = setup();
      cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, levelId }));
      levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
      groupModel.create.mockImplementation(async (doc) => ({ toObject: () => ({ ...doc, _id: groupId, students: [], contentSent: { done: false }, status: GroupStatus.FORMING }) }));

      const view = await service.create(staff, validDto);

      const created = groupModel.create.mock.calls[0][0];
      expect(created.levelId).toBe(levelId);
      expect(created.courseId).toBe(courseId);
      expect(created.name).toBe('Group A');
      expect(view.readiness.ready).toBe(false);
    });
  });

  describe('read scoping', () => {
    it('forces teachers to their own groups even if another teacherId is requested', async () => {
      const { service, groupModel } = setup();
      groupModel.find.mockReturnValue(mockQuery([]));
      await service.findAll(teacher, { teacherId: '64b0000000000000000000ff' });
      expect(String(groupModel.find.mock.calls[0][0].teacherId)).toBe(teacher._id);
    });

    it('parent filtering by a child that is not theirs is rejected', async () => {
      const { service, parentService, groupModel } = setup();
      parentService.validateParentChildLink.mockRejectedValue(new ForbiddenException(ParentErrors.CHILD_NOT_LINKED));
      await expect(service.findAll(parent, { childId: '64b0000000000000000000c9' })).rejects.toThrow(new ForbiddenException(ParentErrors.CHILD_NOT_LINKED));
      expect(groupModel.find).not.toHaveBeenCalled();
    });

    it('limits parents without a childId to their children', async () => {
      const { service, userModel, groupModel } = setup();
      const childIds = [new Types.ObjectId()];
      userModel.findOne.mockReturnValue(mockQuery({ childUsersIds: childIds }));
      groupModel.find.mockReturnValue(mockQuery([]));
      await service.findAll(parent, {});
      expect(groupModel.find.mock.calls[0][0]['students.studentId']).toEqual({ $in: childIds });
    });

    it('parents only see their own children entries and no status history', async () => {
      const { service, userModel, groupModel } = setup();
      const child = new Types.ObjectId();
      userModel.findOne.mockReturnValue(mockQuery({ childUsersIds: [child] }));
      groupModel.find.mockReturnValue(mockQuery([
        baseGroup({
          students: [{ studentId: child, paymentStatus: GroupPaymentStatus.PAID }, { studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.UNPAID }],
          statusHistory: [{ to: GroupStatus.FORMING }],
        }),
      ]));
      const [view] = await service.findAll(parent, {});
      expect(view.students).toHaveLength(1);
      expect(String(view.students[0].studentId)).toBe(String(child));
      expect(view.statusHistory).toEqual([]);
    });

    it('returns display names for the teacher and visible students', async () => {
      const { service, groupModel, userModel } = setup();
      const teacherId = new Types.ObjectId();
      const studentId = new Types.ObjectId();
      groupModel.findOne.mockReturnValue(mockQuery(baseGroup({ teacherId, students: [{ studentId, paymentStatus: GroupPaymentStatus.UNPAID }] })));
      userModel.find.mockReturnValue(mockQuery([
        { _id: teacherId, firstName: 'Amina', lastName: 'K' },
        { _id: studentId, firstName: 'Sara' },
      ]));
      const view = await service.findOne(staff, String(groupId));
      expect(view.people).toEqual({ [String(teacherId)]: 'Amina K', [String(studentId)]: 'Sara' });
    });

    it('returns nothing for roles without group scope', async () => {
      const { service, groupModel } = setup();
      await expect(service.findAll(contentOfficer, {})).resolves.toEqual([]);
      expect(groupModel.find).not.toHaveBeenCalled();
    });

    it('404s a group of another organization for staff', async () => {
      const { service, groupModel } = setup();
      groupModel.findOne.mockReturnValue(mockQuery(null));
      await expect(service.findOne(staff, String(groupId))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
      expect(String(groupModel.findOne.mock.calls[0][0].organizationId)).toBe(ORG);
    });
  });

  describe('status', () => {
    it('refuses READY_TO_START while readiness items are missing', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup());
      await expect(service.markReady(staff, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_NOT_READY));
      expect(groupModel.updateOne).not.toHaveBeenCalled();
    });

    it('moves a ready group to READY_TO_START with history', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup({
        teacherId: new Types.ObjectId(), students: [{ studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.PAID }], contentSent: { done: true }, meetingLink: 'https://m.example/x',
      }));
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.markReady(staff, String(groupId));
      const [filter, update] = groupModel.updateOne.mock.calls[0];
      expect(filter).toEqual({ _id: groupId, status: GroupStatus.FORMING });
      expect(update.$set).toEqual({ status: GroupStatus.READY_TO_START });
      expect(update.$push.statusHistory).toMatchObject({ from: GroupStatus.FORMING, to: GroupStatus.READY_TO_START });
    });

    it('requires a reason to cancel', async () => {
      const { service, state } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup());
      await expect(service.cancel(staff, String(groupId), '  ')).rejects.toThrow(new BadRequestException(AcademicsErrors.CANCEL_REASON_REQUIRED));
    });

    it('cancels with the reason in history', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup());
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.cancel(staff, String(groupId), ' no teacher ');
      expect(groupModel.updateOne.mock.calls[0][1].$push.statusHistory).toMatchObject({ to: GroupStatus.CANCELLED, reason: 'no teacher' });
    });
  });

  describe('update and delete', () => {
    it('rejects maxStudents below the current number of students', async () => {
      const { service, state } = setup();
      state.loadForWrite.mockResolvedValue(baseGroup({ students: [{}, {}] }));
      await expect(service.update(staff, String(groupId), { maxStudents: 1, minStudents: 1 })).rejects.toThrow(new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS));
    });

    it('re-checks teacher fit when the schedule or timezone changes', async () => {
      const { service, state, groupModel, groupTeacher } = setup();
      const group = baseGroup({ teacherId: new Types.ObjectId() });
      state.loadForWrite.mockResolvedValue(group);
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.update(staff, String(groupId), { timezone: 'Asia/Riyadh' });
      expect(groupTeacher.assertScheduleChangeFits).toHaveBeenCalledWith(staff, group, { schedule: group.schedule, timezone: 'Asia/Riyadh' });
    });

    it('does not re-check teacher fit for unrelated edits', async () => {
      const { service, state, groupModel, groupTeacher } = setup();
      state.loadForWrite.mockResolvedValue(baseGroup());
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.update(staff, String(groupId), { meetingLink: 'https://m.example/x' });
      expect(groupTeacher.assertScheduleChangeFits).not.toHaveBeenCalled();
      expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
    });

    it('only deletes forming or cancelled groups', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup({ status: GroupStatus.READY_TO_START }));
      await expect(service.remove(staff, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_DELETE_NOT_ALLOWED));
      expect(groupModel.updateOne).not.toHaveBeenCalled();
    });
  });

  it('records who marked content as sent and re-evaluates readiness', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(baseGroup());
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await service.setContentSent(staff, String(groupId), true);
    const set = groupModel.updateOne.mock.calls[0][1].$set.contentSent;
    expect(set.done).toBe(true);
    expect(String(set.by)).toBe(staff._id);
    expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
  });
});
```
> `GroupService` takes `GroupTeacherService` as its last constructor parameter (`groupTeacher.assertScheduleChangeFits`), but that service is implemented in Task 11. In this task, create it as a minimal provider whose `assertScheduleChangeFits` resolves immediately (Step 7). Task 11 replaces the body.

- [ ] **Step 7: Run it to verify it fails, then implement GroupService and the GroupTeacherService stub**

Run: `pnpm --filter server exec jest src/academics/group/group.service.spec.ts`
Expected: FAIL with `Cannot find module './group.service'`.

`apps/server/src/academics/group/group-teacher.service.ts` (stub; Task 11 replaces it in full):
```ts
import { Injectable } from '@nestjs/common';
import { ScheduleSlot } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { GroupLean } from './group.types';

@Injectable()
export class GroupTeacherService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- replaced in Task 11
  async assertScheduleChangeFits(_actor: AcademicsActor, _group: GroupLean, _next: { schedule: ScheduleSlot[]; timezone: string }): Promise<void> {}
}
```
`apps/server/src/academics/group/group.service.ts`:
```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages, GroupStatus } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { ParentService } from 'src/user/services/parent.service';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { resolveGroupScope } from '../domain/group-scope';
import { checkStatusTransition } from '../domain/group-status';
import { computeReadiness } from '../domain/readiness';
import { isValidSchedule } from '../domain/time';
import { Level } from '../level/entities/level.entity';
import { CreateGroupDto, FindGroupsPayload, UpdateGroupDto } from './dto/group.dto';
import { Group } from './entities/group.entity';
import { GroupStateService } from './group-state.service';
import { GroupTeacherService } from './group-teacher.service';
import { GroupDetailView, GroupLean, GroupView } from './group.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly state: GroupStateService,
    private readonly parentService: ParentService,
    private readonly groupTeacher: GroupTeacherService
  ) {}

  /** Null means the actor may not read any group. visibleStudentIds limits which student entries are returned (null = all). */
  private async resolveScope(actor: AcademicsActor, childId?: string): Promise<{ filter: FilterQuery<Group>; visibleStudentIds: string[] | null } | null> {
    const scope = resolveGroupScope(actor);
    switch (scope.kind) {
      case 'ORG': {
        return { filter: { organizationId: oid(actor.organizationId), ...(childId ? { 'students.studentId': oid(childId) } : {}) }, visibleStudentIds: null };
      }
      case 'TEACHER': {
        return { filter: { teacherId: oid(scope.teacherId) }, visibleStudentIds: null };
      }
      case 'PARENT': {
        if (childId) {
          await this.parentService.validateParentChildLink(oid(scope.parentId), oid(childId));
          return { filter: { 'students.studentId': oid(childId) }, visibleStudentIds: [childId] };
        }
        const parentDoc = await this.userModel.findOne({ _id: oid(scope.parentId) }).select('childUsersIds').lean<{ childUsersIds?: Types.ObjectId[] }>().exec();
        const childIds = parentDoc?.childUsersIds ?? [];
        return { filter: { 'students.studentId': { $in: childIds } }, visibleStudentIds: childIds.map(String) };
      }
      case 'STUDENT': {
        return { filter: { 'students.studentId': oid(scope.studentId) }, visibleStudentIds: [scope.studentId] };
      }
      default: {
        return null;
      }
    }
  }

  /** Families see only their own children's entries (not other children's payment status) and no status history. */
  private present(group: GroupLean, visibleStudentIds: string[] | null): GroupView {
    const view = this.state.toView(group);
    if (!visibleStudentIds) return view;
    return { ...view, students: view.students.filter((s) => visibleStudentIds.includes(String(s.studentId))), statusHistory: [] };
  }

  private async peopleNames(view: GroupView): Promise<Record<string, string>> {
    const ids = [...view.students.map((s) => s.studentId), ...(view.teacherId ? [view.teacherId] : [])];
    if (ids.length === 0) return {};
    const users = await this.userModel
      .find({ _id: { $in: ids } })
      .select('_id firstName lastName')
      .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
      .exec();
    return Object.fromEntries(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
  }

  async findAll(actor: AcademicsActor, query: FindGroupsPayload): Promise<GroupView[]> {
    const resolved = await this.resolveScope(actor, query.childId);
    if (!resolved) return [];
    const requested: FilterQuery<Group> = {};
    if (query.cohortId) requested.cohortId = oid(query.cohortId);
    if (query.status) requested.status = query.status;
    if (query.teacherId) requested.teacherId = oid(query.teacherId);
    // The scope goes last so it always overrides the requested filters.
    const groups = await this.groupModel
      .find(withNotDeletedFilter({ ...requested, ...resolved.filter }))
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ createdAt: -1 })
      .lean<GroupLean[]>()
      .exec();
    return groups.map((group) => this.present(group, resolved.visibleStudentIds));
  }

  async findOne(actor: AcademicsActor, id: string): Promise<GroupDetailView> {
    const resolved = await this.resolveScope(actor);
    if (!resolved) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const group = await this.groupModel.findOne(withNotDeletedFilter({ ...resolved.filter, _id: oid(id) })).lean<GroupLean>().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const view = this.present(group, resolved.visibleStudentIds);
    return { ...view, people: await this.peopleNames(view) };
  }

  async create(actor: AcademicsActor, dto: CreateGroupDto): Promise<GroupView> {
    const cohort = await this.cohortModel
      .findOne(withNotDeletedFilter({ _id: oid(dto.cohortId), organizationId: oid(actor.organizationId) }))
      .lean<{ _id: Types.ObjectId; levelId: Types.ObjectId }>()
      .exec();
    if (!cohort) throw new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND);
    const level = await this.levelModel.findOne({ _id: cohort.levelId }).select('_id courseId').lean<{ _id: Types.ObjectId; courseId: Types.ObjectId }>().exec();
    if (!level) throw new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND);
    if (!isValidSchedule(dto.schedule)) throw new BadRequestException(AcademicsErrors.INVALID_SCHEDULE);
    if (dto.maxStudents < dto.minStudents) throw new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS);

    const created = await this.groupModel.create({
      organizationId: oid(actor.organizationId),
      cohortId: cohort._id,
      levelId: level._id,
      courseId: level.courseId,
      name: dto.name.trim(),
      schedule: dto.schedule,
      timezone: dto.timezone,
      minStudents: dto.minStudents,
      maxStudents: dto.maxStudents,
      meetingLink: dto.meetingLink ?? null,
      whatsappGroupLink: dto.whatsappGroupLink ?? null,
    });
    return this.state.toView(created.toObject() as unknown as GroupLean);
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateGroupDto): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    if (dto.schedule !== undefined && !isValidSchedule(dto.schedule)) throw new BadRequestException(AcademicsErrors.INVALID_SCHEDULE);
    const minStudents = dto.minStudents ?? group.minStudents;
    const maxStudents = dto.maxStudents ?? group.maxStudents;
    if (maxStudents < minStudents || maxStudents < group.students.length) throw new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS);
    if (dto.schedule !== undefined || dto.timezone !== undefined) {
      await this.groupTeacher.assertScheduleChangeFits(actor, group, { schedule: dto.schedule ?? group.schedule, timezone: dto.timezone ?? group.timezone });
    }
    const changes: UpdateGroupDto = { ...dto, ...(dto.name === undefined ? {} : { name: dto.name.trim() }) };
    await this.groupModel.updateOne({ _id: group._id }, { $set: changes }).exec();
    return this.state.syncReadiness(group._id);
  }

  async remove(actor: AcademicsActor, id: string) {
    const group = await this.state.loadInOrg(actor, id);
    if (group.status !== GroupStatus.FORMING && group.status !== GroupStatus.CANCELLED) {
      throw new ConflictException(AcademicsErrors.GROUP_DELETE_NOT_ALLOWED);
    }
    await this.groupModel.updateOne({ _id: group._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }

  async markReady(actor: AcademicsActor, id: string): Promise<GroupView> {
    const group = await this.state.loadInOrg(actor, id);
    const error = checkStatusTransition(group.status, GroupStatus.READY_TO_START, { ready: computeReadiness(group).ready });
    if (error) throw new ConflictException(error);
    if (group.status === GroupStatus.READY_TO_START) return this.state.toView(group);
    await this.groupModel
      .updateOne(
        { _id: group._id, status: GroupStatus.FORMING },
        {
          $set: { status: GroupStatus.READY_TO_START },
          $push: { statusHistory: { from: GroupStatus.FORMING, to: GroupStatus.READY_TO_START, by: oid(actor._id), at: new Date() } },
        }
      )
      .exec();
    return this.state.syncReadiness(group._id);
  }

  async cancel(actor: AcademicsActor, id: string, reason: string): Promise<GroupView> {
    const group = await this.state.loadInOrg(actor, id);
    const error = checkStatusTransition(group.status, GroupStatus.CANCELLED, { ready: false, reason });
    if (error === AcademicsErrors.CANCEL_REASON_REQUIRED) throw new BadRequestException(error);
    if (error) throw new ConflictException(error);
    await this.groupModel
      .updateOne(
        { _id: group._id, status: group.status },
        {
          $set: { status: GroupStatus.CANCELLED },
          $push: { statusHistory: { from: group.status, to: GroupStatus.CANCELLED, by: oid(actor._id), at: new Date(), reason: reason.trim() } },
        }
      )
      .exec();
    return this.state.syncReadiness(group._id);
  }

  async setContentSent(actor: AcademicsActor, id: string, done: boolean): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const contentSent = done ? { done: true, by: oid(actor._id), at: new Date() } : { done: false };
    await this.groupModel.updateOne({ _id: group._id }, { $set: { contentSent } }).exec();
    return this.state.syncReadiness(group._id);
  }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm --filter server exec jest src/academics/group`
Expected: PASS. group-state 4 tests, group.service 19 tests.

- [ ] **Step 9: Controller and module wiring**

`apps/server/src/academics/group/group.controller.message.ts`:
```ts
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CancelGroupPayload, ContentSentPayload, CreateGroupDto, FindGroupsPayload, UpdateGroupPayload } from './dto/group.dto';
import { GroupService } from './group.service';

@Controller()
@ApplyRpcErrorHandling
export class GroupControllerMessage {
  constructor(private readonly groupService: GroupService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindGroupsPayload, @Ctx() context: IUserContext) {
    return this.groupService.findAll(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupService.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateGroupDto, @Ctx() context: IUserContext) {
    return this.groupService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateGroupPayload, @Ctx() context: IUserContext) {
    return this.groupService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupService.remove(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.markReady')
  markReady(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupService.markReady(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.cancel')
  cancel(@Payload(new RpcValidationPipe()) payload: CancelGroupPayload, @Ctx() context: IUserContext) {
    return this.groupService.cancel(actorFromContext(context), payload.id, payload.reason);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.setContentSent')
  setContentSent(@Payload(new RpcValidationPipe()) payload: ContentSentPayload, @Ctx() context: IUserContext) {
    return this.groupService.setContentSent(actorFromContext(context), payload.id, payload.done);
  }
}
```
In `academics.module.ts`:
- add `{ name: User.name, schema: UserSchema }` to `forFeature` (import from `src/user/entities/user.entity`)
- add `forwardRef(() => UserModule)` to `imports` (import from `src/user/user.module`), which provides `ParentService`
- add `GroupControllerMessage` to `controllers`
- add `GroupStateService`, `GroupService` and `GroupTeacherService` to `providers`

- [ ] **Step 10: Run the tests and the type-check, then commit**

Run:
```bash
pnpm --filter server exec jest src/academics
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task9-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task9-server.txt | sort)
```
Expected: jest PASS; no `>` lines.
```bash
git add apps/server/src/academics
git commit -m "feat(academics): group creation, scoping, readiness and status"
```

---

### Task 10: Group students: candidates, add/remove, payment and WhatsApp status

**Files:**
- Create: `apps/server/src/academics/group/group-students.service.ts`
- Test: `apps/server/src/academics/group/group-students.service.spec.ts`
- Modify: `apps/server/src/academics/group/group.controller.message.ts`, `apps/server/src/academics/academics.module.ts`

**Interfaces:**
- Consumes: `GroupStateService` (Task 9), `escapeRegex` (Task 4), the `Group` and `User` models
- Produces:
  - `GroupStudentsService` methods:
    - `studentCandidates(actor, id, q?): Promise<{ _id; firstName; lastName; username; email }[]>`, at most 20
    - `addStudent(actor, id, studentId): Promise<GroupView>`
    - `removeStudent(actor, id, studentId): Promise<GroupView>`
    - `setPaymentStatus(actor, id, studentId, paymentStatus): Promise<GroupView>`
    - `setWhatsapp(actor, id, studentId, whatsappAdded): Promise<GroupView>`
  - NATS patterns `academics.groups.{studentCandidates, addStudent, removeStudent, setPaymentStatus, setWhatsapp}`

- [ ] **Step 1: Write the failing test**

`apps/server/src/academics/group/group-students.service.spec.ts`:
```ts
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupPaymentStatus, GroupStatus, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupStudentsService } from './group-students.service';

const ORG = '64b0000000000000000000bb';
const staff: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const studentId = '64b000000000000000000055';
const existingStudent = new Types.ObjectId('64b000000000000000000066');

const group = (over: Record<string, unknown> = {}) => ({
  _id: groupId, status: GroupStatus.FORMING, maxStudents: 2, students: [{ studentId: existingStudent, paymentStatus: GroupPaymentStatus.UNPAID }], ...over,
});

function setup() {
  const groupModel = { findOne: jest.fn(), updateOne: jest.fn() };
  const userModel = { find: jest.fn(), findOne: jest.fn() };
  const state = { loadInOrg: jest.fn(), loadForWrite: jest.fn(), syncReadiness: jest.fn(async (id) => ({ _id: id })) };
  const service = new GroupStudentsService(groupModel as never, userModel as never, state as never);
  return { service, groupModel, userModel, state };
}

describe('GroupStudentsService', () => {
  describe('studentCandidates', () => {
    it('escapes regex characters in the search text', async () => {
      const { service, state, userModel } = setup();
      state.loadInOrg.mockResolvedValue(group());
      userModel.find.mockReturnValue(mockQuery([]));
      await expect(service.studentCandidates(staff, String(groupId), '(a.*')).resolves.toEqual([]);
      const filter = userModel.find.mock.calls[0][0];
      const regex: RegExp = filter.$or[0].firstName;
      expect(regex.test('(a.*')).toBe(true);
      expect(regex.test('abc')).toBe(false);
    });

    it('only returns organization students not already in the group, at most 20', async () => {
      const { service, state, userModel } = setup();
      state.loadInOrg.mockResolvedValue(group());
      const query = mockQuery([]);
      userModel.find.mockReturnValue(query);
      await service.studentCandidates(staff, String(groupId));
      const filter = userModel.find.mock.calls[0][0];
      expect(filter.roleName).toBe(Roles.STUDENT);
      expect(String(filter.organizationId)).toBe(ORG);
      expect(filter._id.$nin).toEqual([existingStudent]);
      expect(filter.$or).toBeUndefined();
      expect(query.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('addStudent', () => {
    it('rejects users that are not students of the organization', async () => {
      const { service, state, userModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery(null));
      await expect(service.addStudent(staff, String(groupId), studentId)).rejects.toThrow(new BadRequestException(AcademicsErrors.STUDENT_NOT_FOUND_IN_ORGANIZATION));
    });

    it('rejects a student already in the group', async () => {
      const { service, state, userModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery({ _id: existingStudent }));
      await expect(service.addStudent(staff, String(groupId), String(existingStudent))).rejects.toThrow(new ConflictException(AcademicsErrors.STUDENT_ALREADY_IN_GROUP));
    });

    it('rejects when the conditional push matches nothing because the group is full', async () => {
      const { service, state, userModel, groupModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery({ _id: new Types.ObjectId(studentId) }));
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
      groupModel.findOne.mockReturnValue(mockQuery(group({ students: [{ studentId: existingStudent }, { studentId: new Types.ObjectId() }] })));

      await expect(service.addStudent(staff, String(groupId), studentId)).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_FULL));
      const filter = groupModel.updateOne.mock.calls[0][0];
      expect(filter.$expr).toEqual({ $lt: [{ $size: '$students' }, '$maxStudents'] });
      expect(filter.status).toEqual({ $ne: GroupStatus.CANCELLED });
    });

    it('adds an unpaid student and re-evaluates readiness', async () => {
      const { service, state, userModel, groupModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery({ _id: new Types.ObjectId(studentId) }));
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.addStudent(staff, String(groupId), studentId);
      const pushed = groupModel.updateOne.mock.calls[0][1].$push.students;
      expect(String(pushed.studentId)).toBe(studentId);
      expect(pushed.paymentStatus).toBe(GroupPaymentStatus.UNPAID);
      expect(pushed.whatsappAdded).toBe(false);
      expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
    });
  });

  it('404s removing a student who is not in the group', async () => {
    const { service, state } = setup();
    state.loadForWrite.mockResolvedValue(group());
    await expect(service.removeStudent(staff, String(groupId), studentId)).rejects.toThrow(new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP));
  });

  it('sets payment status with a positional update and re-evaluates readiness', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    groupModel.updateOne.mockReturnValue(mockQuery({ matchedCount: 1 }));
    await service.setPaymentStatus(staff, String(groupId), String(existingStudent), GroupPaymentStatus.PAID);
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(filter['students.studentId']).toEqual(existingStudent);
    expect(update).toEqual({ $set: { 'students.$.paymentStatus': GroupPaymentStatus.PAID } });
    expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
  });

  it('404s payment status for a student not in the group', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    groupModel.updateOne.mockReturnValue(mockQuery({ matchedCount: 0 }));
    await expect(service.setPaymentStatus(staff, String(groupId), studentId, GroupPaymentStatus.PAID)).rejects.toThrow(new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec jest src/academics/group/group-students.service.spec.ts`
Expected: FAIL with `Cannot find module './group-students.service'`.

- [ ] **Step 3: Implement**

`apps/server/src/academics/group/group-students.service.ts`:
```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, GroupPaymentStatus, GroupStatus, Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from '../common/actor';
import { escapeRegex } from '../common/escape-regex';
import { Group } from './entities/group.entity';
import { GroupStateService } from './group-state.service';
import { GroupLean, GroupView } from './group.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const CANDIDATE_LIMIT = 20;

@Injectable()
export class GroupStudentsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly state: GroupStateService
  ) {}

  private hasStudent(group: GroupLean, studentId: string) {
    return group.students.some((s) => String(s.studentId) === studentId);
  }

  async studentCandidates(actor: AcademicsActor, id: string, q?: string) {
    const group = await this.state.loadInOrg(actor, id);
    const filter: FilterQuery<User> = {
      organizationId: oid(actor.organizationId),
      roleName: Roles.STUDENT,
      deletedAt: null,
      _id: { $nin: group.students.map((s) => s.studentId) },
    };
    const text = q?.trim();
    if (text) {
      const pattern = new RegExp(escapeRegex(text), 'i');
      filter.$or = [{ firstName: pattern }, { lastName: pattern }, { username: pattern }, { email: pattern }];
    }
    return this.userModel.find(filter).select('_id firstName lastName username email').limit(CANDIDATE_LIMIT).lean().exec();
  }

  async addStudent(actor: AcademicsActor, id: string, studentId: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const student = await this.userModel
      .findOne({ _id: oid(studentId), organizationId: oid(actor.organizationId), roleName: Roles.STUDENT, deletedAt: null })
      .select('_id')
      .lean()
      .exec();
    if (!student) throw new BadRequestException(AcademicsErrors.STUDENT_NOT_FOUND_IN_ORGANIZATION);
    if (this.hasStudent(group, studentId)) throw new ConflictException(AcademicsErrors.STUDENT_ALREADY_IN_GROUP);

    // One conditional update so concurrent adds can never exceed maxStudents or duplicate a student.
    const result = await this.groupModel
      .updateOne(
        {
          _id: group._id,
          status: { $ne: GroupStatus.CANCELLED },
          deletedAt: null,
          'students.studentId': { $ne: oid(studentId) },
          $expr: { $lt: [{ $size: '$students' }, '$maxStudents'] },
        },
        { $push: { students: { studentId: oid(studentId), paymentStatus: GroupPaymentStatus.UNPAID, whatsappAdded: false, addedAt: new Date(), addedBy: oid(actor._id) } } }
      )
      .exec();

    if (result.modifiedCount === 0) {
      const current = await this.groupModel.findOne({ _id: group._id }).lean<GroupLean>().exec();
      if (!current) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
      if (current.status === GroupStatus.CANCELLED) throw new ConflictException(AcademicsErrors.GROUP_CANCELLED);
      if (this.hasStudent(current, studentId)) throw new ConflictException(AcademicsErrors.STUDENT_ALREADY_IN_GROUP);
      throw new ConflictException(AcademicsErrors.GROUP_FULL);
    }
    return this.state.syncReadiness(group._id);
  }

  async removeStudent(actor: AcademicsActor, id: string, studentId: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    if (!this.hasStudent(group, studentId)) throw new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP);
    await this.groupModel.updateOne({ _id: group._id }, { $pull: { students: { studentId: oid(studentId) } } }).exec();
    return this.state.syncReadiness(group._id);
  }

  private async setStudentField(actor: AcademicsActor, id: string, studentId: string, field: 'paymentStatus' | 'whatsappAdded', value: unknown) {
    const group = await this.state.loadForWrite(actor, id);
    const result = await this.groupModel
      .updateOne({ _id: group._id, 'students.studentId': oid(studentId) }, { $set: { [`students.$.${field}`]: value } })
      .exec();
    if (result.matchedCount === 0) throw new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP);
    return this.state.syncReadiness(group._id);
  }

  setPaymentStatus(actor: AcademicsActor, id: string, studentId: string, paymentStatus: GroupPaymentStatus): Promise<GroupView> {
    return this.setStudentField(actor, id, studentId, 'paymentStatus', paymentStatus);
  }

  setWhatsapp(actor: AcademicsActor, id: string, studentId: string, whatsappAdded: boolean): Promise<GroupView> {
    return this.setStudentField(actor, id, studentId, 'whatsappAdded', whatsappAdded);
  }
}
```
> The positional-update test expects `filter['students.studentId']` to equal `existingStudent`. Passing `oid(String(existingStudent))` gives an equal ObjectId, and `toEqual` compares ObjectIds by value, so the test passes.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest src/academics/group/group-students.service.spec.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Controller handlers and module**

In `group.controller.message.ts`:
- inject `private readonly groupStudents: GroupStudentsService` as a second constructor parameter
- extend the dto import with `GroupStudentPayload, PaymentStatusPayload, StudentCandidatesPayload, WhatsappPayload`
- add these handlers:
```ts
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.studentCandidates')
  studentCandidates(@Payload(new RpcValidationPipe()) payload: StudentCandidatesPayload, @Ctx() context: IUserContext) {
    return this.groupStudents.studentCandidates(actorFromContext(context), payload.id, payload.q);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.addStudent')
  addStudent(@Payload(new RpcValidationPipe()) payload: GroupStudentPayload, @Ctx() context: IUserContext) {
    return this.groupStudents.addStudent(actorFromContext(context), payload.id, payload.studentId);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.removeStudent')
  removeStudent(@Payload(new RpcValidationPipe()) payload: GroupStudentPayload, @Ctx() context: IUserContext) {
    return this.groupStudents.removeStudent(actorFromContext(context), payload.id, payload.studentId);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP_PAYMENT_STATUS })
  @MessagePattern('academics.groups.setPaymentStatus')
  setPaymentStatus(@Payload(new RpcValidationPipe()) payload: PaymentStatusPayload, @Ctx() context: IUserContext) {
    return this.groupStudents.setPaymentStatus(actorFromContext(context), payload.id, payload.studentId, payload.paymentStatus);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.setWhatsapp')
  setWhatsapp(@Payload(new RpcValidationPipe()) payload: WhatsappPayload, @Ctx() context: IUserContext) {
    return this.groupStudents.setWhatsapp(actorFromContext(context), payload.id, payload.studentId, payload.whatsappAdded);
  }
```
Add `GroupStudentsService` to `providers` in `academics.module.ts`.

- [ ] **Step 6: Run the tests and the type-check, then commit**

Run:
```bash
pnpm --filter server exec jest src/academics
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task10-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task10-server.txt | sort)
```
Expected: jest PASS; no `>` lines.
```bash
git add apps/server/src/academics
git commit -m "feat(academics): group students, payment and WhatsApp status"
```

---

### Task 11: Teacher assignment, candidates, and fit re-checks on schedule/start-date changes

**Files:**
- Modify (replace the stub): `apps/server/src/academics/group/group-teacher.service.ts`
- Test: `apps/server/src/academics/group/group-teacher.service.spec.ts`
- Modify: `apps/server/src/academics/cohort/cohort.service.ts`, `apps/server/src/academics/cohort/cohort.service.spec.ts`
- Modify: `apps/server/src/academics/group/group.controller.message.ts`, `apps/server/src/academics/academics.module.ts`

**Interfaces:**
- Consumes: `checkTeacherFit`, `TeacherFitResult` (Task 7); `GroupStateService` (Task 9); the `Group`, `User`, `TeacherAvailability` and `Cohort` models
- Produces:
  - `GroupTeacherService` methods:
    - `evaluateFit(group: Pick<GroupLean, 'schedule' | 'timezone' | 'cohortId'> & { _id?: Types.ObjectId }, teacher: TeacherLean, referenceDate?: Date): Promise<TeacherFitResult>`
    - `assign(actor, id, teacherId): Promise<GroupView>`
    - `unassign(actor, id): Promise<GroupView>`
    - `candidates(actor, id): Promise<{ teacherId: string; name: string; ok: boolean; reasons: TeacherFitReason[] }[]>`
    - `assertScheduleChangeFits(actor, group, next: { schedule; timezone }): Promise<void>`
    - `assertCohortStartDateFits(actor, cohortId: Types.ObjectId, startDate: Date): Promise<void>`
  - NATS patterns `academics.groups.{assignTeacher, unassignTeacher, teacherCandidates}`
  - `CohortService` now takes `GroupTeacherService` as its 4th constructor parameter

- [ ] **Step 1: Write the failing test**

`apps/server/src/academics/group/group-teacher.service.spec.ts`:
```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, Roles, TeacherFitReason } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupTeacherService } from './group-teacher.service';

const ORG = '64b0000000000000000000bb';
const staff: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const teacherId = new Types.ObjectId('64b0000000000000000000a1');
const cohortId = new Types.ObjectId('64b000000000000000000022');
const WINTER = new Date('2027-01-04T00:00:00Z');

const group = (over: Record<string, unknown> = {}) => ({
  _id: groupId, cohortId, status: GroupStatus.FORMING, teacherId: null, timezone: 'UTC', students: [],
  schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }], ...over,
});
const instructor = { _id: teacherId, firstName: 'Amina', lastName: 'K', roleName: Roles.INSTRUCTOR, additionalRoles: [] };
const mondayMorning = { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] };

function setup() {
  const groupModel = { find: jest.fn(), updateOne: jest.fn() };
  const userModel = { find: jest.fn(), findOne: jest.fn() };
  const availabilityModel = { find: jest.fn(), findOne: jest.fn() };
  const cohortModel = { findOne: jest.fn() };
  const state = { loadInOrg: jest.fn(), loadForWrite: jest.fn(), syncReadiness: jest.fn(async (id) => ({ _id: id })) };
  const service = new GroupTeacherService(groupModel as never, userModel as never, availabilityModel as never, cohortModel as never, state as never);
  return { service, groupModel, userModel, availabilityModel, cohortModel, state };
}

describe('GroupTeacherService', () => {
  it('404s a teacher outside the organization', async () => {
    const { service, state, userModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    userModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.assign(staff, String(groupId), String(teacherId))).rejects.toThrow(new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION));
    expect(String(userModel.findOne.mock.calls[0][0].organizationId)).toBe(ORG);
  });

  it('refuses a teacher without availability', async () => {
    const { service, state, userModel, availabilityModel, groupModel, cohortModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery(null));
    groupModel.find.mockReturnValue(mockQuery([]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    await expect(service.assign(staff, String(groupId), String(teacherId))).rejects.toThrow(new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE));
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('assigns a fitting teacher, excluding the group itself from conflicts', async () => {
    const { service, state, userModel, availabilityModel, groupModel, cohortModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery(mondayMorning));
    groupModel.find.mockReturnValue(mockQuery([]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));

    await service.assign(staff, String(groupId), String(teacherId));

    expect(groupModel.find.mock.calls[0][0]._id).toEqual({ $ne: groupId });
    expect(groupModel.updateOne.mock.calls[0][1]).toEqual({ $set: { teacherId } });
    expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
  });

  it('lists instructors (including additional-role instructors) with fit and reasons', async () => {
    const { service, state, userModel, availabilityModel, groupModel, cohortModel } = setup();
    state.loadInOrg.mockResolvedValue(group());
    const secondId = new Types.ObjectId();
    userModel.find.mockReturnValue(mockQuery([instructor, { _id: secondId, firstName: 'Omar', lastName: 'S', roleName: Roles.SUPERVISOR, additionalRoles: [Roles.INSTRUCTOR] }]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    availabilityModel.findOne.mockImplementation((filter) => mockQuery(String(filter.teacherId) === String(teacherId) ? mondayMorning : null));
    groupModel.find.mockReturnValue(mockQuery([]));

    const result = await service.candidates(staff, String(groupId));

    expect(userModel.find.mock.calls[0][0].$or).toEqual([{ roleName: Roles.INSTRUCTOR }, { additionalRoles: Roles.INSTRUCTOR }]);
    expect(result).toEqual([
      { teacherId: String(teacherId), name: 'Amina K', ok: true, reasons: [] },
      { teacherId: String(secondId), name: 'Omar S', ok: false, reasons: [TeacherFitReason.NO_AVAILABILITY] },
    ]);
  });

  it('blocks a schedule change that moves outside the assigned teacher availability', async () => {
    const { service, userModel, availabilityModel, groupModel, cohortModel } = setup();
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery(mondayMorning));
    groupModel.find.mockReturnValue(mockQuery([]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    await expect(
      service.assertScheduleChangeFits(staff, group({ teacherId }) as never, { schedule: [{ dayOfWeek: 2, startTime: '10:00', durationMinutes: 60 }], timezone: 'UTC' })
    ).rejects.toThrow(new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE));
  });

  it('skips the schedule re-check when no teacher is assigned', async () => {
    const { service, userModel } = setup();
    await expect(service.assertScheduleChangeFits(staff, group() as never, { schedule: [], timezone: 'UTC' })).resolves.toBeUndefined();
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it('blocks a cohort start date whose DST offset breaks an assigned group', async () => {
    const { service, userModel, availabilityModel, groupModel } = setup();
    // Group Sun 11:00 Riyadh = 08:00 UTC; teacher Sun 09:00–12:00 London: fits in summer, not in winter.
    groupModel.find
      .mockReturnValueOnce(mockQuery([group({ teacherId, timezone: 'Asia/Riyadh', schedule: [{ dayOfWeek: 0, startTime: '11:00', durationMinutes: 60 }] })]))
      .mockReturnValue(mockQuery([]));
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery({ timezone: 'Europe/London', slots: [{ dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }] }));
    await expect(service.assertCohortStartDateFits(staff, cohortId, WINTER)).rejects.toThrow(new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec jest src/academics/group/group-teacher.service.spec.ts`
Expected: FAIL. TypeScript reports that `GroupTeacherService` (the stub) has no constructor parameters and no `assign` method.

- [ ] **Step 3: Implement**

Replace `apps/server/src/academics/group/group-teacher.service.ts` with:
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AvailabilitySlot, GroupStatus, hasRole, Roles, ScheduleSlot, TeacherFitReason } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { checkTeacherFit, TeacherFitResult } from '../domain/teacher-fit';
import { TeacherAvailability } from '../teacher-availability/entities/teacher-availability.entity';
import { Group } from './entities/group.entity';
import { GroupStateService } from './group-state.service';
import { GroupLean, GroupView } from './group.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const TEACHER_FIELDS = '_id firstName lastName roleName additionalRoles';

interface TeacherLean {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  roleName: Roles;
  additionalRoles?: Roles[];
}

type FitGroup = Pick<GroupLean, 'schedule' | 'timezone' | 'cohortId'> & { _id?: Types.ObjectId };

@Injectable()
export class GroupTeacherService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(TeacherAvailability.name) private readonly availabilityModel: Model<TeacherAvailability>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly state: GroupStateService
  ) {}

  private async referenceDateFor(cohortId: Types.ObjectId): Promise<Date> {
    const cohort = await this.cohortModel.findOne({ _id: cohortId }).select('startDate').lean<{ startDate: Date }>().exec();
    return cohort?.startDate ?? new Date();
  }

  async evaluateFit(group: FitGroup, teacher: TeacherLean, referenceDate?: Date): Promise<TeacherFitResult> {
    const [availability, others, reference] = await Promise.all([
      this.availabilityModel.findOne({ teacherId: teacher._id }).lean<{ timezone: string; slots: AvailabilitySlot[] }>().exec(),
      this.groupModel
        .find({ teacherId: teacher._id, status: { $ne: GroupStatus.CANCELLED }, deletedAt: null, ...(group._id ? { _id: { $ne: group._id } } : {}) })
        .select('_id name schedule timezone')
        .lean<{ _id: Types.ObjectId; name: string; schedule: ScheduleSlot[]; timezone: string }[]>()
        .exec(),
      referenceDate ? Promise.resolve(referenceDate) : this.referenceDateFor(group.cohortId),
    ]);
    return checkTeacherFit({
      isInstructor: hasRole(teacher, Roles.INSTRUCTOR),
      groupSchedule: group.schedule,
      groupTimezone: group.timezone,
      referenceDate: reference,
      availability: availability ? { timezone: availability.timezone, slots: availability.slots } : null,
      otherGroups: others.map((o) => ({ _id: String(o._id), name: o.name, timezone: o.timezone, schedule: o.schedule })),
    });
  }

  private async loadTeacher(actor: AcademicsActor, teacherId: string): Promise<TeacherLean> {
    const teacher = await this.userModel
      .findOne({ _id: oid(teacherId), organizationId: oid(actor.organizationId), deletedAt: null })
      .select(TEACHER_FIELDS)
      .lean<TeacherLean>()
      .exec();
    if (!teacher) throw new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION);
    return teacher;
  }

  async assign(actor: AcademicsActor, id: string, teacherId: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const teacher = await this.loadTeacher(actor, teacherId);
    const fit = await this.evaluateFit(group, teacher);
    if (!fit.ok) throw new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE);
    await this.groupModel.updateOne({ _id: group._id }, { $set: { teacherId: teacher._id } }).exec();
    return this.state.syncReadiness(group._id);
  }

  async unassign(actor: AcademicsActor, id: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    await this.groupModel.updateOne({ _id: group._id }, { $set: { teacherId: null } }).exec();
    return this.state.syncReadiness(group._id);
  }

  async candidates(actor: AcademicsActor, id: string): Promise<{ teacherId: string; name: string; ok: boolean; reasons: TeacherFitReason[] }[]> {
    const group = await this.state.loadInOrg(actor, id);
    const [teachers, reference] = await Promise.all([
      this.userModel
        .find({ organizationId: oid(actor.organizationId), deletedAt: null, $or: [{ roleName: Roles.INSTRUCTOR }, { additionalRoles: Roles.INSTRUCTOR }] })
        .select(TEACHER_FIELDS)
        .lean<TeacherLean[]>()
        .exec(),
      this.referenceDateFor(group.cohortId),
    ]);
    return Promise.all(
      teachers.map(async (teacher) => {
        const fit = await this.evaluateFit(group, teacher, reference);
        return { teacherId: String(teacher._id), name: `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim(), ok: fit.ok, reasons: fit.reasons };
      })
    );
  }

  async assertScheduleChangeFits(actor: AcademicsActor, group: GroupLean, next: { schedule: ScheduleSlot[]; timezone: string }): Promise<void> {
    if (!group.teacherId) return;
    const teacher = await this.userModel.findOne({ _id: group.teacherId }).select(TEACHER_FIELDS).lean<TeacherLean>().exec();
    if (!teacher) return;
    const fit = await this.evaluateFit({ ...group, ...next }, teacher);
    if (!fit.ok) throw new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE);
  }

  async assertCohortStartDateFits(actor: AcademicsActor, cohortId: Types.ObjectId, startDate: Date): Promise<void> {
    const groups = await this.groupModel
      .find({ cohortId, teacherId: { $ne: null }, status: { $ne: GroupStatus.CANCELLED }, deletedAt: null })
      .select('_id cohortId schedule timezone teacherId')
      .lean<GroupLean[]>()
      .exec();
    for (const group of groups) {
      const teacher = await this.userModel.findOne({ _id: group.teacherId }).select(TEACHER_FIELDS).lean<TeacherLean>().exec();
      if (!teacher) continue;
      const fit = await this.evaluateFit(group, teacher, startDate);
      if (!fit.ok) throw new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE);
    }
  }
}
```

- [ ] **Step 4: Wire the start-date re-check into CohortService**

In `apps/server/src/academics/cohort/cohort.service.ts`:
- add `import { GroupTeacherService } from '../group/group-teacher.service';`
- add the 4th constructor parameter `private readonly groupTeacher: GroupTeacherService`
- in `update`, replace `if (dto.startDate !== undefined) changes.startDate = new Date(dto.startDate);` with:
```ts
    if (dto.startDate !== undefined) {
      changes.startDate = new Date(dto.startDate);
      await this.groupTeacher.assertCohortStartDateFits(actor, cohort._id, changes.startDate);
    }
```
In `apps/server/src/academics/cohort/cohort.service.spec.ts`:
- change `setup()` so that it builds `const groupTeacher = { assertCohortStartDateFits: jest.fn().mockResolvedValue(undefined) };`, passes it as the 4th constructor argument, and returns it
- add this test:
```ts
  it('re-checks assigned teachers when the start date changes', async () => {
    const { service, cohortModel, groupTeacher } = setup();
    cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId }));
    cohortModel.findOneAndUpdate.mockReturnValue(mockQuery({ _id: cohortId }));
    await service.update(actor, cohortId, { startDate: '2027-03-01' });
    expect(groupTeacher.assertCohortStartDateFits).toHaveBeenCalledWith(actor, cohortId, new Date('2027-03-01'));
  });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest src/academics`
Expected: PASS. group-teacher 7 tests, cohort 4 tests, and every earlier academics suite.

- [ ] **Step 6: Controller handlers and module**

In `group.controller.message.ts`:
- inject `private readonly groupTeacher: GroupTeacherService` as the third constructor parameter
- import `AssignTeacherPayload`
- add these handlers:
```ts
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.assignTeacher')
  assignTeacher(@Payload(new RpcValidationPipe()) payload: AssignTeacherPayload, @Ctx() context: IUserContext) {
    return this.groupTeacher.assign(actorFromContext(context), payload.id, payload.teacherId);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.unassignTeacher')
  unassignTeacher(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupTeacher.unassign(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.teacherCandidates')
  teacherCandidates(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupTeacher.candidates(actorFromContext(context), payload.id);
  }
```
`GroupTeacherService` is already in `providers` (Task 9). Its new constructor needs the `TeacherAvailability` model, which is already registered (Task 8).

- [ ] **Step 7: Full server check, then commit**

Run:
```bash
pnpm --filter server exec jest src/academics src/role src/user/services/user.set-additional-roles.spec.ts
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-task11-server.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-task11-server.txt | sort)
pnpm --filter server run build
```
Expected: jest PASS; no `>` lines; build exits 0. If the build fails, compare against the pre-existing build state with `git stash; pnpm --filter server run build; git stash pop`. Only errors introduced by this plan must be fixed.
```bash
git add apps/server/src/academics
git commit -m "feat(academics): teacher assignment with fit re-checks"
```

---

### Task 12: Client foundations: types, actions, hooks, routes, navigation, translations

**Files:**
- Modify: `apps/client/src/lib/types/user/user.interface.ts` (add `additionalRoles` to `IUser`, after `roleName: Roles;`)
- Create: `apps/client/src/lib/types/academics/academics.ts`
- Create: `apps/client/src/lib/utils/academics/unwrap.ts`
- Test: `apps/client/src/lib/utils/academics/unwrap.test.ts`
- Create: `apps/client/src/lib/actions/academics/programs.action.ts`, `structure.action.ts`, `groups.action.ts`, `teacher-availability.action.ts`, `additional-roles.action.ts`
- Create: `apps/client/src/lib/hooks/academics/use-academics.hook.ts`
- Modify: `apps/client/src/lib/data/constants/routes.constants.ts`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.ts`
- Test: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.test.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts`, `.../organization-dashboard/__components/OrgSidebar.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/__components/StudentSideBar.tsx`
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json`

**Interfaces:**
- Consumes: the NATS patterns from Tasks 2, 4, 5, 8, 9, 10 and 11; `hasRole`, `hasAnyRole`, `ORG_WIDE_GROUP_READER_ROLES`, `ADDITIONAL_ROLE_OPTIONS` (Task 1)
- Produces:
  - Client types `IProgram`, `ICourseOption`, `ILevel`, `ICohort`, `IGroup`, `IGroupDetail`, `IGroupStudent`, `IStudentCandidate`, `ITeacherCandidate`, `ITeacherAvailability`, `GroupFormValues`, `GroupQuery`
  - `unwrap<T>(result: T | NatsErr): T`, which throws `Error(message)` on `{ err }`
  - Query hooks: `usePrograms`, `useProgram(id)`, `useProgramCourses(id)`, `useCourseOptions`, `useLevels(courseId)`, `useCohorts(levelId)`, `useGroups(query)`, `useGroup(id)`, `useStudentCandidates(id, q)`, `useTeacherCandidates(id)`, `useMyAvailability`
  - `useAcademicsMutation(fn)`: shows a success toast, invalidates every `['academics', …]` query, and shows a translated error toast on failure. Mutation hooks built on it (all calling `unwrap`): `useCreateProgram`, `useDeleteProgram`, `useLinkCourse`, `useUnlinkCourse`, `useCreateLevel`, `useDeleteLevel`, `useCreateCohort`, `useDeleteCohort`, `useCreateGroup`, `useUpdateGroup`, `useMarkGroupReady`, `useCancelGroup`, `useSetContentSent`, `useAddStudent`, `useRemoveStudent`, `useSetPaymentStatus`, `useSetWhatsapp`, `useAssignTeacher`, `useUnassignTeacher`, `useSaveMyAvailability`, `useSetAdditionalRoles`
  - Routes: `ROUTE_ORG_ACADEMICS_PROGRAMS`, `ROUTE_ORG_ACADEMICS_PROGRAM(id)`, `ROUTE_ORG_ACADEMICS_GROUPS`, `ROUTE_ORG_ACADEMICS_GROUP(id)`, `ROUTE_ORG_ACADEMICS_GROUP_NEW(cohortId)`, `ROUTE_ORG_MY_AVAILABILITY`, `ROUTE_ORG_MY_GROUPS`, `ROUTE_STUDENT_MY_GROUPS`
  - `isNavItemVisible(item: { requiredRoles?: readonly Roles[]; instructorOnly?: boolean }, user: RoleHolder | null | undefined): boolean`
  - Every `Academics.*` translation key used by Tasks 13–15

- [ ] **Step 1: Write the failing tests**

`apps/client/src/lib/utils/academics/unwrap.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { unwrap } from './unwrap';

describe('unwrap', () => {
  it('returns successful results unchanged', () => {
    expect(unwrap({ _id: '1' })).toEqual({ _id: '1' });
    expect(unwrap([1, 2])).toEqual([1, 2]);
  });
  it('throws the server message for NATS errors', () => {
    expect(() => unwrap({ err: { message: 'groupFull' } })).toThrow('groupFull');
  });
});
```
`apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { Roles } from '@darnozom/shared-types';
import { isNavItemVisible } from './filter-nav';

describe('isNavItemVisible', () => {
  it('shows ungated items to everyone', () => {
    expect(isNavItemVisible({}, { roleName: Roles.STUDENT })).toBe(true);
  });
  it('requires one of requiredRoles, primary or additional', () => {
    const item = { requiredRoles: [Roles.COORDINATOR, Roles.MANAGER] };
    expect(isNavItemVisible(item, { roleName: Roles.MANAGER })).toBe(true);
    expect(isNavItemVisible(item, { roleName: Roles.INSTRUCTOR, additionalRoles: [Roles.COORDINATOR] })).toBe(true);
    expect(isNavItemVisible(item, { roleName: Roles.INSTRUCTOR })).toBe(false);
    expect(isNavItemVisible(item, undefined)).toBe(false);
  });
  it('treats instructorOnly as holding INSTRUCTOR in any position', () => {
    expect(isNavItemVisible({ instructorOnly: true }, { roleName: Roles.SUPERVISOR, additionalRoles: [Roles.INSTRUCTOR] })).toBe(true);
    expect(isNavItemVisible({ instructorOnly: true }, { roleName: Roles.SUPERVISOR })).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter client exec vitest run src/lib/utils/academics filter-nav`
Expected: FAIL with `Failed to resolve import "./unwrap"` and `Failed to resolve import "./filter-nav"`.

- [ ] **Step 3: Implement the types, unwrap and filter-nav**

In `apps/client/src/lib/types/user/user.interface.ts`, add this line after `roleName: Roles;` inside `IUser`:
```ts
  /** Extra roles held in addition to roleName (staff roles + INSTRUCTOR). */
  additionalRoles?: Roles[];
```
`apps/client/src/lib/types/academics/academics.ts`:
```ts
import type { AvailabilitySlot, GroupPaymentStatus, GroupStatus, Readiness, ScheduleSlot, TeacherFitReason } from '@darnozom/shared-types';

export interface IProgram {
  _id: string;
  name: string;
  description?: string;
}

export interface ICourseOption {
  _id: string;
  name: string;
  programId?: string | null;
}

export interface ILevel {
  _id: string;
  courseId: string;
  name: string;
  order: number;
}

export interface ICohort {
  _id: string;
  levelId: string;
  name: string;
  startDate: string;
}

export interface IGroupStudent {
  studentId: string;
  paymentStatus: GroupPaymentStatus;
  whatsappAdded: boolean;
  addedAt: string;
}

export interface IGroup {
  _id: string;
  cohortId: string;
  levelId: string;
  courseId: string;
  name: string;
  teacherId: string | null;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  meetingLink?: string | null;
  whatsappGroupLink?: string | null;
  contentSent: { done: boolean };
  students: IGroupStudent[];
  status: GroupStatus;
  readiness: Readiness;
}

export interface IGroupDetail extends IGroup {
  people: Record<string, string>;
}

export interface GroupQuery {
  cohortId?: string;
  status?: GroupStatus;
  childId?: string;
}

export interface GroupFormValues {
  name: string;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  meetingLink: string | null;
  whatsappGroupLink: string | null;
}

export interface IStudentCandidate {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

export interface ITeacherCandidate {
  teacherId: string;
  name: string;
  ok: boolean;
  reasons: TeacherFitReason[];
}

export interface ITeacherAvailability {
  teacherId: string;
  timezone: string | null;
  slots: AvailabilitySlot[];
}
```
`apps/client/src/lib/utils/academics/unwrap.ts`:
```ts
import type { NatsErr } from '@/lib/utils/natsErrorHandler';

function isNatsErr(value: unknown): value is NatsErr {
  return typeof value === 'object' && value !== null && 'err' in value;
}

/** Server actions return `R | { err }`; react-query needs a throw to enter its error state. */
export function unwrap<T>(result: T | NatsErr): T {
  if (isNatsErr(result)) throw new Error(result.err.message);
  return result;
}
```
`apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.ts`:
```ts
import { hasAnyRole, hasRole, Roles, type RoleHolder } from '@darnozom/shared-types';

export interface RoleGatedNavItem {
  requiredRoles?: readonly Roles[];
  instructorOnly?: boolean;
}

export function isNavItemVisible(item: RoleGatedNavItem, user: RoleHolder | null | undefined): boolean {
  if (item.instructorOnly && !hasRole(user, Roles.INSTRUCTOR)) return false;
  if (item.requiredRoles && !hasAnyRole(user, item.requiredRoles)) return false;
  return true;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter client exec vitest run src/lib/utils/academics filter-nav`
Expected: PASS, 5 tests.

- [ ] **Step 5: Server actions**

`apps/client/src/lib/actions/academics/programs.action.ts`:
```ts
'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ICourseOption, IProgram } from '@/lib/types/academics/academics';

export async function getPrograms() {
  return createAuthorizedNatsRequest<IProgram[]>('academics.programs.findAll', {});
}
export async function getProgram(id: string) {
  return createAuthorizedNatsRequest<IProgram>('academics.programs.findOne', { id });
}
export async function createProgram(data: { name: string; description?: string }) {
  return createAuthorizedNatsRequest<IProgram>('academics.programs.create', data);
}
export async function deleteProgram(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('academics.programs.delete', { id });
}
export async function getProgramCourses(id: string) {
  return createAuthorizedNatsRequest<ICourseOption[]>('academics.programs.findCourses', { id });
}
export async function getCourseOptions() {
  return createAuthorizedNatsRequest<ICourseOption[]>('academics.programs.courseOptions', {});
}
export async function linkCourse(programId: string, courseId: string) {
  return createAuthorizedNatsRequest<{ programId: string; courseId: string }>('academics.programs.linkCourse', { programId, courseId });
}
export async function unlinkCourse(courseId: string) {
  return createAuthorizedNatsRequest<{ courseId: string }>('academics.programs.unlinkCourse', { courseId });
}
```
`apps/client/src/lib/actions/academics/structure.action.ts`:
```ts
'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ICohort, ILevel } from '@/lib/types/academics/academics';

export async function getLevels(courseId: string) {
  return createAuthorizedNatsRequest<ILevel[]>('academics.levels.findAll', { courseId });
}
export async function createLevel(data: { courseId: string; name: string; order: number }) {
  return createAuthorizedNatsRequest<ILevel>('academics.levels.create', data);
}
export async function deleteLevel(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('academics.levels.delete', { id });
}
export async function getCohorts(levelId: string) {
  return createAuthorizedNatsRequest<ICohort[]>('academics.cohorts.findAll', { levelId });
}
export async function createCohort(data: { levelId: string; name: string; startDate: string }) {
  return createAuthorizedNatsRequest<ICohort>('academics.cohorts.create', data);
}
export async function deleteCohort(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('academics.cohorts.delete', { id });
}
```
`apps/client/src/lib/actions/academics/groups.action.ts`:
```ts
'use server';

import type { GroupPaymentStatus } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { GroupFormValues, GroupQuery, IGroup, IGroupDetail, IStudentCandidate, ITeacherCandidate } from '@/lib/types/academics/academics';

export async function getGroups(query: GroupQuery) {
  return createAuthorizedNatsRequest<IGroup[]>('academics.groups.findAll', query);
}
export async function getGroup(id: string) {
  return createAuthorizedNatsRequest<IGroupDetail>('academics.groups.findOne', { id });
}
export async function createGroup(data: GroupFormValues & { cohortId: string }) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.create', data);
}
export async function updateGroup(id: string, data: Partial<GroupFormValues>) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.update', { id, data });
}
export async function markGroupReady(id: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.markReady', { id });
}
export async function cancelGroup(id: string, reason: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.cancel', { id, reason });
}
export async function setContentSent(id: string, done: boolean) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.setContentSent', { id, done });
}
export async function getStudentCandidates(id: string, q: string) {
  return createAuthorizedNatsRequest<IStudentCandidate[]>('academics.groups.studentCandidates', { id, q });
}
export async function addStudent(id: string, studentId: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.addStudent', { id, studentId });
}
export async function removeStudent(id: string, studentId: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.removeStudent', { id, studentId });
}
export async function setPaymentStatus(id: string, studentId: string, paymentStatus: GroupPaymentStatus) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.setPaymentStatus', { id, studentId, paymentStatus });
}
export async function setWhatsapp(id: string, studentId: string, whatsappAdded: boolean) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.setWhatsapp', { id, studentId, whatsappAdded });
}
export async function assignTeacher(id: string, teacherId: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.assignTeacher', { id, teacherId });
}
export async function unassignTeacher(id: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.unassignTeacher', { id });
}
export async function getTeacherCandidates(id: string) {
  return createAuthorizedNatsRequest<ITeacherCandidate[]>('academics.groups.teacherCandidates', { id });
}
```
`apps/client/src/lib/actions/academics/teacher-availability.action.ts`:
```ts
'use server';

import type { AvailabilitySlot } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ITeacherAvailability } from '@/lib/types/academics/academics';

export async function getMyAvailability() {
  return createAuthorizedNatsRequest<ITeacherAvailability>('academics.teacherAvailability.getMine', {});
}
export async function saveMyAvailability(data: { timezone: string; slots: AvailabilitySlot[] }) {
  return createAuthorizedNatsRequest<ITeacherAvailability>('academics.teacherAvailability.putMine', data);
}
```
`apps/client/src/lib/actions/academics/additional-roles.action.ts`:
```ts
'use server';

import type { Roles } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

export async function setAdditionalRoles(userId: string, additionalRoles: Roles[]) {
  return createAuthorizedNatsRequest<{ additionalRoles: Roles[] }>('users.setAdditionalRoles', { userId, additionalRoles });
}
```

- [ ] **Step 6: Hooks**

`apps/client/src/lib/hooks/academics/use-academics.hook.ts`:
```ts
'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import type { AvailabilitySlot, GroupPaymentStatus, Roles } from '@darnozom/shared-types';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as programsApi from '@/lib/actions/academics/programs.action';
import * as structureApi from '@/lib/actions/academics/structure.action';
import * as groupsApi from '@/lib/actions/academics/groups.action';
import * as availabilityApi from '@/lib/actions/academics/teacher-availability.action';
import { setAdditionalRoles } from '@/lib/actions/academics/additional-roles.action';
import type { GroupFormValues, GroupQuery } from '@/lib/types/academics/academics';

const ROOT = 'academics';

export const academicsKeys = {
  programs: [ROOT, 'programs'] as const,
  program: (id: string) => [ROOT, 'program', id] as const,
  programCourses: (id: string) => [ROOT, 'program-courses', id] as const,
  courseOptions: [ROOT, 'course-options'] as const,
  levels: (courseId: string) => [ROOT, 'levels', courseId] as const,
  cohorts: (levelId: string) => [ROOT, 'cohorts', levelId] as const,
  groups: (query: GroupQuery) => [ROOT, 'groups', query] as const,
  group: (id: string) => [ROOT, 'group', id] as const,
  studentCandidates: (id: string, q: string) => [ROOT, 'student-candidates', id, q] as const,
  teacherCandidates: (id: string) => [ROOT, 'teacher-candidates', id] as const,
  myAvailability: [ROOT, 'my-availability'] as const,
};

export const usePrograms = () => useQuery({ queryKey: academicsKeys.programs, queryFn: async () => unwrap(await programsApi.getPrograms()) });
export const useProgram = (id: string) =>
  useQuery({ queryKey: academicsKeys.program(id), queryFn: async () => unwrap(await programsApi.getProgram(id)), enabled: !!id });
export const useProgramCourses = (id: string) =>
  useQuery({ queryKey: academicsKeys.programCourses(id), queryFn: async () => unwrap(await programsApi.getProgramCourses(id)), enabled: !!id });
export const useCourseOptions = () =>
  useQuery({ queryKey: academicsKeys.courseOptions, queryFn: async () => unwrap(await programsApi.getCourseOptions()) });
export const useLevels = (courseId: string) =>
  useQuery({ queryKey: academicsKeys.levels(courseId), queryFn: async () => unwrap(await structureApi.getLevels(courseId)), enabled: !!courseId });
export const useCohorts = (levelId: string) =>
  useQuery({ queryKey: academicsKeys.cohorts(levelId), queryFn: async () => unwrap(await structureApi.getCohorts(levelId)), enabled: !!levelId });
export const useGroups = (query: GroupQuery) =>
  useQuery({ queryKey: academicsKeys.groups(query), queryFn: async () => unwrap(await groupsApi.getGroups(query)) });
export const useGroup = (id: string) =>
  useQuery({ queryKey: academicsKeys.group(id), queryFn: async () => unwrap(await groupsApi.getGroup(id)), enabled: !!id });
export const useStudentCandidates = (id: string, q: string) =>
  useQuery({ queryKey: academicsKeys.studentCandidates(id, q), queryFn: async () => unwrap(await groupsApi.getStudentCandidates(id, q)), enabled: !!id });
export const useTeacherCandidates = (id: string) =>
  useQuery({ queryKey: academicsKeys.teacherCandidates(id), queryFn: async () => unwrap(await groupsApi.getTeacherCandidates(id)), enabled: !!id });
export const useMyAvailability = () =>
  useQuery({ queryKey: academicsKeys.myAvailability, queryFn: async () => unwrap(await availabilityApi.getMyAvailability()) });

/** Shared mutation behaviour: success toast, refresh every academics query, translated error toast. */
export function useAcademicsMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const t = useTranslations('Academics');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const useCreateProgram = () => useAcademicsMutation(async (v: { name: string; description?: string }) => unwrap(await programsApi.createProgram(v)));
export const useDeleteProgram = () => useAcademicsMutation(async (id: string) => unwrap(await programsApi.deleteProgram(id)));
export const useLinkCourse = () => useAcademicsMutation(async (v: { programId: string; courseId: string }) => unwrap(await programsApi.linkCourse(v.programId, v.courseId)));
export const useUnlinkCourse = () => useAcademicsMutation(async (courseId: string) => unwrap(await programsApi.unlinkCourse(courseId)));
export const useCreateLevel = () => useAcademicsMutation(async (v: { courseId: string; name: string; order: number }) => unwrap(await structureApi.createLevel(v)));
export const useDeleteLevel = () => useAcademicsMutation(async (id: string) => unwrap(await structureApi.deleteLevel(id)));
export const useCreateCohort = () => useAcademicsMutation(async (v: { levelId: string; name: string; startDate: string }) => unwrap(await structureApi.createCohort(v)));
export const useDeleteCohort = () => useAcademicsMutation(async (id: string) => unwrap(await structureApi.deleteCohort(id)));
export const useCreateGroup = () => useAcademicsMutation(async (v: GroupFormValues & { cohortId: string }) => unwrap(await groupsApi.createGroup(v)));
export const useUpdateGroup = () => useAcademicsMutation(async (v: { id: string; data: Partial<GroupFormValues> }) => unwrap(await groupsApi.updateGroup(v.id, v.data)));
export const useMarkGroupReady = () => useAcademicsMutation(async (id: string) => unwrap(await groupsApi.markGroupReady(id)));
export const useCancelGroup = () => useAcademicsMutation(async (v: { id: string; reason: string }) => unwrap(await groupsApi.cancelGroup(v.id, v.reason)));
export const useSetContentSent = () => useAcademicsMutation(async (v: { id: string; done: boolean }) => unwrap(await groupsApi.setContentSent(v.id, v.done)));
export const useAddStudent = () => useAcademicsMutation(async (v: { id: string; studentId: string }) => unwrap(await groupsApi.addStudent(v.id, v.studentId)));
export const useRemoveStudent = () => useAcademicsMutation(async (v: { id: string; studentId: string }) => unwrap(await groupsApi.removeStudent(v.id, v.studentId)));
export const useSetPaymentStatus = () =>
  useAcademicsMutation(async (v: { id: string; studentId: string; paymentStatus: GroupPaymentStatus }) => unwrap(await groupsApi.setPaymentStatus(v.id, v.studentId, v.paymentStatus)));
export const useSetWhatsapp = () =>
  useAcademicsMutation(async (v: { id: string; studentId: string; whatsappAdded: boolean }) => unwrap(await groupsApi.setWhatsapp(v.id, v.studentId, v.whatsappAdded)));
export const useAssignTeacher = () => useAcademicsMutation(async (v: { id: string; teacherId: string }) => unwrap(await groupsApi.assignTeacher(v.id, v.teacherId)));
export const useUnassignTeacher = () => useAcademicsMutation(async (id: string) => unwrap(await groupsApi.unassignTeacher(id)));
export const useSaveMyAvailability = () =>
  useAcademicsMutation(async (v: { timezone: string; slots: AvailabilitySlot[] }) => unwrap(await availabilityApi.saveMyAvailability(v)));
export const useSetAdditionalRoles = () =>
  useAcademicsMutation(async (v: { userId: string; additionalRoles: Roles[] }) => unwrap(await setAdditionalRoles(v.userId, v.additionalRoles)));
```

- [ ] **Step 7: Routes, navigation, sidebar filter**

Append to `apps/client/src/lib/data/constants/routes.constants.ts`:
```ts
export const ROUTE_ORG_ACADEMICS_PROGRAMS = '/organization-dashboard/academics/programs';
export const ROUTE_ORG_ACADEMICS_PROGRAM = (id: string) => `${ROUTE_ORG_ACADEMICS_PROGRAMS}/${id}`;
export const ROUTE_ORG_ACADEMICS_GROUPS = '/organization-dashboard/academics/groups';
export const ROUTE_ORG_ACADEMICS_GROUP = (id: string) => `${ROUTE_ORG_ACADEMICS_GROUPS}/${id}`;
export const ROUTE_ORG_ACADEMICS_GROUP_NEW = (cohortId: string) => `${ROUTE_ORG_ACADEMICS_GROUPS}/new?cohortId=${encodeURIComponent(cohortId)}`;
export const ROUTE_ORG_MY_AVAILABILITY = '/organization-dashboard/my-availability';
export const ROUTE_ORG_MY_GROUPS = '/organization-dashboard/my-groups';
export const ROUTE_STUDENT_MY_GROUPS = '/student-dashboard/my-groups';
```
In `organization-dashboard/data.ts`:
- add `IconClockHour4, IconSchool, IconSitemap, IconUsersGroup` to the `@tabler/icons-react` import
- add `ROUTE_ORG_ACADEMICS_GROUPS, ROUTE_ORG_ACADEMICS_PROGRAMS, ROUTE_ORG_MY_AVAILABILITY, ROUTE_ORG_MY_GROUPS` to the routes import
- add `import { ORG_WIDE_GROUP_READER_ROLES, Roles } from '@darnozom/shared-types';` (or merge with the existing `CourseContentType` import)
- insert these as the **first** elements of `navMain`:
```ts
    {
      titleKey: 'navMain.academics',
      url: ROUTE_ORG_ACADEMICS_GROUPS,
      icon: IconSchool,
      key: 'academics',
      requiredRoles: ORG_WIDE_GROUP_READER_ROLES,
      children: [
        { titleKey: 'navMain.academicsGroups', url: ROUTE_ORG_ACADEMICS_GROUPS, key: 'academics-groups', icon: IconUsersGroup },
        {
          titleKey: 'navMain.academicsPrograms',
          url: ROUTE_ORG_ACADEMICS_PROGRAMS,
          key: 'academics-programs',
          icon: IconSitemap,
          requiredRoles: [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR],
        },
      ],
    },
    { titleKey: 'navMain.myGroups', url: ROUTE_ORG_MY_GROUPS, icon: IconUsersGroup, key: 'my-groups', requiredRoles: [Roles.INSTRUCTOR] },
    { titleKey: 'navMain.myAvailability', url: ROUTE_ORG_MY_AVAILABILITY, icon: IconClockHour4, key: 'my-availability', requiredRoles: [Roles.INSTRUCTOR] },
```
In `OrgSidebar.tsx`:
- replace `import { Roles } from '@darnozom/shared-types';` with `import { isNavItemVisible } from './filter-nav';`
- delete the `const isInstructor = …` line
- change the `navMain` mapping to:
```ts
    navMain: data.navMain
      .filter((item) => isNavItemVisible(item, user))
      .map((item) => ({
        ...item,
        title: t(item.titleKey),
        children: item.children
          ?.filter((child) => isNavItemVisible(child, user))
          .map((child) => ({
            ...child,
            title: t(child.titleKey),
          })),
      })),
```
In `student-dashboard/__components/StudentSideBar.tsx`:
- add `ROUTE_STUDENT_MY_GROUPS` to the routes import and `IconUsersGroup` to the tabler import
- add this entry right after the `courses` entry in `navMain`:
```ts
      {
        title: t('navMain.myGroups'),
        url: ROUTE_STUDENT_MY_GROUPS,
        icon: IconUsersGroup,
        key: 'my-groups',
      },
```

- [ ] **Step 8: Translations**

Add to `en.json` → `OrgSidebar.navMain`:
```json
"academics": "Academics",
"academicsGroups": "Groups",
"academicsPrograms": "Programs",
"myGroups": "My groups",
"myAvailability": "My availability",
```
to `en.json` → `StudentSidebar.navMain`: `"myGroups": "My groups",`
and to `ar.json` → `OrgSidebar.navMain`:
```json
"academics": "الشؤون الأكاديمية",
"academicsGroups": "المجموعات",
"academicsPrograms": "البرامج",
"myGroups": "مجموعاتي",
"myAvailability": "أوقات توفري",
```
and to `ar.json` → `StudentSidebar.navMain`: `"myGroups": "مجموعاتي",`

Add a new top-level namespace to `en.json`:
```json
"Academics": {
  "saved": "Saved",
  "loading": "Loading…",
  "empty": "Nothing here yet.",
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "create": "Create",
  "add": "Add",
  "remove": "Remove",
  "name": "Name",
  "description": "Description",
  "order": "Order",
  "startDate": "Start date",
  "confirmDelete": "Delete this item?",
  "days": { "0": "Sunday", "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday", "5": "Friday", "6": "Saturday" },
  "roles": {
    "OWNER": "Owner", "MANAGER": "Academy manager", "COORDINATOR": "Coordinator", "SUPERVISOR": "Supervisor",
    "CONTENT_OFFICER": "Content officer", "SHARIA_REVIEWER": "Sharia reviewer", "HR": "HR officer", "ACCOUNTANT": "Accountant", "INSTRUCTOR": "Teacher"
  },
  "programs": {
    "title": "Programs", "new": "New program", "courses": "Courses", "linkCourse": "Link course", "selectCourse": "Select a course",
    "unlink": "Unlink", "levels": "Levels", "newLevel": "New level", "cohorts": "Cohorts", "newCohort": "New cohort",
    "newGroup": "New group", "viewGroups": "View groups"
  },
  "groups": {
    "title": "Groups", "new": "New group", "status": "Status", "allStatuses": "All statuses", "readiness": "Readiness",
    "students": "Students", "teacher": "Teacher", "noTeacher": "No teacher assigned", "open": "Open",
    "statuses": { "FORMING": "Forming", "READY_TO_START": "Ready to start", "CANCELLED": "Cancelled" }
  },
  "form": {
    "schedule": "Weekly schedule", "day": "Day", "startTime": "Start time", "duration": "Duration (minutes)", "addSlot": "Add time",
    "timezone": "Time zone", "minStudents": "Minimum students", "maxStudents": "Maximum students", "meetingLink": "Meeting link",
    "whatsappGroupLink": "WhatsApp group link", "missingCohort": "Open this page from a cohort to create a group."
  },
  "readiness": {
    "title": "Readiness checklist", "markReady": "Ready to start", "notReadyHint": "Complete every item to mark the group ready.",
    "contentSentToggle": "Content has been sent",
    "items": {
      "TEACHER_ASSIGNED": "Teacher assigned", "MINIMUM_STUDENTS": "Minimum students reached", "PAYMENTS_MADE": "Payments made",
      "CONTENT_SENT": "Content sent", "MEETING_LINK": "Meeting link created"
    }
  },
  "students": {
    "title": "Students", "search": "Search students by name or email", "payment": "Payment", "whatsapp": "Added to WhatsApp",
    "paid": "Paid", "unpaid": "Unpaid", "noCandidates": "No matching students"
  },
  "teacher": {
    "title": "Teacher", "select": "Select a teacher", "assign": "Assign", "unassign": "Unassign",
    "reasons": { "NOT_INSTRUCTOR": "Not a teacher", "NO_AVAILABILITY": "No availability set", "OUTSIDE_AVAILABILITY": "Outside availability", "CONFLICT": "Schedule conflict" }
  },
  "cancelGroup": { "title": "Cancel group", "reason": "Reason for cancelling", "confirm": "Cancel group" },
  "availability": { "title": "My weekly availability", "addSlot": "Add time", "endTime": "End time (HH:mm, 24:00 for midnight)" },
  "myGroups": { "title": "My groups" },
  "additionalRoles": { "title": "Additional roles", "hint": "Extra roles this person holds in addition to their main role." },
  "childGroups": { "title": "Groups", "empty": "Not in any group yet." }
}
```
Add the same namespace to `ar.json`:
```json
"Academics": {
  "saved": "تم الحفظ",
  "loading": "جارٍ التحميل…",
  "empty": "لا يوجد شيء بعد.",
  "save": "حفظ",
  "cancel": "إلغاء",
  "delete": "حذف",
  "create": "إنشاء",
  "add": "إضافة",
  "remove": "إزالة",
  "name": "الاسم",
  "description": "الوصف",
  "order": "الترتيب",
  "startDate": "تاريخ البدء",
  "confirmDelete": "هل تريد حذف هذا العنصر؟",
  "days": { "0": "الأحد", "1": "الاثنين", "2": "الثلاثاء", "3": "الأربعاء", "4": "الخميس", "5": "الجمعة", "6": "السبت" },
  "roles": {
    "OWNER": "المالك", "MANAGER": "مدير الأكاديمية", "COORDINATOR": "المنسق الإداري", "SUPERVISOR": "المشرف التربوي",
    "CONTENT_OFFICER": "مسؤول المحتوى", "SHARIA_REVIEWER": "المراجع الشرعي", "HR": "مسؤول الموارد البشرية", "ACCOUNTANT": "المحاسب", "INSTRUCTOR": "المعلم"
  },
  "programs": {
    "title": "البرامج", "new": "برنامج جديد", "courses": "الدورات", "linkCourse": "ربط دورة", "selectCourse": "اختر دورة",
    "unlink": "إلغاء الربط", "levels": "المستويات", "newLevel": "مستوى جديد", "cohorts": "الدفعات", "newCohort": "دفعة جديدة",
    "newGroup": "مجموعة جديدة", "viewGroups": "عرض المجموعات"
  },
  "groups": {
    "title": "المجموعات", "new": "مجموعة جديدة", "status": "الحالة", "allStatuses": "كل الحالات", "readiness": "الجاهزية",
    "students": "الطلاب", "teacher": "المعلم", "noTeacher": "لم يتم تعيين معلم", "open": "فتح",
    "statuses": { "FORMING": "قيد التشكيل", "READY_TO_START": "جاهزة للبدء", "CANCELLED": "ملغاة" }
  },
  "form": {
    "schedule": "الجدول الأسبوعي", "day": "اليوم", "startTime": "وقت البدء", "duration": "المدة (بالدقائق)", "addSlot": "إضافة موعد",
    "timezone": "المنطقة الزمنية", "minStudents": "الحد الأدنى للطلاب", "maxStudents": "الحد الأقصى للطلاب", "meetingLink": "رابط اللقاء",
    "whatsappGroupLink": "رابط مجموعة واتساب", "missingCohort": "افتح هذه الصفحة من دفعة لإنشاء مجموعة."
  },
  "readiness": {
    "title": "قائمة الجاهزية", "markReady": "جاهزة للبدء", "notReadyHint": "أكمل جميع البنود لتعليم المجموعة كجاهزة.",
    "contentSentToggle": "تم إرسال المحتوى",
    "items": {
      "TEACHER_ASSIGNED": "تم تعيين المعلم", "MINIMUM_STUDENTS": "بلوغ الحد الأدنى للطلاب", "PAYMENTS_MADE": "سداد الدفعات",
      "CONTENT_SENT": "إرسال المحتوى", "MEETING_LINK": "إنشاء رابط اللقاء"
    }
  },
  "students": {
    "title": "الطلاب", "search": "ابحث عن الطلاب بالاسم أو البريد الإلكتروني", "payment": "الدفع", "whatsapp": "مضاف إلى واتساب",
    "paid": "مدفوع", "unpaid": "غير مدفوع", "noCandidates": "لا يوجد طلاب مطابقون"
  },
  "teacher": {
    "title": "المعلم", "select": "اختر معلمًا", "assign": "تعيين", "unassign": "إلغاء التعيين",
    "reasons": { "NOT_INSTRUCTOR": "ليس معلمًا", "NO_AVAILABILITY": "لم تُحدَّد أوقات التوفر", "OUTSIDE_AVAILABILITY": "خارج أوقات التوفر", "CONFLICT": "تعارض في المواعيد" }
  },
  "cancelGroup": { "title": "إلغاء المجموعة", "reason": "سبب الإلغاء", "confirm": "إلغاء المجموعة" },
  "availability": { "title": "أوقات توفري الأسبوعية", "addSlot": "إضافة موعد", "endTime": "وقت الانتهاء (HH:mm، و24:00 لمنتصف الليل)" },
  "myGroups": { "title": "مجموعاتي" },
  "additionalRoles": { "title": "أدوار إضافية", "hint": "أدوار إضافية يحملها هذا الشخص بجانب دوره الأساسي." },
  "childGroups": { "title": "المجموعات", "empty": "ليس في أي مجموعة بعد." }
}
```

- [ ] **Step 9: Build shared-types, type-check, check i18n, run the tests, commit**

Run:
```bash
pnpm --filter @darnozom/shared-types run build
pnpm --filter client run tsc --noEmit -p tsconfig.json > .superpowers/tsc-task12-client.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-task12-client.txt | sort)
pnpm --filter client run i18n:check-keys
pnpm --filter client exec vitest run src/lib/utils/academics filter-nav
```
Expected: no `>` lines; the i18n check exits 0; vitest PASS (5 tests).
```bash
git add apps/client/src/lib apps/client/messages "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts" "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components" "apps/client/src/app/[locale]/(dashboard)/student-dashboard/__components/StudentSideBar.tsx"
git commit -m "feat(client): academics data layer, navigation and translations"
```

---

### Task 13: Client: programs, courses, levels and cohorts pages

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs/page.tsx`
- Create: `.../academics/programs/__components/programs-manager.tsx`
- Create: `.../academics/programs/[id]/page.tsx`
- Create: `.../academics/programs/[id]/__components/program-detail.tsx`, `course-levels.tsx`, `level-cohorts.tsx`

**Interfaces:**
- Consumes: the hooks and routes from Task 12
- Produces: the program pages. A cohort row links to `ROUTE_ORG_ACADEMICS_GROUP_NEW(cohortId)` and to `ROUTE_ORG_ACADEMICS_GROUPS?cohortId=…`, which Task 14 consumes.

- [ ] **Step 1: Programs list page**

`.../academics/programs/page.tsx`:
```tsx
import { ProgramsManager } from './__components/programs-manager';

export default function ProgramsPage() {
  return <ProgramsManager />;
}
```
`.../academics/programs/__components/programs-manager.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { ROUTE_ORG_ACADEMICS_PROGRAM } from '@/lib/data/constants/routes.constants';
import { useCreateProgram, useDeleteProgram, usePrograms } from '@/lib/hooks/academics/use-academics.hook';

export function ProgramsManager() {
  const t = useTranslations('Academics');
  const { data: programs = [], isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const deleteProgram = useDeleteProgram();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  let list = <p className="text-muted-foreground">{t('empty')}</p>;
  if (isLoading) list = <p>{t('loading')}</p>;
  else if (programs.length > 0) {
    list = (
      <ul className="grid gap-3 md:grid-cols-2">
        {programs.map((program) => (
          <li key={program._id}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <Link href={ROUTE_ORG_ACADEMICS_PROGRAM(program._id)} className="font-medium hover:underline">
                  {program.name}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (globalThis.confirm(t('confirmDelete'))) deleteProgram.mutate(program._id);
                  }}>
                  {t('delete')}
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">{t('programs.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('programs.new')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              createProgram.mutate(
                { name, description: description.trim() || undefined },
                {
                  onSuccess: () => {
                    setName('');
                    setDescription('');
                  },
                }
              );
            }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} required />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('description')} />
            <Button type="submit" disabled={!name.trim() || createProgram.isPending}>
              {t('create')}
            </Button>
          </form>
        </CardContent>
      </Card>
      {list}
    </div>
  );
}
```

- [ ] **Step 2: Program detail with courses, levels and cohorts**

`.../academics/programs/[id]/page.tsx`:
```tsx
'use client';

import { useParams } from 'next/navigation';
import { ProgramDetail } from './__components/program-detail';

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProgramDetail programId={id} />;
}
```
`.../academics/programs/[id]/__components/program-detail.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { useCourseOptions, useLinkCourse, useProgram, useProgramCourses, useUnlinkCourse } from '@/lib/hooks/academics/use-academics.hook';
import { CourseLevels } from './course-levels';

export function ProgramDetail({ programId }: { programId: string }) {
  const t = useTranslations('Academics');
  const { data: program } = useProgram(programId);
  const { data: courses = [] } = useProgramCourses(programId);
  const { data: options = [] } = useCourseOptions();
  const linkCourse = useLinkCourse();
  const unlinkCourse = useUnlinkCourse();
  const [courseId, setCourseId] = useState('');
  const linkable = options.filter((option) => option.programId !== programId);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">{program?.name ?? t('loading')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('programs.courses')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder={t('programs.selectCourse')} />
              </SelectTrigger>
              <SelectContent>
                {linkable.map((course) => (
                  <SelectItem key={course._id} value={course._id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!courseId || linkCourse.isPending}
              onClick={() => linkCourse.mutate({ programId, courseId }, { onSuccess: () => setCourseId('') })}>
              {t('programs.linkCourse')}
            </Button>
          </div>
          {courses.length === 0 ? <p className="text-muted-foreground">{t('empty')}</p> : null}
          {courses.map((course) => (
            <div key={course._id} className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{course.name}</h2>
                <Button variant="outline" size="sm" onClick={() => unlinkCourse.mutate(course._id)}>
                  {t('programs.unlink')}
                </Button>
              </div>
              <CourseLevels courseId={course._id} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```
`.../academics/programs/[id]/__components/course-levels.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { useCreateLevel, useDeleteLevel, useLevels } from '@/lib/hooks/academics/use-academics.hook';
import { LevelCohorts } from './level-cohorts';

export function CourseLevels({ courseId }: { courseId: string }) {
  const t = useTranslations('Academics');
  const { data: levels = [] } = useLevels(courseId);
  const createLevel = useCreateLevel();
  const deleteLevel = useDeleteLevel();
  const [name, setName] = useState('');
  const [order, setOrder] = useState(String(levels.length + 1));

  return (
    <div className="space-y-3">
      <h3 className="font-medium">{t('programs.levels')}</h3>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createLevel.mutate({ courseId, name, order: Number(order) }, { onSuccess: () => setName('') });
        }}>
        <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} required />
        <Input className="w-24" type="number" min={1} value={order} onChange={(e) => setOrder(e.target.value)} placeholder={t('order')} required />
        <Button type="submit" size="sm" disabled={!name.trim() || createLevel.isPending}>
          {t('programs.newLevel')}
        </Button>
      </form>
      {levels.map((level) => (
        <div key={level._id} className="ms-4 space-y-2 border-s ps-4">
          <div className="flex items-center gap-3">
            <span className="font-medium">
              {level.order}. {level.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (globalThis.confirm(t('confirmDelete'))) deleteLevel.mutate(level._id);
              }}>
              {t('delete')}
            </Button>
          </div>
          <LevelCohorts levelId={level._id} />
        </div>
      ))}
    </div>
  );
}
```
`.../academics/programs/[id]/__components/level-cohorts.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { ROUTE_ORG_ACADEMICS_GROUP_NEW, ROUTE_ORG_ACADEMICS_GROUPS } from '@/lib/data/constants/routes.constants';
import { useCohorts, useCreateCohort, useDeleteCohort } from '@/lib/hooks/academics/use-academics.hook';

export function LevelCohorts({ levelId }: { levelId: string }) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: cohorts = [] } = useCohorts(levelId);
  const createCohort = useCreateCohort();
  const deleteCohort = useDeleteCohort();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');

  return (
    <div className="space-y-2">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createCohort.mutate({ levelId, name, startDate }, { onSuccess: () => setName('') });
        }}>
        <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} required />
        <Input className="w-44" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label={t('startDate')} required />
        <Button type="submit" size="sm" variant="secondary" disabled={!name.trim() || !startDate || createCohort.isPending}>
          {t('programs.newCohort')}
        </Button>
      </form>
      <ul className="space-y-1">
        {cohorts.map((cohort) => (
          <li key={cohort._id} className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              {cohort.name} — {new Date(cohort.startDate).toLocaleDateString(locale)}
            </span>
            <Link className="underline" href={`${ROUTE_ORG_ACADEMICS_GROUPS}?cohortId=${cohort._id}`}>
              {t('programs.viewGroups')}
            </Link>
            <Link className="underline" href={ROUTE_ORG_ACADEMICS_GROUP_NEW(cohort._id)}>
              {t('programs.newGroup')}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (globalThis.confirm(t('confirmDelete'))) deleteCohort.mutate(cohort._id);
              }}>
              {t('delete')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2b: Lint the new files**

Run: `pnpm --filter client exec eslint "src/app/[locale]/(dashboard)/organization-dashboard/academics/programs"`
Expected: no errors. Fix any `i18next/no-literal-string` hits by moving the text into `Academics.*` in both locale files. The `—` separator in `level-cohorts.tsx` may need `{' — '}` or an eslint-disable comment explaining that it is punctuation.

- [ ] **Step 3: Type-check and commit**

Run:
```bash
pnpm --filter client run tsc --noEmit -p tsconfig.json > .superpowers/tsc-task13-client.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-task13-client.txt | sort)
```
Expected: no `>` lines.
```bash
git add "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs"
git commit -m "feat(client): programs, levels and cohorts pages"
```

---

### Task 14: Client: groups list, new group, group formation screen

**Files:**
- Create: `.../organization-dashboard/academics/groups/page.tsx`, `.../academics/groups/__components/groups-manager.tsx`
- Create: `.../academics/groups/new/page.tsx`
- Create: `.../academics/groups/__components/group-form.tsx`, `schedule-editor.tsx`, `status-badge.tsx`
- Create: `.../academics/groups/[id]/page.tsx`
- Create: `.../academics/groups/[id]/__components/group-formation-screen.tsx`, `readiness-panel.tsx`, `students-card.tsx`, `teacher-card.tsx`, `cancel-group-dialog.tsx`
- Test: `.../academics/groups/[id]/__components/readiness-panel.test.tsx`

**Interfaces:**
- Consumes: the hooks and types from Task 12; `ReadinessKey`, `GroupStatus`, `GroupPaymentStatus` (Task 1)
- Produces:
  - `ReadinessPanel` props: `{ readiness: Readiness; status: GroupStatus; contentSent: boolean; disabled: boolean; onToggleContentSent: (done: boolean) => void; onMarkReady: () => void }`
  - `GroupForm` props: `{ initial: GroupFormValues; submitLabel: string; pending: boolean; onSubmit: (values: GroupFormValues) => void }`
  - `ScheduleEditor` props: `{ value: ScheduleSlot[]; onChange: (slots: ScheduleSlot[]) => void }`
  - `StatusBadge` props: `{ status: GroupStatus }`

- [ ] **Step 1: Write the failing ReadinessPanel test**

`.../academics/groups/[id]/__components/readiness-panel.test.tsx`:
```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GroupStatus, ReadinessKey } from '@darnozom/shared-types';
import { ReadinessPanel } from './readiness-panel';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const items = (done: boolean) => Object.values(ReadinessKey).map((key) => ({ key, done }));

describe('ReadinessPanel', () => {
  it('lists all five readiness items', () => {
    render(<ReadinessPanel readiness={{ ready: false, items: items(false) }} status={GroupStatus.FORMING} contentSent={false} disabled={false} onToggleContentSent={vi.fn()} onMarkReady={vi.fn()} />);
    for (const key of Object.values(ReadinessKey)) expect(screen.getByText(`readiness.items.${key}`)).toBeInTheDocument();
  });

  it('disables "Ready to start" and shows the hint while items are missing', () => {
    render(<ReadinessPanel readiness={{ ready: false, items: items(false) }} status={GroupStatus.FORMING} contentSent={false} disabled={false} onToggleContentSent={vi.fn()} onMarkReady={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'readiness.markReady' })).toBeDisabled();
    expect(screen.getByText('readiness.notReadyHint')).toBeInTheDocument();
  });

  it('enables "Ready to start" for a ready forming group and calls onMarkReady', () => {
    const onMarkReady = vi.fn();
    render(<ReadinessPanel readiness={{ ready: true, items: items(true) }} status={GroupStatus.FORMING} contentSent disabled={false} onToggleContentSent={vi.fn()} onMarkReady={onMarkReady} />);
    fireEvent.click(screen.getByRole('button', { name: 'readiness.markReady' }));
    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('hides the button once the group is ready to start', () => {
    render(<ReadinessPanel readiness={{ ready: true, items: items(true) }} status={GroupStatus.READY_TO_START} contentSent disabled={false} onToggleContentSent={vi.fn()} onMarkReady={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'readiness.markReady' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter client exec vitest run readiness-panel`
Expected: FAIL with `Failed to resolve import "./readiness-panel"`.

- [ ] **Step 3: Implement ReadinessPanel**

`.../academics/groups/[id]/__components/readiness-panel.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { IconCircleCheck, IconCircleDashed } from '@tabler/icons-react';
import { GroupStatus, ReadinessKey, type Readiness } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Switch } from '@/components/atoms/switch';

interface ReadinessPanelProps {
  readiness: Readiness;
  status: GroupStatus;
  contentSent: boolean;
  disabled: boolean;
  onToggleContentSent: (done: boolean) => void;
  onMarkReady: () => void;
}

export function ReadinessPanel({ readiness, status, contentSent, disabled, onToggleContentSent, onMarkReady }: ReadinessPanelProps) {
  const t = useTranslations('Academics');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('readiness.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {readiness.items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              {item.done ? <IconCircleCheck className="h-5 w-5 text-green-600" /> : <IconCircleDashed className="text-muted-foreground h-5 w-5" />}
              <span>{t(`readiness.items.${item.key}`)}</span>
              {item.key === ReadinessKey.CONTENT_SENT ? (
                <Switch
                  className="ms-auto"
                  checked={contentSent}
                  disabled={disabled}
                  onCheckedChange={(checked) => onToggleContentSent(checked)}
                  aria-label={t('readiness.contentSentToggle')}
                />
              ) : null}
            </li>
          ))}
        </ul>
        {status === GroupStatus.FORMING ? (
          <div className="space-y-2">
            {readiness.ready ? null : <p className="text-muted-foreground text-sm">{t('readiness.notReadyHint')}</p>}
            <Button disabled={disabled || !readiness.ready} onClick={onMarkReady}>
              {t('readiness.markReady')}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter client exec vitest run readiness-panel`
Expected: PASS, 4 tests.

- [ ] **Step 5: Shared group components**

`.../academics/groups/__components/status-badge.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';

const VARIANT: Record<GroupStatus, 'default' | 'secondary' | 'destructive'> = {
  [GroupStatus.FORMING]: 'secondary',
  [GroupStatus.READY_TO_START]: 'default',
  [GroupStatus.CANCELLED]: 'destructive',
};

export function StatusBadge({ status }: { status: GroupStatus }) {
  const t = useTranslations('Academics');
  return <Badge variant={VARIANT[status]}>{t(`groups.statuses.${status}`)}</Badge>;
}
```
`.../academics/groups/__components/schedule-editor.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ScheduleSlot } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function ScheduleEditor({ value, onChange }: { value: ScheduleSlot[]; onChange: (slots: ScheduleSlot[]) => void }) {
  const t = useTranslations('Academics');
  const update = (index: number, patch: Partial<ScheduleSlot>) => onChange(value.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  return (
    <div className="space-y-2">
      {value.map((slot, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <Select value={String(slot.dayOfWeek)} onValueChange={(day) => update(index, { dayOfWeek: Number(day) })}>
            <SelectTrigger className="w-36" aria-label={t('form.day')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {t(`days.${day}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-32" type="time" value={slot.startTime} onChange={(e) => update(index, { startTime: e.target.value })} aria-label={t('form.startTime')} />
          <Input
            className="w-28"
            type="number"
            min={15}
            max={480}
            value={slot.durationMinutes}
            onChange={(e) => update(index, { durationMinutes: Number(e.target.value) })}
            aria-label={t('form.duration')}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(value.filter((_, i) => i !== index))}>
            {t('remove')}
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { dayOfWeek: 0, startTime: '17:00', durationMinutes: 60 }])}>
        {t('form.addSlot')}
      </Button>
    </div>
  );
}
```
`.../academics/groups/__components/group-form.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import type { GroupFormValues } from '@/lib/types/academics/academics';
import { ScheduleEditor } from './schedule-editor';

interface GroupFormProps {
  initial: GroupFormValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: GroupFormValues) => void;
}

export function GroupForm({ initial, submitLabel, pending, onSubmit }: GroupFormProps) {
  const t = useTranslations('Academics');
  const [values, setValues] = useState<GroupFormValues>(initial);
  const set = <K extends keyof GroupFormValues>(key: K, value: GroupFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...values, name: values.name.trim(), meetingLink: values.meetingLink?.trim() || null, whatsappGroupLink: values.whatsappGroupLink?.trim() || null });
      }}>
      <div className="space-y-1">
        <Label htmlFor="group-name">{t('name')}</Label>
        <Input id="group-name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-timezone">{t('form.timezone')}</Label>
        <Input id="group-timezone" value={values.timezone} onChange={(e) => set('timezone', e.target.value)} required />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>{t('form.schedule')}</Label>
        <ScheduleEditor value={values.schedule} onChange={(schedule) => set('schedule', schedule)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-min">{t('form.minStudents')}</Label>
        <Input id="group-min" type="number" min={1} value={values.minStudents} onChange={(e) => set('minStudents', Number(e.target.value))} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-max">{t('form.maxStudents')}</Label>
        <Input id="group-max" type="number" min={1} value={values.maxStudents} onChange={(e) => set('maxStudents', Number(e.target.value))} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-meeting">{t('form.meetingLink')}</Label>
        <Input id="group-meeting" type="url" value={values.meetingLink ?? ''} onChange={(e) => set('meetingLink', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-whatsapp">{t('form.whatsappGroupLink')}</Label>
        <Input id="group-whatsapp" type="url" value={values.whatsappGroupLink ?? ''} onChange={(e) => set('whatsappGroupLink', e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending || values.schedule.length === 0}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Groups list and new-group pages**

`.../academics/groups/page.tsx`:
```tsx
import { GroupsManager } from './__components/groups-manager';

export default function GroupsPage() {
  return <GroupsManager />;
}
```
`.../academics/groups/__components/groups-manager.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Link } from '@/i18n/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { ROUTE_ORG_ACADEMICS_GROUP } from '@/lib/data/constants/routes.constants';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';
import { StatusBadge } from './status-badge';

const ALL = 'ALL';

export function GroupsManager() {
  const t = useTranslations('Academics');
  const cohortId = useSearchParams().get('cohortId') ?? undefined;
  const [status, setStatus] = useState<string>(ALL);
  const { data: groups = [], isLoading } = useGroups({ cohortId, status: status === ALL ? undefined : (status as GroupStatus) });

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('groups.title')}</h1>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48" aria-label={t('groups.status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('groups.allStatuses')}</SelectItem>
            {Object.values(GroupStatus).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`groups.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <p>{t('loading')}</p> : null}
      {!isLoading && groups.length === 0 ? <p className="text-muted-foreground">{t('empty')}</p> : null}
      {groups.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('groups.status')}</TableHead>
              <TableHead>{t('groups.readiness')}</TableHead>
              <TableHead>{t('groups.students')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group._id}>
                <TableCell>
                  <Link href={ROUTE_ORG_ACADEMICS_GROUP(group._id)} className="font-medium hover:underline">
                    {group.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={group.status} />
                </TableCell>
                <TableCell>{`${group.readiness.items.filter((item) => item.done).length}/${group.readiness.items.length}`}</TableCell>
                <TableCell>{`${group.students.length}/${group.maxStudents}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
```
`.../academics/groups/new/page.tsx`:
```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ROUTE_ORG_ACADEMICS_GROUP } from '@/lib/data/constants/routes.constants';
import { useCreateGroup } from '@/lib/hooks/academics/use-academics.hook';
import { GroupForm } from '../__components/group-form';

export default function NewGroupPage() {
  const t = useTranslations('Academics');
  const router = useRouter();
  const cohortId = useSearchParams().get('cohortId');
  const createGroup = useCreateGroup();

  if (!cohortId) return <p className="p-4">{t('form.missingCohort')}</p>;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('groups.new')}</h1>
      <GroupForm
        initial={{
          name: '',
          schedule: [{ dayOfWeek: 0, startTime: '17:00', durationMinutes: 60 }],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          minStudents: 1,
          maxStudents: 10,
          meetingLink: null,
          whatsappGroupLink: null,
        }}
        submitLabel={t('create')}
        pending={createGroup.isPending}
        onSubmit={(values) => createGroup.mutate({ ...values, cohortId }, { onSuccess: (group) => router.push(ROUTE_ORG_ACADEMICS_GROUP(group._id)) })}
      />
    </div>
  );
}
```
> `router.push` from `next/navigation` doesn't add the locale prefix. If the project's `@/i18n/navigation` exports `useRouter` (check with `grep -n "useRouter" apps/client/src/i18n/navigation.ts`), import it from there instead so the locale is kept.

- [ ] **Step 7: Formation screen and its cards**

`.../academics/groups/[id]/page.tsx`:
```tsx
'use client';

import { useParams } from 'next/navigation';
import { GroupFormationScreen } from './__components/group-formation-screen';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  return <GroupFormationScreen groupId={id} />;
}
```
`.../academics/groups/[id]/__components/cancel-group-dialog.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/atoms/dialog';
import { Textarea } from '@/components/atoms/textarea';

export function CancelGroupDialog({ pending, onConfirm }: { pending: boolean; onConfirm: (reason: string) => void }) {
  const t = useTranslations('Academics');
  const [reason, setReason] = useState('');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">{t('cancelGroup.title')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelGroup.title')}</DialogTitle>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('cancelGroup.reason')} rows={3} />
        <Button variant="destructive" disabled={!reason.trim() || pending} onClick={() => onConfirm(reason)}>
          {t('cancelGroup.confirm')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```
`.../academics/groups/[id]/__components/teacher-card.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import type { IGroupDetail } from '@/lib/types/academics/academics';
import { useAssignTeacher, useTeacherCandidates, useUnassignTeacher } from '@/lib/hooks/academics/use-academics.hook';

export function TeacherCard({ group, disabled }: { group: IGroupDetail; disabled: boolean }) {
  const t = useTranslations('Academics');
  const { data: candidates = [] } = useTeacherCandidates(group._id);
  const assign = useAssignTeacher();
  const unassign = useUnassignTeacher();
  const [teacherId, setTeacherId] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('teacher.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {group.teacherId ? (
          <div className="flex items-center justify-between">
            <span className="font-medium">{group.people[group.teacherId] ?? group.teacherId}</span>
            <Button variant="outline" size="sm" disabled={disabled || unassign.isPending} onClick={() => unassign.mutate(group._id)}>
              {t('teacher.unassign')}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">{t('groups.noTeacher')}</p>
        )}
        <div className="flex gap-2">
          <Select value={teacherId} onValueChange={setTeacherId} disabled={disabled}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder={t('teacher.select')} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.teacherId} value={candidate.teacherId} disabled={!candidate.ok}>
                  {candidate.ok ? candidate.name : `${candidate.name} — ${candidate.reasons.map((r) => t(`teacher.reasons.${r}`)).join(', ')}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={disabled || !teacherId || assign.isPending}
            onClick={() => assign.mutate({ id: group._id, teacherId }, { onSuccess: () => setTeacherId('') })}>
            {t('teacher.assign')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```
`.../academics/groups/[id]/__components/students-card.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { GroupPaymentStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Switch } from '@/components/atoms/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { IGroupDetail } from '@/lib/types/academics/academics';
import { useAddStudent, useRemoveStudent, useSetPaymentStatus, useSetWhatsapp, useStudentCandidates } from '@/lib/hooks/academics/use-academics.hook';

export function StudentsCard({ group, disabled }: { group: IGroupDetail; disabled: boolean }) {
  const t = useTranslations('Academics');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data: candidates = [] } = useStudentCandidates(disabled ? '' : group._id, debounced);
  const addStudent = useAddStudent();
  const removeStudent = useRemoveStudent();
  const setPayment = useSetPaymentStatus();
  const setWhatsapp = useSetWhatsapp();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${t('students.title')} (${group.students.length}/${group.maxStudents})`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('students.payment')}</TableHead>
              <TableHead>{t('students.whatsapp')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.students.map((student) => (
              <TableRow key={student.studentId}>
                <TableCell>{group.people[student.studentId] ?? student.studentId}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={student.paymentStatus === GroupPaymentStatus.PAID}
                      disabled={disabled}
                      onCheckedChange={(paid) =>
                        setPayment.mutate({ id: group._id, studentId: student.studentId, paymentStatus: paid ? GroupPaymentStatus.PAID : GroupPaymentStatus.UNPAID })
                      }
                      aria-label={t('students.payment')}
                    />
                    <span>{student.paymentStatus === GroupPaymentStatus.PAID ? t('students.paid') : t('students.unpaid')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={student.whatsappAdded}
                    disabled={disabled}
                    onCheckedChange={(whatsappAdded) => setWhatsapp.mutate({ id: group._id, studentId: student.studentId, whatsappAdded })}
                    aria-label={t('students.whatsapp')}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" disabled={disabled} onClick={() => removeStudent.mutate({ id: group._id, studentId: student.studentId })}>
                    {t('remove')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {disabled ? null : (
          <div className="space-y-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('students.search')} />
            {candidates.length === 0 ? <p className="text-muted-foreground text-sm">{t('students.noCandidates')}</p> : null}
            <ul className="space-y-1">
              {candidates.map((candidate) => (
                <li key={candidate._id} className="flex items-center justify-between text-sm">
                  <span>{`${candidate.firstName ?? ''} ${candidate.lastName ?? ''} (${candidate.email ?? candidate.username ?? ''})`}</span>
                  <Button size="sm" variant="outline" disabled={addStudent.isPending} onClick={() => addStudent.mutate({ id: group._id, studentId: candidate._id })}>
                    {t('add')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```
> Confirm that `useDebounce` is exported by name with `grep -n "export" apps/client/src/lib/hooks/use-debounce.ts`. If it is a default export, use `import useDebounce from '@/lib/hooks/use-debounce';`.

`.../academics/groups/[id]/__components/group-formation-screen.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useCancelGroup, useGroup, useMarkGroupReady, useSetContentSent, useUpdateGroup } from '@/lib/hooks/academics/use-academics.hook';
import { GroupForm } from '../../__components/group-form';
import { StatusBadge } from '../../__components/status-badge';
import { CancelGroupDialog } from './cancel-group-dialog';
import { ReadinessPanel } from './readiness-panel';
import { StudentsCard } from './students-card';
import { TeacherCard } from './teacher-card';

export function GroupFormationScreen({ groupId }: { groupId: string }) {
  const t = useTranslations('Academics');
  const { data: group, isLoading } = useGroup(groupId);
  const updateGroup = useUpdateGroup();
  const markReady = useMarkGroupReady();
  const cancelGroup = useCancelGroup();
  const setContentSent = useSetContentSent();

  if (isLoading || !group) return <p className="p-4">{t('loading')}</p>;
  const cancelled = group.status === GroupStatus.CANCELLED;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <StatusBadge status={group.status} />
        </div>
        {cancelled ? null : <CancelGroupDialog pending={cancelGroup.isPending} onConfirm={(reason) => cancelGroup.mutate({ id: group._id, reason })} />}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <GroupForm
                key={group._id}
                initial={{
                  name: group.name,
                  schedule: group.schedule,
                  timezone: group.timezone,
                  minStudents: group.minStudents,
                  maxStudents: group.maxStudents,
                  meetingLink: group.meetingLink ?? null,
                  whatsappGroupLink: group.whatsappGroupLink ?? null,
                }}
                submitLabel={t('save')}
                pending={updateGroup.isPending || cancelled}
                onSubmit={(data) => updateGroup.mutate({ id: group._id, data })}
              />
            </CardContent>
          </Card>
          <StudentsCard group={group} disabled={cancelled} />
        </div>
        <div className="space-y-6">
          <ReadinessPanel
            readiness={group.readiness}
            status={group.status}
            contentSent={group.contentSent.done}
            disabled={cancelled || markReady.isPending}
            onToggleContentSent={(done) => setContentSent.mutate({ id: group._id, done })}
            onMarkReady={() => markReady.mutate(group._id)}
          />
          <TeacherCard group={group} disabled={cancelled} />
          <Card>
            <CardHeader>
              <CardTitle>{t('form.whatsappGroupLink')}</CardTitle>
            </CardHeader>
            <CardContent>
              {group.whatsappGroupLink ? (
                <a className="break-all underline" href={group.whatsappGroupLink} target="_blank" rel="noreferrer">
                  {group.whatsappGroupLink}
                </a>
              ) : (
                <p className="text-muted-foreground">{t('empty')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Lint, type-check, run the tests, commit**

Run:
```bash
pnpm --filter client exec eslint "src/app/[locale]/(dashboard)/organization-dashboard/academics"
pnpm --filter client run tsc --noEmit -p tsconfig.json > .superpowers/tsc-task14-client.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-task14-client.txt | sort)
pnpm --filter client exec vitest run readiness-panel filter-nav
```
Expected: no lint errors (fix `i18next/no-literal-string` hits as in Task 13); no `>` lines; vitest PASS.
```bash
git add "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups"
git commit -m "feat(client): groups list and group formation screen"
```

---

### Task 15: Client: teacher availability and groups, additional roles, parent and student group views

**Files:**
- Create: `.../organization-dashboard/my-availability/page.tsx`, `.../organization-dashboard/my-availability/__components/availability-editor.tsx`
- Create: `.../organization-dashboard/my-groups/page.tsx`
- Create: `apps/client/src/components/organs/academics/group-summary-list.tsx` (read-only group list shared by teacher, student and parent)
- Create: `.../organization-dashboard/users/[id]/__components/additional-roles-card.tsx`
- Modify: `.../organization-dashboard/users/[id]/edit/page.tsx`
- Create: `.../parent-dashboard/children/__components/child-groups.tsx`; Modify: `.../parent-dashboard/children/page.tsx`
- Create: `.../student-dashboard/my-groups/page.tsx`

**Interfaces:**
- Consumes: the hooks from Task 12; `ADDITIONAL_ROLE_OPTIONS`, `Roles` (Task 1); `useChildren()` (existing, `@/lib/hooks/parent/useParent.hook`, returns `IChild[]` with `_id` and `firstName`); `useUserByOrganization(id)` (existing)
- Produces: `GroupSummaryList` props `{ groups: IGroup[] }`

- [ ] **Step 1: Shared read-only group list**

`apps/client/src/components/organs/academics/group-summary-list.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { IGroup } from '@/lib/types/academics/academics';

export function GroupSummaryList({ groups }: { groups: IGroup[] }) {
  const t = useTranslations('Academics');
  if (groups.length === 0) return <p className="text-muted-foreground">{t('childGroups.empty')}</p>;
  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li key={group._id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{group.name}</span>
            <span className="text-sm">{t(`groups.statuses.${group.status}`)}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {group.schedule.map((slot) => `${t(`days.${slot.dayOfWeek}`)} ${slot.startTime} (${slot.durationMinutes}′)`).join(' · ')}
            {` — ${group.timezone}`}
          </p>
          {group.meetingLink ? (
            <a className="text-sm underline" href={group.meetingLink} target="_blank" rel="noreferrer">
              {t('form.meetingLink')}
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Teacher pages**

`.../organization-dashboard/my-groups/page.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { GroupSummaryList } from '@/components/organs/academics/group-summary-list';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';

export default function MyGroupsPage() {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({});
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('myGroups.title')}</h1>
      {isLoading ? <p>{t('loading')}</p> : <GroupSummaryList groups={groups} />}
    </div>
  );
}
```
`.../organization-dashboard/my-availability/page.tsx`:
```tsx
import { AvailabilityEditor } from './__components/availability-editor';

export default function MyAvailabilityPage() {
  return <AvailabilityEditor />;
}
```
`.../organization-dashboard/my-availability/__components/availability-editor.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AvailabilitySlot } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { useMyAvailability, useSaveMyAvailability } from '@/lib/hooks/academics/use-academics.hook';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function AvailabilityEditor() {
  const t = useTranslations('Academics');
  const { data } = useMyAvailability();
  const save = useSaveMyAvailability();
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    if (!data) return;
    if (data.timezone) setTimezone(data.timezone);
    setSlots(data.slots);
  }, [data]);

  const update = (index: number, patch: Partial<AvailabilitySlot>) => setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('availability.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="availability-timezone">{t('form.timezone')}</Label>
            <Input id="availability-timezone" className="w-72" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
          {slots.map((slot, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Select value={String(slot.dayOfWeek)} onValueChange={(day) => update(index, { dayOfWeek: Number(day) })}>
                <SelectTrigger className="w-36" aria-label={t('form.day')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {t(`days.${day}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="w-32" type="time" value={slot.startTime} onChange={(e) => update(index, { startTime: e.target.value })} aria-label={t('form.startTime')} />
              <Input
                className="w-32"
                value={slot.endTime}
                pattern="^(([01]\d|2[0-3]):[0-5]\d|24:00)$"
                onChange={(e) => update(index, { endTime: e.target.value })}
                aria-label={t('availability.endTime')}
                title={t('availability.endTime')}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}>
                {t('remove')}
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setSlots((prev) => [...prev, { dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }])}>
              {t('availability.addSlot')}
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate({ timezone, slots })}>
              {t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Additional roles card on the user edit page**

`.../organization-dashboard/users/[id]/__components/additional-roles-card.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ADDITIONAL_ROLE_OPTIONS, Roles } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Checkbox } from '@/components/atoms/checkbox';
import { useSetAdditionalRoles } from '@/lib/hooks/academics/use-academics.hook';

interface AdditionalRolesCardProps {
  userId: string;
  roleName: Roles;
  initial: Roles[];
}

export function AdditionalRolesCard({ userId, roleName, initial }: AdditionalRolesCardProps) {
  const t = useTranslations('Academics');
  const [selected, setSelected] = useState<Roles[]>(initial);
  const save = useSetAdditionalRoles();
  if (roleName === Roles.STUDENT || roleName === Roles.PARENT) return null;
  const options = ADDITIONAL_ROLE_OPTIONS.filter((role) => role !== roleName);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('additionalRoles.title')}</CardTitle>
        <CardDescription>{t('additionalRoles.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((role) => (
            <label key={role} className="flex items-center gap-2">
              <Checkbox
                checked={selected.includes(role)}
                onCheckedChange={(checked) => setSelected((prev) => (checked ? [...prev, role] : prev.filter((r) => r !== role)))}
              />
              <span>{t(`roles.${role}`)}</span>
            </label>
          ))}
        </div>
        <Button disabled={save.isPending} onClick={() => save.mutate({ userId, additionalRoles: selected })}>
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
```
In `.../organization-dashboard/users/[id]/edit/page.tsx`:
- add `import { AdditionalRolesCard } from '../__components/additional-roles-card';`
- render it right after `<CreateUserForm … />`:
```tsx
      {user ? <AdditionalRolesCard userId={id} roleName={user.roleName} initial={user.additionalRoles ?? []} /> : null}
```
If `useUserByOrganization` is not typed as `IUser`, cast it at the call site: `const typed = user as IUser | undefined`.

- [ ] **Step 4: Parent and student views**

`.../parent-dashboard/children/__components/child-groups.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { GroupSummaryList } from '@/components/organs/academics/group-summary-list';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';

export function ChildGroups({ childId, childName }: { childId: string; childName: string }) {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({ childId });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${childName} — ${t('childGroups.title')}`}</CardTitle>
      </CardHeader>
      <CardContent>{isLoading ? <p>{t('loading')}</p> : <GroupSummaryList groups={groups} />}</CardContent>
    </Card>
  );
}
```
In `.../parent-dashboard/children/page.tsx`:
- add `import { ChildGroups } from './__components/child-groups';`
- render this after `<ChildrenTable … />`:
```tsx
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {children.map((child) => (
          <ChildGroups key={child._id} childId={child._id} childName={`${child.firstName ?? ''}`} />
        ))}
      </div>
```
`.../student-dashboard/my-groups/page.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { GroupSummaryList } from '@/components/organs/academics/group-summary-list';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';

export default function StudentMyGroupsPage() {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({});
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('myGroups.title')}</h1>
      {isLoading ? <p>{t('loading')}</p> : <GroupSummaryList groups={groups} />}
    </div>
  );
}
```

- [ ] **Step 5: Lint, type-check, commit**

Run:
```bash
pnpm --filter client exec eslint "src/app/[locale]/(dashboard)/organization-dashboard/my-availability" "src/app/[locale]/(dashboard)/organization-dashboard/my-groups" "src/app/[locale]/(dashboard)/organization-dashboard/users" "src/app/[locale]/(dashboard)/parent-dashboard/children" "src/app/[locale]/(dashboard)/student-dashboard/my-groups" src/components/organs/academics
pnpm --filter client run tsc --noEmit -p tsconfig.json > .superpowers/tsc-task15-client.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-task15-client.txt | sort)
```
Expected: no new lint errors; no `>` lines. Punctuation-only literals (`—`, `·`, `′`) may need `{' — '}`-style expressions or a justified `eslint-disable-next-line i18next/no-literal-string`.
```bash
git add apps/client/src
git commit -m "feat(client): teacher availability, additional roles, family group views"
```

---

### Task 16: End-to-end verification

**Files:** none new. This task runs everything and walks the golden path in a browser.

- [ ] **Step 1: Full automated checks**

Run from the repo root:
```bash
pnpm --filter @darnozom/shared-types exec vitest run
pnpm --filter server exec jest src/academics src/role src/user/services/user.set-additional-roles.spec.ts
pnpm --filter client exec vitest run src/lib/utils/academics filter-nav readiness-panel
pnpm --filter client run i18n:check-keys
nx run-many -t test --exclude=darnozom-academy > .superpowers/full-test.txt 2>&1; tail -8 .superpowers/full-test.txt
```
Expected:
- the targeted suites all PASS
- the i18n check exits 0
- in the full run, the failing suites are exactly the pre-existing baseline (30 failed suites / 25 failed tests before this plan) and every new suite passes; the passed counts go up by the number of new tests

If any **pre-existing** suite flips from PASS to FAIL, that is a regression to fix.

- [ ] **Step 2: Seed roles**

Run: `pnpm --filter server run seed`
Expected: completes without errors. Check in MongoDB that the `roles` collection now contains `OWNER`, `MANAGER`, `COORDINATOR`, `SUPERVISOR`, `ACCOUNTANT`, `CONTENT_OFFICER`, `SHARIA_REVIEWER` and `HR`:
```bash
mongosh "$MONGODB_URI" --quiet --eval 'db.roles.find({}, {name:1,_id:0}).toArray()'
```
If `mongosh` isn't available, check with any MongoDB client, or log the role count from a small `tsx` script.

- [ ] **Step 3: Golden path in the browser**

Start the server (`pnpm --filter server run start:dev`, port 5000) and the client (`pnpm --filter client run dev`, port 3001). Sign up a new organization at `http://localhost:3001/en/signup`, or log in with an existing organization admin. Then:

1. **Academics → Programs:** create "Quran Memorization". Open it, link an existing course, add "Level 1" (order 1), and add the cohort "Oct 2026" starting 7 days from today.
2. **Users:** create a teacher user (role Instructor) and two student users. On another staff user's edit page, tick "Teacher" under **Additional roles**, then save.
3. Log in as the teacher. Open **My availability**, add Monday 16:00–20:00 in your time zone, and save.
4. Back as admin, from the cohort row click **New group**. Create a Monday 17:00 / 60 min group in the same time zone, with min 2 and max 2.
5. On the formation screen:
   - The readiness panel shows 0/5, and "Ready to start" is disabled with the hint.
   - Assign the teacher; the teacher's row is enabled in the picker.
   - Add both students. A third add attempt shows the "group is full" toast.
   - Toggle both payments to Paid, switch on "Content has been sent", and set a meeting link.
   - All 5 items turn green. Click **Ready to start**; the status badge becomes "Ready to start".
6. Remove one student. The status returns to "Forming" automatically and "Minimum students reached" turns grey.
7. Log in as the teacher, open **My availability**, and change Monday to 18:00–20:00. Saving shows "This availability no longer covers these groups: <group name>".
8. Switch the UI to Arabic (`/ar/...`) and confirm the new screens show Arabic labels with no raw keys.
9. Cancel the group with a reason. The status shows "Cancelled", and the edit controls are disabled.

Write down anything that misbehaves and fix it before closing the task. A UI issue caused by an assumption in this plan (for example a component prop name that doesn't match) is fixed in place and noted in the ledger.

- [ ] **Step 4: Final type-check and commit**

Run:
```bash
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-final-server.txt 2>&1
pnpm --filter client run tsc --noEmit -p tsconfig.json > .superpowers/tsc-final-client.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-final-server.txt | sort)
diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-final-client.txt | sort)
git status --short
```
Expected: no `>` lines in either diff. `git status` shows only intended changes. Commit any fixes made in Step 3 with a message describing them.
