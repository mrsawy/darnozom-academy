# Supervision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A supervisor can evaluate any held session of the groups they supervise on the concept's five criteria — commitment, teaching, pedagogy, content adherence and technical quality — each scored 1 to 5 with an optional note.

**Architecture:** A new collection in `academics/supervision` holds one evaluation per supervisor per session, with a unique index enforcing that. The authorization and validity rules live in a pure module tested without a database; the service is a thin shell around them. The entity deliberately carries **no monetary field**, which is how "supervisors can't impose financial penalties without authorization" holds in the MVP: nothing in an evaluation can reach pay, and sub-project 7's payroll never reads this collection.

**Tech Stack:** NestJS 11, Mongoose, Jest (server), Next.js 15 + React Query + next-intl (client), Vitest (client).

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp5-supervision-design.md`

**Depends on:** sub-project 2 (sessions, reports, attendance) and sub-project 3 (`supervisorId` on the group). **Sub-project 3 must be merged before this plan starts** — Task 4 reads `group.supervisorId`, which sub-project 3 adds.

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`. Never start a test run in the background.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection. Role changes go through `pnpm --filter server seed:prod`, which is upsert-only.
- **`eslint --fix` only on specific new or modified files, never on a directory.**
- Server controllers are NATS message handlers. The spec's `POST /sessions/:id/evaluation` maps to `academics.supervision.create`.
- Every server-side error is a key from `AcademicsErrors`; the client translates it with `translateApiMessage`.
- Every user-facing string is a next-intl key present in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- **Each of the five criteria is an integer from 1 to 5**, reusing `SESSION_SCORE_MIN` and `SESSION_SCORE_MAX` from `@darnozom/shared-types`, which sub-project 2 already defines as 1 and 5.
- **The evaluation entity has no monetary field, and payroll never reads it.** Do not add a penalty, deduction, bonus or amount field for any reason.
- Accountants, parents and students never see an evaluation — the concept's rule is that accountants cannot see confidential pedagogical notes.

## Plan Decisions (deviations from the spec, decided while writing this plan)

- **D1 — the entity is `SupervisionEvaluation`, not `SessionEvaluation`.** The spec §4 names it `SessionEvaluation`, but sub-project 2 already defines an embedded `SessionEvaluation` class in `apps/server/src/academics/session/entities/session.entity.ts` — the teacher's per-student evaluation inside a session report. Two classes with one name in one module is a bug waiting to happen, and the teacher's one is already shipped. Everything in this plan uses `SupervisionEvaluation`, and the shared-types criterion enum is `SupervisionCriterion`.
- **D2 — the edit window is measured from `createdAt` in whole hours.** The spec says "within 7 days" without naming the clock. 7 × 24 hours from `createdAt`, compared against a `now` the caller passes in, keeps the rule testable and immune to daylight saving, which a calendar-day reading is not.
- **D3 — a supervisor may evaluate a session of a group they supervise *now*.** The spec requires the caller to be the group's `supervisorId` and says nothing about a session held before they took the seat. Checking the seat at the time of the session would need a history the group does not keep. The current seat is the rule, and the evaluation records `supervisorId` so the audit trail stays honest.

## Review Focus

Failure modes the spec implies but does not pin with a test. Each has a test in the task that owns the code.

1. **A non-integer or out-of-range score** — `4.5`, `0`, `6`, `"3"`, `null`: each must be refused, never rounded or coerced. A silently rounded score is a fabricated judgment about a teacher. — Task 3.
2. **A cancelled session.** It is closed but was never held, so it must never be evaluable even though its status is terminal. — Task 3.
3. **A teacher who also holds `SUPERVISOR` for a different group** must still not read another teacher's evaluations through their `INSTRUCTOR` read rule. — Task 6.
4. **The supervisor seat changed hands** after a session was held: the current supervisor can evaluate, and the record names them, not the previous holder. — Task 4.
5. **An edit arriving exactly on the boundary** of the 7-day window, and one a second past it. — Task 5.

---

## File Structure

**Shared types**
- `lib/shared-types/src/lib/types/academics/academics.types.ts` — `SupervisionCriterion`, `SUPERVISION_CRITERIA`, `SUPERVISION_EDIT_WINDOW_HOURS`.
- `lib/shared-types/src/lib/messages/academics-errors.enum.ts` — the new error keys.
- `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts` — `SESSION_EVALUATION`.

**Server** — new directory `apps/server/src/academics/supervision/`:
- `entities/supervision-evaluation.entity.ts`
- `dto/supervision.dto.ts`
- `supervision-rules.ts` — pure validity and authorization rules. No database.
- `supervision.service.ts` — create, edit, read.
- `supervision.controller.message.ts`
- `supervision.types.ts`

Also modified: `academics/academics.module.ts`, and the supervisor, manager and instructor role seeds.

**Client** — `lib/types/academics/academics.ts`, `lib/actions/academics/supervision.action.ts` (new), `lib/hooks/academics/use-academics.hook.ts`, a new `organization-dashboard/my-groups/__components/evaluate-session-dialog.tsx`, a new `organization-dashboard/my-evaluations/` route, and both message catalogues.

---

### Task 1: Shared types for supervision

**Files:**
- Modify: `lib/shared-types/src/lib/types/academics/academics.types.ts`
- Modify: `lib/shared-types/src/lib/messages/academics-errors.enum.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Test: `lib/shared-types/src/lib/types/academics/supervision-types.spec.ts`

**Interfaces:**
- Consumes: `SESSION_SCORE_MIN`, `SESSION_SCORE_MAX` (already in this file from sub-project 2).
- Produces: `SupervisionCriterion`, `SUPERVISION_CRITERIA: readonly SupervisionCriterion[]`, `SUPERVISION_EDIT_WINDOW_HOURS = 168`; `AcademicsErrors.EVALUATION_NOT_FOUND`, `.NOT_GROUP_SUPERVISOR`, `.SESSION_NOT_HELD`, `.EVALUATION_ALREADY_EXISTS`, `.EVALUATION_INVALID`, `.EVALUATION_EDIT_WINDOW_CLOSED`; `Subjects.SESSION_EVALUATION`.

- [ ] **Step 1: Write the failing test**

Create `lib/shared-types/src/lib/types/academics/supervision-types.spec.ts`:

```ts
import {
  SESSION_SCORE_MAX,
  SESSION_SCORE_MIN,
  SUPERVISION_CRITERIA,
  SUPERVISION_EDIT_WINDOW_HOURS,
  SupervisionCriterion,
} from './academics.types';

describe('supervision shared types', () => {
  it('has exactly the concept’s five criteria, in the order the concept lists them', () => {
    expect([...SUPERVISION_CRITERIA]).toEqual([
      SupervisionCriterion.COMMITMENT,
      SupervisionCriterion.TEACHING,
      SupervisionCriterion.PEDAGOGY,
      SupervisionCriterion.CONTENT_ADHERENCE,
      SupervisionCriterion.TECHNICAL_QUALITY,
    ]);
  });

  it('scores on the same 1-to-5 scale the teacher report already uses', () => {
    expect(SESSION_SCORE_MIN).toBe(1);
    expect(SESSION_SCORE_MAX).toBe(5);
  });

  it('keeps an evaluation editable for seven days', () => {
    expect(SUPERVISION_EDIT_WINDOW_HOURS).toBe(7 * 24);
  });

  it('names no monetary criterion, because an evaluation can never affect pay', () => {
    const names = SUPERVISION_CRITERIA.join(',').toLowerCase();
    for (const forbidden of ['penalty', 'deduction', 'bonus', 'amount', 'pay']) {
      expect(names).not.toContain(forbidden);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest supervision-types --runInBand`
Expected: FAIL — `SUPERVISION_CRITERIA is not exported`.

- [ ] **Step 3: Add the types**

Append to `lib/shared-types/src/lib/types/academics/academics.types.ts`:

```ts
/** The five criteria the concept names for supervisor evaluation of a held session. */
export enum SupervisionCriterion {
  COMMITMENT = 'commitment',
  TEACHING = 'teaching',
  PEDAGOGY = 'pedagogy',
  CONTENT_ADHERENCE = 'contentAdherence',
  TECHNICAL_QUALITY = 'technicalQuality',
}

/** In the concept's own order. The form renders them in this order too. */
export const SUPERVISION_CRITERIA = [
  SupervisionCriterion.COMMITMENT,
  SupervisionCriterion.TEACHING,
  SupervisionCriterion.PEDAGOGY,
  SupervisionCriterion.CONTENT_ADHERENCE,
  SupervisionCriterion.TECHNICAL_QUALITY,
] as const;

/** An evaluation stays editable by its author for this many hours after it was written. */
export const SUPERVISION_EDIT_WINDOW_HOURS = 7 * 24;
```

Append to `AcademicsErrors`:

```ts
  EVALUATION_NOT_FOUND = 'evaluationNotFound',
  NOT_GROUP_SUPERVISOR = 'notGroupSupervisor',
  SESSION_NOT_HELD = 'sessionNotHeld',
  EVALUATION_ALREADY_EXISTS = 'evaluationAlreadyExists',
  EVALUATION_INVALID = 'evaluationInvalid',
  EVALUATION_EDIT_WINDOW_CLOSED = 'evaluationEditWindowClosed',
```

Add `SESSION_EVALUATION = 'SESSION_EVALUATION',` to `Subjects`, directly before `ALL = '*'`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest supervision-types --runInBand`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/shared-types/src
git commit -m "feat(sp5): add supervision criteria, error keys and the evaluation subject"
```

---

### Task 2: The evaluation entity

**Files:**
- Create: `apps/server/src/academics/supervision/entities/supervision-evaluation.entity.ts`
- Create: `apps/server/src/academics/supervision/supervision.types.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/supervision/entities/supervision-evaluation.entity.spec.ts`

**Interfaces:**
- Consumes: Task 1's enums and constants.
- Produces: `SupervisionEvaluation`, `SupervisionEvaluationSchema`; `SupervisionEvaluationLean`, `SupervisionEvaluationView`.

Per plan decision D1 the class is **`SupervisionEvaluation`**. `SessionEvaluation` is already taken by the teacher's per-student report entry in `session.entity.ts`; do not reuse that name.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/supervision/entities/supervision-evaluation.entity.spec.ts`:

```ts
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN, SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import { SupervisionEvaluationSchema } from './supervision-evaluation.entity';

const path = (name: string) => SupervisionEvaluationSchema.path(name) as { options: Record<string, unknown> } | undefined;

describe('SupervisionEvaluationSchema', () => {
  it('lets a supervisor evaluate a session exactly once', () => {
    const entry = SupervisionEvaluationSchema.indexes().find(([, options]) => options?.name === 'one_evaluation_per_supervisor_session');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ sessionId: 1, supervisorId: 1 });
    expect(options?.unique).toBe(true);
  });

  it('requires all five criteria, each bounded to the shared 1-to-5 scale', () => {
    for (const criterion of SUPERVISION_CRITERIA) {
      const options = path(criterion)?.options;
      expect(options).toBeDefined();
      expect(options?.required).toBe(true);
      expect(options?.min).toBe(SESSION_SCORE_MIN);
      expect(options?.max).toBe(SESSION_SCORE_MAX);
    }
  });

  it('keeps the teacher and the group on the record, so evaluations can be listed by either', () => {
    expect(path('teacherId')?.options.required).toBe(true);
    expect(path('groupId')?.options.required).toBe(true);
  });

  it('has no monetary field: an evaluation can never reach pay', () => {
    const fields = Object.keys(SupervisionEvaluationSchema.paths).join(',').toLowerCase();
    for (const forbidden of ['penalty', 'deduction', 'bonus', 'amount', 'salary', 'pay']) {
      expect(fields).not.toContain(forbidden);
    }
  });

  it('indexes the two listing paths', () => {
    const names = SupervisionEvaluationSchema.indexes().map(([, options]) => options?.name);
    expect(names).toEqual(expect.arrayContaining(['evaluations_by_group', 'evaluations_by_teacher']));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest supervision-evaluation.entity --runInBand`
Expected: FAIL — `Cannot find module './supervision-evaluation.entity'`.

- [ ] **Step 3: Create the entity**

Create `apps/server/src/academics/supervision/entities/supervision-evaluation.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN } from '@darnozom/shared-types';

const score = { type: Number, required: true, min: SESSION_SCORE_MIN, max: SESSION_SCORE_MAX } as const;

@Schema({ _id: false })
export class SupervisionNotes {
  @Prop({ type: String, required: false, trim: true })
  commitment?: string;

  @Prop({ type: String, required: false, trim: true })
  teaching?: string;

  @Prop({ type: String, required: false, trim: true })
  pedagogy?: string;

  @Prop({ type: String, required: false, trim: true })
  contentAdherence?: string;

  @Prop({ type: String, required: false, trim: true })
  technicalQuality?: string;

  @Prop({ type: String, required: false, trim: true })
  general?: string;
}
export const SupervisionNotesSchema = SchemaFactory.createForClass(SupervisionNotes);

/**
 * A supervisor's judgment of one held session, on the concept's five criteria.
 *
 * Deliberately carries no monetary field. That is the whole mechanism behind the concept's rule
 * that supervisors cannot impose financial penalties without authorization: there is nothing here
 * that pay can read, and sub-project 7's payroll never queries this collection.
 */
@Schema({ timestamps: true })
export class SupervisionEvaluation extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  /** Who wrote it. Recorded even if the supervisor seat later changes hands (plan decision D3). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  supervisorId: Types.ObjectId;

  @Prop(score)
  commitment: number;

  @Prop(score)
  teaching: number;

  @Prop(score)
  pedagogy: number;

  @Prop(score)
  contentAdherence: number;

  @Prop(score)
  technicalQuality: number;

  @Prop({ type: SupervisionNotesSchema, default: () => ({}) })
  notes: SupervisionNotes;
}

export const SupervisionEvaluationSchema = SchemaFactory.createForClass(SupervisionEvaluation);
SupervisionEvaluationSchema.index(
  { sessionId: 1, supervisorId: 1 },
  { unique: true, name: 'one_evaluation_per_supervisor_session' }
);
SupervisionEvaluationSchema.index({ organizationId: 1, groupId: 1, createdAt: -1 }, { name: 'evaluations_by_group' });
SupervisionEvaluationSchema.index({ organizationId: 1, teacherId: 1, createdAt: -1 }, { name: 'evaluations_by_teacher' });
```

Create `apps/server/src/academics/supervision/supervision.types.ts`:

```ts
import { Types } from 'mongoose';

export interface SupervisionNotesLean {
  commitment?: string;
  teaching?: string;
  pedagogy?: string;
  contentAdherence?: string;
  technicalQuality?: string;
  general?: string;
}

export interface SupervisionEvaluationLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  sessionId: Types.ObjectId;
  groupId: Types.ObjectId;
  teacherId: Types.ObjectId;
  supervisorId: Types.ObjectId;
  commitment: number;
  teaching: number;
  pedagogy: number;
  contentAdherence: number;
  technicalQuality: number;
  notes: SupervisionNotesLean;
  createdAt: Date;
  updatedAt?: Date;
}

/** What the client reads: the evaluation plus the names a list needs. */
export interface SupervisionEvaluationView extends SupervisionEvaluationLean {
  groupName: string;
  sessionSequence: number;
  sessionStartsAt: Date;
}
```

- [ ] **Step 4: Wire the module**

In `apps/server/src/academics/academics.module.ts`, add the import and `{ name: SupervisionEvaluation.name, schema: SupervisionEvaluationSchema },` to `MongooseModule.forFeature([...])`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest supervision-evaluation.entity src/academics --runInBand`
Expected: PASS — 5 new tests, every existing academics suite still green.

- [ ] **Step 6: Type-check, lint, commit**

```bash
pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json
pnpm --filter server exec eslint src/academics/supervision/entities/supervision-evaluation.entity.ts src/academics/supervision/entities/supervision-evaluation.entity.spec.ts src/academics/supervision/supervision.types.ts src/academics/academics.module.ts
git add apps/server/src/academics lib/shared-types/src
git commit -m "feat(sp5): add the SupervisionEvaluation collection"
```

---

### Task 3: The rules (pure)

**Files:**
- Create: `apps/server/src/academics/supervision/supervision-rules.ts`
- Test: `apps/server/src/academics/supervision/supervision-rules.spec.ts`

**Interfaces:**
- Consumes: `SUPERVISION_CRITERIA`, `SESSION_SCORE_MIN/MAX`, `SUPERVISION_EDIT_WINDOW_HOURS`, `SessionStatus`, `Roles`.
- Produces:

```ts
export function isHeldSession(status: SessionStatus): boolean;
export function areScoresValid(input: Record<string, unknown>): boolean;
export function canEvaluate(actor: { _id: string; roleName: Roles; additionalRoles: Roles[] }, group: { supervisorId: unknown }): boolean;
export function isWithinEditWindow(createdAt: Date, now: Date): boolean;
```

This task carries **Review Focus 1** (invalid scores) and **Review Focus 2** (a cancelled session).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/supervision/supervision-rules.spec.ts`:

```ts
import { Roles, SessionStatus, SUPERVISION_EDIT_WINDOW_HOURS } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { areScoresValid, canEvaluate, isHeldSession, isWithinEditWindow } from './supervision-rules';

const valid = { commitment: 5, teaching: 4, pedagogy: 3, contentAdherence: 2, technicalQuality: 1 };

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
  const actor = (id: string, roleName: Roles, additionalRoles: Roles[] = []) => ({ _id: id, roleName, additionalRoles });

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest supervision-rules --runInBand`
Expected: FAIL — `Cannot find module './supervision-rules'`.

- [ ] **Step 3: Write the rules**

Create `apps/server/src/academics/supervision/supervision-rules.ts`:

```ts
import {
  hasRole,
  Roles,
  SESSION_SCORE_MAX,
  SESSION_SCORE_MIN,
  SessionStatus,
  SUPERVISION_CRITERIA,
  SUPERVISION_EDIT_WINDOW_HOURS,
} from '@darnozom/shared-types';

/**
 * A session can be evaluated once it has actually been held. REPORT_PENDING and COMPLETED both
 * mean the clock ran out on a scheduled session; CANCELLED means it never happened, so there is
 * nothing to judge.
 */
export function isHeldSession(status: SessionStatus): boolean {
  return status === SessionStatus.REPORT_PENDING || status === SessionStatus.COMPLETED;
}

/**
 * All five criteria, each a whole number on the shared scale. Nothing is defaulted and nothing is
 * coerced: a rounded or guessed score is a fabricated judgment about a teacher's work.
 */
export function areScoresValid(input: Record<string, unknown>): boolean {
  return SUPERVISION_CRITERIA.every((criterion) => {
    const value = input[criterion];
    return typeof value === 'number' && Number.isInteger(value) && value >= SESSION_SCORE_MIN && value <= SESSION_SCORE_MAX;
  });
}

interface EvaluatorActor {
  _id: string;
  roleName: Roles;
  additionalRoles?: readonly Roles[];
}

/** The group's own supervisor, or anyone who manages the organization. */
export function canEvaluate(actor: EvaluatorActor, group: { supervisorId: unknown }): boolean {
  if (hasRole(actor, Roles.MANAGER) || hasRole(actor, Roles.OWNER)) return true;
  if (group.supervisorId == null) return false;
  return hasRole(actor, Roles.SUPERVISOR) && String(group.supervisorId) === actor._id;
}

/** Hours, not calendar days, so a daylight-saving shift cannot move the deadline (plan decision D2). */
export function isWithinEditWindow(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() < SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000;
}
```

Open `lib/shared-types/src/lib/types/role/role/role-helpers.ts` and match `hasRole`'s real parameter shape; adapt the calls if it differs and record a `Ruling:` line.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest supervision-rules --runInBand`
Expected: PASS, 19 tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/supervision/supervision-rules.ts src/academics/supervision/supervision-rules.spec.ts
git add apps/server/src/academics/supervision
git commit -m "feat(sp5): add the pure supervision validity and authorization rules"
```

---

### Task 4: Creating an evaluation

**Files:**
- Create: `apps/server/src/academics/supervision/supervision.service.ts`
- Create: `apps/server/src/academics/supervision/dto/supervision.dto.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/supervision/supervision-create.spec.ts`

**Interfaces:**
- Consumes: Task 3's rules, `SupervisionEvaluation` (Task 2), `Session`, `Group`, `AcademicsActor`.
- Produces: `SupervisionService.create(actor, sessionId, dto): Promise<SupervisionEvaluationLean>`.

This task carries **Review Focus 4** (the supervisor seat changed hands).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/supervision/supervision-create.spec.ts`:

```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles, SessionStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SupervisionService } from './supervision.service';

const ORG = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const TEACHER = new Types.ObjectId();
const SUPERVISOR = new Types.ObjectId();

const actor = (id = String(SUPERVISOR), roleName = Roles.SUPERVISOR) => ({
  _id: id,
  organizationId: String(ORG),
  roleName,
  additionalRoles: [] as Roles[],
});

const scores = { commitment: 5, teaching: 4, pedagogy: 3, contentAdherence: 2, technicalQuality: 1 };

const makeService = (
  session: Record<string, unknown> | null = {
    _id: SESSION,
    organizationId: ORG,
    groupId: GROUP,
    teacherId: TEACHER,
    sequence: 3,
    startsAt: new Date('2026-03-10T10:00:00.000Z'),
    status: SessionStatus.COMPLETED,
  },
  group: Record<string, unknown> | null = { _id: GROUP, organizationId: ORG, name: 'Group A', supervisorId: SUPERVISOR },
  duplicate = false
) => {
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      if (duplicate) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11000;
        throw error;
      }
      return { ...doc, _id: new Types.ObjectId(), createdAt: new Date() };
    }),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => [] }) }) })),
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const sessionModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => session }) })) };
  const groupModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => group }) })),
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => (group ? [group] : []) }) }) })),
  };
  return { service: new SupervisionService(model as never, sessionModel as never, groupModel as never), model };
};

describe('SupervisionService.create', () => {
  it('records the evaluation against the session, group, teacher and supervisor', async () => {
    const { service, model } = makeService();
    await service.create(actor(), String(SESSION), { ...scores, notes: { general: 'Solid.' } });
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG,
        sessionId: SESSION,
        groupId: GROUP,
        teacherId: TEACHER,
        supervisorId: SUPERVISOR,
        ...scores,
      })
    );
  });

  it('keeps the notes it was given', async () => {
    const { service, model } = makeService();
    await service.create(actor(), String(SESSION), { ...scores, notes: { teaching: 'Clear explanations.' } });
    expect(model.create.mock.calls[0][0].notes).toEqual({ teaching: 'Clear explanations.' });
  });

  it('defaults the notes to an empty object rather than undefined', async () => {
    const { service, model } = makeService();
    await service.create(actor(), String(SESSION), { ...scores });
    expect(model.create.mock.calls[0][0].notes).toEqual({});
  });

  it('refuses a session that has not been held', async () => {
    const { service } = makeService({
      _id: SESSION,
      organizationId: ORG,
      groupId: GROUP,
      teacherId: TEACHER,
      sequence: 1,
      startsAt: new Date(),
      status: SessionStatus.SCHEDULED,
    });
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(
      new ConflictException(AcademicsErrors.SESSION_NOT_HELD)
    );
  });

  it('refuses a cancelled session', async () => {
    const { service } = makeService({
      _id: SESSION,
      organizationId: ORG,
      groupId: GROUP,
      teacherId: TEACHER,
      sequence: 1,
      startsAt: new Date(),
      status: SessionStatus.CANCELLED,
    });
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(
      new ConflictException(AcademicsErrors.SESSION_NOT_HELD)
    );
  });

  it('refuses a supervisor who does not supervise this group', async () => {
    const { service } = makeService(undefined, { _id: GROUP, organizationId: ORG, name: 'Group A', supervisorId: new Types.ObjectId() });
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR)
    );
  });

  it('lets the supervisor who holds the seat now evaluate a session held earlier, and records them', async () => {
    const newSupervisor = new Types.ObjectId();
    const { service, model } = makeService(undefined, { _id: GROUP, organizationId: ORG, name: 'Group A', supervisorId: newSupervisor });
    await service.create(actor(String(newSupervisor)), String(SESSION), scores);
    expect(model.create.mock.calls[0][0].supervisorId).toEqual(newSupervisor);
  });

  it('refuses a score outside the scale', async () => {
    const { service } = makeService();
    await expect(service.create(actor(), String(SESSION), { ...scores, teaching: 9 })).rejects.toThrow(
      new BadRequestException(AcademicsErrors.EVALUATION_INVALID)
    );
  });

  it('refuses a second evaluation by the same supervisor', async () => {
    const { service } = makeService(undefined, undefined, true);
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(
      new ConflictException(AcademicsErrors.EVALUATION_ALREADY_EXISTS)
    );
  });

  it('404s on a session in another organization', async () => {
    const { service } = makeService(null);
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(
      new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND)
    );
  });

  it('404s when the session’s group has vanished', async () => {
    const { service } = makeService(undefined, null);
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(
      new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND)
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest supervision-create --runInBand`
Expected: FAIL — `Cannot find module './supervision.service'`.

- [ ] **Step 3: Write the DTOs**

Create `apps/server/src/academics/supervision/dto/supervision.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN } from '@darnozom/shared-types';

export class SupervisionNotesDto {
  @IsOptional() @IsString() commitment?: string;
  @IsOptional() @IsString() teaching?: string;
  @IsOptional() @IsString() pedagogy?: string;
  @IsOptional() @IsString() contentAdherence?: string;
  @IsOptional() @IsString() technicalQuality?: string;
  @IsOptional() @IsString() general?: string;
}

export class SupervisionScoresDto {
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) commitment: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) teaching: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) pedagogy: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) contentAdherence: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) technicalQuality: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SupervisionNotesDto)
  notes?: SupervisionNotesDto;
}

export class CreateEvaluationPayload extends SupervisionScoresDto {
  @IsMongoId()
  sessionId: string;
}

export class UpdateEvaluationPayload {
  @IsMongoId()
  id: string;

  @ValidateNested()
  @Type(() => SupervisionScoresDto)
  data: SupervisionScoresDto;
}

export class FindEvaluationsPayload {
  @IsOptional() @IsMongoId() groupId?: string;
  @IsOptional() @IsMongoId() teacherId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
```

`class-validator`'s `@IsInt()` is the first line of defence and `areScoresValid` in Task 3 is the second. Keep both: the DTO rejects a malformed payload at the edge, and the rule keeps the service honest when it is called from anywhere else.

- [ ] **Step 4: Write the create path**

Create `apps/server/src/academics/supervision/supervision.service.ts`:

```ts
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { Group } from '../group/entities/group.entity';
import { Session } from '../session/entities/session.entity';
import { SupervisionEvaluation } from './entities/supervision-evaluation.entity';
import { SupervisionEvaluationLean } from './supervision.types';
import { areScoresValid, canEvaluate, isHeldSession } from './supervision-rules';
import { SupervisionScoresDto } from './dto/supervision.dto';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const DUPLICATE_KEY = 11000;

interface SessionForEvaluation {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sequence: number;
  startsAt: Date;
  status: SessionStatus;
}

interface GroupForEvaluation {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  supervisorId: Types.ObjectId | null;
}

@Injectable()
export class SupervisionService {
  constructor(
    @InjectModel(SupervisionEvaluation.name) private readonly evaluationModel: Model<SupervisionEvaluation>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  async create(actor: AcademicsActor, sessionId: string, dto: SupervisionScoresDto): Promise<SupervisionEvaluationLean> {
    const session = await this.sessionModel
      .findOne({ _id: oid(sessionId), organizationId: oid(actor.organizationId) })
      .lean<SessionForEvaluation | null>()
      .exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);

    const group = await this.groupModel.findOne({ _id: session.groupId }).lean<GroupForEvaluation | null>().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);

    if (!canEvaluate(actor, group)) throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);
    if (!isHeldSession(session.status)) throw new ConflictException(AcademicsErrors.SESSION_NOT_HELD);
    if (!areScoresValid(dto as unknown as Record<string, unknown>)) {
      throw new BadRequestException(AcademicsErrors.EVALUATION_INVALID);
    }

    try {
      const created = await this.evaluationModel.create({
        organizationId: session.organizationId,
        sessionId: session._id,
        groupId: session.groupId,
        teacherId: session.teacherId,
        // Whoever holds the seat now, not whoever held it when the session ran (plan decision D3).
        supervisorId: oid(actor._id),
        commitment: dto.commitment,
        teaching: dto.teaching,
        pedagogy: dto.pedagogy,
        contentAdherence: dto.contentAdherence,
        technicalQuality: dto.technicalQuality,
        notes: dto.notes ?? {},
      });
      return created as unknown as SupervisionEvaluationLean;
    } catch (error) {
      // The unique index, not a read-then-write check, is what makes "one evaluation each" true.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictException(AcademicsErrors.EVALUATION_ALREADY_EXISTS);
      }
      throw error;
    }
  }
}
```

Note the check order: authorization before state, state before shape. A caller with no business touching this session learns nothing about it from the error.

- [ ] **Step 5: Register the provider**

Add `SupervisionService` to the imports and `providers` of `academics.module.ts`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter server exec jest supervision-create --runInBand`
Expected: PASS, 11 tests.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/supervision/supervision.service.ts src/academics/supervision/supervision-create.spec.ts src/academics/supervision/dto/supervision.dto.ts src/academics/academics.module.ts
git add apps/server/src/academics
git commit -m "feat(sp5): let a supervisor evaluate a held session"
```

---

### Task 5: Editing an evaluation

**Files:**
- Modify: `apps/server/src/academics/supervision/supervision.service.ts`
- Test: `apps/server/src/academics/supervision/supervision-update.spec.ts`

**Interfaces:**
- Consumes: `isWithinEditWindow`, `areScoresValid` (Task 3).
- Produces: `SupervisionService.update(actor, id, dto, now?: Date): Promise<SupervisionEvaluationLean>`.

This task carries **Review Focus 5** (an edit on and past the window boundary).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/supervision/supervision-update.spec.ts`:

```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles, SUPERVISION_EDIT_WINDOW_HOURS } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SupervisionService } from './supervision.service';

const ORG = new Types.ObjectId();
const EVALUATION = new Types.ObjectId();
const SUPERVISOR = new Types.ObjectId();
const CREATED_AT = new Date('2026-03-01T00:00:00.000Z');

const actor = (id = String(SUPERVISOR), roleName = Roles.SUPERVISOR) => ({
  _id: id,
  organizationId: String(ORG),
  roleName,
  additionalRoles: [] as Roles[],
});

const scores = { commitment: 2, teaching: 2, pedagogy: 2, contentAdherence: 2, technicalQuality: 2 };

const makeService = (evaluation: Record<string, unknown> | null = {
  _id: EVALUATION,
  organizationId: ORG,
  sessionId: new Types.ObjectId(),
  groupId: new Types.ObjectId(),
  teacherId: new Types.ObjectId(),
  supervisorId: SUPERVISOR,
  commitment: 5,
  teaching: 5,
  pedagogy: 5,
  contentAdherence: 5,
  technicalQuality: 5,
  notes: {},
  createdAt: CREATED_AT,
}) => {
  const model = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => evaluation }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    create: jest.fn(),
    find: jest.fn(),
  };
  const sessionModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })) };
  const groupModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })), find: jest.fn() };
  return { service: new SupervisionService(model as never, sessionModel as never, groupModel as never), model };
};

const inWindow = new Date(CREATED_AT.getTime() + 3600 * 1000);

describe('SupervisionService.update', () => {
  it('writes the new scores and notes', async () => {
    const { service, model } = makeService();
    await service.update(actor(), String(EVALUATION), { ...scores, notes: { general: 'Revised.' } }, inWindow);
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: EVALUATION },
      { $set: expect.objectContaining({ ...scores, notes: { general: 'Revised.' } }) }
    );
  });

  it('refuses someone who did not write it, manager or not', async () => {
    const { service } = makeService();
    for (const role of [Roles.SUPERVISOR, Roles.MANAGER, Roles.OWNER]) {
      await expect(service.update(actor(String(new Types.ObjectId()), role), String(EVALUATION), scores, inWindow)).rejects.toThrow(
        new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR)
      );
    }
  });

  it('allows an edit on the last second of the window', async () => {
    const { service, model } = makeService();
    const last = new Date(CREATED_AT.getTime() + SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000 - 1000);
    await service.update(actor(), String(EVALUATION), scores, last);
    expect(model.updateOne).toHaveBeenCalled();
  });

  it('refuses an edit once the window has closed', async () => {
    const { service, model } = makeService();
    const past = new Date(CREATED_AT.getTime() + SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000 + 1000);
    await expect(service.update(actor(), String(EVALUATION), scores, past)).rejects.toThrow(
      new ConflictException(AcademicsErrors.EVALUATION_EDIT_WINDOW_CLOSED)
    );
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('refuses an invalid score', async () => {
    const { service } = makeService();
    await expect(service.update(actor(), String(EVALUATION), { ...scores, pedagogy: 0 }, inWindow)).rejects.toThrow(
      new BadRequestException(AcademicsErrors.EVALUATION_INVALID)
    );
  });

  it('never moves the evaluation to another session or teacher', async () => {
    const { service, model } = makeService();
    await service.update(actor(), String(EVALUATION), scores, inWindow);
    const [, update] = model.updateOne.mock.calls[0];
    for (const immutable of ['sessionId', 'groupId', 'teacherId', 'supervisorId', 'organizationId']) {
      expect(update.$set).not.toHaveProperty(immutable);
    }
  });

  it('404s on an evaluation in another organization', async () => {
    const { service } = makeService(null);
    await expect(service.update(actor(), String(EVALUATION), scores, inWindow)).rejects.toThrow(
      new NotFoundException(AcademicsErrors.EVALUATION_NOT_FOUND)
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest supervision-update --runInBand`
Expected: FAIL — `service.update is not a function`.

- [ ] **Step 3: Add the update method**

Add to `SupervisionService`:

```ts
  /**
   * The author revises their own evaluation inside the edit window. Nobody else may, not even a
   * manager: an evaluation is one named person's judgment, and a second hand editing it silently
   * would make the record a lie.
   */
  async update(
    actor: AcademicsActor,
    id: string,
    dto: SupervisionScoresDto,
    now: Date = new Date()
  ): Promise<SupervisionEvaluationLean> {
    const evaluation = await this.evaluationModel
      .findOne({ _id: oid(id), organizationId: oid(actor.organizationId) })
      .lean<SupervisionEvaluationLean | null>()
      .exec();
    if (!evaluation) throw new NotFoundException(AcademicsErrors.EVALUATION_NOT_FOUND);

    if (String(evaluation.supervisorId) !== actor._id) throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);
    if (!isWithinEditWindow(evaluation.createdAt, now)) {
      throw new ConflictException(AcademicsErrors.EVALUATION_EDIT_WINDOW_CLOSED);
    }
    if (!areScoresValid(dto as unknown as Record<string, unknown>)) {
      throw new BadRequestException(AcademicsErrors.EVALUATION_INVALID);
    }

    // Only the scores and the notes. The session, group, teacher and author are fixed for ever.
    const set = {
      commitment: dto.commitment,
      teaching: dto.teaching,
      pedagogy: dto.pedagogy,
      contentAdherence: dto.contentAdherence,
      technicalQuality: dto.technicalQuality,
      notes: dto.notes ?? {},
    };
    await this.evaluationModel.updateOne({ _id: evaluation._id }, { $set: set }).exec();
    return { ...evaluation, ...set };
  }
```

Add `isWithinEditWindow` to the import from `./supervision-rules`.

- [ ] **Step 4: Run both suites to verify they pass**

Run: `pnpm --filter server exec jest supervision-create supervision-update --runInBand`
Expected: PASS — 11 create tests and 7 update tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/supervision/supervision.service.ts src/academics/supervision/supervision-update.spec.ts
git add apps/server/src/academics/supervision
git commit -m "feat(sp5): let the author revise their evaluation inside the seven-day window"
```

---

### Task 6: Reading evaluations, scoped by role

**Files:**
- Modify: `apps/server/src/academics/supervision/supervision.service.ts`
- Create: `apps/server/src/academics/supervision/supervision-scope.ts`
- Test: `apps/server/src/academics/supervision/supervision-scope.spec.ts`
- Test: `apps/server/src/academics/supervision/supervision-read.spec.ts`

**Interfaces:**
- Consumes: `Roles`, `hasRole`.
- Produces: `resolveEvaluationScope(actor): { kind: 'ORG' } | { kind: 'OWN_TEACHING'; teacherId: string } | { kind: 'NONE' }`; `SupervisionService.findAll(actor, query): Promise<SupervisionEvaluationView[]>`; `SupervisionService.findForSession(actor, sessionId)`.

This task carries **Review Focus 3** (a teacher who also supervises another group).

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/academics/supervision/supervision-scope.spec.ts`:

```ts
import { Roles } from '@darnozom/shared-types';
import { resolveEvaluationScope } from './supervision-scope';

const actor = (roleName: Roles, additionalRoles: Roles[] = []) => ({ _id: 'u1', roleName, additionalRoles });

describe('resolveEvaluationScope', () => {
  it('gives supervisors, managers and owners the whole organization', () => {
    for (const role of [Roles.SUPERVISOR, Roles.MANAGER, Roles.OWNER]) {
      expect(resolveEvaluationScope(actor(role))).toEqual({ kind: 'ORG' });
    }
  });

  it('gives a teacher only the evaluations of their own sessions', () => {
    expect(resolveEvaluationScope(actor(Roles.INSTRUCTOR))).toEqual({ kind: 'OWN_TEACHING', teacherId: 'u1' });
  });

  it('gives a teacher who also supervises the organization scope, because they hold SUPERVISOR', () => {
    expect(resolveEvaluationScope(actor(Roles.INSTRUCTOR, [Roles.SUPERVISOR]))).toEqual({ kind: 'ORG' });
  });

  it('gives an accountant, a parent and a student nothing', () => {
    for (const role of [Roles.ACCOUNTANT, Roles.PARENT, Roles.STUDENT]) {
      expect(resolveEvaluationScope(actor(role))).toEqual({ kind: 'NONE' });
    }
  });

  it('gives a content officer and a Sharia reviewer nothing: these are pedagogical notes', () => {
    for (const role of [Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER]) {
      expect(resolveEvaluationScope(actor(role))).toEqual({ kind: 'NONE' });
    }
  });
});
```

Create `apps/server/src/academics/supervision/supervision-read.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SupervisionService } from './supervision.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const TEACHER = new Types.ObjectId();
const SESSION = new Types.ObjectId();

const actor = (roleName: Roles, id = String(TEACHER), additionalRoles: Roles[] = []) => ({
  _id: id,
  organizationId: String(ORG),
  roleName,
  additionalRoles,
});

const row = {
  _id: new Types.ObjectId(),
  organizationId: ORG,
  sessionId: SESSION,
  groupId: GROUP,
  teacherId: TEACHER,
  supervisorId: new Types.ObjectId(),
  commitment: 5,
  teaching: 5,
  pedagogy: 5,
  contentAdherence: 5,
  technicalQuality: 5,
  notes: {},
  createdAt: new Date('2026-03-11T00:00:00.000Z'),
};

const makeService = () => {
  const model = {
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => [row] }) }) })),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };
  const sessionModel = {
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => [{ _id: SESSION, sequence: 4, startsAt: row.createdAt }] }) }) })),
    findOne: jest.fn(),
  };
  const groupModel = {
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => [{ _id: GROUP, name: 'Group A' }] }) }) })),
    findOne: jest.fn(),
  };
  return { service: new SupervisionService(model as never, sessionModel as never, groupModel as never), model };
};

describe('SupervisionService.findAll', () => {
  it('scopes a supervisor to their organization and nothing wider', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.SUPERVISOR), {});
    expect(model.find.mock.calls[0][0]).toMatchObject({ organizationId: ORG });
    expect(model.find.mock.calls[0][0]).not.toHaveProperty('teacherId');
  });

  it('pins a teacher to their own evaluations', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.INSTRUCTOR), {});
    expect(model.find.mock.calls[0][0].teacherId).toEqual(TEACHER);
  });

  it('ignores a teacher’s attempt to ask for someone else’s', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.INSTRUCTOR), { teacherId: String(new Types.ObjectId()) });
    expect(model.find.mock.calls[0][0].teacherId).toEqual(TEACHER);
  });

  it('refuses an accountant outright, so pedagogical notes stay out of finance', async () => {
    const { service } = makeService();
    await expect(service.findAll(actor(Roles.ACCOUNTANT), {})).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR)
    );
  });

  it('refuses a parent and a student', async () => {
    const { service } = makeService();
    for (const role of [Roles.PARENT, Roles.STUDENT]) {
      await expect(service.findAll(actor(role), {})).rejects.toThrow(new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR));
    }
  });

  it('attaches the group name and the session details a list needs', async () => {
    const { service } = makeService();
    const result = await service.findAll(actor(Roles.SUPERVISOR), {});
    expect(result[0]).toMatchObject({ groupName: 'Group A', sessionSequence: 4 });
  });

  it('filters by group when asked', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.SUPERVISOR), { groupId: String(GROUP) });
    expect(model.find.mock.calls[0][0].groupId).toEqual(GROUP);
  });

  it('filters by date range when asked', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.SUPERVISOR), { from: '2026-03-01', to: '2026-03-31' });
    expect(model.find.mock.calls[0][0].createdAt).toEqual({ $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest supervision-scope supervision-read --runInBand`
Expected: FAIL — `Cannot find module './supervision-scope'`.

- [ ] **Step 3: Write the scope**

Create `apps/server/src/academics/supervision/supervision-scope.ts`:

```ts
import { hasAnyRole, hasRole, Roles } from '@darnozom/shared-types';

/** Who may read every evaluation in the organization. */
const ORG_WIDE_EVALUATION_READERS = [Roles.SUPERVISOR, Roles.MANAGER, Roles.OWNER, Roles.ADMIN] as const;

export type EvaluationScope =
  | { kind: 'ORG' }
  | { kind: 'OWN_TEACHING'; teacherId: string }
  | { kind: 'NONE' };

/**
 * First matching rule wins. A teacher who also holds SUPERVISOR reads org-wide, which is correct:
 * they hold the supervising role. A teacher who does not reads only evaluations of their own
 * sessions. Everyone else reads nothing — the concept's rule is that accountants cannot see
 * confidential pedagogical notes, and parents and students have no business here at all.
 */
export function resolveEvaluationScope(actor: {
  _id: string;
  roleName: Roles;
  additionalRoles?: readonly Roles[];
}): EvaluationScope {
  if (hasAnyRole(actor, ORG_WIDE_EVALUATION_READERS)) return { kind: 'ORG' };
  if (hasRole(actor, Roles.INSTRUCTOR)) return { kind: 'OWN_TEACHING', teacherId: actor._id };
  return { kind: 'NONE' };
}
```

Check `hasAnyRole`'s real signature in `role-helpers.ts` — `resolveGroupScope` in `academics/domain/group-scope.ts` already calls it, so copy from there.

- [ ] **Step 4: Add the read methods**

Add to `SupervisionService`:

```ts
  /** Every evaluation the caller is allowed to see, newest first, with the names a list needs. */
  async findAll(actor: AcademicsActor, query: FindEvaluationsPayload): Promise<SupervisionEvaluationView[]> {
    const scope = resolveEvaluationScope(actor);
    if (scope.kind === 'NONE') throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);

    const filter: FilterQuery<SupervisionEvaluation> = { organizationId: oid(actor.organizationId) };
    if (query.groupId) filter.groupId = oid(query.groupId);
    // A teacher's own id wins over whatever they asked for, so the filter cannot be widened.
    if (scope.kind === 'OWN_TEACHING') filter.teacherId = oid(scope.teacherId);
    else if (query.teacherId) filter.teacherId = oid(query.teacherId);

    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      };
    }

    const rows = await this.evaluationModel.find(filter).sort({ createdAt: -1 }).lean<SupervisionEvaluationLean[]>().exec();
    return this.decorate(rows);
  }

  /** The evaluations of one session, for the read-only panel beside the report. */
  async findForSession(actor: AcademicsActor, sessionId: string): Promise<SupervisionEvaluationView[]> {
    const scope = resolveEvaluationScope(actor);
    if (scope.kind === 'NONE') throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);

    const filter: FilterQuery<SupervisionEvaluation> = {
      organizationId: oid(actor.organizationId),
      sessionId: oid(sessionId),
    };
    if (scope.kind === 'OWN_TEACHING') filter.teacherId = oid(scope.teacherId);

    const rows = await this.evaluationModel.find(filter).sort({ createdAt: -1 }).lean<SupervisionEvaluationLean[]>().exec();
    return this.decorate(rows);
  }

  private async decorate(rows: SupervisionEvaluationLean[]): Promise<SupervisionEvaluationView[]> {
    if (rows.length === 0) return [];

    const groups = await this.groupModel
      .find({ _id: { $in: rows.map((row) => row.groupId) } })
      .select('_id name')
      .lean<{ _id: Types.ObjectId; name: string }[]>()
      .exec();
    const sessions = await this.sessionModel
      .find({ _id: { $in: rows.map((row) => row.sessionId) } })
      .select('_id sequence startsAt')
      .lean<{ _id: Types.ObjectId; sequence: number; startsAt: Date }[]>()
      .exec();

    const names = new Map(groups.map((group) => [String(group._id), group.name]));
    const bySession = new Map(sessions.map((session) => [String(session._id), session]));

    return rows.map((row) => {
      const session = bySession.get(String(row.sessionId));
      return {
        ...row,
        groupName: names.get(String(row.groupId)) ?? '',
        sessionSequence: session?.sequence ?? 0,
        sessionStartsAt: session?.startsAt ?? row.createdAt,
      };
    });
  }
```

Add `FilterQuery` to the mongoose import, `resolveEvaluationScope` from `./supervision-scope`, `FindEvaluationsPayload` from the DTO file, and `SupervisionEvaluationView` to the types import.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest supervision-scope supervision-read --runInBand`
Expected: PASS — 5 scope tests and 8 read tests.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/supervision/supervision-scope.ts src/academics/supervision/supervision-scope.spec.ts src/academics/supervision/supervision-read.spec.ts src/academics/supervision/supervision.service.ts
git add apps/server/src/academics/supervision
git commit -m "feat(sp5): read evaluations within the caller's role scope"
```

---

### Task 7: The API and the permissions

**Files:**
- Create: `apps/server/src/academics/supervision/supervision.controller.message.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Modify: `apps/server/src/role/seeds/role.supervisor.config.ts`
- Modify: `apps/server/src/role/seeds/role.manager.config.ts`
- Modify: `apps/server/src/role/seeds/role.instructor.config.ts`
- Test: `apps/server/src/role/seeds/roles.config.spec.ts` (extend)

**Interfaces:**
- Consumes: `SupervisionService` (Tasks 4 to 6).
- Produces: message patterns `academics.supervision.create`, `academics.supervision.update`, `academics.supervision.list`, `academics.supervision.listForSession`.

- [ ] **Step 1: Write the failing test**

Extend `apps/server/src/role/seeds/roles.config.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest roles.config --runInBand`
Expected: FAIL — no seed grants `SESSION_EVALUATION`.

- [ ] **Step 3: Grant the permissions**

Add `{ action: Actions.MANAGE, subject: Subjects.SESSION_EVALUATION },` to `SUPERVISOR_PERMISSIONS` and `MANAGER_PERMISSIONS`.

Add `{ action: Actions.READ, subject: Subjects.SESSION_EVALUATION },` to `INSTRUCTOR_PERMISSIONS`.

`OWNER_SEED` reuses `ADMIN_PERMISSIONS`; add the `MANAGE` rule there too unless that array already grants `MANAGE` on `Subjects.ALL`.

- [ ] **Step 4: Write the controller**

Create `apps/server/src/academics/supervision/supervision.controller.message.ts`:

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
import { CreateEvaluationPayload, FindEvaluationsPayload, UpdateEvaluationPayload } from './dto/supervision.dto';
import { SupervisionService } from './supervision.service';

@Controller()
@ApplyRpcErrorHandling
export class SupervisionControllerMessage {
  constructor(private readonly supervision: SupervisionService) {}

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateEvaluationPayload, @Ctx() context: IUserContext) {
    const { sessionId, ...scores } = payload;
    return this.supervision.create(actorFromContext(context), sessionId, scores);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateEvaluationPayload, @Ctx() context: IUserContext) {
    return this.supervision.update(actorFromContext(context), payload.id, payload.data);
  }

  /** READ, because a teacher reads their own; the service narrows the scope by role. */
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.list')
  list(@Payload(new RpcValidationPipe()) payload: FindEvaluationsPayload, @Ctx() context: IUserContext) {
    return this.supervision.findAll(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.listForSession')
  listForSession(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.supervision.findForSession(actorFromContext(context), payload.id);
  }
}
```

The guard on `create` and `update` is `MANAGE`, so a teacher holding only `READ` is stopped at the guard and never reaches the service. The service's own checks are the second layer, for a supervisor reaching across to a group they do not supervise.

Register `SupervisionControllerMessage` in the `controllers` array of `academics.module.ts`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest roles.config --runInBand`
Expected: PASS, including the three new cases.

- [ ] **Step 6: Apply the role changes**

Run: `pnpm --filter server seed:prod`
Expected: completes without error. **Never run `pnpm seed`.**

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/supervision/supervision.controller.message.ts src/role/seeds/role.supervisor.config.ts src/role/seeds/role.manager.config.ts src/role/seeds/role.instructor.config.ts src/role/seeds/roles.config.spec.ts src/academics/academics.module.ts
git add apps/server/src
git commit -m "feat(sp5): expose the supervision API and grant the evaluation permissions"
```

---

### Task 8: Client data layer

**Files:**
- Create: `apps/client/src/lib/actions/academics/supervision.action.ts`
- Modify: `apps/client/src/lib/types/academics/academics.ts`
- Modify: `apps/client/src/lib/hooks/academics/use-academics.hook.ts`
- Test: `apps/client/src/lib/hooks/academics/supervision-keys.test.ts`

**Interfaces:**
- Consumes: the Task 7 message patterns.
- Produces: `ISupervisionEvaluation`, `SupervisionScores`, `EvaluationQuery`; `createEvaluation`, `updateEvaluation`, `getEvaluations`, `getSessionEvaluations`; `useEvaluations(query)`, `useSessionEvaluations(sessionId)`, `useCreateEvaluation()`, `useUpdateEvaluation()`; `academicsKeys.evaluations(query)` and `.sessionEvaluations(sessionId)`.

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/lib/hooks/academics/supervision-keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { academicsKeys } from './use-academics.hook';

describe('academicsKeys supervision entries', () => {
  it('namespaces evaluation queries under academics, so one write refreshes them all', () => {
    expect(academicsKeys.evaluations({})[0]).toBe('academics');
    expect(academicsKeys.sessionEvaluations('s1')[0]).toBe('academics');
  });

  it('keys the list by its query and the session list by session', () => {
    expect(academicsKeys.evaluations({ groupId: 'g1' })).not.toEqual(academicsKeys.evaluations({}));
    expect(academicsKeys.sessionEvaluations('s1')).not.toEqual(academicsKeys.sessionEvaluations('s2'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter client exec vitest run supervision-keys --no-file-parallelism`
Expected: FAIL — `academicsKeys.evaluations is not a function`.

- [ ] **Step 3: Add the types**

Append to `apps/client/src/lib/types/academics/academics.ts`:

```ts
export interface SupervisionNotes {
  commitment?: string;
  teaching?: string;
  pedagogy?: string;
  contentAdherence?: string;
  technicalQuality?: string;
  general?: string;
}

export interface SupervisionScores {
  commitment: number;
  teaching: number;
  pedagogy: number;
  contentAdherence: number;
  technicalQuality: number;
  notes?: SupervisionNotes;
}

export interface ISupervisionEvaluation extends SupervisionScores {
  _id: string;
  sessionId: string;
  groupId: string;
  groupName: string;
  sessionSequence: number;
  sessionStartsAt: string;
  teacherId: string;
  supervisorId: string;
  notes: SupervisionNotes;
  createdAt: string;
}

export interface EvaluationQuery {
  groupId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
}
```

- [ ] **Step 4: Add the actions and hooks**

Create `apps/client/src/lib/actions/academics/supervision.action.ts`:

```ts
'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { EvaluationQuery, ISupervisionEvaluation, SupervisionScores } from '@/lib/types/academics/academics';

export async function getEvaluations(query: EvaluationQuery) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation[]>('academics.supervision.list', query);
}

export async function getSessionEvaluations(sessionId: string) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation[]>('academics.supervision.listForSession', { id: sessionId });
}

export async function createEvaluation(sessionId: string, data: SupervisionScores) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation>('academics.supervision.create', { sessionId, ...data });
}

export async function updateEvaluation(id: string, data: SupervisionScores) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation>('academics.supervision.update', { id, data });
}
```

In `use-academics.hook.ts`, add `import * as supervisionApi from '@/lib/actions/academics/supervision.action';`, add the two keys:

```ts
  evaluations: (query: EvaluationQuery) => [ROOT, 'evaluations', query] as const,
  sessionEvaluations: (sessionId: string) => [ROOT, 'session-evaluations', sessionId] as const,
```

and the four hooks, following the surrounding conventions:

```ts
export const useEvaluations = (query: EvaluationQuery, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.evaluations(query),
    queryFn: async () => unwrap(await supervisionApi.getEvaluations(query)),
    enabled,
  });

export const useSessionEvaluations = (sessionId: string, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.sessionEvaluations(sessionId),
    queryFn: async () => unwrap(await supervisionApi.getSessionEvaluations(sessionId)),
    enabled: enabled && Boolean(sessionId),
  });

export const useCreateEvaluation = () =>
  useAcademicsMutation(async (vars: { sessionId: string; data: SupervisionScores }) =>
    unwrap(await supervisionApi.createEvaluation(vars.sessionId, vars.data))
  );

export const useUpdateEvaluation = () =>
  useAcademicsMutation(async (vars: { id: string; data: SupervisionScores }) =>
    unwrap(await supervisionApi.updateEvaluation(vars.id, vars.data))
  );
```

Add `EvaluationQuery` and `SupervisionScores` to that file's type import.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter client exec vitest run supervision-keys --no-file-parallelism`
Expected: PASS, 2 tests.

- [ ] **Step 6: Lint, type-check, commit**

```bash
pnpm --filter client exec eslint src/lib/actions/academics/supervision.action.ts src/lib/hooks/academics/use-academics.hook.ts src/lib/hooks/academics/supervision-keys.test.ts src/lib/types/academics/academics.ts
pnpm --filter client tsc --noEmit
git add apps/client/src/lib
git commit -m "feat(sp5): add the client data layer for supervision"
```

`pnpm --filter client tsc --noEmit` has a known baseline of 5 pre-existing errors. Only new ones matter.

---

### Task 9: The evaluation form

**Files:**
- Create: `apps/client/src/components/organs/academics/evaluation-form.tsx`
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json`
- Test: `apps/client/src/components/organs/academics/evaluation-form.test.tsx`

**Interfaces:**
- Consumes: `SUPERVISION_CRITERIA`, `SupervisionScores` (Task 8).
- Produces: `EvaluationForm({ initial, onSubmit, isSubmitting })`.

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/components/organs/academics/evaluation-form.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import { EvaluationForm } from './evaluation-form';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

describe('EvaluationForm', () => {
  it('offers a selector for each of the five criteria', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByLabelText(`supervision.criteria.${criterion}`)).toBeInTheDocument();
    }
  });

  it('offers a note field for each criterion and one general note', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByLabelText(`supervision.notes.${criterion}`)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('supervision.notes.general')).toBeInTheDocument();
  });

  it('starts every score at 3, the middle of the scale, rather than at an extreme', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByLabelText(`supervision.criteria.${criterion}`)).toHaveValue('3');
    }
  });

  it('prefills from an existing evaluation when editing', () => {
    render(
      <EvaluationForm
        initial={{ commitment: 5, teaching: 4, pedagogy: 3, contentAdherence: 2, technicalQuality: 1, notes: { general: 'Earlier note.' } }}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />
    );
    expect(screen.getByLabelText('supervision.criteria.commitment')).toHaveValue('5');
    expect(screen.getByLabelText('supervision.notes.general')).toHaveValue('Earlier note.');
  });

  it('submits five integers and the notes', () => {
    const onSubmit = vi.fn();
    render(<EvaluationForm onSubmit={onSubmit} isSubmitting={false} />);
    screen.getByRole('button', { name: 'supervision.submit' }).click();
    expect(onSubmit).toHaveBeenCalledWith({
      commitment: 3,
      teaching: 3,
      pedagogy: 3,
      contentAdherence: 3,
      technicalQuality: 3,
      notes: {},
    });
  });

  it('disables the button while a submission is in flight, so one click is one evaluation', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole('button', { name: 'supervision.submit' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter client exec vitest run evaluation-form --no-file-parallelism`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the form**

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN, SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import type { SupervisionNotes, SupervisionScores } from '@/lib/types/academics/academics';

const SCALE = Array.from({ length: SESSION_SCORE_MAX - SESSION_SCORE_MIN + 1 }, (_, index) => SESSION_SCORE_MIN + index);
/** The middle of the scale, so an untouched selector is not a strong claim either way. */
const DEFAULT_SCORE = 3;

export function EvaluationForm({
  initial,
  onSubmit,
  isSubmitting,
}: {
  initial?: SupervisionScores;
  onSubmit: (values: SupervisionScores) => void;
  isSubmitting: boolean;
}) {
  const t = useTranslations('Academics');
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(SUPERVISION_CRITERIA.map((criterion) => [criterion, initial?.[criterion] ?? DEFAULT_SCORE]))
  );
  const [notes, setNotes] = useState<SupervisionNotes>(() => initial?.notes ?? {});

  const submit = () =>
    onSubmit({
      commitment: scores.commitment,
      teaching: scores.teaching,
      pedagogy: scores.pedagogy,
      contentAdherence: scores.contentAdherence,
      technicalQuality: scores.technicalQuality,
      notes,
    });

  return (
    <div className="space-y-4">
      {SUPERVISION_CRITERIA.map((criterion) => (
        <div key={criterion} className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`score-${criterion}`}>
            {t(`supervision.criteria.${criterion}`)}
          </label>
          {/* A native select keeps the 1-5 scale readable and testable without a popover. */}
          <select
            id={`score-${criterion}`}
            aria-label={t(`supervision.criteria.${criterion}`)}
            className="w-full rounded-md border p-2"
            value={String(scores[criterion])}
            onChange={(event) => setScores((prev) => ({ ...prev, [criterion]: Number(event.target.value) }))}
          >
            {SCALE.map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
          <Textarea
            aria-label={t(`supervision.notes.${criterion}`)}
            value={notes[criterion] ?? ''}
            onChange={(event) => setNotes((prev) => ({ ...prev, [criterion]: event.target.value }))}
          />
        </div>
      ))}
      <Textarea
        aria-label={t('supervision.notes.general')}
        value={notes.general ?? ''}
        onChange={(event) => setNotes((prev) => ({ ...prev, general: event.target.value }))}
      />
      <Button onClick={submit} disabled={isSubmitting}>
        {t('supervision.submit')}
      </Button>
    </div>
  );
}
```

The test expects `notes` to be `{}` on an untouched form, so do not seed `notes` with empty strings. Check the real `Textarea` and `Button` paths in `apps/client/src/components/atoms/`.

- [ ] **Step 4: Add the translations**

Add to the `Academics` namespace in **both** catalogues. English:

```json
"supervision": {
  "title": "Supervision",
  "evaluate": "Evaluate",
  "submit": "Save evaluation",
  "myEvaluations": "My evaluations",
  "empty": "No evaluations yet.",
  "alreadyEvaluated": "You have already evaluated this session.",
  "editWindow": "You can revise this evaluation for 7 days.",
  "criteria": {
    "commitment": "Commitment",
    "teaching": "Teaching",
    "pedagogy": "Pedagogy",
    "contentAdherence": "Content adherence",
    "technicalQuality": "Technical quality"
  },
  "notes": {
    "commitment": "Note on commitment",
    "teaching": "Note on teaching",
    "pedagogy": "Note on pedagogy",
    "contentAdherence": "Note on content adherence",
    "technicalQuality": "Note on technical quality",
    "general": "General note"
  }
}
```

Arabic: `"الإشراف"`, `"تقييم"`, `"حفظ التقييم"`, `"تقييماتي"`, `"لا توجد تقييمات بعد."`, `"لقد قيّمت هذه الحصة بالفعل."`, `"يمكنك تعديل هذا التقييم خلال 7 أيام."`, `"الالتزام"`, `"التدريس"`, `"الأساليب التربوية"`, `"الالتزام بالمحتوى"`, `"الجودة التقنية"`, and for the notes `"ملاحظة على الالتزام"`, `"ملاحظة على التدريس"`, `"ملاحظة على الأساليب التربوية"`, `"ملاحظة على الالتزام بالمحتوى"`, `"ملاحظة على الجودة التقنية"`, `"ملاحظة عامة"`.

Add the six new `AcademicsErrors` keys to the `errors` namespace in both catalogues too.

- [ ] **Step 5: Run the tests and the i18n check**

Run: `pnpm --filter client exec vitest run evaluation-form --no-file-parallelism`
Expected: PASS, 6 tests.

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter client exec eslint src/components/organs/academics/evaluation-form.tsx src/components/organs/academics/evaluation-form.test.tsx
git add apps/client
git commit -m "feat(sp5): add the five-criteria evaluation form"
```

---

### Task 10: The supervisor and teacher screens

**Files:**
- Create: `apps/client/src/components/organs/academics/evaluation-list.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-evaluations/page.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-groups/__components/` — the sessions list that already renders a group's sessions
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts`
- Modify: `apps/client/src/lib/data/constants/routes.constants.ts`
- Test: `apps/client/src/components/organs/academics/evaluation-list.test.tsx`

**Interfaces:**
- Consumes: `useEvaluations`, `useSessionEvaluations`, `useCreateEvaluation`, `ISupervisionEvaluation` (Task 8), `EvaluationForm` (Task 9).
- Produces: `EvaluationList({ evaluations, isLoading })`.

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/components/organs/academics/evaluation-list.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import type { ISupervisionEvaluation } from '@/lib/types/academics/academics';
import { EvaluationList } from './evaluation-list';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useLocale: () => 'en',
}));

const evaluation = (overrides: Partial<ISupervisionEvaluation> = {}): ISupervisionEvaluation => ({
  _id: 'e1',
  sessionId: 's1',
  groupId: 'g1',
  groupName: 'Group A',
  sessionSequence: 4,
  sessionStartsAt: '2026-03-10T10:00:00.000Z',
  teacherId: 't1',
  supervisorId: 'sv1',
  commitment: 5,
  teaching: 4,
  pedagogy: 3,
  contentAdherence: 2,
  technicalQuality: 1,
  notes: { general: 'Good pace.' },
  createdAt: '2026-03-11T00:00:00.000Z',
  ...overrides,
});

describe('EvaluationList', () => {
  it('says so when there is nothing yet', () => {
    render(<EvaluationList evaluations={[]} isLoading={false} />);
    expect(screen.getByText('supervision.empty')).toBeInTheDocument();
  });

  it('shows the loading state instead of the empty state while fetching', () => {
    render(<EvaluationList evaluations={[]} isLoading />);
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('supervision.empty')).not.toBeInTheDocument();
  });

  it('names the group and the session', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText(/#4/)).toBeInTheDocument();
  });

  it('shows every criterion with its score', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByText(new RegExp(`supervision.criteria.${criterion}`))).toBeInTheDocument();
    }
  });

  it('shows a general note when there is one', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    expect(screen.getByText('Good pace.')).toBeInTheDocument();
  });

  it('is read-only: it offers no button', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter client exec vitest run evaluation-list --no-file-parallelism`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the list**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import type { ISupervisionEvaluation } from '@/lib/types/academics/academics';

export function EvaluationList({
  evaluations,
  isLoading,
}: {
  evaluations: ISupervisionEvaluation[];
  isLoading: boolean;
}) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  if (isLoading) return <p>{t('loading')}</p>;
  if (evaluations.length === 0) return <p className="text-muted-foreground">{t('supervision.empty')}</p>;

  return (
    <ul className="space-y-3">
      {evaluations.map((evaluation) => (
        <li key={evaluation._id} className="space-y-1 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{evaluation.groupName}</span>
            <span className="text-muted-foreground text-sm">{`#${evaluation.sessionSequence}`}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {new Date(evaluation.sessionStartsAt).toLocaleString(locale)}
          </p>
          <p className="text-sm">
            {SUPERVISION_CRITERIA.map((criterion) => `${t(`supervision.criteria.${criterion}`)}: ${evaluation[criterion]}`).join(' · ')}
          </p>
          {evaluation.notes?.general ? <p className="text-muted-foreground text-sm">{evaluation.notes.general}</p> : null}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Write the teacher page**

Create `my-evaluations/page.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { EvaluationList } from '@/components/organs/academics/evaluation-list';
import { useEvaluations } from '@/lib/hooks/academics/use-academics.hook';

export default function MyEvaluationsPage() {
  const t = useTranslations('Academics');
  // The server pins a teacher to their own rows, so no filter is needed here.
  const { data: evaluations = [], isLoading } = useEvaluations({});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('supervision.myEvaluations')}</CardTitle>
      </CardHeader>
      <CardContent>
        <EvaluationList evaluations={evaluations} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
```

Add `export const ROUTE_ORG_MY_EVALUATIONS = '/organization-dashboard/my-evaluations';` to `routes.constants.ts` and a nav entry in `data.ts` gated to the instructor, supervisor, manager and owner, following how that file gates its other entries.

- [ ] **Step 5: Add the Evaluate action to the supervisor's sessions list**

Read the existing sessions list under `organization-dashboard/my-groups/__components/` (and `group-sessions-card.tsx` under `academics/groups/[id]/__components/`, which renders the same rows). Add, for each session whose status is `REPORT_PENDING` or `COMPLETED`, an "Evaluate" button that opens a dialog holding `<EvaluationForm …>` wired to `useCreateEvaluation()`, plus `<EvaluationList …>` from `useSessionEvaluations(sessionId)` showing what is already recorded, and the session's report and attendance read-only beside the form as the spec's §8 requires — both are already on the session object those components receive.

Hide the button when `useSessionEvaluations(sessionId)` already contains a row written by the current user, and show `t('supervision.alreadyEvaluated')` instead. Follow the dialog pattern `cancel-session-dialog.tsx` already uses in that folder rather than introducing a new one.

- [ ] **Step 6: Run the tests and the i18n check**

Run: `pnpm --filter client exec vitest run evaluation-list --no-file-parallelism`
Expected: PASS, 6 tests.

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 7: Lint and commit**

Lint each touched file by name, then:

```bash
git add apps/client
git commit -m "feat(sp5): add the supervisor evaluate action and the teacher evaluations page"
```

---

### Task 11: Whole sub-project verification

**Files:** none created. This task proves the branch.

- [ ] **Step 1: Run the full server suite**

Run: `pnpm --filter server exec jest --runInBand`
Expected: every new suite passes. Compare the failure set against the baseline sub-project 2 recorded and name any **new** failure.

- [ ] **Step 2: Run the full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: all green, including the 14 new tests from Tasks 8 to 10.

- [ ] **Step 3: Type-check both apps**

Run: `pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json`
Expected: 0 errors.

Run: `pnpm --filter client tsc --noEmit`
Expected: the 5 baseline errors only.

- [ ] **Step 4: Check the translations**

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 5: Prove the financial boundary holds**

Grep the whole sub-project for a monetary leak and record the output:

```bash
cd C:/COURSES/work/darnozom/academy && grep -rniE "penalt|deduct|bonus|amount|salar|payroll" apps/server/src/academics/supervision
```

Expected: no match other than a comment explaining why there is none. This is the concept's rule that supervisors cannot impose financial penalties, and it holds by the absence of a field, not by a check — so the grep is the test.

- [ ] **Step 6: Confirm the unique index exists**

With the server running against the development database, confirm the `supervisionevaluations` collection carries `one_evaluation_per_supervisor_session` as a unique index. Mongoose builds it on first use of the model, so create one evaluation first. Record what you saw.

- [ ] **Step 7: Walk the golden path in the browser**

With `pnpm dev` running: as an owner, set a supervisor on a group that has a completed session. As that supervisor, open the group's sessions, evaluate the completed session on all five criteria, and confirm a second attempt is refused. As the group's teacher, open **My evaluations** and confirm the evaluation is there, read-only. As an accountant, confirm the page is not reachable. If no dev server is available in your context, say so explicitly rather than claiming the walk passed.

- [ ] **Step 8: Ledger the result**

No commit is needed if the tree is clean. If a step surfaced a fix, make it with a test that fails first, then commit.
