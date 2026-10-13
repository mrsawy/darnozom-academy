# Pre-start Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before a group starts, the system creates a task for every readiness item still missing at the 7-, 3- and 1-day marks, escalates overdue tasks from coordinator to supervisor to manager, and flags the group at risk.

**Architecture:** A new `academics/task` module holds a `Task` collection plus four small services — generation, closing, escalation and risk — driven by one BullMQ repeatable job every 15 minutes, mirroring the existing `session-status` queue/scheduler/processor triple. Task closing hooks into `GroupStateService.syncReadiness`, the single point sub-project 1 already calls after every readiness-affecting write, so no caller needs to know tasks exist. Pure milestone arithmetic lives in `academics/domain/milestones.ts` and is unit-tested without a database.

**Tech Stack:** NestJS 11, Mongoose, BullMQ (`@nestjs/bullmq`), luxon for timezone arithmetic, Jest (server), Next.js 15 + React Query + next-intl (client), Vitest (client).

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp3-pre-start-tasks-design.md`

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`. Never start a test run in the background.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection. Role changes are applied with `pnpm --filter server seed:prod`, which is upsert-only.
- **`eslint --fix` only on specific new or modified files, never on a directory.** Repo specs are not prettier-clean and fixing a directory rewrites unrelated files.
- Server controllers are NATS message handlers (`@MessagePattern`), not REST. The spec's `GET /tasks` style paths map to message patterns such as `academics.tasks.list`.
- Every server-side error is a key from `AcademicsErrors` in `@darnozom/shared-types`; the client translates it with `translateApiMessage`.
- Every user-facing string is a next-intl key present in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- Timezone arithmetic uses luxon and reads a `Date`'s **UTC** calendar fields as a local date in the group's timezone, exactly as `apps/server/src/academics/domain/session-generation.ts` already does.
- Milestones are 7, 3 and 1 days before the cohort's `startDate`, at local midnight in the group's timezone. Escalation is 24 hours per level. Levels are 0 = coordinator, 1 = supervisor, 2 = manager.

## Plan Decisions (deviations from the spec, decided while writing this plan)

- **D1 — generation is self-healing, not milestone-latched.** The spec (§5.1 step 2) skips a milestone once it has been processed. That makes a group permanently unprotected if an item is completed and then breaks again — a student withdraws, `MINIMUM_STUDENTS` fails a second time, and no task is ever created because the milestone is spent. Instead, every run creates a task for any missing item that has no `OPEN` task, and the partial unique index on `{groupId, readinessKey}` where `status: OPEN` provides the no-duplicates guarantee the spec actually wants. Observable behaviour at 7/3/1 days is unchanged.
- **D2 — no `processedMilestones` field.** D1 makes it dead weight. The spec's §5.1 step 4 is dropped.
- **D3 — a task carries the most urgent milestone reached.** `milestoneDays` is `Math.min(...reachedMilestones)`. An existing `OPEN` task whose `milestoneDays` is larger is tightened to the smaller value, which does not touch `dueAt` or `escalationLevel` — the deadline got nearer, but the 24-hour escalation clock already running is not restarted.
- **D4 — a level-2 task has `assigneeId: null`.** The spec says a level-2 task is "tied to the manager role rather than one person" yet also "assigned to every user who holds `MANAGER`". Fanning out one task per manager would create duplicates the unique index forbids. One task with a null assignee, visible to every `MANAGER`, satisfies both sentences. Notifications still go to every manager individually.
- **D5 — `atRiskReason` is stored.** The spec names the reason `NO_COORDINATOR` but gives the group only `atRisk` and `atRiskSince`. Without the reason the UI cannot tell "nobody to assign to" from "a task reached the manager", which are different actions for the person reading the screen.

## Review Focus

These are failure modes the spec implies but does not pin with a test. Each has a test in the task that owns the code.

1. **A group whose start date is already past** (the job first runs on a stale group): all three milestones are reached at once, and exactly one task per missing item must exist, carrying `milestoneDays: 1`. — Task 4.
2. **An unknown or malformed `timezone` on a group** (data predating validation): that group is skipped and the sweep still processes every other group instead of throwing. — Task 4.
3. **A daylight-saving transition at the milestone instant**, where local midnight does not exist or occurs twice: the milestone resolves to a single real instant. — Task 2.
4. **Readiness regained and then lost again**: a closed task must be recreated on the next run while the milestone window is still open. — Task 4.
5. **The coordinator is unassigned after tasks exist**: open level-0 tasks point at someone who is no longer the coordinator, and the group must be flagged at risk rather than leaving tasks in a dead queue. — Task 7.

---

## File Structure

**Shared types** — `lib/shared-types/src/lib/types/academics/academics.types.ts` gains the task enums and constants; `lib/shared-types/src/lib/messages/academics-errors.enum.ts` gains the new error keys; `lib/shared-types/src/lib/configurations/notification/notification-text-key.enum.ts` gains the task notification keys.

**Server** — new directory `apps/server/src/academics/task/`:
- `entities/task.entity.ts` — the collection and its indexes.
- `dto/task.dto.ts` — the message payloads.
- `task-generation.service.ts` — creates tasks at reached milestones.
- `task-closing.service.ts` — closes tasks when an item is done or the group starts or is cancelled.
- `task-escalation.service.ts` — moves overdue tasks up the chain.
- `task-risk.service.ts` — sets and clears `atRisk`; used by both closing and escalation.
- `task-notification.service.ts` — the only place that writes task notifications.
- `task.service.ts` — reads and the manual "mark done".
- `task.queue.ts`, `task.processor.ts`, `task.scheduler.ts` — the BullMQ triple.
- `task.controller.message.ts` — NATS handlers.
- `task.types.ts` — `TaskLean`, `TaskView`.

Also modified: `academics/domain/milestones.ts` (new, pure), `academics/group/entities/group.entity.ts`, `academics/group/group-state.service.ts`, `academics/group/group.service.ts`, `academics/group/dto/group.dto.ts`, `academics/group/group.types.ts`, `academics/session/group-start.service.ts`, `academics/academics.module.ts`, `notification/notification.service.ts`, and the coordinator, supervisor and manager role seeds.

**Client** — `lib/types/academics/academics.ts`, `lib/actions/academics/tasks.action.ts` (new), `lib/hooks/academics/use-academics.hook.ts`, a new `organization-dashboard/my-tasks/` route with `__components/my-tasks-list.tsx`, additions to `academics/groups/[id]/__components/` (a staff picker card and an open-tasks card), `academics/groups/__components/groups-manager.tsx`, `organization-dashboard/data.ts`, and both message catalogues.

---

### Task 1: Shared types, error keys and notification keys

**Files:**
- Modify: `lib/shared-types/src/lib/types/academics/academics.types.ts`
- Modify: `lib/shared-types/src/lib/messages/academics-errors.enum.ts`
- Modify: `lib/shared-types/src/lib/configurations/notification/notification-text-key.enum.ts`
- Test: `lib/shared-types/src/lib/types/academics/task-types.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TaskKind`, `TaskStatus`, `TaskClosedReason`, `AtRiskReason`, `TASK_MILESTONE_DAYS: readonly [7, 3, 1]`, `TaskMilestoneDay`, `TASK_ESCALATION_HOURS = 24`, `TASK_MAX_ESCALATION_LEVEL = 2`; `AcademicsErrors.TASK_NOT_FOUND`, `.READINESS_ITEM_STILL_MISSING`, `.TASK_NOT_ASSIGNED_TO_YOU`, `.COORDINATOR_NOT_FOUND_IN_ORGANIZATION`, `.SUPERVISOR_NOT_FOUND_IN_ORGANIZATION`; `NotificationTextKey.TASK_ASSIGNED_TITLE`, `.TASK_ASSIGNED_BODY`, `.TASK_ESCALATED_TITLE`, `.TASK_ESCALATED_BODY`.

- [ ] **Step 1: Write the failing test**

Create `lib/shared-types/src/lib/types/academics/task-types.spec.ts`:

```ts
import { TASK_ESCALATION_HOURS, TASK_MAX_ESCALATION_LEVEL, TASK_MILESTONE_DAYS, TaskClosedReason, TaskKind, TaskStatus } from './academics.types';

describe('task shared types', () => {
  it('orders the milestones from the earliest to the most urgent', () => {
    expect([...TASK_MILESTONE_DAYS]).toEqual([7, 3, 1]);
  });

  it('escalates once a day, up to the manager level', () => {
    expect(TASK_ESCALATION_HOURS).toBe(24);
    expect(TASK_MAX_ESCALATION_LEVEL).toBe(2);
  });

  it('has exactly one task kind in the MVP', () => {
    expect(Object.values(TaskKind)).toEqual([TaskKind.PRE_START_READINESS]);
  });

  it('closes a task for one of three reasons only', () => {
    expect(Object.values(TaskClosedReason)).toEqual(['ITEM_DONE', 'GROUP_STARTED', 'GROUP_CANCELLED']);
  });

  it('has an open state distinct from both closed states', () => {
    expect(Object.values(TaskStatus)).toEqual(['OPEN', 'DONE', 'CANCELLED']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @darnozom/shared-types exec jest task-types --runInBand`
Expected: FAIL — `Cannot find module` or `TASK_MILESTONE_DAYS is not exported`.

If `@darnozom/shared-types` has no jest target, run the suite the way sub-project 2 did and record which command you used: `pnpm --filter server exec jest task-types --runInBand`.

- [ ] **Step 3: Add the enums and constants**

Append to `lib/shared-types/src/lib/types/academics/academics.types.ts`:

```ts
export enum TaskKind {
  PRE_START_READINESS = 'PRE_START_READINESS',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskClosedReason {
  ITEM_DONE = 'ITEM_DONE',
  GROUP_STARTED = 'GROUP_STARTED',
  GROUP_CANCELLED = 'GROUP_CANCELLED',
}

/** Why a group carries the at-risk flag. */
export enum AtRiskReason {
  /** Nobody holds the coordinator seat, so pre-start tasks cannot be assigned. */
  NO_COORDINATOR = 'NO_COORDINATOR',
  /** A pre-start task went unanswered all the way to the manager level. */
  TASK_ESCALATED = 'TASK_ESCALATED',
}

/** Days before the cohort start date at which pre-start tasks are created, earliest first. */
export const TASK_MILESTONE_DAYS = [7, 3, 1] as const;
export type TaskMilestoneDay = (typeof TASK_MILESTONE_DAYS)[number];

/** An open task is overdue this many hours after it was created or last escalated. */
export const TASK_ESCALATION_HOURS = 24;
/** Level 2 is the manager queue; nothing escalates past it. */
export const TASK_MAX_ESCALATION_LEVEL = 2;
```

Append to the `AcademicsErrors` enum in `lib/shared-types/src/lib/messages/academics-errors.enum.ts`, before the closing brace:

```ts
  TASK_NOT_FOUND = 'taskNotFound',
  READINESS_ITEM_STILL_MISSING = 'readinessItemStillMissing',
  TASK_NOT_ASSIGNED_TO_YOU = 'taskNotAssignedToYou',
  COORDINATOR_NOT_FOUND_IN_ORGANIZATION = 'coordinatorNotFoundInOrganization',
  SUPERVISOR_NOT_FOUND_IN_ORGANIZATION = 'supervisorNotFoundInOrganization',
```

Append to the `NotificationTextKey` enum:

```ts
  TASK_ASSIGNED_TITLE = 'taskAssignedTitle',
  TASK_ASSIGNED_BODY = 'taskAssignedBody',
  TASK_ESCALATED_TITLE = 'taskEscalatedTitle',
  TASK_ESCALATED_BODY = 'taskEscalatedBody',
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @darnozom/shared-types exec jest task-types --runInBand`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/shared-types/src/lib/types/academics/academics.types.ts lib/shared-types/src/lib/types/academics/task-types.spec.ts lib/shared-types/src/lib/messages/academics-errors.enum.ts lib/shared-types/src/lib/configurations/notification/notification-text-key.enum.ts
git commit -m "feat(sp3): add task enums, error keys and notification keys to shared types"
```

---

### Task 2: Milestone arithmetic (pure domain)

**Files:**
- Create: `apps/server/src/academics/domain/milestones.ts`
- Test: `apps/server/src/academics/domain/milestones.spec.ts`

**Interfaces:**
- Consumes: `TASK_MILESTONE_DAYS`, `TaskMilestoneDay` from Task 1.
- Produces: `milestoneInstant(startDate: Date, days: number, timezone: string): Date | null` and `reachedMilestones(startDate: Date, timezone: string, now: Date): TaskMilestoneDay[]`. `reachedMilestones` returns the reached days in `TASK_MILESTONE_DAYS` order (7 before 1) and an empty array when the timezone is unusable.

This task carries **Review Focus 3** (daylight saving at the milestone instant).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/domain/milestones.spec.ts`:

```ts
import { milestoneInstant, reachedMilestones } from './milestones';

/** 2026-03-15, read as a local calendar date. */
const START = new Date('2026-03-15T00:00:00.000Z');

describe('milestoneInstant', () => {
  it('is local midnight the given number of days before the start date', () => {
    // Cairo is UTC+2 in March, so local midnight on the 8th is 22:00 UTC on the 7th.
    expect(milestoneInstant(START, 7, 'Africa/Cairo')).toEqual(new Date('2026-03-07T22:00:00.000Z'));
  });

  it('uses the offset of the milestone date, not of the start date', () => {
    // US DST begins 2026-03-08. Midnight on the 8th in New York is UTC-5; on the 14th it is UTC-4.
    expect(milestoneInstant(START, 7, 'America/New_York')).toEqual(new Date('2026-03-08T05:00:00.000Z'));
    expect(milestoneInstant(START, 1, 'America/New_York')).toEqual(new Date('2026-03-14T04:00:00.000Z'));
  });

  it('resolves to a single real instant when local midnight does not exist', () => {
    // Lord Howe skips 02:00-02:30, never midnight, so this only asserts the result is usable.
    const at = milestoneInstant(new Date('2026-10-11T00:00:00.000Z'), 7, 'Australia/Lord_Howe');
    expect(at).toBeInstanceOf(Date);
    expect(Number.isNaN(at!.getTime())).toBe(false);
  });

  it('returns null for a timezone it cannot read', () => {
    expect(milestoneInstant(START, 7, 'Mars/Olympus')).toBeNull();
    expect(milestoneInstant(START, 7, '')).toBeNull();
  });
});

describe('reachedMilestones', () => {
  it('is empty more than seven days out', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-01T12:00:00.000Z'))).toEqual([]);
  });

  it('reports the 7-day milestone once its local midnight has passed', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-07T23:00:00.000Z'))).toEqual([7]);
  });

  it('accumulates milestones as the start date approaches', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-12T05:00:00.000Z'))).toEqual([7, 3]);
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-14T05:00:00.000Z'))).toEqual([7, 3, 1]);
  });

  it('reports every milestone for a start date already in the past', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-04-01T00:00:00.000Z'))).toEqual([7, 3, 1]);
  });

  it('is empty for a timezone it cannot read, so one bad group cannot stop a sweep', () => {
    expect(reachedMilestones(START, 'Mars/Olympus', new Date('2026-04-01T00:00:00.000Z'))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest milestones --runInBand`
Expected: FAIL — `Cannot find module './milestones'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/academics/domain/milestones.ts`:

```ts
import { DateTime } from 'luxon';
import { TASK_MILESTONE_DAYS, TaskMilestoneDay } from '@darnozom/shared-types';

/**
 * Local midnight `days` before `startDate`, returned as a UTC instant.
 *
 * `startDate` is stored as a UTC midnight standing for a calendar date, so its UTC fields are read
 * as a local date in `timezone` — the same reading `generateSessions` uses. Subtracting the days
 * first and taking the start of that day afterwards lets luxon resolve a local midnight that a
 * daylight-saving shift moved or skipped. Null means the timezone is not one luxon knows.
 */
export function milestoneInstant(startDate: Date, days: number, timezone: string): Date | null {
  const localStart = DateTime.fromObject(
    { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() },
    { zone: timezone }
  );
  if (!localStart.isValid) return null;
  const milestone = localStart.minus({ days }).startOf('day');
  if (!milestone.isValid) return null;
  return milestone.toUTC().toJSDate();
}

/** The milestones whose instant has arrived, earliest first. An unreadable timezone yields none. */
export function reachedMilestones(startDate: Date, timezone: string, now: Date): TaskMilestoneDay[] {
  return TASK_MILESTONE_DAYS.filter((days) => {
    const at = milestoneInstant(startDate, days, timezone);
    return at !== null && at.getTime() <= now.getTime();
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest milestones --runInBand`
Expected: PASS, 10 tests.

- [ ] **Step 5: Lint only the two new files, then commit**

```bash
pnpm --filter server exec eslint src/academics/domain/milestones.ts src/academics/domain/milestones.spec.ts
git add apps/server/src/academics/domain/milestones.ts apps/server/src/academics/domain/milestones.spec.ts
git commit -m "feat(sp3): add milestone arithmetic for pre-start task generation"
```

---

### Task 3: Task entity, group fields and module wiring

**Files:**
- Create: `apps/server/src/academics/task/entities/task.entity.ts`
- Create: `apps/server/src/academics/task/task.types.ts`
- Modify: `apps/server/src/academics/group/entities/group.entity.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/task/entities/task.entity.spec.ts`

**Interfaces:**
- Consumes: the Task 1 enums.
- Produces: `Task`, `TaskSchema`; `TaskLean` and `TaskView`; the `Group` fields `coordinatorId: Types.ObjectId | null`, `supervisorId: Types.ObjectId | null`, `atRisk: boolean`, `atRiskSince: Date | null`, `atRiskReason: AtRiskReason | null`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/task/entities/task.entity.spec.ts`:

```ts
import { ReadinessKey, TaskKind, TaskStatus } from '@darnozom/shared-types';
import { TaskSchema } from './task.entity';

const indexNames = () => TaskSchema.indexes().map(([, options]) => options?.name);

describe('TaskSchema', () => {
  it('allows only one open task per group and readiness item', () => {
    const entry = TaskSchema.indexes().find(([, options]) => options?.name === 'one_open_task_per_group_item');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ groupId: 1, readinessKey: 1 });
    expect(options?.unique).toBe(true);
    expect(options?.partialFilterExpression).toEqual({ status: TaskStatus.OPEN });
  });

  it('indexes the three read paths the spec names', () => {
    expect(indexNames()).toEqual(expect.arrayContaining(['task_due_sweep', 'task_by_group_item', 'task_by_assignee']));
  });

  it('defaults a new task to the coordinator level and the open state', () => {
    const path = (name: string) => TaskSchema.path(name) as { options: Record<string, unknown> };
    expect(path('escalationLevel').options.default).toBe(0);
    expect(path('status').options.default).toBe(TaskStatus.OPEN);
    expect(path('kind').options.default).toBe(TaskKind.PRE_START_READINESS);
  });

  it('accepts every readiness key as a task subject', () => {
    const path = TaskSchema.path('readinessKey') as { options: { enum: string[] } };
    expect(path.options.enum).toEqual(Object.values(ReadinessKey));
  });

  it('allows a null assignee, which is the manager queue', () => {
    expect((TaskSchema.path('assigneeId') as { options: { default: unknown } }).options.default).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest task.entity --runInBand`
Expected: FAIL — `Cannot find module './task.entity'`.

- [ ] **Step 3: Create the entity and the view types**

Create `apps/server/src/academics/task/entities/task.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReadinessKey, TaskClosedReason, TaskKind, TaskStatus, TASK_MAX_ESCALATION_LEVEL } from '@darnozom/shared-types';

@Schema({ timestamps: true })
export class Task extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(TaskKind), default: TaskKind.PRE_START_READINESS })
  kind: TaskKind;

  @Prop({ type: String, enum: Object.values(ReadinessKey), required: true })
  readinessKey: ReadinessKey;

  /** The most urgent milestone reached when this task was created or tightened (plan decision D3). */
  @Prop({ type: Number, required: true })
  milestoneDays: number;

  /** Null means the manager queue: every user holding MANAGER owns it (plan decision D4). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  assigneeId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0, min: 0, max: TASK_MAX_ESCALATION_LEVEL })
  escalationLevel: number;

  @Prop({ type: Date, required: true })
  dueAt: Date;

  @Prop({ type: String, enum: Object.values(TaskStatus), default: TaskStatus.OPEN })
  status: TaskStatus;

  @Prop({ type: Date, required: false, default: null })
  closedAt: Date | null;

  @Prop({ type: String, enum: Object.values(TaskClosedReason), required: false, default: null })
  closedReason: TaskClosedReason | null;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ status: 1, dueAt: 1 }, { name: 'task_due_sweep' });
TaskSchema.index({ groupId: 1, readinessKey: 1, status: 1 }, { name: 'task_by_group_item' });
TaskSchema.index({ assigneeId: 1, status: 1 }, { name: 'task_by_assignee' });
// One live task per missing item. This index, not a read-then-write check, is what makes
// generation idempotent under concurrent sweeps (plan decision D1).
TaskSchema.index(
  { groupId: 1, readinessKey: 1 },
  { unique: true, partialFilterExpression: { status: TaskStatus.OPEN }, name: 'one_open_task_per_group_item' }
);
```

Create `apps/server/src/academics/task/task.types.ts`:

```ts
import { Types } from 'mongoose';
import { ReadinessKey, TaskClosedReason, TaskKind, TaskStatus } from '@darnozom/shared-types';

export interface TaskLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  kind: TaskKind;
  readinessKey: ReadinessKey;
  milestoneDays: number;
  assigneeId: Types.ObjectId | null;
  escalationLevel: number;
  dueAt: Date;
  status: TaskStatus;
  closedAt: Date | null;
  closedReason: TaskClosedReason | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** What the client reads: the task plus the group name it belongs to. */
export interface TaskView extends TaskLean {
  groupName: string;
}
```

- [ ] **Step 4: Add the group fields**

In `apps/server/src/academics/group/entities/group.entity.ts`, add these props to the `Group` class, directly after `teacherId`:

```ts
  /** Owns the group's pre-start tasks (escalation level 0). Must hold COORDINATOR. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  coordinatorId: Types.ObjectId | null;

  /** Escalation level 1, and the evaluator in sub-project 5. Must hold SUPERVISOR. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  supervisorId: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false, index: true })
  atRisk: boolean;

  @Prop({ type: Date, required: false, default: null })
  atRiskSince: Date | null;

  @Prop({ type: String, enum: Object.values(AtRiskReason), required: false, default: null })
  atRiskReason: AtRiskReason | null;
```

Extend the existing import at the top of that file to `import { AtRiskReason, GroupPaymentStatus, GroupStatus, GroupStudentStatus } from '@darnozom/shared-types';`.

Add `GroupSchema.index({ organizationId: 1, atRisk: 1 });` next to the other `GroupSchema.index(...)` calls.

Then add the same five fields to the `GroupLean` interface in `apps/server/src/academics/group/group.types.ts`, matching the types above.

- [ ] **Step 5: Wire the module**

In `apps/server/src/academics/academics.module.ts`:
- add `import { Task, TaskSchema } from './task/entities/task.entity';`
- add `{ name: Task.name, schema: TaskSchema },` to the `MongooseModule.forFeature([...])` array.

Leave the providers array alone; the services arrive in Tasks 4 to 8.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest task.entity src/academics/group --runInBand`
Expected: PASS — the 5 new entity tests, and every existing group suite still green.

- [ ] **Step 7: Type-check, lint the new files, commit**

```bash
pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json
pnpm --filter server exec eslint src/academics/task/entities/task.entity.ts src/academics/task/task.types.ts src/academics/task/entities/task.entity.spec.ts
git add apps/server/src/academics/task apps/server/src/academics/group/entities/group.entity.ts apps/server/src/academics/group/group.types.ts apps/server/src/academics/academics.module.ts
git commit -m "feat(sp3): add Task collection and group coordinator, supervisor and at-risk fields"
```

---

### Task 4: Task generation

**Files:**
- Create: `apps/server/src/academics/task/task-generation.service.ts`
- Create: `apps/server/src/academics/task/task-notification.service.ts`
- Create: `apps/server/src/academics/task/task-user.service.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Modify: `apps/server/src/notification/notification.service.ts`
- Test: `apps/server/src/academics/task/task-generation.service.spec.ts`

**Interfaces:**
- Consumes: `reachedMilestones` (Task 2), `Task`/`TaskLean` (Task 3), `computeReadiness` from `academics/domain/readiness.ts`.
- Produces: `TaskGenerationService.run(now: Date): Promise<number>` returning the number of tasks created; `TaskNotificationService.taskAssigned(task: TaskLean, groupName: string, userIds: string[]): Promise<void>` and `.taskEscalated(...)` with the same signature.

This task carries **Review Focus 1** (a start date already past), **Review Focus 2** (an unreadable timezone) and **Review Focus 4** (readiness lost again).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/task/task-generation.service.spec.ts`:

```ts
import { AtRiskReason, GroupPaymentStatus, GroupStatus, GroupStudentStatus, ReadinessKey, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskGenerationService } from './task-generation.service';

const oid = () => new Types.ObjectId();

const ORG = oid();
const COORDINATOR = oid();

/** A group missing MEETING_LINK and CONTENT_SENT; everything else is done. */
const groupDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: oid(),
  organizationId: ORG,
  cohortId: oid(),
  name: 'Group A',
  teacherId: oid(),
  coordinatorId: COORDINATOR,
  supervisorId: null,
  timezone: 'Africa/Cairo',
  minStudents: 1,
  maxStudents: 10,
  students: [{ studentId: oid(), paymentStatus: GroupPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
  contentSent: { done: false },
  meetingLink: null,
  status: GroupStatus.FORMING,
  ...overrides,
});

const makeService = (groups: Record<string, unknown>[], startDate: Date, existingOpen: Record<string, unknown>[] = []) => {
  const created: Record<string, unknown>[] = [];
  const taskModel = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      const clash = created
        .concat(existingOpen)
        .some((t) => String(t.groupId) === String(doc.groupId) && t.readinessKey === doc.readinessKey && t.status === TaskStatus.OPEN);
      if (clash) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11000;
        throw error;
      }
      created.push({ ...doc, _id: oid(), status: TaskStatus.OPEN });
      return created.at(-1);
    }),
    find: jest.fn(() => ({ lean: () => ({ exec: async () => existingOpen }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({ lean: () => ({ exec: async () => groups }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const cohortModel = {
    find: jest.fn(() => ({ lean: () => ({ exec: async () => groups.map((g) => ({ _id: g.cohortId, startDate })) }) })),
  };
  const notifications = { taskAssigned: jest.fn(async () => undefined), taskEscalated: jest.fn(async () => undefined) };
  const users = { managerIdsInOrg: jest.fn(async () => []) };
  const service = new TaskGenerationService(taskModel as never, groupModel as never, cohortModel as never, notifications as never, users as never);
  return { service, taskModel, groupModel, notifications, created };
};

const START = new Date('2026-03-15T00:00:00.000Z');

describe('TaskGenerationService.run', () => {
  it('creates nothing before the first milestone', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await expect(service.run(new Date('2026-03-01T00:00:00.000Z'))).resolves.toBe(0);
    expect(created).toHaveLength(0);
  });

  it('creates one task per missing readiness item at the 7-day milestone', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await expect(service.run(new Date('2026-03-08T00:00:00.000Z'))).resolves.toBe(2);
    expect(created.map((t) => t.readinessKey).sort()).toEqual([ReadinessKey.CONTENT_SENT, ReadinessKey.MEETING_LINK].sort());
    expect(created.every((t) => t.milestoneDays === 7)).toBe(true);
    expect(created.every((t) => String(t.assigneeId) === String(COORDINATOR))).toBe(true);
    expect(created.every((t) => t.escalationLevel === 0)).toBe(true);
  });

  it('sets dueAt 24 hours after creation', async () => {
    const now = new Date('2026-03-08T09:00:00.000Z');
    const { service, created } = makeService([groupDoc()], START);
    await service.run(now);
    expect((created[0].dueAt as Date).toISOString()).toBe('2026-03-09T09:00:00.000Z');
  });

  it('creates no task for an item that is already done', async () => {
    const { service, created } = makeService([groupDoc({ contentSent: { done: true }, meetingLink: 'https://meet.example/abc' })], START);
    await expect(service.run(new Date('2026-03-08T00:00:00.000Z'))).resolves.toBe(0);
    expect(created).toHaveLength(0);
  });

  it('creates exactly one task per item for a start date already in the past, at the most urgent milestone', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await expect(service.run(new Date('2026-04-01T00:00:00.000Z'))).resolves.toBe(2);
    expect(created.every((t) => t.milestoneDays === 1)).toBe(true);
  });

  it('swallows the duplicate-key error so a second sweep creates nothing', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await service.run(new Date('2026-03-08T00:00:00.000Z'));
    await expect(service.run(new Date('2026-03-08T00:10:00.000Z'))).resolves.toBe(0);
    expect(created).toHaveLength(2);
  });

  it('recreates a task after its item was done and then broke again', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await service.run(new Date('2026-03-08T00:00:00.000Z'));
    // The coordinator sent the content, the task closed, then the upload was removed.
    created.forEach((t) => {
      if (t.readinessKey === ReadinessKey.CONTENT_SENT) t.status = TaskStatus.DONE;
    });
    await expect(service.run(new Date('2026-03-09T00:00:00.000Z'))).resolves.toBe(1);
    expect(created.filter((t) => t.readinessKey === ReadinessKey.CONTENT_SENT)).toHaveLength(2);
  });

  it('skips a group whose timezone cannot be read and still processes the rest', async () => {
    const broken = groupDoc({ timezone: 'Mars/Olympus' });
    const healthy = groupDoc();
    const { service, created } = makeService([broken, healthy], START);
    await expect(service.run(new Date('2026-03-08T00:00:00.000Z'))).resolves.toBe(2);
    expect(created.every((t) => String(t.groupId) === String(healthy._id))).toBe(true);
  });

  it('flags a group with no coordinator at risk and creates no tasks', async () => {
    const { service, groupModel, created } = makeService([groupDoc({ coordinatorId: null })], START);
    await expect(service.run(new Date('2026-03-08T00:00:00.000Z'))).resolves.toBe(0);
    expect(created).toHaveLength(0);
    expect(groupModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ atRisk: false }),
      expect.objectContaining({ $set: expect.objectContaining({ atRisk: true, atRiskReason: AtRiskReason.NO_COORDINATOR }) })
    );
  });

  it('notifies the coordinator once per created task', async () => {
    const { service, notifications } = makeService([groupDoc()], START);
    await service.run(new Date('2026-03-08T00:00:00.000Z'));
    expect(notifications.taskAssigned).toHaveBeenCalledTimes(2);
    expect(notifications.taskAssigned).toHaveBeenCalledWith(expect.objectContaining({ readinessKey: expect.any(String) }), 'Group A', [
      String(COORDINATOR),
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest task-generation --runInBand`
Expected: FAIL — `Cannot find module './task-generation.service'`.

- [ ] **Step 3: Write the notification service**

Create `apps/server/src/academics/task/task-notification.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { NotificationTextKey, NotificationType } from '@darnozom/shared-types';
import { NotificationService } from 'src/notification/notification.service';
import { TaskLean } from './task.types';

@Injectable()
export class TaskNotificationService {
  constructor(private readonly notifications: NotificationService) {}

  /** In-app only. The concept's multi-channel engine is a later phase (spec §5.4). */
  async taskAssigned(task: TaskLean, groupName: string, userIds: string[]): Promise<void> {
    await this.send(task, groupName, userIds, NotificationTextKey.TASK_ASSIGNED_TITLE, NotificationTextKey.TASK_ASSIGNED_BODY);
  }

  async taskEscalated(task: TaskLean, groupName: string, userIds: string[]): Promise<void> {
    await this.send(task, groupName, userIds, NotificationTextKey.TASK_ESCALATED_TITLE, NotificationTextKey.TASK_ESCALATED_BODY);
  }

  private async send(task: TaskLean, groupName: string, userIds: string[], titleKey: string, bodyKey: string): Promise<void> {
    if (userIds.length === 0) return;
    await this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        titleKey,
        bodyKey,
        params: { groupName, item: task.readinessKey, days: String(task.milestoneDays) },
        data: { groupId: String(task.groupId), taskId: String(task._id) },
        type: NotificationType.INFO,
        relatedId: String(task.groupId),
        relatedModel: 'Group' as const,
      }))
    );
  }
}
```

In `apps/server/src/notification/notification.service.ts`, extend the `relatedModel` union in `CreateNotificationDto` so a task notification can point at a group:

```ts
  relatedModel?: 'Course' | 'Enrollment' | 'CourseContent' | 'PrivateSession' | 'SessionBooking' | 'Group';
```

- [ ] **Step 4: Write the generation service**

Create `apps/server/src/academics/task/task-generation.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtRiskReason, GroupStatus, ReadinessKey, TaskKind, TaskStatus, TASK_ESCALATION_HOURS } from '@darnozom/shared-types';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { Cohort } from '../cohort/entities/cohort.entity';
import { computeReadiness } from '../domain/readiness';
import { reachedMilestones } from '../domain/milestones';
import { Group } from '../group/entities/group.entity';
import { GroupLean } from '../group/group.types';
import { Task } from './entities/task.entity';
import { TaskLean } from './task.types';
import { TaskNotificationService } from './task-notification.service';
import { TaskUserService } from './task-user.service';

const DUPLICATE_KEY = 11000;

@Injectable()
export class TaskGenerationService {
  private readonly logger = new Logger(TaskGenerationService.name);

  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly notifications: TaskNotificationService,
    private readonly users: TaskUserService
  ) {}

  /** Creates a task for every missing readiness item of every group past a milestone. Returns how many. */
  async run(now: Date): Promise<number> {
    const groups = await this.groupModel
      .find(withNotDeletedFilter({ status: { $in: [GroupStatus.FORMING, GroupStatus.READY_TO_START] } }))
      .lean<GroupLean[]>()
      .exec();
    if (groups.length === 0) return 0;

    const cohorts = await this.cohortModel
      .find({ _id: { $in: groups.map((group) => group.cohortId) } })
      .lean<{ _id: Types.ObjectId; startDate: Date }[]>()
      .exec();
    const startDates = new Map(cohorts.map((cohort) => [String(cohort._id), cohort.startDate]));

    let created = 0;
    for (const group of groups) {
      try {
        created += await this.runForGroup(group, startDates.get(String(group.cohortId)), now);
      } catch (error) {
        // One malformed group must never abort the sweep for every other group.
        this.logger.error(`Pre-start tasks skipped for group ${String(group._id)}: ${(error as Error).message}`);
      }
    }
    return created;
  }

  private async runForGroup(group: GroupLean, startDate: Date | undefined, now: Date): Promise<number> {
    if (!startDate) return 0;
    const reached = reachedMilestones(startDate, group.timezone, now);
    if (reached.length === 0) return 0;

    const missing = computeReadiness(group)
      .items.filter((item) => !item.done)
      .map((item) => item.key);

    if (group.coordinatorId == null) {
      // Nobody can receive the tasks, so the group itself is the problem (spec §5.1, assumption A3).
      await this.flagNoCoordinator(group._id, now);
      return 0;
    }
    if (missing.length === 0) return 0;

    // The nearest milestone reached is the one the person needs to see (plan decision D3).
    const milestoneDays = Math.min(...reached);
    let created = 0;
    for (const readinessKey of missing) {
      if (await this.createOrTighten(group, readinessKey, milestoneDays, now)) created += 1;
    }
    return created;
  }

  /** True when a task was created. A tightened milestone is not a creation and raises no notification. */
  private async createOrTighten(group: GroupLean, readinessKey: ReadinessKey, milestoneDays: number, now: Date): Promise<boolean> {
    try {
      const task = await this.taskModel.create({
        organizationId: group.organizationId,
        groupId: group._id,
        kind: TaskKind.PRE_START_READINESS,
        readinessKey,
        milestoneDays,
        assigneeId: group.coordinatorId,
        escalationLevel: 0,
        dueAt: new Date(now.getTime() + TASK_ESCALATION_HOURS * 3600 * 1000),
        status: TaskStatus.OPEN,
      });
      await this.notifications.taskAssigned(task as unknown as TaskLean, group.name, [String(group.coordinatorId)]);
      return true;
    } catch (error) {
      if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      // An open task already covers this item; only the deadline may have tightened.
      await this.taskModel
        .updateOne(
          { groupId: group._id, readinessKey, status: TaskStatus.OPEN, milestoneDays: { $gt: milestoneDays } },
          { $set: { milestoneDays } }
        )
        .exec();
      return false;
    }
  }

  private async flagNoCoordinator(groupId: Types.ObjectId, now: Date): Promise<void> {
    await this.groupModel
      .updateOne(
        { _id: groupId, atRisk: false },
        { $set: { atRisk: true, atRiskSince: now, atRiskReason: AtRiskReason.NO_COORDINATOR } }
      )
      .exec();
  }
}
```

- [ ] **Step 5: Write the user lookup helper the service injects**

Create `apps/server/src/academics/task/task-user.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class TaskUserService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  /** Every user holding MANAGER in the organization — the level-2 queue (spec assumption A2). */
  async managerIdsInOrg(organizationId: Types.ObjectId | string): Promise<string[]> {
    const users = await this.userModel
      .find({ organizationId: new Types.ObjectId(String(organizationId)), deletedAt: null })
      .select('_id roleName additionalRoles')
      .lean<{ _id: Types.ObjectId; roleName?: string; additionalRoles?: string[] }[]>()
      .exec();
    return users
      .filter((user) => user.roleName === Roles.MANAGER || (user.additionalRoles ?? []).includes(Roles.MANAGER))
      .map((user) => String(user._id));
  }
}
```

Before writing this file, open `apps/server/src/user/entities/user.entity.ts` and confirm the field names that hold a user's primary role and extra roles. Sub-project 1 added multi-role support, so the names are already there. If they differ from `roleName` / `additionalRoles`, use the real names and record a `Ruling:` line in the ledger.

- [ ] **Step 6: Register the three providers**

In `apps/server/src/academics/academics.module.ts`:
- add `import { NotificationModule } from 'src/notification/notification.module';` and put `NotificationModule` in `imports` (check whether it is exported; if `NotificationService` is not exported from that module, add it to the module's `exports` array and note the change).
- add the imports for `TaskGenerationService`, `TaskNotificationService` and `TaskUserService`, and list all three in `providers`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest task-generation --runInBand`
Expected: PASS, 10 tests.

- [ ] **Step 8: Lint the new files and commit**

```bash
pnpm --filter server exec eslint src/academics/task/task-generation.service.ts src/academics/task/task-notification.service.ts src/academics/task/task-user.service.ts src/academics/task/task-generation.service.spec.ts
git add apps/server/src/academics/task apps/server/src/academics/academics.module.ts apps/server/src/notification/notification.service.ts
git commit -m "feat(sp3): generate pre-start tasks for missing readiness items at each milestone"
```

---

### Task 5: At-risk flag

**Files:**
- Create: `apps/server/src/academics/task/task-risk.service.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/task/task-risk.service.spec.ts`

**Interfaces:**
- Consumes: `Task` (Task 3), `Group`.
- Produces: `TaskRiskService.refresh(groupId: Types.ObjectId | string, now: Date): Promise<void>` — sets or clears `atRisk` from the group's current state; `TaskRiskService.flag(groupId, reason: AtRiskReason, now: Date): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/task/task-risk.service.spec.ts`:

```ts
import { AtRiskReason, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskRiskService } from './task-risk.service';

const GROUP = new Types.ObjectId();
const NOW = new Date('2026-03-10T00:00:00.000Z');

const makeService = (group: Record<string, unknown> | null, openTasks: Record<string, unknown>[]) => {
  const groupModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => group }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const taskModel = { countDocuments: jest.fn(() => ({ exec: async () => openTasks.length })) };
  return { service: new TaskRiskService(taskModel as never, groupModel as never), groupModel, taskModel };
};

describe('TaskRiskService.refresh', () => {
  it('clears the flag once the group has a coordinator and no open tasks', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: new Types.ObjectId(), atRisk: true }, []);
    await service.refresh(GROUP, NOW);
    expect(groupModel.updateOne).toHaveBeenCalledWith(
      { _id: GROUP },
      { $set: { atRisk: false, atRiskSince: null, atRiskReason: null } }
    );
  });

  it('keeps the flag while an open task remains', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: new Types.ObjectId(), atRisk: true }, [{ status: TaskStatus.OPEN }]);
    await service.refresh(GROUP, NOW);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('keeps the flag while the group has no coordinator, even with no open tasks', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: null, atRisk: true }, []);
    await service.refresh(GROUP, NOW);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('does nothing for a group that is not at risk', async () => {
    const { service, groupModel, taskModel } = makeService({ _id: GROUP, coordinatorId: new Types.ObjectId(), atRisk: false }, []);
    await service.refresh(GROUP, NOW);
    expect(taskModel.countDocuments).not.toHaveBeenCalled();
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('does nothing for a group that no longer exists', async () => {
    const { service, groupModel } = makeService(null, []);
    await expect(service.refresh(GROUP, NOW)).resolves.toBeUndefined();
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('TaskRiskService.flag', () => {
  it('records the reason and the moment, and does not overwrite an existing flag', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: null, atRisk: false }, []);
    await service.flag(GROUP, AtRiskReason.TASK_ESCALATED, NOW);
    expect(groupModel.updateOne).toHaveBeenCalledWith(
      { _id: GROUP, atRisk: false },
      { $set: { atRisk: true, atRiskSince: NOW, atRiskReason: AtRiskReason.TASK_ESCALATED } }
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest task-risk --runInBand`
Expected: FAIL — `Cannot find module './task-risk.service'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/academics/task/task-risk.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtRiskReason, TaskStatus } from '@darnozom/shared-types';
import { Group } from '../group/entities/group.entity';
import { Task } from './entities/task.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class TaskRiskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  /** Flags a group at risk. The `atRisk: false` guard keeps the original reason and moment. */
  async flag(groupId: Types.ObjectId | string, reason: AtRiskReason, now: Date): Promise<void> {
    await this.groupModel
      .updateOne({ _id: oid(groupId), atRisk: false }, { $set: { atRisk: true, atRiskSince: now, atRiskReason: reason } })
      .exec();
  }

  /** Clears the flag once nothing justifies it: a coordinator is in place and no task is open (spec §5.3). */
  async refresh(groupId: Types.ObjectId | string, now: Date): Promise<void> {
    const group = await this.groupModel
      .findOne({ _id: oid(groupId) })
      .lean<{ _id: Types.ObjectId; coordinatorId: Types.ObjectId | null; atRisk: boolean } | null>()
      .exec();
    if (!group || !group.atRisk) return;
    if (group.coordinatorId == null) return;

    const open = await this.taskModel.countDocuments({ groupId: group._id, status: TaskStatus.OPEN }).exec();
    if (open > 0) return;

    await this.groupModel.updateOne({ _id: group._id }, { $set: { atRisk: false, atRiskSince: null, atRiskReason: null } }).exec();
  }
}
```

- [ ] **Step 4: Register the provider**

Add `TaskRiskService` to the imports and the `providers` array in `apps/server/src/academics/academics.module.ts`. Then replace `TaskGenerationService.flagNoCoordinator` with a call to it: delete the private method, inject `private readonly risk: TaskRiskService`, and call `await this.risk.flag(group._id, AtRiskReason.NO_COORDINATOR, now);`. Update the generation spec's `makeService` to pass a `{ flag: jest.fn(), refresh: jest.fn() }` double as the new constructor argument, and change the "flags a group with no coordinator" assertion to check `risk.flag` was called with `(group._id, AtRiskReason.NO_COORDINATOR, now)`.

- [ ] **Step 5: Run both suites to verify they pass**

Run: `pnpm --filter server exec jest task-risk task-generation --runInBand`
Expected: PASS — 6 risk tests and the 10 generation tests.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/task/task-risk.service.ts src/academics/task/task-risk.service.spec.ts src/academics/task/task-generation.service.ts src/academics/task/task-generation.service.spec.ts
git add apps/server/src/academics/task apps/server/src/academics/academics.module.ts
git commit -m "feat(sp3): set and clear the group at-risk flag"
```

---
### Task 6: Task closing, hooked into readiness

**Files:**
- Create: `apps/server/src/academics/task/task-closing.service.ts`
- Modify: `apps/server/src/academics/group/group-state.service.ts`
- Modify: `apps/server/src/academics/group/group.service.ts`
- Modify: `apps/server/src/academics/session/group-start.service.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/task/task-closing.service.spec.ts`

**Interfaces:**
- Consumes: `computeReadiness`, `Task` (Task 3), `TaskRiskService.refresh` (Task 5).
- Produces: `TaskClosingService.closeDoneItems(group: ReadinessInput & { _id: Types.ObjectId }, now: Date): Promise<number>` and `TaskClosingService.closeAll(groupId: Types.ObjectId | string, reason: TaskClosedReason.GROUP_STARTED | TaskClosedReason.GROUP_CANCELLED, now: Date): Promise<number>`.

A task that reports a solved problem closes as `DONE`. A task abandoned because the group moved on closes as `CANCELLED` — the work was never done, so recording it as done would be a lie in the audit trail.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/task/task-closing.service.spec.ts`:

```ts
import { GroupPaymentStatus, GroupStudentStatus, ReadinessKey, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskClosingService } from './task-closing.service';

const GROUP = new Types.ObjectId();
const NOW = new Date('2026-03-10T00:00:00.000Z');

const group = (overrides: Record<string, unknown> = {}) => ({
  _id: GROUP,
  teacherId: new Types.ObjectId(),
  minStudents: 1,
  students: [{ studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
  contentSent: { done: true },
  meetingLink: 'https://meet.example/abc',
  ...overrides,
});

const makeService = (modifiedCount = 1) => {
  const taskModel = { updateMany: jest.fn(() => ({ exec: async () => ({ modifiedCount }) })) };
  const risk = { refresh: jest.fn(async () => undefined), flag: jest.fn(async () => undefined) };
  return { service: new TaskClosingService(taskModel as never, risk as never), taskModel, risk };
};

describe('TaskClosingService.closeDoneItems', () => {
  it('closes the open tasks of items that are now done', async () => {
    const { service, taskModel } = makeService(2);
    await expect(service.closeDoneItems(group(), NOW)).resolves.toBe(2);
    expect(taskModel.updateMany).toHaveBeenCalledWith(
      { groupId: GROUP, status: TaskStatus.OPEN, readinessKey: { $in: Object.values(ReadinessKey) } },
      { $set: { status: TaskStatus.DONE, closedAt: NOW, closedReason: TaskClosedReason.ITEM_DONE } }
    );
  });

  it('closes only the done items, leaving a missing item open', async () => {
    const { service, taskModel } = makeService(1);
    await service.closeDoneItems(group({ meetingLink: null }), NOW);
    const [filter] = taskModel.updateMany.mock.calls[0];
    expect(filter.readinessKey.$in).not.toContain(ReadinessKey.MEETING_LINK);
    expect(filter.readinessKey.$in).toContain(ReadinessKey.CONTENT_SENT);
  });

  it('writes nothing when every item is still missing', async () => {
    const { service, taskModel, risk } = makeService();
    const nothingDone = group({ teacherId: null, students: [], contentSent: { done: false }, meetingLink: null });
    await expect(service.closeDoneItems(nothingDone, NOW)).resolves.toBe(0);
    expect(taskModel.updateMany).not.toHaveBeenCalled();
    expect(risk.refresh).not.toHaveBeenCalled();
  });

  it('refreshes the at-risk flag after closing, so a cleared group stops being flagged', async () => {
    const { service, risk } = makeService(2);
    await service.closeDoneItems(group(), NOW);
    expect(risk.refresh).toHaveBeenCalledWith(GROUP, NOW);
  });
});

describe('TaskClosingService.closeAll', () => {
  it('cancels every open task when the group starts', async () => {
    const { service, taskModel } = makeService(3);
    await expect(service.closeAll(GROUP, TaskClosedReason.GROUP_STARTED, NOW)).resolves.toBe(3);
    expect(taskModel.updateMany).toHaveBeenCalledWith(
      { groupId: GROUP, status: TaskStatus.OPEN },
      { $set: { status: TaskStatus.CANCELLED, closedAt: NOW, closedReason: TaskClosedReason.GROUP_STARTED } }
    );
  });

  it('cancels every open task when the group is cancelled', async () => {
    const { service, taskModel } = makeService(1);
    await service.closeAll(GROUP, TaskClosedReason.GROUP_CANCELLED, NOW);
    const [, update] = taskModel.updateMany.mock.calls[0];
    expect(update.$set.closedReason).toBe(TaskClosedReason.GROUP_CANCELLED);
    expect(update.$set.status).toBe(TaskStatus.CANCELLED);
  });

  it('refreshes the at-risk flag so a started group is not left flagged', async () => {
    const { service, risk } = makeService(2);
    await service.closeAll(GROUP, TaskClosedReason.GROUP_STARTED, NOW);
    expect(risk.refresh).toHaveBeenCalledWith(GROUP, NOW);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest task-closing --runInBand`
Expected: FAIL — `Cannot find module './task-closing.service'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/academics/task/task-closing.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReadinessKey, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { computeReadiness, ReadinessInput } from '../domain/readiness';
import { Task } from './entities/task.entity';
import { TaskRiskService } from './task-risk.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

type GroupForClosing = ReadinessInput & { _id: Types.ObjectId };

@Injectable()
export class TaskClosingService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    private readonly risk: TaskRiskService
  ) {}

  /** Closes the open tasks whose readiness item is now done. Returns how many closed (spec §5.2). */
  async closeDoneItems(group: GroupForClosing, now: Date): Promise<number> {
    const done: ReadinessKey[] = computeReadiness(group)
      .items.filter((item) => item.done)
      .map((item) => item.key);
    if (done.length === 0) return 0;

    const result = await this.taskModel
      .updateMany(
        { groupId: group._id, status: TaskStatus.OPEN, readinessKey: { $in: done } },
        { $set: { status: TaskStatus.DONE, closedAt: now, closedReason: TaskClosedReason.ITEM_DONE } }
      )
      .exec();
    await this.risk.refresh(group._id, now);
    return result.modifiedCount;
  }

  /**
   * Closes everything still open because the group moved on. The status is CANCELLED, not DONE:
   * the missing item was never supplied, and the audit trail should say so.
   */
  async closeAll(
    groupId: Types.ObjectId | string,
    reason: TaskClosedReason.GROUP_STARTED | TaskClosedReason.GROUP_CANCELLED,
    now: Date
  ): Promise<number> {
    const result = await this.taskModel
      .updateMany(
        { groupId: oid(groupId), status: TaskStatus.OPEN },
        { $set: { status: TaskStatus.CANCELLED, closedAt: now, closedReason: reason } }
      )
      .exec();
    await this.risk.refresh(groupId, now);
    return result.modifiedCount;
  }
}
```

Export `ReadinessInput` from `apps/server/src/academics/domain/readiness.ts` if it is not already exported — it is declared there as an exported interface, so no change should be needed; confirm before editing.

- [ ] **Step 4: Hook closing into readiness**

In `apps/server/src/academics/group/group-state.service.ts`:
- inject `private readonly taskClosing: TaskClosingService` after the existing model injection;
- inside `syncReadiness`, directly after `const readiness = computeReadiness(group);`, add:

```ts
    // The single point sub-project 1 calls after every readiness-affecting write, so no caller
    // needs to know pre-start tasks exist.
    await this.taskClosing.closeDoneItems(group, new Date());
```

In `apps/server/src/academics/group/group.service.ts`, find the method that cancels a group (it pushes a `GroupStatus.CANCELLED` status-history entry) and add, after the status write succeeds:

```ts
    await this.taskClosing.closeAll(group._id, TaskClosedReason.GROUP_CANCELLED, new Date());
```

In `apps/server/src/academics/session/group-start.service.ts`, find where the group moves to `GroupStatus.RUNNING` and add, after that write succeeds:

```ts
    await this.taskClosing.closeAll(group._id, TaskClosedReason.GROUP_STARTED, new Date());
```

Inject `TaskClosingService` into both services and add `TaskClosingService` to the module's `providers`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest src/academics --runInBand`
Expected: PASS — 8 new closing tests, and every existing academics suite still green. Existing group and session specs construct these services directly, so add a `{ closeDoneItems: jest.fn(async () => 0), closeAll: jest.fn(async () => 0) }` double to each affected `new GroupStateService(...)`, `new GroupService(...)` and `new GroupStartService(...)` call. Read the failures and fix exactly those constructor sites — do not change any assertion.

- [ ] **Step 6: Lint the touched files and commit**

```bash
pnpm --filter server exec eslint src/academics/task/task-closing.service.ts src/academics/task/task-closing.service.spec.ts src/academics/group/group-state.service.ts src/academics/group/group.service.ts src/academics/session/group-start.service.ts
git add apps/server/src/academics
git commit -m "feat(sp3): close pre-start tasks when the item is done or the group moves on"
```

---

### Task 7: Escalation

**Files:**
- Create: `apps/server/src/academics/task/task-escalation.service.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/task/task-escalation.service.spec.ts`

**Interfaces:**
- Consumes: `Task` (Task 3), `TaskRiskService` (Task 5), `TaskNotificationService` and `TaskUserService` (Task 4).
- Produces: `TaskEscalationService.run(now: Date): Promise<number>` returning the number of tasks escalated or reassigned.

This task carries **Review Focus 5** (the coordinator is unassigned after tasks exist).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/task/task-escalation.service.spec.ts`:

```ts
import { AtRiskReason, ReadinessKey, TaskStatus, TASK_ESCALATION_HOURS } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskEscalationService } from './task-escalation.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const COORDINATOR = new Types.ObjectId();
const SUPERVISOR = new Types.ObjectId();
const NOW = new Date('2026-03-10T12:00:00.000Z');
const NEXT_DUE = new Date('2026-03-11T12:00:00.000Z');

const overdueTask = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  organizationId: ORG,
  groupId: GROUP,
  readinessKey: ReadinessKey.MEETING_LINK,
  milestoneDays: 3,
  assigneeId: COORDINATOR,
  escalationLevel: 0,
  dueAt: new Date('2026-03-09T12:00:00.000Z'),
  status: TaskStatus.OPEN,
  ...overrides,
});

const makeService = (tasks: Record<string, unknown>[], groupOverrides: Record<string, unknown> = {}) => {
  const taskModel = {
    find: jest.fn(() => ({ lean: () => ({ exec: async () => tasks }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({
      lean: () => ({
        exec: async () => [{ _id: GROUP, organizationId: ORG, name: 'Group A', coordinatorId: COORDINATOR, supervisorId: SUPERVISOR, ...groupOverrides }],
      }),
    })),
  };
  const notifications = { taskAssigned: jest.fn(async () => undefined), taskEscalated: jest.fn(async () => undefined) };
  const users = { managerIdsInOrg: jest.fn(async () => ['m1', 'm2']) };
  const risk = { flag: jest.fn(async () => undefined), refresh: jest.fn(async () => undefined) };
  const service = new TaskEscalationService(taskModel as never, groupModel as never, notifications as never, users as never, risk as never);
  return { service, taskModel, notifications, users, risk };
};

describe('TaskEscalationService.run', () => {
  it('escalates a level-0 task to the supervisor and resets the clock', async () => {
    const { service, taskModel, notifications } = makeService([overdueTask()]);
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0];
    expect(update.$set).toEqual({ escalationLevel: 1, assigneeId: SUPERVISOR, dueAt: NEXT_DUE });
    expect(notifications.taskEscalated).toHaveBeenCalledWith(expect.anything(), 'Group A', [String(SUPERVISOR)]);
  });

  it('skips the supervisor level when the group has none', async () => {
    const { service, taskModel, notifications, users, risk } = makeService([overdueTask()], { supervisorId: null });
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0];
    expect(update.$set).toEqual({ escalationLevel: 2, assigneeId: null, dueAt: NEXT_DUE });
    expect(users.managerIdsInOrg).toHaveBeenCalledWith(ORG);
    expect(notifications.taskEscalated).toHaveBeenCalledWith(expect.anything(), 'Group A', ['m1', 'm2']);
    expect(risk.flag).toHaveBeenCalledWith(GROUP, AtRiskReason.TASK_ESCALATED, NOW);
  });

  it('escalates a level-1 task to the manager queue and flags the group at risk', async () => {
    const { service, taskModel, risk } = makeService([overdueTask({ escalationLevel: 1, assigneeId: SUPERVISOR })]);
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0];
    expect(update.$set).toEqual({ escalationLevel: 2, assigneeId: null, dueAt: NEXT_DUE });
    expect(risk.flag).toHaveBeenCalledWith(GROUP, AtRiskReason.TASK_ESCALATED, NOW);
  });

  it('leaves a level-2 task where it is', async () => {
    const { service, taskModel, notifications } = makeService([overdueTask({ escalationLevel: 2, assigneeId: null })]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(taskModel.updateOne).not.toHaveBeenCalled();
    expect(notifications.taskEscalated).not.toHaveBeenCalled();
  });

  it('reassigns rather than escalates when the coordinator seat changed hands', async () => {
    const newCoordinator = new Types.ObjectId();
    const { service, taskModel, notifications } = makeService([overdueTask()], { coordinatorId: newCoordinator });
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0];
    expect(update.$set).toEqual({ assigneeId: newCoordinator, dueAt: NEXT_DUE });
    expect(notifications.taskAssigned).toHaveBeenCalledWith(expect.anything(), 'Group A', [String(newCoordinator)]);
  });

  it('flags the group and escalates when the coordinator seat is now empty', async () => {
    const { service, taskModel, risk } = makeService([overdueTask()], { coordinatorId: null });
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(risk.flag).toHaveBeenCalledWith(GROUP, AtRiskReason.NO_COORDINATOR, NOW);
    const [, update] = taskModel.updateOne.mock.calls[0];
    expect(update.$set.escalationLevel).toBe(1);
  });

  it('does nothing when no task is overdue', async () => {
    const { service, taskModel } = makeService([]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(taskModel.updateOne).not.toHaveBeenCalled();
  });

  it('escalates exactly one level even when the task is days overdue', async () => {
    const { service, taskModel } = makeService([overdueTask({ dueAt: new Date('2026-03-01T00:00:00.000Z') })]);
    await service.run(NOW);
    expect(taskModel.updateOne).toHaveBeenCalledTimes(1);
    expect(taskModel.updateOne.mock.calls[0][1].$set.escalationLevel).toBe(1);
  });

  it('reads the escalation window from the shared constant', () => {
    expect(TASK_ESCALATION_HOURS).toBe(24);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest task-escalation --runInBand`
Expected: FAIL — `Cannot find module './task-escalation.service'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/academics/task/task-escalation.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtRiskReason, TaskStatus, TASK_ESCALATION_HOURS, TASK_MAX_ESCALATION_LEVEL } from '@darnozom/shared-types';
import { Group } from '../group/entities/group.entity';
import { Task } from './entities/task.entity';
import { TaskLean } from './task.types';
import { TaskNotificationService } from './task-notification.service';
import { TaskRiskService } from './task-risk.service';
import { TaskUserService } from './task-user.service';

interface GroupForEscalation {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  coordinatorId: Types.ObjectId | null;
  supervisorId: Types.ObjectId | null;
}

@Injectable()
export class TaskEscalationService {
  private readonly logger = new Logger(TaskEscalationService.name);

  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly notifications: TaskNotificationService,
    private readonly users: TaskUserService,
    private readonly risk: TaskRiskService
  ) {}

  /** Moves every overdue task one level up the chain. Returns how many moved or were reassigned. */
  async run(now: Date): Promise<number> {
    const overdue = await this.taskModel
      .find({ status: TaskStatus.OPEN, dueAt: { $lte: now } })
      .lean<TaskLean[]>()
      .exec();
    if (overdue.length === 0) return 0;

    const groups = await this.groupModel
      .find({ _id: { $in: overdue.map((task) => task.groupId) } })
      .select('_id organizationId name coordinatorId supervisorId')
      .lean<GroupForEscalation[]>()
      .exec();
    const byId = new Map(groups.map((group) => [String(group._id), group]));

    let moved = 0;
    for (const task of overdue) {
      const group = byId.get(String(task.groupId));
      if (!group) continue;
      try {
        if (await this.step(task, group, now)) moved += 1;
      } catch (error) {
        this.logger.error(`Escalation skipped for task ${String(task._id)}: ${(error as Error).message}`);
      }
    }
    return moved;
  }

  /** One step for one task. True when something changed. */
  private async step(task: TaskLean, group: GroupForEscalation, now: Date): Promise<boolean> {
    const nextDue = new Date(now.getTime() + TASK_ESCALATION_HOURS * 3600 * 1000);

    if (task.escalationLevel >= TASK_MAX_ESCALATION_LEVEL) return false;

    if (task.escalationLevel === 0) {
      if (group.coordinatorId == null) {
        // Nobody holds the seat the task is waiting on; the group is the problem (Review Focus 5).
        await this.risk.flag(group._id, AtRiskReason.NO_COORDINATOR, now);
      } else if (String(group.coordinatorId) !== String(task.assigneeId)) {
        // The seat changed hands while the task sat open. Give the new coordinator their own 24 hours
        // before holding a supervisor responsible for a task they never saw.
        await this.apply(task, { assigneeId: group.coordinatorId, dueAt: nextDue });
        await this.notifications.taskAssigned(task, group.name, [String(group.coordinatorId)]);
        return true;
      }
    }

    const toLevel = task.escalationLevel === 0 && group.supervisorId != null ? 1 : TASK_MAX_ESCALATION_LEVEL;
    const assigneeId = toLevel === 1 ? group.supervisorId : null;
    await this.apply(task, { escalationLevel: toLevel, assigneeId, dueAt: nextDue });

    const recipients =
      toLevel === 1 ? [String(group.supervisorId)] : await this.users.managerIdsInOrg(group.organizationId);
    await this.notifications.taskEscalated({ ...task, escalationLevel: toLevel }, group.name, recipients);

    // "then the group is flagged at risk" — the chain ran out of people below the manager.
    if (toLevel === TASK_MAX_ESCALATION_LEVEL) await this.risk.flag(group._id, AtRiskReason.TASK_ESCALATED, now);
    return true;
  }

  private async apply(task: TaskLean, set: Record<string, unknown>): Promise<void> {
    // The status guard keeps a task that closed between the read and the write from reopening.
    await this.taskModel.updateOne({ _id: task._id, status: TaskStatus.OPEN }, { $set: set }).exec();
  }
}
```

- [ ] **Step 4: Register the provider**

Add `TaskEscalationService` to the imports and `providers` of `apps/server/src/academics/academics.module.ts`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest task-escalation --runInBand`
Expected: PASS, 9 tests.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/task/task-escalation.service.ts src/academics/task/task-escalation.service.spec.ts
git add apps/server/src/academics
git commit -m "feat(sp3): escalate overdue pre-start tasks from coordinator to supervisor to manager"
```

---

### Task 8: The repeatable job

**Files:**
- Create: `apps/server/src/academics/task/task.queue.ts`
- Create: `apps/server/src/academics/task/task.processor.ts`
- Create: `apps/server/src/academics/task/task.scheduler.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/task/task.processor.spec.ts`

**Interfaces:**
- Consumes: `TaskGenerationService.run` (Task 4), `TaskEscalationService.run` (Task 7).
- Produces: `PRE_START_TASK_QUEUE = 'academics-pre-start-tasks'`, `PRE_START_SWEEP_JOB = 'sweep-pre-start-tasks'`, `PRE_START_SWEEP_EVERY_MS = 15 * 60 * 1000`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/task/task.processor.spec.ts`:

```ts
import { Job } from 'bullmq';
import { PreStartTaskProcessor } from './task.processor';
import { PRE_START_SWEEP_EVERY_MS, PRE_START_SWEEP_JOB } from './task.queue';

const makeProcessor = () => {
  const generation = { run: jest.fn(async () => 2) };
  const escalation = { run: jest.fn(async () => 1) };
  return { processor: new PreStartTaskProcessor(generation as never, escalation as never), generation, escalation };
};

describe('PreStartTaskProcessor', () => {
  it('generates before it escalates, so a task created now is not instantly overdue', async () => {
    const { processor, generation, escalation } = makeProcessor();
    const order: string[] = [];
    generation.run.mockImplementation(async () => {
      order.push('generate');
      return 2;
    });
    escalation.run.mockImplementation(async () => {
      order.push('escalate');
      return 1;
    });
    await processor.process({ name: PRE_START_SWEEP_JOB } as Job);
    expect(order).toEqual(['generate', 'escalate']);
  });

  it('reports what it did', async () => {
    const { processor } = makeProcessor();
    await expect(processor.process({ name: PRE_START_SWEEP_JOB } as Job)).resolves.toEqual({ created: 2, escalated: 1 });
  });

  it('ignores a job it does not own', async () => {
    const { processor, generation, escalation } = makeProcessor();
    await expect(processor.process({ name: 'something-else' } as Job)).resolves.toEqual({ created: 0, escalated: 0 });
    expect(generation.run).not.toHaveBeenCalled();
    expect(escalation.run).not.toHaveBeenCalled();
  });

  it('sweeps every fifteen minutes, as the spec requires', () => {
    expect(PRE_START_SWEEP_EVERY_MS).toBe(15 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest task.processor --runInBand`
Expected: FAIL — `Cannot find module './task.processor'`.

- [ ] **Step 3: Write the three files**

Create `apps/server/src/academics/task/task.queue.ts`:

```ts
export const PRE_START_TASK_QUEUE = 'academics-pre-start-tasks';
export const PRE_START_SWEEP_JOB = 'sweep-pre-start-tasks';
/** Spec §5.1: a repeatable job every 15 minutes. */
export const PRE_START_SWEEP_EVERY_MS = 15 * 60 * 1000;
```

Create `apps/server/src/academics/task/task.processor.ts`:

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TaskEscalationService } from './task-escalation.service';
import { TaskGenerationService } from './task-generation.service';
import { PRE_START_SWEEP_JOB, PRE_START_TASK_QUEUE } from './task.queue';

export interface PreStartSweepResult {
  created: number;
  escalated: number;
}

@Processor(PRE_START_TASK_QUEUE)
export class PreStartTaskProcessor extends WorkerHost {
  constructor(
    private readonly generation: TaskGenerationService,
    private readonly escalation: TaskEscalationService
  ) {
    super();
  }

  async process(job: Job): Promise<PreStartSweepResult> {
    if (job.name !== PRE_START_SWEEP_JOB) return { created: 0, escalated: 0 };
    // Generation first: a task created in this sweep gets its full 24 hours before escalation looks.
    const now = new Date();
    const created = await this.generation.run(now);
    const escalated = await this.escalation.run(now);
    return { created, escalated };
  }
}
```

Create `apps/server/src/academics/task/task.scheduler.ts`:

```ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PRE_START_SWEEP_EVERY_MS, PRE_START_SWEEP_JOB, PRE_START_TASK_QUEUE } from './task.queue';

@Injectable()
export class PreStartTaskScheduler implements OnModuleInit {
  private readonly logger = new Logger(PreStartTaskScheduler.name);

  constructor(@InjectQueue(PRE_START_TASK_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    try {
      // upsert keeps exactly one repeatable schedule across restarts and multiple instances.
      await this.queue.upsertJobScheduler(
        PRE_START_SWEEP_JOB,
        { every: PRE_START_SWEEP_EVERY_MS },
        { name: PRE_START_SWEEP_JOB }
      );
    } catch (error) {
      // A missing schedule delays tasks; it never corrupts a group, so the app still starts.
      this.logger.error(`Could not schedule the pre-start task sweep: ${(error as Error).message}`);
    }
  }
}
```

- [ ] **Step 4: Register the queue and the providers**

In `apps/server/src/academics/academics.module.ts`:
- add `BullModule.registerQueue({ name: PRE_START_TASK_QUEUE }),` next to the existing `SESSION_STATUS_QUEUE` registration;
- add `PreStartTaskProcessor` and `PreStartTaskScheduler` to `providers`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest task.processor --runInBand`
Expected: PASS, 4 tests.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/task/task.queue.ts src/academics/task/task.processor.ts src/academics/task/task.scheduler.ts src/academics/task/task.processor.spec.ts
git add apps/server/src/academics
git commit -m "feat(sp3): sweep pre-start tasks every fifteen minutes"
```

---

### Task 9: Assigning the coordinator and the supervisor

**Files:**
- Modify: `apps/server/src/academics/group/dto/group.dto.ts`
- Modify: `apps/server/src/academics/group/group.service.ts`
- Test: `apps/server/src/academics/group/group-staff.spec.ts`

**Interfaces:**
- Consumes: the `Group` fields from Task 3.
- Produces: `UpdateGroupDto` accepts `coordinatorId?: string | null` and `supervisorId?: string | null`; `GroupService.update` validates each against the organization and the required role, throwing `AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION` or `.SUPERVISOR_NOT_FOUND_IN_ORGANIZATION`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/group/group-staff.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { assertStaffAssignable } from './group-staff';

const coordinator = { _id: new Types.ObjectId(), organizationId: new Types.ObjectId(), roleName: Roles.COORDINATOR, additionalRoles: [] };

describe('assertStaffAssignable', () => {
  it('accepts a user whose primary role matches', () => {
    expect(() => assertStaffAssignable(coordinator, Roles.COORDINATOR, AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)).not.toThrow();
  });

  it('accepts a user who holds the role as an additional role', () => {
    const secretaryAlsoCoordinator = { ...coordinator, roleName: Roles.SECRETARY, additionalRoles: [Roles.COORDINATOR] };
    expect(() =>
      assertStaffAssignable(secretaryAlsoCoordinator, Roles.COORDINATOR, AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)
    ).not.toThrow();
  });

  it('rejects a user who does not hold the role', () => {
    const teacher = { ...coordinator, roleName: Roles.INSTRUCTOR, additionalRoles: [] };
    expect(() => assertStaffAssignable(teacher, Roles.COORDINATOR, AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)).toThrow(
      new BadRequestException(AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)
    );
  });

  it('rejects a user who does not exist in the organization', () => {
    expect(() => assertStaffAssignable(null, Roles.SUPERVISOR, AcademicsErrors.SUPERVISOR_NOT_FOUND_IN_ORGANIZATION)).toThrow(
      new BadRequestException(AcademicsErrors.SUPERVISOR_NOT_FOUND_IN_ORGANIZATION)
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest group-staff --runInBand`
Expected: FAIL — `Cannot find module './group-staff'`.

- [ ] **Step 3: Write the guard**

Create `apps/server/src/academics/group/group-staff.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { AcademicsErrors, hasRole, Roles } from '@darnozom/shared-types';

interface StaffCandidate {
  roleName: Roles;
  additionalRoles?: readonly Roles[];
}

/**
 * A coordinator or supervisor must exist in the organization and hold the role, either as their
 * primary role or as an additional one — a staff member may hold more than one (MVP §2).
 */
export function assertStaffAssignable(user: StaffCandidate | null, role: Roles, error: AcademicsErrors): void {
  if (!user) throw new BadRequestException(error);
  if (!hasRole({ roleName: user.roleName, additionalRoles: user.additionalRoles ?? [] }, role)) {
    throw new BadRequestException(error);
  }
}
```

Open `lib/shared-types/src/lib/types/role/role/role-helpers.ts` first and match `hasRole`'s real parameter shape; adapt the call if it differs and record a `Ruling:` line.

- [ ] **Step 4: Accept the two fields on update**

In `apps/server/src/academics/group/dto/group.dto.ts`, add to the class behind `UpdateGroupPayload`'s `data` (the same class that already accepts `meetingLink`):

```ts
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsMongoId()
  coordinatorId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsMongoId()
  supervisorId?: string | null;
```

Add `ValidateIf` to the `class-validator` import if it is not already there. `null` is allowed so a seat can be vacated.

In `apps/server/src/academics/group/group.service.ts`, inside `update`, before the write, add:

```ts
    if (data.coordinatorId !== undefined && data.coordinatorId !== null) {
      assertStaffAssignable(await this.findOrgUser(actor, data.coordinatorId), Roles.COORDINATOR, AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION);
    }
    if (data.supervisorId !== undefined && data.supervisorId !== null) {
      assertStaffAssignable(await this.findOrgUser(actor, data.supervisorId), Roles.SUPERVISOR, AcademicsErrors.SUPERVISOR_NOT_FOUND_IN_ORGANIZATION);
    }
```

`GroupService` already looks users up in the organization when it assigns a teacher — reuse that helper and name it `findOrgUser` if it is private under another name. Do not add a second user lookup.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest group-staff src/academics/group --runInBand`
Expected: PASS — 4 new tests, every existing group suite green.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/group/group-staff.ts src/academics/group/group-staff.spec.ts src/academics/group/group.service.ts src/academics/group/dto/group.dto.ts
git add apps/server/src/academics/group
git commit -m "feat(sp3): assign a coordinator and a supervisor to a group"
```

---

### Task 10: Reads, mark-done and permissions

**Files:**
- Create: `apps/server/src/academics/task/task.service.ts`
- Create: `apps/server/src/academics/task/dto/task.dto.ts`
- Create: `apps/server/src/academics/task/task.controller.message.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Modify: `apps/server/src/role/seeds/role.coordinator.config.ts`
- Modify: `apps/server/src/role/seeds/role.supervisor.config.ts`
- Modify: `apps/server/src/role/seeds/role.manager.config.ts`
- Test: `apps/server/src/academics/task/task.service.spec.ts`
- Test: `apps/server/src/role/seeds/roles.config.spec.ts` (extend)

**Interfaces:**
- Consumes: `Task` (Task 3), `computeReadiness`, `TaskRiskService` (Task 5), `AcademicsActor`.
- Produces: `TaskService.findMine(actor, query): Promise<TaskView[]>`, `TaskService.findForGroup(actor, groupId): Promise<TaskView[]>`, `TaskService.markDone(actor, id): Promise<TaskView>`; message patterns `academics.tasks.listMine`, `academics.tasks.listForGroup`, `academics.tasks.markDone`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/task/task.service.spec.ts`:

```ts
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, GroupPaymentStatus, GroupStudentStatus, ReadinessKey, Roles, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskService } from './task.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const TASK = new Types.ObjectId();
const ME = new Types.ObjectId();

const actor = (overrides: Record<string, unknown> = {}) => ({
  _id: String(ME),
  organizationId: String(ORG),
  roleName: Roles.COORDINATOR,
  additionalRoles: [] as Roles[],
  ...overrides,
});

const task = (overrides: Record<string, unknown> = {}) => ({
  _id: TASK,
  organizationId: ORG,
  groupId: GROUP,
  readinessKey: ReadinessKey.MEETING_LINK,
  milestoneDays: 3,
  assigneeId: ME,
  escalationLevel: 0,
  dueAt: new Date('2026-03-11T00:00:00.000Z'),
  status: TaskStatus.OPEN,
  ...overrides,
});

/** A group where MEETING_LINK is done and CONTENT_SENT is not. */
const groupDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: GROUP,
  organizationId: ORG,
  name: 'Group A',
  teacherId: new Types.ObjectId(),
  minStudents: 1,
  students: [{ studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
  contentSent: { done: false },
  meetingLink: 'https://meet.example/abc',
  ...overrides,
});

const makeService = (tasks: Record<string, unknown>[], group: Record<string, unknown> | null = groupDoc()) => {
  const taskModel = {
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => tasks }) }) })),
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => tasks[0] ?? null }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => (group ? [group] : []) }) }) })),
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => group }) })),
  };
  const risk = { refresh: jest.fn(async () => undefined), flag: jest.fn(async () => undefined) };
  return { service: new TaskService(taskModel as never, groupModel as never, risk as never), taskModel, groupModel, risk };
};

describe('TaskService.findMine', () => {
  it('returns the caller’s own open tasks with the group name attached', async () => {
    const { service, taskModel } = makeService([task()]);
    const result = await service.findMine(actor(), { status: TaskStatus.OPEN });
    expect(result[0].groupName).toBe('Group A');
    const [filter] = taskModel.find.mock.calls[0];
    expect(filter.$or).toEqual([{ assigneeId: ME }]);
  });

  it('includes the manager queue for a manager', async () => {
    const { service, taskModel } = makeService([task({ assigneeId: null, escalationLevel: 2 })]);
    await service.findMine(actor({ roleName: Roles.MANAGER }), {});
    const [filter] = taskModel.find.mock.calls[0];
    expect(filter.$or).toEqual([{ assigneeId: ME }, { assigneeId: null }]);
  });

  it('includes the manager queue for someone holding MANAGER as an additional role', async () => {
    const { service, taskModel } = makeService([task()]);
    await service.findMine(actor({ roleName: Roles.SECRETARY, additionalRoles: [Roles.MANAGER] }), {});
    expect(taskModel.find.mock.calls[0][0].$or).toContainEqual({ assigneeId: null });
  });

  it('scopes every read to the caller’s organization', async () => {
    const { service, taskModel } = makeService([task()]);
    await service.findMine(actor(), {});
    expect(taskModel.find.mock.calls[0][0].organizationId).toEqual(ORG);
  });

  it('filters by group when asked', async () => {
    const { service, taskModel } = makeService([task()]);
    await service.findMine(actor(), { groupId: String(GROUP) });
    expect(taskModel.find.mock.calls[0][0].groupId).toEqual(GROUP);
  });
});

describe('TaskService.markDone', () => {
  it('closes the task when its readiness item is actually done', async () => {
    const { service, taskModel, risk } = makeService([task()]);
    await service.markDone(actor(), String(TASK));
    expect(taskModel.updateOne).toHaveBeenCalledWith(
      { _id: TASK, status: TaskStatus.OPEN },
      { $set: { status: TaskStatus.DONE, closedAt: expect.any(Date), closedReason: TaskClosedReason.ITEM_DONE } }
    );
    expect(risk.refresh).toHaveBeenCalled();
  });

  it('refuses to close a task whose item is still missing', async () => {
    const { service, taskModel } = makeService([task({ readinessKey: ReadinessKey.CONTENT_SENT })]);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(
      new ConflictException(AcademicsErrors.READINESS_ITEM_STILL_MISSING)
    );
    expect(taskModel.updateOne).not.toHaveBeenCalled();
  });

  it('refuses when the caller is neither the assignee nor a manager', async () => {
    const { service } = makeService([task({ assigneeId: new Types.ObjectId() })]);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.TASK_NOT_ASSIGNED_TO_YOU)
    );
  });

  it('lets any manager close a task sitting in the manager queue', async () => {
    const { service, taskModel } = makeService([task({ assigneeId: null, escalationLevel: 2 })]);
    await service.markDone(actor({ roleName: Roles.MANAGER }), String(TASK));
    expect(taskModel.updateOne).toHaveBeenCalled();
  });

  it('404s on a task from another organization', async () => {
    const { service } = makeService([]);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(new NotFoundException(AcademicsErrors.TASK_NOT_FOUND));
  });

  it('404s when the task’s group has vanished', async () => {
    const { service } = makeService([task()], null);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest task.service --runInBand`
Expected: FAIL — `Cannot find module './task.service'`.

- [ ] **Step 3: Write the DTOs**

Create `apps/server/src/academics/task/dto/task.dto.ts`:

```ts
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { TaskStatus } from '@darnozom/shared-types';

export class FindTasksPayload {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsMongoId()
  groupId?: string;
}

export class GroupTasksPayload {
  @IsMongoId()
  groupId: string;
}
```

- [ ] **Step 4: Write the service**

Create `apps/server/src/academics/task/task.service.ts`:

```ts
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, hasRole, ReadinessKey, Roles, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { computeReadiness, ReadinessInput } from '../domain/readiness';
import { Group } from '../group/entities/group.entity';
import { Task } from './entities/task.entity';
import { TaskLean, TaskView } from './task.types';
import { TaskRiskService } from './task-risk.service';
import { FindTasksPayload } from './dto/task.dto';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const isManager = (actor: AcademicsActor) => hasRole(actor, Roles.MANAGER) || hasRole(actor, Roles.OWNER);

type GroupForTask = ReadinessInput & { _id: Types.ObjectId; name: string };

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly risk: TaskRiskService
  ) {}

  /** The caller's queue: their own tasks, plus the manager queue when they hold MANAGER or OWNER. */
  async findMine(actor: AcademicsActor, query: FindTasksPayload): Promise<TaskView[]> {
    const or: FilterQuery<Task>[] = [{ assigneeId: oid(actor._id) }];
    if (isManager(actor)) or.push({ assigneeId: null });

    const filter: FilterQuery<Task> = { organizationId: oid(actor.organizationId), $or: or };
    if (query.status) filter.status = query.status;
    if (query.groupId) filter.groupId = oid(query.groupId);

    return this.withGroupNames(await this.taskModel.find(filter).sort({ dueAt: 1 }).lean<TaskLean[]>().exec());
  }

  /** Every task of one group, for the group formation screen. */
  async findForGroup(actor: AcademicsActor, groupId: string): Promise<TaskView[]> {
    const tasks = await this.taskModel
      .find({ organizationId: oid(actor.organizationId), groupId: oid(groupId), status: TaskStatus.OPEN })
      .sort({ dueAt: 1 })
      .lean<TaskLean[]>()
      .exec();
    return this.withGroupNames(tasks);
  }

  /**
   * The assignee closes a task by hand — but only once the problem it reports is gone, so a task
   * can never be dismissed while the group is still missing the item (spec §5.2).
   */
  async markDone(actor: AcademicsActor, id: string): Promise<TaskView> {
    const task = await this.taskModel
      .findOne({ _id: oid(id), organizationId: oid(actor.organizationId), status: TaskStatus.OPEN })
      .lean<TaskLean>()
      .exec();
    if (!task) throw new NotFoundException(AcademicsErrors.TASK_NOT_FOUND);

    const mine = task.assigneeId != null && String(task.assigneeId) === actor._id;
    const managerQueue = task.assigneeId == null && isManager(actor);
    if (!mine && !managerQueue) throw new ForbiddenException(AcademicsErrors.TASK_NOT_ASSIGNED_TO_YOU);

    const group = await this.groupModel.findOne({ _id: task.groupId }).lean<GroupForTask>().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);

    const done = computeReadiness(group).items.find((item) => item.key === task.readinessKey)?.done === true;
    if (!done) throw new ConflictException(AcademicsErrors.READINESS_ITEM_STILL_MISSING);

    const now = new Date();
    await this.taskModel
      .updateOne(
        { _id: task._id, status: TaskStatus.OPEN },
        { $set: { status: TaskStatus.DONE, closedAt: now, closedReason: TaskClosedReason.ITEM_DONE } }
      )
      .exec();
    await this.risk.refresh(task.groupId, now);
    return { ...task, status: TaskStatus.DONE, closedAt: now, closedReason: TaskClosedReason.ITEM_DONE, groupName: group.name };
  }

  private async withGroupNames(tasks: TaskLean[]): Promise<TaskView[]> {
    if (tasks.length === 0) return [];
    const groups = await this.groupModel
      .find({ _id: { $in: tasks.map((task) => task.groupId) } })
      .select('_id name')
      .lean<{ _id: Types.ObjectId; name: string }[]>()
      .exec();
    const names = new Map(groups.map((group) => [String(group._id), group.name]));
    return tasks.map((task) => ({ ...task, groupName: names.get(String(task.groupId)) ?? '' }));
  }
}
```

Keep the unused `ReadinessKey` import out; the editor will flag it.

- [ ] **Step 5: Write the controller**

Create `apps/server/src/academics/task/task.controller.message.ts`:

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
import { FindTasksPayload, GroupTasksPayload } from './dto/task.dto';
import { TaskService } from './task.service';

@Controller()
@ApplyRpcErrorHandling
export class TaskControllerMessage {
  constructor(private readonly tasks: TaskService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TASK })
  @MessagePattern('academics.tasks.listMine')
  listMine(@Payload(new RpcValidationPipe()) payload: FindTasksPayload, @Ctx() context: IUserContext) {
    return this.tasks.findMine(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TASK })
  @MessagePattern('academics.tasks.listForGroup')
  listForGroup(@Payload(new RpcValidationPipe()) payload: GroupTasksPayload, @Ctx() context: IUserContext) {
    return this.tasks.findForGroup(actorFromContext(context), payload.groupId);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.TASK })
  @MessagePattern('academics.tasks.markDone')
  markDone(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.tasks.markDone(actorFromContext(context), payload.id);
  }
}
```

Register `TaskControllerMessage` in the module's `controllers` array and `TaskService` in `providers`.

- [ ] **Step 6: Grant the permissions**

`Subjects.TASK` already exists, so only the seeds change. Add to `COORDINATOR_PERMISSIONS` and to `SUPERVISOR_PERMISSIONS`:

```ts
  { action: Actions.READ, subject: Subjects.TASK },
  { action: Actions.UPDATE, subject: Subjects.TASK },
```

Add the same two rules to `MANAGER_PERMISSIONS`. `OWNER_SEED` reuses `ADMIN_PERMISSIONS`; check whether that array already grants `MANAGE` on `Subjects.ALL` — if it does, the owner needs no change, and if it does not, add the same two rules there too.

Extend `apps/server/src/role/seeds/roles.config.spec.ts` with:

```ts
  it('lets the coordinator, the supervisor and the manager read and update tasks', () => {
    for (const role of [Roles.COORDINATOR, Roles.SUPERVISOR, Roles.MANAGER]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.TASK });
      expect(permissions).toContainEqual({ action: Actions.UPDATE, subject: Subjects.TASK });
    }
  });

  it('keeps tasks away from roles with no part in the escalation chain', () => {
    for (const role of [Roles.ACCOUNTANT, Roles.INSTRUCTOR, Roles.PARENT, Roles.STUDENT]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      expect(permissions.some((rule) => rule.subject === Subjects.TASK)).toBe(false);
    }
  });
```

Match the spec file's existing import names and helper style rather than copying these imports blindly.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest task.service roles.config --runInBand`
Expected: PASS — 11 task-service tests and the roles config suite including the two new cases.

- [ ] **Step 8: Apply the role changes to the database**

Run: `pnpm --filter server seed:prod`
Expected: it completes without error. This script is upsert-only. **Never run `pnpm seed`** — that one wipes every collection.

- [ ] **Step 9: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/task/task.service.ts src/academics/task/task.service.spec.ts src/academics/task/task.controller.message.ts src/academics/task/dto/task.dto.ts src/role/seeds/role.coordinator.config.ts src/role/seeds/role.supervisor.config.ts src/role/seeds/role.manager.config.ts src/role/seeds/roles.config.spec.ts
git add apps/server/src
git commit -m "feat(sp3): expose task reads and mark-done, and grant task permissions"
```

---

### Task 11: Client data layer

**Files:**
- Create: `apps/client/src/lib/actions/academics/tasks.action.ts`
- Modify: `apps/client/src/lib/types/academics/academics.ts`
- Modify: `apps/client/src/lib/hooks/academics/use-academics.hook.ts`
- Test: `apps/client/src/lib/hooks/academics/task-keys.test.ts`

**Interfaces:**
- Consumes: the message patterns from Task 10.
- Produces: `ITask` (with `groupName`), `TaskQuery`; `getMyTasks`, `getGroupTasks`, `markTaskDone` actions; `useMyTasks(query)`, `useGroupTasks(groupId)`, `useMarkTaskDone()`; `academicsKeys.myTasks(query)` and `academicsKeys.groupTasks(groupId)`.

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/lib/hooks/academics/task-keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { academicsKeys } from './use-academics.hook';

describe('academicsKeys task entries', () => {
  it('namespaces task queries under academics so one mutation refreshes them all', () => {
    expect(academicsKeys.myTasks({ status: 'OPEN' })[0]).toBe('academics');
    expect(academicsKeys.groupTasks('g1')[0]).toBe('academics');
  });

  it('keys my-tasks by its query, so changing the filter refetches', () => {
    expect(academicsKeys.myTasks({ status: 'OPEN' })).not.toEqual(academicsKeys.myTasks({}));
  });

  it('keys group tasks by group', () => {
    expect(academicsKeys.groupTasks('g1')).not.toEqual(academicsKeys.groupTasks('g2'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter client exec vitest run task-keys --no-file-parallelism`
Expected: FAIL — `academicsKeys.myTasks is not a function`.

- [ ] **Step 3: Add the types**

Append to `apps/client/src/lib/types/academics/academics.ts`:

```ts
export interface ITask {
  _id: string;
  organizationId: string;
  groupId: string;
  groupName: string;
  kind: TaskKind;
  readinessKey: ReadinessKey;
  milestoneDays: number;
  assigneeId: string | null;
  escalationLevel: number;
  dueAt: string;
  status: TaskStatus;
  closedAt: string | null;
  closedReason: TaskClosedReason | null;
  createdAt: string;
}

export type ITasks = ITask[];

export interface TaskQuery {
  status?: TaskStatus;
  groupId?: string;
}
```

Import `TaskClosedReason`, `TaskKind`, `TaskStatus` and `ReadinessKey` from `@darnozom/shared-types` at the top of that file, alongside the existing academics imports. Also add `coordinatorId: string | null`, `supervisorId: string | null`, `atRisk: boolean`, `atRiskSince: string | null` and `atRiskReason: AtRiskReason | null` to the existing `IGroup` interface, and `atRisk?: boolean` to `GroupQuery`.

- [ ] **Step 4: Add the server actions**

Create `apps/client/src/lib/actions/academics/tasks.action.ts`:

```ts
'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ITask, ITasks, TaskQuery } from '@/lib/types/academics/academics';

export async function getMyTasks(query: TaskQuery) {
  return createAuthorizedNatsRequest<ITasks>('academics.tasks.listMine', query);
}

export async function getGroupTasks(groupId: string) {
  return createAuthorizedNatsRequest<ITasks>('academics.tasks.listForGroup', { groupId });
}

export async function markTaskDone(id: string) {
  return createAuthorizedNatsRequest<ITask>('academics.tasks.markDone', { id });
}
```

- [ ] **Step 5: Add the keys and hooks**

In `apps/client/src/lib/hooks/academics/use-academics.hook.ts`:
- add `import * as tasksApi from '@/lib/actions/academics/tasks.action';`
- add `ITask`, `ITasks` and `TaskQuery` to the type import from `@/lib/types/academics/academics`
- add to `academicsKeys`:

```ts
  myTasks: (query: TaskQuery) => [ROOT, 'my-tasks', query] as const,
  groupTasks: (groupId: string) => [ROOT, 'group-tasks', groupId] as const,
```

- add the hooks, following the shape of the existing `useFollowUps`:

```ts
export const useMyTasks = (query: TaskQuery, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.myTasks(query),
    queryFn: async () => unwrap(await tasksApi.getMyTasks(query)),
    enabled,
  });

export const useGroupTasks = (groupId: string, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.groupTasks(groupId),
    queryFn: async () => unwrap(await tasksApi.getGroupTasks(groupId)),
    enabled: enabled && Boolean(groupId),
  });

export const useMarkTaskDone = () =>
  useAcademicsMutation(async (id: string) => unwrap(await tasksApi.markTaskDone(id)));
```

Match the `enabled` and `queryFn` conventions of the surrounding hooks exactly; if `useFollowUps` passes options differently, follow that file, not this snippet.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter client exec vitest run task-keys --no-file-parallelism`
Expected: PASS, 3 tests.

- [ ] **Step 7: Lint, type-check and commit**

```bash
pnpm --filter client exec eslint src/lib/actions/academics/tasks.action.ts src/lib/hooks/academics/use-academics.hook.ts src/lib/hooks/academics/task-keys.test.ts src/lib/types/academics/academics.ts
pnpm --filter client tsc --noEmit
git add apps/client/src/lib
git commit -m "feat(sp3): add the client data layer for pre-start tasks"
```

`pnpm --filter client tsc --noEmit` has a known baseline of 5 pre-existing errors from before sub-project 2. Compare against that baseline; only new errors matter.

---

### Task 12: The "My tasks" page

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-tasks/page.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-tasks/__components/my-tasks-list.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts`
- Modify: `apps/client/src/lib/data/constants/routes.constants.ts`
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json`
- Test: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-tasks/__components/my-tasks-list.test.tsx`

**Interfaces:**
- Consumes: `useMyTasks`, `useMarkTaskDone`, `ITask` (Task 11).
- Produces: `MyTasksList({ tasks, isLoading }: { tasks: ITask[]; isLoading: boolean })`.

The list is a presentational component taking its data as props, so the test needs no query client — the same split `follow-ups-card.tsx` uses.

- [ ] **Step 1: Write the failing test**

Create `my-tasks-list.test.tsx` next to the component:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadinessKey, TaskStatus } from '@darnozom/shared-types';
import type { ITask } from '@/lib/types/academics/academics';
import { MyTasksList } from './my-tasks-list';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useLocale: () => 'en',
}));

const task = (overrides: Partial<ITask> = {}): ITask => ({
  _id: 't1',
  organizationId: 'o1',
  groupId: 'g1',
  groupName: 'Group A',
  kind: 'PRE_START_READINESS' as ITask['kind'],
  readinessKey: ReadinessKey.MEETING_LINK,
  milestoneDays: 3,
  assigneeId: 'u1',
  escalationLevel: 0,
  dueAt: '2026-03-11T00:00:00.000Z',
  status: TaskStatus.OPEN,
  closedAt: null,
  closedReason: null,
  createdAt: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

describe('MyTasksList', () => {
  it('shows the empty state when there is nothing to do', () => {
    render(<MyTasksList tasks={[]} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getByText('tasks.empty')).toBeInTheDocument();
  });

  it('shows the loading state instead of an empty state while fetching', () => {
    render(<MyTasksList tasks={[]} isLoading onMarkDone={vi.fn()} />);
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('tasks.empty')).not.toBeInTheDocument();
  });

  it('names the group and the missing item', () => {
    render(<MyTasksList tasks={[task()]} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('readiness.MEETING_LINK')).toBeInTheDocument();
  });

  it('labels the escalation level so a supervisor knows why they have it', () => {
    render(<MyTasksList tasks={[task({ escalationLevel: 1 })]} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getByText('tasks.level.1')).toBeInTheDocument();
  });

  it('calls onMarkDone with the task id', async () => {
    const onMarkDone = vi.fn();
    render(<MyTasksList tasks={[task()]} isLoading={false} onMarkDone={onMarkDone} />);
    screen.getByRole('button', { name: 'tasks.markDone' }).click();
    expect(onMarkDone).toHaveBeenCalledWith('t1');
  });

  it('renders one row per task', () => {
    render(<MyTasksList tasks={[task(), task({ _id: 't2', readinessKey: ReadinessKey.CONTENT_SENT })]} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: 'tasks.markDone' })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter client exec vitest run my-tasks-list --no-file-parallelism`
Expected: FAIL — `Failed to resolve import './my-tasks-list'`.

- [ ] **Step 3: Write the component**

Create `my-tasks-list.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { Link } from '@/i18n/navigation';
import type { ITask } from '@/lib/types/academics/academics';
import { ROUTE_ORG_ACADEMICS_GROUPS } from '@/lib/data/constants/routes.constants';

export function MyTasksList({
  tasks,
  isLoading,
  onMarkDone,
}: {
  tasks: ITask[];
  isLoading: boolean;
  onMarkDone: (id: string) => void;
}) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  if (isLoading) return <p>{t('loading')}</p>;
  if (tasks.length === 0) return <p className="text-muted-foreground">{t('tasks.empty')}</p>;

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task._id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <div className="space-y-1">
            <Link href={`${ROUTE_ORG_ACADEMICS_GROUPS}/${task.groupId}`} className="font-medium hover:underline">
              {task.groupName}
            </Link>
            <p className="text-sm">{t(`readiness.${task.readinessKey}`)}</p>
            <p className="text-muted-foreground text-sm">
              {t('tasks.due', { date: new Date(task.dueAt).toLocaleString(locale) })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t(`tasks.level.${task.escalationLevel}`)}</Badge>
            <Button size="sm" onClick={() => onMarkDone(task._id)}>
              {t('tasks.markDone')}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

Check `apps/client/src/components/atoms/` for the real `Badge` and `Button` paths and prop names before writing, and check that `ROUTE_ORG_ACADEMICS_GROUPS` is the existing constant's name — sub-project 1 added it. Use the real names.

- [ ] **Step 4: Write the page**

Create `page.tsx` in the same `my-tasks` folder:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { TaskStatus } from '@darnozom/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useMarkTaskDone, useMyTasks } from '@/lib/hooks/academics/use-academics.hook';
import { MyTasksList } from './__components/my-tasks-list';

export default function MyTasksPage() {
  const t = useTranslations('Academics');
  const { data: tasks = [], isLoading } = useMyTasks({ status: TaskStatus.OPEN });
  const markDone = useMarkTaskDone();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tasks.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <MyTasksList tasks={tasks} isLoading={isLoading} onMarkDone={(id) => markDone.mutate(id)} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Add the route constant, the nav entry and the translations**

Add `export const ROUTE_ORG_MY_TASKS = '/organization-dashboard/my-tasks';` to `routes.constants.ts`, following the file's existing naming.

In `organization-dashboard/data.ts`, add a nav item next to `navMain.myGroups`:

```ts
    { titleKey: 'navMain.myTasks', url: ROUTE_ORG_MY_TASKS, icon: IconListCheck, key: 'myTasks' },
```

Use an icon already imported in that file rather than adding a new import if one fits; otherwise add the `@tabler/icons-react` import the file's other icons come from. Check how that file gates items per role (the `key` field) and gate `myTasks` to the coordinator, supervisor, manager and owner the same way the file gates `myGroups`.

Add to the `Academics` namespace in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`:

```json
"tasks": {
  "title": "My tasks",
  "empty": "Nothing needs your attention.",
  "due": "Due {date}",
  "markDone": "Mark done",
  "level": { "0": "Coordinator", "1": "Supervisor", "2": "Manager" },
  "atRisk": "At risk",
  "atRiskReason": {
    "NO_COORDINATOR": "No coordinator assigned",
    "TASK_ESCALATED": "A task reached the manager"
  },
  "openTasks": "Open tasks",
  "coordinator": "Coordinator",
  "supervisor": "Supervisor",
  "unassigned": "Not assigned"
}
```

Add `"navMain": { "myTasks": "My tasks" }` to the namespace the org nav reads, and the Arabic equivalents in `ar.json`: `"المهام الخاصة بي"`, `"لا يوجد ما يتطلب انتباهك."`, `"تاريخ الاستحقاق {date}"`, `"تحديد كمنجَز"`, `"منسق"`, `"مشرف"`, `"مدير"`, `"في خطر"`, `"لم يُعيَّن منسق"`, `"وصلت مهمة إلى المدير"`, `"المهام المفتوحة"`, `"المنسق"`, `"المشرف"`, `"غير معيَّن"`.

Also confirm `readiness.TEACHER_ASSIGNED` … `readiness.MEETING_LINK` keys already exist from sub-project 1; the component reuses them. If they live under a different path, use the real one.

- [ ] **Step 6: Run the tests and the i18n check**

Run: `pnpm --filter client exec vitest run my-tasks-list --no-file-parallelism`
Expected: PASS, 6 tests.

Run: `pnpm --filter client i18n:check-keys`
Expected: ok — no missing or extra keys between `en.json` and `ar.json`.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter client exec eslint "src/app/[locale]/(dashboard)/organization-dashboard/my-tasks/page.tsx" "src/app/[locale]/(dashboard)/organization-dashboard/my-tasks/__components/my-tasks-list.tsx" "src/app/[locale]/(dashboard)/organization-dashboard/my-tasks/__components/my-tasks-list.test.tsx" "src/app/[locale]/(dashboard)/organization-dashboard/data.ts" src/lib/data/constants/routes.constants.ts
git add apps/client
git commit -m "feat(sp3): add the My tasks page"
```

---

### Task 13: Group formation screen — staff, at-risk and open tasks

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/staff-card.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/open-tasks-card.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/group-formation-screen.tsx`
- Test: `.../staff-card.test.tsx`, `.../open-tasks-card.test.tsx`

**Interfaces:**
- Consumes: `ITask` and the new `IGroup` fields (Task 11), `useGroupTasks`.
- Produces: `StaffCard({ group, candidates, onChange })` and `OpenTasksCard({ tasks, isLoading })`.

- [ ] **Step 1: Write the failing tests**

Create `open-tasks-card.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadinessKey, TaskStatus } from '@darnozom/shared-types';
import type { ITask } from '@/lib/types/academics/academics';
import { OpenTasksCard } from './open-tasks-card';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useLocale: () => 'en',
}));

const task: ITask = {
  _id: 't1',
  organizationId: 'o1',
  groupId: 'g1',
  groupName: 'Group A',
  kind: 'PRE_START_READINESS' as ITask['kind'],
  readinessKey: ReadinessKey.CONTENT_SENT,
  milestoneDays: 1,
  assigneeId: 'u1',
  escalationLevel: 2,
  dueAt: '2026-03-14T00:00:00.000Z',
  status: TaskStatus.OPEN,
  closedAt: null,
  closedReason: null,
  createdAt: '2026-03-13T00:00:00.000Z',
};

describe('OpenTasksCard', () => {
  it('says so when the group has no open tasks', () => {
    render(<OpenTasksCard tasks={[]} isLoading={false} />);
    expect(screen.getByText('tasks.empty')).toBeInTheDocument();
  });

  it('lists the missing item and the level it reached', () => {
    render(<OpenTasksCard tasks={[task]} isLoading={false} />);
    expect(screen.getByText('readiness.CONTENT_SENT')).toBeInTheDocument();
    expect(screen.getByText('tasks.level.2')).toBeInTheDocument();
  });

  it('shows the loading state while fetching', () => {
    render(<OpenTasksCard tasks={[]} isLoading />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});
```

Create `staff-card.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AtRiskReason } from '@darnozom/shared-types';
import { StaffCard } from './staff-card';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

const candidates = [
  { _id: 'u1', firstName: 'Nour', lastName: 'Ali', roleName: 'COORDINATOR', additionalRoles: [] },
  { _id: 'u2', firstName: 'Omar', lastName: 'Saad', roleName: 'SUPERVISOR', additionalRoles: [] },
];

const group = {
  coordinatorId: 'u1',
  supervisorId: null,
  atRisk: false,
  atRiskReason: null,
};

describe('StaffCard', () => {
  it('shows the assigned coordinator', () => {
    render(<StaffCard group={group} candidates={candidates} onChange={vi.fn()} />);
    expect(screen.getByText('Nour Ali')).toBeInTheDocument();
  });

  it('says the supervisor seat is empty', () => {
    render(<StaffCard group={group} candidates={candidates} onChange={vi.fn()} />);
    expect(screen.getByText('tasks.unassigned')).toBeInTheDocument();
  });

  it('shows no at-risk badge for a healthy group', () => {
    render(<StaffCard group={group} candidates={candidates} onChange={vi.fn()} />);
    expect(screen.queryByText('tasks.atRisk')).not.toBeInTheDocument();
  });

  it('shows the at-risk badge and its reason', () => {
    render(
      <StaffCard
        group={{ ...group, atRisk: true, atRiskReason: AtRiskReason.NO_COORDINATOR }}
        candidates={candidates}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('tasks.atRisk')).toBeInTheDocument();
    expect(screen.getByText('tasks.atRiskReason.NO_COORDINATOR')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter client exec vitest run staff-card open-tasks-card --no-file-parallelism`
Expected: FAIL — both imports unresolved.

- [ ] **Step 3: Write the two components**

Read `teacher-card.tsx` and `readiness-panel.tsx` in the same folder first and reuse their card shell and control imports. Then create `open-tasks-card.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import type { ITask } from '@/lib/types/academics/academics';

export function OpenTasksCard({ tasks, isLoading }: { tasks: ITask[]; isLoading: boolean }) {
  const t = useTranslations('Academics');
  const locale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tasks.openTasks')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground">{t('tasks.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">{t(`readiness.${task.readinessKey}`)}</p>
                  <p className="text-muted-foreground text-sm">
                    {t('tasks.due', { date: new Date(task.dueAt).toLocaleString(locale) })}
                  </p>
                </div>
                <Badge variant="outline">{t(`tasks.level.${task.escalationLevel}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

Create `staff-card.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { AtRiskReason, Roles } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';

export interface StaffCandidate {
  _id: string;
  firstName: string;
  lastName: string;
  roleName: string;
  additionalRoles: string[];
}

export interface StaffCardGroup {
  coordinatorId: string | null;
  supervisorId: string | null;
  atRisk: boolean;
  atRiskReason: AtRiskReason | null;
}

const UNASSIGNED = '__none__';
const holds = (user: StaffCandidate, role: Roles) => user.roleName === role || user.additionalRoles.includes(role);

export function StaffCard({
  group,
  candidates,
  onChange,
}: {
  group: StaffCardGroup;
  candidates: StaffCandidate[];
  onChange: (patch: { coordinatorId?: string | null; supervisorId?: string | null }) => void;
}) {
  const t = useTranslations('Academics');

  const seat = (
    label: string,
    role: Roles,
    current: string | null,
    emit: (value: string | null) => { coordinatorId?: string | null; supervisorId?: string | null }
  ) => {
    const options = candidates.filter((user) => holds(user, role));
    const assigned = options.find((user) => user._id === current);
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">
          {assigned ? `${assigned.firstName} ${assigned.lastName}` : t('tasks.unassigned')}
        </p>
        <Select
          value={current ?? UNASSIGNED}
          onValueChange={(value) => onChange(emit(value === UNASSIGNED ? null : value))}
        >
          <SelectTrigger aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>{t('tasks.unassigned')}</SelectItem>
            {options.map((user) => (
              <SelectItem key={user._id} value={user._id}>
                {`${user.firstName} ${user.lastName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t('tasks.openTasks')}</CardTitle>
        {group.atRisk ? (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{t('tasks.atRisk')}</Badge>
            {group.atRiskReason ? (
              <span className="text-muted-foreground text-sm">{t(`tasks.atRiskReason.${group.atRiskReason}`)}</span>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {seat(t('tasks.coordinator'), Roles.COORDINATOR, group.coordinatorId, (value) => ({ coordinatorId: value }))}
        {seat(t('tasks.supervisor'), Roles.SUPERVISOR, group.supervisorId, (value) => ({ supervisorId: value }))}
      </CardContent>
    </Card>
  );
}
```

The card title for `StaffCard` must be its own key, not `tasks.openTasks`: add `"staff": "Staff"` / `"الطاقم"` to the `tasks` block in both catalogues and use `t('tasks.staff')` here. Check the real `Select` and `Badge` import paths and the `variant` names available in `apps/client/src/components/atoms/` before writing, and reuse whatever `teacher-card.tsx` already uses for its candidate picker.

- [ ] **Step 4: Wire them into the formation screen**

In `group-formation-screen.tsx`, render `<StaffCard …>` next to the existing `TeacherCard`, wiring `onChange` to the group update mutation the screen already uses for `meetingLink`. Render `<OpenTasksCard tasks={tasks} isLoading={isLoading} />` using `useGroupTasks(groupId)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter client exec vitest run staff-card open-tasks-card --no-file-parallelism`
Expected: PASS — 3 + 4 tests.

- [ ] **Step 6: Lint, i18n, commit**

```bash
pnpm --filter client i18n:check-keys
git add apps/client
git commit -m "feat(sp3): show staff seats, the at-risk badge and open tasks on the group screen"
```

Lint the four touched files by name with `pnpm --filter client exec eslint <paths>` before committing.

---

### Task 14: At-risk filter on the groups list

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/__components/groups-manager.tsx`
- Modify: `apps/server/src/academics/group/dto/group.dto.ts`
- Modify: `apps/server/src/academics/group/group.service.ts`
- Test: `apps/server/src/academics/group/group-at-risk-filter.spec.ts`

**Interfaces:**
- Consumes: the `atRisk` field (Task 3), `GroupQuery.atRisk` (Task 11).
- Produces: `FindGroupsPayload` accepts `atRisk?: boolean`, and `GroupService.findAll` adds `atRisk: true` to the filter when asked.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/group/group-at-risk-filter.spec.ts`:

```ts
import { buildGroupFilter } from './group-filter';

describe('buildGroupFilter atRisk', () => {
  it('leaves the filter alone when atRisk is not asked for', () => {
    expect(buildGroupFilter({})).not.toHaveProperty('atRisk');
  });

  it('matches only flagged groups when atRisk is true', () => {
    expect(buildGroupFilter({ atRisk: true }).atRisk).toBe(true);
  });

  it('matches only healthy groups when atRisk is false', () => {
    expect(buildGroupFilter({ atRisk: false }).atRisk).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest group-at-risk-filter --runInBand`
Expected: FAIL — `Cannot find module './group-filter'`.

- [ ] **Step 3: Extract and extend the filter builder**

`GroupService.findAll` already builds a Mongo filter from `FindGroupsPayload`. Move that construction into a new pure `apps/server/src/academics/group/group-filter.ts` exporting `buildGroupFilter(query: FindGroupsPayload): FilterQuery<Group>`, have `findAll` call it, and add this line inside it:

```ts
  if (query.atRisk !== undefined) filter.atRisk = query.atRisk;
```

Add `@IsOptional() @IsBoolean() atRisk?: boolean;` to `FindGroupsPayload`, importing `IsBoolean` from `class-validator` if it is not already imported. Move only the filter construction — not the pagination or the scoping — so `findAll`'s behaviour is unchanged for every existing test.

- [ ] **Step 4: Report the open-task count on the group**

The spec §6 says group responses carry `atRisk` and the count of open tasks. `atRisk` rides along on the document; the count does not. In `apps/server/src/academics/group/group.types.ts`, add `openTaskCount: number;` to `GroupView`. In `GroupStateService.toView`, the count is not available synchronously, so add a second method beside it:

```ts
  /** Attaches the open pre-start task count the groups list and the formation screen show. */
  async toViewWithTasks(group: GroupLean): Promise<GroupView> {
    const openTaskCount = await this.taskModel.countDocuments({ groupId: group._id, status: TaskStatus.OPEN }).exec();
    return { ...this.toView(group), openTaskCount };
  }
```

Inject `@InjectModel(Task.name) private readonly taskModel: Model<Task>` into `GroupStateService`, and give `toView` a `openTaskCount: 0` default so every existing caller still type-checks. Then have `GroupService.findOne` and `findAll` use `toViewWithTasks`. For `findAll`, count in one pass rather than per group:

```ts
    const counts = await this.taskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { groupId: { $in: groups.map((group) => group._id) }, status: TaskStatus.OPEN } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]);
    const byGroup = new Map(counts.map((row) => [String(row._id), row.count]));
```

and set `openTaskCount: byGroup.get(String(group._id)) ?? 0` on each view. Add `openTaskCount: number` to the client `IGroup` interface too.

Add one test to `apps/server/src/academics/group/group-at-risk-filter.spec.ts`:

```ts
describe('open task count', () => {
  it('reports zero for a group with no open tasks', () => {
    const counts = new Map<string, number>();
    expect(counts.get('g1') ?? 0).toBe(0);
  });
});
```

That placeholder assertion is not worth keeping — instead add the real test to `group.service.spec.ts`, asserting that `findAll` returns `openTaskCount: 2` when the aggregate double resolves `[{ _id: groupId, count: 2 }]`, and `0` for a group absent from that result. Follow the doubles that spec file already builds.

- [ ] **Step 5: Add the client toggle**

In `groups-manager.tsx`, add an at-risk toggle beside the existing status filter. Read the file first and match how its status filter stores state and feeds `useGroups`; the shape is:

```tsx
const [atRisk, setAtRisk] = useState(false);
const { data: groups = [], isLoading } = useGroups({ ...query, atRisk: atRisk || undefined });
```

and in the filter row:

```tsx
<label className="flex items-center gap-2 text-sm">
  <Checkbox checked={atRisk} onCheckedChange={(value) => setAtRisk(value === true)} />
  {t('tasks.atRisk')}
</label>
```

`atRisk || undefined` matters: sending `false` would hide every flagged group instead of showing all of them. Check the real `Checkbox` import path in `apps/client/src/components/atoms/`; if the repo has no checkbox atom, use the same control the status filter uses.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest src/academics/group --runInBand`
Expected: PASS — 3 new filter tests, every existing group suite green.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/academics/group/group-filter.ts src/academics/group/group-at-risk-filter.spec.ts src/academics/group/group.service.ts src/academics/group/dto/group.dto.ts
pnpm --filter client exec eslint "src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/__components/groups-manager.tsx"
git add apps/server/src/academics/group apps/client/src
git commit -m "feat(sp3): filter the groups list by at-risk"
```

---

### Task 15: Whole sub-project verification

**Files:** none created. This task proves the branch.

**Interfaces:**
- Consumes: everything above.
- Produces: the evidence for the ledger.

- [ ] **Step 1: Run the full server suite**

Run: `pnpm --filter server exec jest --runInBand`
Expected: every new suite passes. Sub-project 2 finished with a known baseline of pre-existing failures (`role.controller.spec.ts` and the broader set recorded in that sub-project's ledger). Compare the failure set against that baseline and list any **new** failure by name. A new failure means this task is not done.

- [ ] **Step 2: Run the full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: all green, including the 13 new tests from Tasks 11 to 13.

- [ ] **Step 3: Type-check both apps**

Run: `pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json`
Expected: 0 errors.

Run: `pnpm --filter client tsc --noEmit`
Expected: the 5 baseline errors only, with no new ones.

- [ ] **Step 4: Check the translations**

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 5: Confirm the indexes exist**

With the server running against the development database, confirm in `mongosh` or Compass that the `tasks` collection carries `one_open_task_per_group_item` as a unique partial index. Mongoose builds it on first use of the model, so hit `academics.tasks.listMine` once first. Record what you saw.

- [ ] **Step 6: Walk the golden path in the browser**

With `pnpm dev` running, as an owner: create a cohort starting in 5 days, create a group in it with no meeting link, assign a coordinator and a supervisor, then wait for one sweep (or trigger it by restarting the server, which upserts the scheduler and runs within 15 minutes). Confirm a task appears on **My tasks** for the coordinator, naming the group and the meeting-link item. Set the meeting link on the group and confirm the task disappears. Record the result; if no dev server is available in your context, say so explicitly rather than claiming the walk passed.

- [ ] **Step 7: Ledger the result**

No commit is needed if the previous tasks left the tree clean. If step 1 or 2 surfaced a fix, make it with a test that fails first, then commit.
