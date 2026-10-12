# MVP Sub-project 2: Sessions, Attendance & Reports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a ready group is started, generate all its sessions; let the teacher record attendance and submit a per-student report; auto-advance session and group statuses; let the coordinator record each student's first-session follow-up.

**Architecture:** Extends the sub-project 1 `academics` module in the existing NestJS + Mongoose server (NATS message patterns, CASL permissions, thin services over pure domain functions) and the Next.js client (server actions → react-query hooks → pages). Sessions are pre-generated rows (`Session`) created in one transaction when a group starts; a pure function `generateSessions` does all date maths with `luxon`. Session status is derived on read (`effectiveSessionStatus`) and persisted by a 5-minute BullMQ repeatable sweep.

**Tech Stack:** NestJS 11, Mongoose 8 (transactions), `@nestjs/bullmq` / `bullmq` 5, `luxon` 3.7.2, class-validator, Jest (server); Next 16, next-intl, react-query, Vitest + Testing Library (client); `@darnozom/shared-types` (Vitest).

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp2-sessions-attendance-reports-design.md` (depends on SP1: `docs/superpowers/specs/2026-10-11-mvp-sp1-core-entities-group-formation-design.md`)

## Global Constraints

- **Scope authority:** only what the spec lists. No live board, "I'm ready" button, make-up sessions, rescheduling, video monitoring, supervisor evaluations, pre-start tasks. Do not invent extra statuses, approvals or workflow steps.
- **Transport:** the client talks to the server ONLY through NATS message patterns (`createAuthorizedNatsRequest`). The spec's REST paths map to patterns named `academics.<area>.<action>` (see Task 11). Handlers use `@MessagePattern`, `@RequirePermissionsGuard({ action, subject })`, `@Payload(new RpcValidationPipe())`, `@Ctx() context: IUserContext`, class-level `@ApplyRpcErrorHandling`.
- **CASL:** `CaslAbilityFactory` expands `MANAGE` into concrete actions and never grants MANAGE itself, so a required permission is always `CREATE | READ | UPDATE | DELETE`. The spec's "MANAGE GROUP" therefore means `UPDATE GROUP` on the handler; roles are seeded with `MANAGE`.
- **Organization scope:** every staff query filters by `organizationId`; families and teachers are scoped by membership / `teacherId` exactly as in SP1 (`resolveGroupScope`).
- **Status enums / constants (verbatim from the spec):** group statuses `FORMING, READY_TO_START, RUNNING, COMPLETED, CANCELLED`; session statuses `SCHEDULED, REPORT_PENDING, COMPLETED, CANCELLED`; follow-up decisions `CONTINUE, WITHDRAW`; student statuses `ACTIVE, WITHDRAWN`; scores integers 1–5; `totalSessions` integer 1–500; attendance opens 15 minutes before `startsAt`; report editable for 24 hours; sweep every 5 minutes.
- **Attendance enum:** reuse the existing shared `AttendanceStatus` (PRESENT, LATE, EXCUSED, ABSENT).
- **Errors:** shared-types string enums (spread into `ALL_ERROR_KEYS`), each with `errors.<key>` in `en.json` and `ar.json`.
- **Client:** UI strings via next-intl in `Academics.*` (en + ar, kept in parity by `pnpm --filter client run i18n:check-keys`); no raw keys on screen.
- **Tests:** Jest for server (mocked models, `mockQuery` helper from `__test__/academics/mock-query.ts`, every query ends in `.exec()`); Vitest for shared-types and client. Server Jest maps `@darnozom/shared-types` to its source; the client needs `pnpm --filter @darnozom/shared-types run build` after shared-types changes.
- **Resource rule (user feedback):** run ONE heavy node process at a time. Run targeted test files, never `nx run-many`; jest with `--runInBand`, vitest with `--no-file-parallelism`; never leave dev servers or background test runs going. Run the full server/client suites once, in the foreground, in the last task.
- **Line endings / files:** files containing backslashes are written with the Write tool (Git-Bash heredocs collapse them). Apply scripted edits with Python and `newline=''` so CRLF files stay consistent; `eslint --fix` normalises afterwards.
- **`@nestjs/mapped-types` is ESM-only** and cannot load under Jest: do not import it from anything a Jest test loads. New update DTOs are explicit classes using `OptionalNonNull` (`src/academics/common/optional-non-null.ts`), never `PartialType`. A spec that must import `user.controller.message.ts`/old DTOs stubs the module with `jest.mock('@nestjs/mapped-types', ...)` as `group.dto.spec.ts` did.

## Rulings (plan deviations from, or fills for, spec silence)

- **R1 — Patterns, not REST.** Spec §6 paths become NATS patterns (Task 11). `PATCH` report = `academics.sessions.editReport`.
- **R2 — New subject `SESSION`.** Teachers must read/update sessions without holding `UPDATE GROUP`. `INSTRUCTOR` gets `READ SESSION` + `UPDATE SESSION` (ownership enforced in the service). `COORDINATOR` and `MANAGER` get `MANAGE SESSION`. `SUPERVISOR`, `ACCOUNTANT`, `PARENT`, `STUDENT` get `READ SESSION`. Start, cancel, teacher-attendance and follow-ups require `UPDATE GROUP` (the spec's "MANAGE GROUP").
- **R3 — "the group's supervisor" (teacher attendance).** There is no supervisor-to-group link before sub-project 5. Teacher attendance requires `UPDATE GROUP` only; sub-project 5 widens it.
- **R4 — Running-group locks.** While `RUNNING`: schedule / timezone / `totalSessions` changes → `409 GROUP_RUNNING_SCHEDULE_LOCKED` (only when the value actually changes, so saving other fields from a form that always posts the schedule still works); assigning or unassigning the teacher → `409 GROUP_RUNNING_TEACHER_LOCKED` (sessions copy `teacherId`; reassignment is rescheduling-adjacent and out of MVP). Cancelling or marking-ready a `RUNNING`/`COMPLETED` group → `INVALID_STATUS_TRANSITION` / `GROUP_COMPLETED`. `COMPLETED` groups are read-only (`GROUP_COMPLETED`).
- **R5 — `isScheduleChange` also gates the teacher-fit re-check** (SP1 deferred minor: every save re-ran it).
- **R6 — Adding students to a `RUNNING` group** is allowed (spec silent); they simply have no record for earlier sessions. A `WITHDRAWN` student cannot be re-added (`STUDENT_ALREADY_IN_GROUP`).
- **R7 — Families never receive the report `summary`** (it is about the whole class); they receive only their own child's attendance row and evaluation. Accountants receive attendance without notes, and `report` reduced to `{ submittedBy, submittedAt, evaluations: [] }`. A user who is the session's teacher always gets the full view of their own session.
- **R8 — Report `PATCH` window** is measured from `report.submittedAt` and is not extended by edits.
- **R9 — Follow-up decision is not reversible from the UI:** setting `CONTINUE` after `WITHDRAW` does not re-activate the student (re-adding is a SP1 operation and a `WITHDRAWN` student cannot be re-added, R6).
- **R10 — Stacked cards, not tabs,** on the group page for sessions and follow-ups (the formation screen is already a card grid).
- **R11 — Default `totalSessions` in the new-group form is 12** (an editable starting value; the field is required and 1–500).
- **R12 — Running/completed groups hide the readiness panel and the cancel button** (the server refuses both transitions, R4); the teacher card is disabled while running.

## Review Focus

1. **Daylight saving inside a group's run.** A weekly Sunday 10:00 `America/New_York` group crossing 2026-11-01 must keep local 10:00 (UTC 14:00 → 15:00) and `endsAt = startsAt + duration`. Test: Task 2, "applies each date's own UTC offset across a DST change".
2. **Two coordinators click "Start group" together / start twice.** Exactly one set of sessions must exist (conditional `READY_TO_START → RUNNING` update inside the transaction plus the unique `{groupId, sequence}` index). Test: Task 5, "does not create sessions when the group is no longer READY_TO_START".
3. **A parent opens a session list / detail.** Never another child's attendance row or evaluation, never `summary`; an accountant never sees evaluations or notes. Tests: Task 3 "redactSession" cases and Task 6 "parent receives only their own child's rows".
4. **Withdrawn students.** Not counted for capacity, readiness, required attendance or required evaluations, but their history survives. Tests: Task 4 (readiness / capacity / removal) and Task 7 / Task 9 ("ignores withdrawn students").
5. **Report timing.** A report cannot be submitted before the class starts, cannot be submitted twice, and cannot be edited after 24 hours or by anyone but the session's teacher. Tests: Task 3 "checkReportOpen / checkReportEditable" and Task 9 "rejects a second submission" / "rejects edits by staff".

---

### Task 1: Shared types, errors, SESSION subject, role seeds, error translations

**Files:**
- Modify: `lib/shared-types/src/lib/types/academics/academics.types.ts`
- Modify: `lib/shared-types/src/lib/messages/academics-errors.enum.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Modify: `apps/server/src/role/seeds/role.instructor.config.ts`, `role.coordinator.config.ts`, `role.manager.config.ts`, `role.supervisor.config.ts`, `role.accountant.config.ts`, `role.parent.config.ts`, `role.student.config.ts`
- Modify: `apps/server/src/role/seeds/roles.config.spec.ts`
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json` (`errors.*` only)

**Interfaces:**
- Produces (shared-types): `GroupStatus.RUNNING`, `GroupStatus.COMPLETED`; `GroupStudentStatus {ACTIVE, WITHDRAWN}`; `SessionStatus {SCHEDULED, REPORT_PENDING, COMPLETED, CANCELLED}`; `FollowUpDecision {CONTINUE, WITHDRAW}`; constants `SESSION_SCORE_MIN = 1`, `SESSION_SCORE_MAX = 5`, `TOTAL_SESSIONS_MAX = 500`, `ATTENDANCE_OPEN_MINUTES_BEFORE = 15`, `REPORT_EDIT_WINDOW_HOURS = 24`; `Subjects.SESSION`; new `AcademicsErrors` members (listed in Step 3).

- [ ] **Step 1: Write the failing role test**

In `apps/server/src/role/seeds/roles.config.spec.ts`, inside the top-level `describe('ROLE_SEED_DEFINITIONS', ...)`, before its closing `});`, add:

```ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter server exec jest roles.config --runInBand`
Expected: FAIL — TypeScript error `Property 'SESSION' does not exist on type 'typeof Subjects'`.

- [ ] **Step 3: Add the shared types, subject and errors**

`lib/shared-types/src/lib/types/academics/academics.types.ts` — replace the `GroupStatus` enum and add the new enums/constants right after `GroupPaymentStatus`:

```ts
export enum GroupStatus {
  FORMING = 'FORMING',
  READY_TO_START = 'READY_TO_START',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum GroupPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export enum GroupStudentStatus {
  ACTIVE = 'ACTIVE',
  WITHDRAWN = 'WITHDRAWN',
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  REPORT_PENDING = 'REPORT_PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum FollowUpDecision {
  CONTINUE = 'CONTINUE',
  WITHDRAW = 'WITHDRAW',
}

export const SESSION_SCORE_MIN = 1;
export const SESSION_SCORE_MAX = 5;
export const TOTAL_SESSIONS_MAX = 500;
/** Teachers/staff may record attendance from this many minutes before a session starts. */
export const ATTENDANCE_OPEN_MINUTES_BEFORE = 15;
/** A submitted report stays editable by its teacher for this many hours. */
export const REPORT_EDIT_WINDOW_HOURS = 24;
```

`lib/shared-types/src/lib/types/role/subject/subjects.enum.ts` — directly after the line `  GROUP_PAYMENT_STATUS = 'GROUP_PAYMENT_STATUS',` add one line:

```ts
  SESSION = 'SESSION',
```

`lib/shared-types/src/lib/messages/academics-errors.enum.ts` — inside `AcademicsErrors`, after `USER_NOT_FOUND_IN_ORGANIZATION`, add:

```ts
  GROUP_COMPLETED = 'groupCompleted',
  GROUP_TOTAL_SESSIONS_REQUIRED = 'groupTotalSessionsRequired',
  GROUP_RUNNING_SCHEDULE_LOCKED = 'groupRunningScheduleLocked',
  GROUP_RUNNING_TEACHER_LOCKED = 'groupRunningTeacherLocked',
  SESSION_NOT_FOUND = 'sessionNotFound',
  SESSION_CANCEL_NOT_ALLOWED = 'sessionCancelNotAllowed',
  NOT_SESSION_TEACHER = 'notSessionTeacher',
  ATTENDANCE_NOT_OPEN = 'attendanceNotOpen',
  ATTENDANCE_CLOSED = 'attendanceClosed',
  ATTENDANCE_STUDENT_INVALID = 'attendanceStudentInvalid',
  ATTENDANCE_INCOMPLETE = 'attendanceIncomplete',
  REPORT_NOT_OPEN = 'reportNotOpen',
  REPORT_ALREADY_SUBMITTED = 'reportAlreadySubmitted',
  REPORT_NOT_SUBMITTED = 'reportNotSubmitted',
  REPORT_EDIT_WINDOW_CLOSED = 'reportEditWindowClosed',
  REPORT_INVALID = 'reportInvalid',
  FOLLOW_UP_NOT_FOUND = 'followUpNotFound',
```

(`AcademicsErrors` is already spread into `ALL_ERROR_KEYS`; no change to `messages/index.ts`.)

- [ ] **Step 4: Seed the SESSION permissions**

Create `.superpowers/sp2-role-seeds.py` (scratch, not committed) and run it with `python .superpowers/sp2-role-seeds.py`:

```python
import io

SEEDS = 'apps/server/src/role/seeds/'

def add_after(file, anchor, new_line):
    p = SEEDS + file
    s = io.open(p, encoding='utf8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    assert s.count(anchor) == 1, (file, anchor, s.count(anchor))
    s = s.replace(anchor, anchor + nl + new_line)
    io.open(p, 'w', encoding='utf8', newline='').write(s)

read = '  { action: Actions.READ, subject: Subjects.SESSION },'
add_after('role.instructor.config.ts', '  { action: Actions.MANAGE, subject: Subjects.TEACHER_AVAILABILITY },',
          read + '\n  { action: Actions.UPDATE, subject: Subjects.SESSION },')
add_after('role.coordinator.config.ts', '  { action: Actions.MANAGE, subject: Subjects.GROUP },',
          '  { action: Actions.MANAGE, subject: Subjects.SESSION },')
add_after('role.manager.config.ts', '  { action: Actions.MANAGE, subject: Subjects.GROUP_PAYMENT_STATUS },',
          '  { action: Actions.MANAGE, subject: Subjects.SESSION },')
for f in ['role.supervisor.config.ts', 'role.accountant.config.ts', 'role.parent.config.ts', 'role.student.config.ts']:
    add_after(f, '  { action: Actions.READ, subject: Subjects.GROUP },', read)
print('ok')
```

Expected: prints `ok`. If an `assert` fires, open that seed file, find the equivalent last `GROUP` line, and adjust the anchor (the intent: append the SESSION rule(s) to that role's permission array).

- [ ] **Step 5: Add the error translations**

Create `.superpowers/i18n-sp2-errors.cjs` (scratch) and run `node .superpowers/i18n-sp2-errors.cjs`:

```js
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'apps', 'client', 'messages');

const errors = {
  en: {
    groupCompleted: 'This group has completed and can no longer be changed.',
    groupTotalSessionsRequired: 'Set the number of sessions for this group before starting it.',
    groupRunningScheduleLocked: "While the group is running, its schedule, time zone and number of sessions can't be changed.",
    groupRunningTeacherLocked: "While the group is running, its teacher can't be changed.",
    sessionNotFound: 'Session not found.',
    sessionCancelNotAllowed: 'Only a session that has not ended yet can be cancelled.',
    notSessionTeacher: "Only this session's teacher can do that.",
    attendanceNotOpen: 'Attendance opens 15 minutes before the session starts.',
    attendanceClosed: 'Attendance is closed for this session.',
    attendanceStudentInvalid: 'Attendance can only be recorded once for each active student of this group.',
    attendanceIncomplete: 'Record attendance for every active student before submitting the report.',
    reportNotOpen: 'The report can be submitted once the session has started.',
    reportAlreadySubmitted: 'The report for this session was already submitted.',
    reportNotSubmitted: 'This session has no report yet.',
    reportEditWindowClosed: 'The report can only be edited within 24 hours of submitting it.',
    reportInvalid: 'The report needs one evaluation per active student, with every score from 1 to 5.',
    followUpNotFound: 'Follow-up not found.',
  },
  ar: {
    groupCompleted: 'اكتملت هذه المجموعة ولم يعد بالإمكان تعديلها.',
    groupTotalSessionsRequired: 'حدّد عدد الجلسات لهذه المجموعة قبل بدئها.',
    groupRunningScheduleLocked: 'لا يمكن تغيير الجدول أو المنطقة الزمنية أو عدد الجلسات أثناء سير المجموعة.',
    groupRunningTeacherLocked: 'لا يمكن تغيير معلم المجموعة أثناء سيرها.',
    sessionNotFound: 'الجلسة غير موجودة.',
    sessionCancelNotAllowed: 'يمكن إلغاء الجلسة التي لم تنتهِ بعد فقط.',
    notSessionTeacher: 'معلم هذه الجلسة وحده يمكنه تنفيذ ذلك.',
    attendanceNotOpen: 'يُفتح الحضور قبل بدء الجلسة بـ 15 دقيقة.',
    attendanceClosed: 'تم إغلاق الحضور لهذه الجلسة.',
    attendanceStudentInvalid: 'يمكن تسجيل الحضور مرة واحدة فقط لكل طالب نشط في هذه المجموعة.',
    attendanceIncomplete: 'سجّل حضور كل طالب نشط قبل إرسال التقرير.',
    reportNotOpen: 'يمكن إرسال التقرير بعد بدء الجلسة.',
    reportAlreadySubmitted: 'تم إرسال تقرير هذه الجلسة مسبقًا.',
    reportNotSubmitted: 'لا يوجد تقرير لهذه الجلسة بعد.',
    reportEditWindowClosed: 'يمكن تعديل التقرير خلال 24 ساعة من إرساله فقط.',
    reportInvalid: 'يتطلب التقرير تقييمًا واحدًا لكل طالب نشط، بدرجات من 1 إلى 5.',
    followUpNotFound: 'المتابعة غير موجودة.',
  },
};

for (const lang of ['en', 'ar']) {
  const file = path.join(dir, `${lang}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of Object.keys(errors[lang])) {
    if (json.errors[key] !== undefined) throw new Error(`errors.${key} already exists in ${lang}.json`);
  }
  Object.assign(json.errors, errors[lang]);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(lang, 'ok');
}
```

Expected: prints `en ok` and `ar ok`.

- [ ] **Step 6: Run the tests and the key check**

Run, one after another:
- `pnpm --filter server exec jest roles.config --runInBand` → Expected: PASS (all cases including the new one).
- `pnpm --filter @darnozom/shared-types exec vitest run --no-file-parallelism` → Expected: PASS (existing 23).
- `pnpm --filter @darnozom/shared-types run build` → Expected: exit 0 (client needs the new exports).
- `pnpm --filter client run i18n:check-keys` → Expected: exit 0, "en/ar message structures match".

- [ ] **Step 7: Commit**

```bash
git add lib/shared-types/src apps/server/src/role/seeds apps/client/messages
git commit -m "feat(shared-types): session statuses, SESSION subject, role seeds and error keys"
```

---

### Task 2: `generateSessions` (pure)

**Files:**
- Create: `apps/server/src/academics/domain/session-generation.ts`
- Test: `apps/server/src/academics/domain/session-generation.spec.ts`

**Interfaces:**
- Consumes: `ScheduleSlot` from shared-types (`{ dayOfWeek: 0..6 (0 = Sunday), startTime: 'HH:mm', durationMinutes }`).
- Produces: `interface GeneratedSession { sequence: number; startsAt: Date; endsAt: Date }` and `generateSessions(schedule: ScheduleSlot[], timezone: string, startDate: Date, totalSessions: number): GeneratedSession[]`. `startDate` is the cohort's stored date; its **UTC** year/month/day is taken as the first local calendar date in `timezone`.

- [ ] **Step 1: Write the failing tests**

```ts
import { generateSessions } from './session-generation';

const at = (iso: string) => new Date(iso);
const starts = (list: { startsAt: Date }[]) => list.map((s) => s.startsAt.toISOString());

describe('generateSessions', () => {
  it('generates one session per weekly slot, in order, from the start date', () => {
    const result = generateSessions(
      [
        { dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 },
        { dayOfWeek: 4, startTime: '17:00', durationMinutes: 90 },
      ],
      'Asia/Riyadh',
      at('2026-10-12T00:00:00.000Z'), // a Monday
      3
    );
    expect(starts(result)).toEqual(['2026-10-12T14:00:00.000Z', '2026-10-15T14:00:00.000Z', '2026-10-19T14:00:00.000Z']);
    expect(result.map((s) => s.sequence)).toEqual([1, 2, 3]);
    expect(result[1].endsAt.toISOString()).toBe('2026-10-15T15:30:00.000Z');
  });

  it('starts at the first matching weekday when the start date is mid-week', () => {
    const result = generateSessions(
      [
        { dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 },
        { dayOfWeek: 4, startTime: '17:00', durationMinutes: 60 },
      ],
      'Asia/Riyadh',
      at('2026-10-14T00:00:00.000Z'), // a Wednesday
      2
    );
    expect(starts(result)).toEqual(['2026-10-15T14:00:00.000Z', '2026-10-19T14:00:00.000Z']);
  });

  it('orders several slots on the same day by start time and stops exactly at totalSessions', () => {
    const result = generateSessions(
      [
        { dayOfWeek: 1, startTime: '18:00', durationMinutes: 60 },
        { dayOfWeek: 1, startTime: '09:00', durationMinutes: 60 },
      ],
      'UTC',
      at('2026-10-12T00:00:00.000Z'),
      3
    );
    expect(starts(result)).toEqual(['2026-10-12T09:00:00.000Z', '2026-10-12T18:00:00.000Z', '2026-10-19T09:00:00.000Z']);
  });

  it('applies each date\'s own UTC offset across a DST change', () => {
    const result = generateSessions(
      [{ dayOfWeek: 0, startTime: '10:00', durationMinutes: 60 }],
      'America/New_York',
      at('2026-10-25T00:00:00.000Z'), // Sunday; DST ends Sunday 2026-11-01
      3
    );
    expect(starts(result)).toEqual(['2026-10-25T14:00:00.000Z', '2026-11-01T15:00:00.000Z', '2026-11-08T15:00:00.000Z']);
    expect(result[1].endsAt.toISOString()).toBe('2026-11-01T16:00:00.000Z');
  });

  it('treats the start date as a calendar date in the group timezone, not a UTC instant', () => {
    // 2026-10-12T00:00Z is still Sunday evening in New York, but the cohort date means "12 October".
    const result = generateSessions([{ dayOfWeek: 1, startTime: '09:00', durationMinutes: 60 }], 'America/New_York', at('2026-10-12T00:00:00.000Z'), 1);
    expect(starts(result)).toEqual(['2026-10-12T13:00:00.000Z']);
  });

  it('returns nothing for an empty schedule or a non-positive count', () => {
    expect(generateSessions([], 'UTC', at('2026-10-12T00:00:00.000Z'), 5)).toEqual([]);
    expect(generateSessions([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }], 'UTC', at('2026-10-12T00:00:00.000Z'), 0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-generation --runInBand`
Expected: FAIL — `Cannot find module './session-generation'`.

- [ ] **Step 3: Implement**

```ts
import { DateTime } from 'luxon';
import { ScheduleSlot } from '@darnozom/shared-types';

export interface GeneratedSession {
  sequence: number;
  startsAt: Date;
  endsAt: Date;
}

/**
 * Walks forward from startDate (its UTC calendar date, read as a local date in `timezone`),
 * emitting each weekday's slots in start-time order until totalSessions exist.
 * Each local time is converted with its own date's UTC offset, so daylight saving is respected.
 */
export function generateSessions(schedule: ScheduleSlot[], timezone: string, startDate: Date, totalSessions: number): GeneratedSession[] {
  if (schedule.length === 0 || totalSessions < 1) return [];

  const slotsByDay = new Map<number, ScheduleSlot[]>();
  for (const slot of schedule) {
    const list = slotsByDay.get(slot.dayOfWeek) ?? [];
    list.push(slot);
    slotsByDay.set(slot.dayOfWeek, list);
  }
  for (const list of slotsByDay.values()) {
    // eslint-disable-next-line unicorn/no-array-sort -- sorting a local list we own
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const first = DateTime.fromObject({ year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() }, { zone: timezone });
  const result: GeneratedSession[] = [];
  // Every week has at least one slot, so totalSessions weeks always suffice.
  const maxDays = totalSessions * 7 + 7;
  for (let offset = 0; offset < maxDays && result.length < totalSessions; offset++) {
    const day = first.plus({ days: offset });
    for (const slot of slotsByDay.get(day.weekday % 7) ?? []) {
      if (result.length >= totalSessions) break;
      const [hour, minute] = slot.startTime.split(':').map(Number);
      const startsAt = day.set({ hour, minute, second: 0, millisecond: 0 }).toUTC();
      result.push({ sequence: result.length + 1, startsAt: startsAt.toJSDate(), endsAt: startsAt.plus({ minutes: slot.durationMinutes }).toJSDate() });
    }
  }
  return result;
}
```

(luxon `weekday` is 1 = Monday … 7 = Sunday, so `% 7` maps Sunday to 0 like `ScheduleSlot.dayOfWeek`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest session-generation --runInBand`
Expected: PASS, 6 tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/domain/session-generation.ts src/academics/domain/session-generation.spec.ts
git add apps/server/src/academics/domain/session-generation.ts apps/server/src/academics/domain/session-generation.spec.ts
git commit -m "feat(academics): generateSessions pure function with DST-aware slots"
```

---

### Task 3: Session rules, scope and redaction (pure)

**Files:**
- Create: `apps/server/src/academics/domain/session-rules.ts`, `apps/server/src/academics/domain/session-scope.ts`
- Test: `apps/server/src/academics/domain/session-rules.spec.ts`, `apps/server/src/academics/domain/session-scope.spec.ts`

**Interfaces:**
- Consumes: shared-types `AcademicsErrors`, `AttendanceStatus`, `SessionStatus`, constants from Task 1; `resolveGroupScope`/`GroupScope` from `group-scope.ts`.
- Produces (`session-rules.ts`):
  - `effectiveSessionStatus(session: { status: SessionStatus; endsAt: Date }, now: Date): SessionStatus`
  - `checkAttendanceWindow(session: { status: SessionStatus; startsAt: Date }, now: Date): AcademicsErrors | null`
  - `checkReportOpen(session: { status: SessionStatus; startsAt: Date }, now: Date): AcademicsErrors | null`
  - `checkReportEditable(session: { status: SessionStatus; report?: { submittedAt: Date } | null }, now: Date): AcademicsErrors | null`
  - `missingAttendance(requiredIds: string[], attendance: { studentId: unknown }[]): string[]`
  - `interface EvaluationInput { studentId: string; participation: number; understanding: number; behavior: number; homework: number }`
  - `validateEvaluations(requiredIds: string[], allowedIds: string[], evaluations: EvaluationInput[]): AcademicsErrors | null`
  - `statusFilterFor(status: SessionStatus, now: Date): Record<string, unknown>`
  - `type SessionAudience = 'STAFF' | 'ACCOUNTANT' | 'FAMILY'`
  - `redactSession<T extends RedactableSession>(session: T, audience: SessionAudience, visibleStudentIds: string[] | null): T`
- Produces (`session-scope.ts`): `type SessionScope = { kind: 'ORG'; audience: 'STAFF' | 'ACCOUNTANT' } | { kind: 'TEACHER'; teacherId: string } | { kind: 'PARENT'; parentId: string } | { kind: 'STUDENT'; studentId: string } | { kind: 'NONE' }` and `resolveSessionScope(actor): SessionScope`.

- [ ] **Step 1: Write the failing tests**

`session-rules.spec.ts`:

```ts
import { AcademicsErrors, AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import {
  checkAttendanceWindow,
  checkReportEditable,
  checkReportOpen,
  effectiveSessionStatus,
  missingAttendance,
  redactSession,
  statusFilterFor,
  validateEvaluations,
} from './session-rules';

const T0 = new Date('2026-10-12T14:00:00.000Z');
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);
const hours = (n: number) => minutes(n * 60);

describe('effectiveSessionStatus', () => {
  const session = (status: SessionStatus) => ({ status, endsAt: minutes(60) });
  it('turns SCHEDULED into REPORT_PENDING once the session has ended', () => {
    expect(effectiveSessionStatus(session(SessionStatus.SCHEDULED), minutes(59))).toBe(SessionStatus.SCHEDULED);
    expect(effectiveSessionStatus(session(SessionStatus.SCHEDULED), minutes(60))).toBe(SessionStatus.REPORT_PENDING);
  });
  it('leaves every other status alone', () => {
    for (const status of [SessionStatus.REPORT_PENDING, SessionStatus.COMPLETED, SessionStatus.CANCELLED]) {
      expect(effectiveSessionStatus(session(status), hours(5))).toBe(status);
    }
  });
});

describe('checkAttendanceWindow', () => {
  const session = (status = SessionStatus.SCHEDULED) => ({ status, startsAt: T0 });
  it('opens exactly 15 minutes before the start', () => {
    expect(checkAttendanceWindow(session(), minutes(-16))).toBe(AcademicsErrors.ATTENDANCE_NOT_OPEN);
    expect(checkAttendanceWindow(session(), minutes(-15))).toBeNull();
    expect(checkAttendanceWindow(session(SessionStatus.REPORT_PENDING), hours(3))).toBeNull();
  });
  it('is closed once the report is submitted or the session is cancelled', () => {
    expect(checkAttendanceWindow(session(SessionStatus.COMPLETED), minutes(10))).toBe(AcademicsErrors.ATTENDANCE_CLOSED);
    expect(checkAttendanceWindow(session(SessionStatus.CANCELLED), minutes(10))).toBe(AcademicsErrors.ATTENDANCE_CLOSED);
  });
});

describe('checkReportOpen', () => {
  const session = (status = SessionStatus.SCHEDULED) => ({ status, startsAt: T0 });
  it('is not open before the session starts', () => {
    expect(checkReportOpen(session(), minutes(-1))).toBe(AcademicsErrors.REPORT_NOT_OPEN);
    expect(checkReportOpen(session(), minutes(0))).toBeNull();
    expect(checkReportOpen(session(SessionStatus.REPORT_PENDING), hours(2))).toBeNull();
  });
  it('rejects a second submission and a cancelled session', () => {
    expect(checkReportOpen(session(SessionStatus.COMPLETED), hours(2))).toBe(AcademicsErrors.REPORT_ALREADY_SUBMITTED);
    expect(checkReportOpen(session(SessionStatus.CANCELLED), hours(2))).toBe(AcademicsErrors.REPORT_NOT_OPEN);
  });
});

describe('checkReportEditable', () => {
  const done = { status: SessionStatus.COMPLETED, report: { submittedAt: T0 } };
  it('allows edits for 24 hours after submission', () => {
    expect(checkReportEditable(done, hours(24))).toBeNull();
    expect(checkReportEditable(done, new Date(hours(24).getTime() + 1))).toBe(AcademicsErrors.REPORT_EDIT_WINDOW_CLOSED);
  });
  it('needs a submitted report', () => {
    expect(checkReportEditable({ status: SessionStatus.REPORT_PENDING, report: null }, hours(1))).toBe(AcademicsErrors.REPORT_NOT_SUBMITTED);
  });
});

describe('missingAttendance', () => {
  it('lists required students without an attendance row', () => {
    expect(missingAttendance(['a', 'b', 'c'], [{ studentId: 'a' }, { studentId: 'c' }])).toEqual(['b']);
    expect(missingAttendance([], [])).toEqual([]);
  });
});

describe('validateEvaluations', () => {
  const ev = (studentId: string, score = 4) => ({ studentId, participation: score, understanding: score, behavior: score, homework: score });
  it('accepts one in-range evaluation per required student', () => {
    expect(validateEvaluations(['a', 'b'], ['a', 'b'], [ev('a'), ev('b', 1)])).toBeNull();
  });
  it('rejects missing, duplicate, unknown and out-of-range evaluations', () => {
    expect(validateEvaluations(['a', 'b'], ['a', 'b'], [ev('a')])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a'), ev('a')])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a'), ev('z')])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a', 0)])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a', 6)])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a', 3.5)])).toBe(AcademicsErrors.REPORT_INVALID);
  });
  it('does not require withdrawn students but tolerates their existing evaluation', () => {
    expect(validateEvaluations(['a'], ['a', 'w'], [ev('a'), ev('w')])).toBeNull();
    expect(validateEvaluations(['a'], ['a', 'w'], [ev('a')])).toBeNull();
  });
});

describe('statusFilterFor', () => {
  it('maps the derived statuses to stored fields', () => {
    expect(statusFilterFor(SessionStatus.SCHEDULED, T0)).toEqual({ status: SessionStatus.SCHEDULED, endsAt: { $gt: T0 } });
    expect(statusFilterFor(SessionStatus.REPORT_PENDING, T0)).toEqual({
      $or: [{ status: SessionStatus.REPORT_PENDING }, { status: SessionStatus.SCHEDULED, endsAt: { $lte: T0 } }],
    });
    expect(statusFilterFor(SessionStatus.COMPLETED, T0)).toEqual({ status: SessionStatus.COMPLETED });
  });
});

describe('redactSession', () => {
  const base = {
    teacherAttendance: AttendanceStatus.PRESENT,
    attendance: [
      { studentId: 'a', status: AttendanceStatus.PRESENT, note: 'late bus' },
      { studentId: 'b', status: AttendanceStatus.ABSENT, note: 'sick' },
    ],
    report: {
      evaluations: [
        { studentId: 'a', participation: 5, understanding: 4, behavior: 5, homework: 3, note: 'great' },
        { studentId: 'b', participation: 1, understanding: 1, behavior: 1, homework: 1, note: 'struggling' },
      ],
      summary: 'whole-class summary',
      submittedBy: 't1',
      submittedAt: T0,
    },
  };

  it('returns staff views untouched', () => {
    expect(redactSession(base, 'STAFF', null)).toEqual(base);
  });

  it("keeps only the family's own child and drops the class summary", () => {
    const view = redactSession(base, 'FAMILY', ['a']);
    expect(view.attendance.map((a) => a.studentId)).toEqual(['a']);
    expect(view.report?.evaluations.map((e) => e.studentId)).toEqual(['a']);
    expect(view.report?.summary).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain('struggling');
    expect(JSON.stringify(view)).not.toContain('sick');
  });

  it('gives accountants attendance without notes and no evaluations', () => {
    const view = redactSession(base, 'ACCOUNTANT', null);
    expect(view.attendance.map((a) => a.studentId)).toEqual(['a', 'b']);
    expect(view.attendance.every((a) => a.note === undefined)).toBe(true);
    expect(view.report).toEqual({ evaluations: [], submittedBy: 't1', submittedAt: T0 });
  });

  it('copes with a session that has no report yet', () => {
    expect(redactSession({ ...base, report: null }, 'FAMILY', ['a']).report).toBeNull();
  });
});
```

`session-scope.spec.ts`:

```ts
import { Roles } from '@darnozom/shared-types';
import { resolveSessionScope } from './session-scope';

const actor = (roleName: Roles, additionalRoles: Roles[] = []) => ({ _id: 'u1', roleName, additionalRoles });

describe('resolveSessionScope', () => {
  it('treats pedagogical org-wide staff as STAFF', () => {
    for (const role of [Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR]) {
      expect(resolveSessionScope(actor(role))).toEqual({ kind: 'ORG', audience: 'STAFF' });
    }
  });
  it('limits an accountant to the ACCOUNTANT audience unless they also hold a pedagogical role', () => {
    expect(resolveSessionScope(actor(Roles.ACCOUNTANT))).toEqual({ kind: 'ORG', audience: 'ACCOUNTANT' });
    expect(resolveSessionScope(actor(Roles.ACCOUNTANT, [Roles.COORDINATOR]))).toEqual({ kind: 'ORG', audience: 'STAFF' });
  });
  it('falls back to the group scopes for teachers, parents and students', () => {
    expect(resolveSessionScope(actor(Roles.INSTRUCTOR))).toEqual({ kind: 'TEACHER', teacherId: 'u1' });
    expect(resolveSessionScope(actor(Roles.PARENT))).toEqual({ kind: 'PARENT', parentId: 'u1' });
    expect(resolveSessionScope(actor(Roles.STUDENT))).toEqual({ kind: 'STUDENT', studentId: 'u1' });
    expect(resolveSessionScope(actor(Roles.HR))).toEqual({ kind: 'NONE' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-rules session-scope --runInBand`
Expected: FAIL — `Cannot find module './session-rules'` / `'./session-scope'`.

- [ ] **Step 3: Implement `session-rules.ts`**

```ts
import {
  AcademicsErrors,
  ATTENDANCE_OPEN_MINUTES_BEFORE,
  AttendanceStatus,
  REPORT_EDIT_WINDOW_HOURS,
  SESSION_SCORE_MAX,
  SESSION_SCORE_MIN,
  SessionStatus,
} from '@darnozom/shared-types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** SCHEDULED becomes REPORT_PENDING by itself once the session has ended (also persisted by the sweep job). */
export function effectiveSessionStatus(session: { status: SessionStatus; endsAt: Date }, now: Date): SessionStatus {
  return session.status === SessionStatus.SCHEDULED && session.endsAt.getTime() <= now.getTime() ? SessionStatus.REPORT_PENDING : session.status;
}

/** Attendance is open from 15 minutes before the start until the report is submitted. */
export function checkAttendanceWindow(session: { status: SessionStatus; startsAt: Date }, now: Date): AcademicsErrors | null {
  if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED) return AcademicsErrors.ATTENDANCE_CLOSED;
  if (now.getTime() < session.startsAt.getTime() - ATTENDANCE_OPEN_MINUTES_BEFORE * MINUTE_MS) return AcademicsErrors.ATTENDANCE_NOT_OPEN;
  return null;
}

/** A report can be submitted once the session has started, exactly once. */
export function checkReportOpen(session: { status: SessionStatus; startsAt: Date }, now: Date): AcademicsErrors | null {
  if (session.status === SessionStatus.COMPLETED) return AcademicsErrors.REPORT_ALREADY_SUBMITTED;
  if (session.status === SessionStatus.CANCELLED) return AcademicsErrors.REPORT_NOT_OPEN;
  if (now.getTime() < session.startsAt.getTime()) return AcademicsErrors.REPORT_NOT_OPEN;
  return null;
}

export function checkReportEditable(session: { status: SessionStatus; report?: { submittedAt: Date } | null }, now: Date): AcademicsErrors | null {
  if (session.status !== SessionStatus.COMPLETED || !session.report) return AcademicsErrors.REPORT_NOT_SUBMITTED;
  return now.getTime() - session.report.submittedAt.getTime() > REPORT_EDIT_WINDOW_HOURS * HOUR_MS ? AcademicsErrors.REPORT_EDIT_WINDOW_CLOSED : null;
}

export function missingAttendance(requiredIds: string[], attendance: { studentId: unknown }[]): string[] {
  const marked = new Set(attendance.map((entry) => String(entry.studentId)));
  return requiredIds.filter((id) => !marked.has(id));
}

export interface EvaluationInput {
  studentId: string;
  participation: number;
  understanding: number;
  behavior: number;
  homework: number;
}

const isScore = (value: unknown): boolean => Number.isInteger(value) && (value as number) >= SESSION_SCORE_MIN && (value as number) <= SESSION_SCORE_MAX;

/** One evaluation per required student; every id must be allowed; no duplicates; scores are integers 1–5. */
export function validateEvaluations(requiredIds: string[], allowedIds: string[], evaluations: EvaluationInput[]): AcademicsErrors | null {
  const seen = new Set<string>();
  for (const evaluation of evaluations) {
    if (seen.has(evaluation.studentId) || !allowedIds.includes(evaluation.studentId)) return AcademicsErrors.REPORT_INVALID;
    seen.add(evaluation.studentId);
    if (![evaluation.participation, evaluation.understanding, evaluation.behavior, evaluation.homework].every(isScore)) return AcademicsErrors.REPORT_INVALID;
  }
  return requiredIds.every((id) => seen.has(id)) ? null : AcademicsErrors.REPORT_INVALID;
}

/** Query fragment for a status filter that matches the derived (effective) status. */
export function statusFilterFor(status: SessionStatus, now: Date): Record<string, unknown> {
  switch (status) {
    case SessionStatus.SCHEDULED: {
      return { status: SessionStatus.SCHEDULED, endsAt: { $gt: now } };
    }
    case SessionStatus.REPORT_PENDING: {
      return { $or: [{ status: SessionStatus.REPORT_PENDING }, { status: SessionStatus.SCHEDULED, endsAt: { $lte: now } }] };
    }
    default: {
      return { status };
    }
  }
}

export type SessionAudience = 'STAFF' | 'ACCOUNTANT' | 'FAMILY';

export interface RedactableSession {
  teacherAttendance?: AttendanceStatus | null;
  attendance: { studentId: unknown; status: AttendanceStatus; note?: string }[];
  report?: {
    evaluations: { studentId: unknown; note?: string }[];
    summary?: string;
    submittedBy: unknown;
    submittedAt: Date;
  } | null;
}

/**
 * STAFF sees everything. FAMILY sees only visibleStudentIds' rows and never the class summary.
 * ACCOUNTANT sees attendance (no notes) and no evaluations ("accountants can't see confidential pedagogical notes").
 */
export function redactSession<T extends RedactableSession>(session: T, audience: SessionAudience, visibleStudentIds: string[] | null): T {
  if (audience === 'STAFF' && !visibleStudentIds) return session;
  if (audience === 'ACCOUNTANT') {
    return {
      ...session,
      attendance: session.attendance.map(({ note: _note, ...rest }) => rest),
      report: session.report ? { evaluations: [], submittedBy: session.report.submittedBy, submittedAt: session.report.submittedAt } : session.report,
    };
  }
  const visible = (studentId: unknown) => !visibleStudentIds || visibleStudentIds.includes(String(studentId));
  return {
    ...session,
    attendance: session.attendance.filter((entry) => visible(entry.studentId)),
    report: session.report
      ? { evaluations: session.report.evaluations.filter((entry) => visible(entry.studentId)), submittedBy: session.report.submittedBy, submittedAt: session.report.submittedAt }
      : session.report,
  };
}
```

(`_note` is intentionally unused — it is the destructured-away field. If `@typescript-eslint/no-unused-vars` flags it, add `// eslint-disable-next-line @typescript-eslint/no-unused-vars -- note is removed on purpose` above the `.map`.)

- [ ] **Step 4: Implement `session-scope.ts`**

```ts
import { hasAnyRole, Roles } from '@darnozom/shared-types';
import { GroupScope, resolveGroupScope } from './group-scope';

export type SessionScope = Exclude<GroupScope, { kind: 'ORG' }> | { kind: 'ORG'; audience: 'STAFF' | 'ACCOUNTANT' };

/** Org-wide roles that may read pedagogical content. An accountant alone may not. */
const PEDAGOGICAL_ORG_ROLES: readonly Roles[] = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR];

export function resolveSessionScope(actor: { _id: string; roleName: string; additionalRoles?: readonly string[] }): SessionScope {
  const scope = resolveGroupScope(actor);
  if (scope.kind === 'ORG') return { kind: 'ORG', audience: hasAnyRole(actor, PEDAGOGICAL_ORG_ROLES) ? 'STAFF' : 'ACCOUNTANT' };
  return scope;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest session-rules session-scope --runInBand`
Expected: PASS (~19 tests).

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/domain/session-rules.ts src/academics/domain/session-rules.spec.ts src/academics/domain/session-scope.ts src/academics/domain/session-scope.spec.ts
git add apps/server/src/academics/domain
git commit -m "feat(academics): session rules, scope and redaction as pure functions"
```

---

### Task 4: Group changes — `totalSessions`, student status, running locks

**Files:**
- Modify: `apps/server/src/academics/group/entities/group.entity.ts`, `group/group.types.ts`, `group/dto/group.dto.ts`, `group/group.service.ts`, `group/group-state.service.ts`, `group/group-students.service.ts`, `group/group-teacher.service.ts`
- Modify: `apps/server/src/academics/domain/readiness.ts`, `domain/group-status.ts`
- Create: `apps/server/src/academics/domain/schedule-change.ts`
- Test: `domain/readiness.spec.ts`, `domain/group-status.spec.ts`, `domain/schedule-change.spec.ts` (new), `group/group.service.spec.ts`, `group/group-state.service.spec.ts`, `group/group-students.service.spec.ts`, `group/group-teacher.service.spec.ts`, `common/update-dtos.spec.ts`

**Interfaces:**
- Consumes: Task 1 enums/errors.
- Produces:
  - `GroupLean.totalSessions?: number | null`; `GroupStudentLean.status?: GroupStudentStatus`, `withdrawnAt?: Date`.
  - `isScheduleChange(current: { schedule: ScheduleSlot[]; timezone: string }, next: { schedule?: ScheduleSlot[]; timezone?: string }): boolean`.
  - `GroupStudentsService.markWithdrawn(groupId: Types.ObjectId, studentId: string): Promise<void>` (used by Task 10).
  - `computeReadiness` counts `ACTIVE` students only; `checkStatusTransition` refuses user transitions out of `RUNNING`/`COMPLETED`.

- [ ] **Step 1: Write the failing domain tests**

Append to `domain/readiness.spec.ts` (inside its top-level `describe`; reuse that file's group-builder if it has one, otherwise use the literal below):

```ts
  it('counts only ACTIVE students for the minimum and for payments (withdrawn students are ignored)', () => {
    const group = {
      teacherId: 'teacher',
      minStudents: 2,
      contentSent: { done: true },
      meetingLink: 'https://meet.example.com/a',
      students: [
        { paymentStatus: 'PAID', status: 'ACTIVE' },
        { paymentStatus: 'UNPAID', status: 'WITHDRAWN' },
        { paymentStatus: 'PAID' }, // legacy entry without a status is ACTIVE
      ],
    };
    const readiness = computeReadiness(group);
    expect(readiness.ready).toBe(true);
    expect(computeReadiness({ ...group, minStudents: 3 }).items.find((i) => i.key === ReadinessKey.MINIMUM_STUDENTS)?.done).toBe(false);
  });
```
(Ensure the spec imports `ReadinessKey` from shared-types.)

Append to `domain/group-status.spec.ts`:

```ts
  it('refuses user-driven transitions out of RUNNING and COMPLETED', () => {
    expect(checkStatusTransition(GroupStatus.RUNNING, GroupStatus.CANCELLED, { ready: true, reason: 'x' })).toBe(AcademicsErrors.INVALID_STATUS_TRANSITION);
    expect(checkStatusTransition(GroupStatus.RUNNING, GroupStatus.READY_TO_START, { ready: true })).toBe(AcademicsErrors.INVALID_STATUS_TRANSITION);
    expect(checkStatusTransition(GroupStatus.COMPLETED, GroupStatus.CANCELLED, { ready: true, reason: 'x' })).toBe(AcademicsErrors.GROUP_COMPLETED);
  });
```

Create `domain/schedule-change.spec.ts`:

```ts
import { isScheduleChange } from './schedule-change';

const slot = (dayOfWeek: number, startTime = '10:00', durationMinutes = 60) => ({ dayOfWeek, startTime, durationMinutes });

describe('isScheduleChange', () => {
  const current = { schedule: [slot(1), slot(3)], timezone: 'UTC' };
  it('is false when nothing is sent or the same values are re-sent (in any order)', () => {
    expect(isScheduleChange(current, {})).toBe(false);
    expect(isScheduleChange(current, { schedule: [slot(3), slot(1)], timezone: 'UTC' })).toBe(false);
  });
  it('is true for a different timezone, slot, duration or slot count', () => {
    expect(isScheduleChange(current, { timezone: 'Asia/Riyadh' })).toBe(true);
    expect(isScheduleChange(current, { schedule: [slot(1), slot(4)] })).toBe(true);
    expect(isScheduleChange(current, { schedule: [slot(1), slot(3, '10:00', 90)] })).toBe(true);
    expect(isScheduleChange(current, { schedule: [slot(1)] })).toBe(true);
  });
});
```

Extend `common/update-dtos.spec.ts`: add `['group', UpdateGroupDto, 'totalSessions']` to the "rejects null" table and
`expect(fieldErrors(UpdateGroupDto, 'totalSessions', 501).length).toBeGreaterThan(0)` as a new `it('rejects totalSessions outside 1–500', ...)` (also `0`).

- [ ] **Step 2: Write the failing service tests**

`group/group-state.service.spec.ts` — add:

```ts
  it('treats a COMPLETED group as read-only for writes', async () => {
    const { service, groupModel } = setup(); // use this file's existing setup helper
    groupModel.findOne.mockReturnValue(mockQuery({ _id: groupId, status: GroupStatus.COMPLETED }));
    await expect(service.loadForWrite(staff, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_COMPLETED));
  });
```
(Match the names/imports already used in that spec: the file already builds `service`, a `groupModel` mock with `findOne`, an actor and a group id; if a helper is named differently, use that file's.)

`group/group-students.service.spec.ts` — add (adapt `setup()`/fixtures to the file's existing names):

```ts
  it('counts only ACTIVE students against maxStudents in the conditional push', async () => {
    const { service, groupModel, state, userModel } = setup();
    state.loadForWrite.mockResolvedValue({ _id: groupId, status: GroupStatus.FORMING, students: [] });
    userModel.findOne.mockReturnValue(mockQuery({ _id: studentOid }));
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await service.addStudent(staff, String(groupId), String(studentOid));
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(JSON.stringify(filter.$expr)).toContain('WITHDRAWN');
    expect(update.$push.students.status).toBe(GroupStudentStatus.ACTIVE);
  });

  it('marks a student WITHDRAWN instead of deleting them once the group is RUNNING', async () => {
    const { service, groupModel, state } = setup();
    state.loadForWrite.mockResolvedValue({ _id: groupId, status: GroupStatus.RUNNING, students: [{ studentId: studentOid, status: GroupStudentStatus.ACTIVE }] });
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await service.removeStudent(staff, String(groupId), String(studentOid));
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(update.$pull).toBeUndefined();
    expect(update.$set['students.$.status']).toBe(GroupStudentStatus.WITHDRAWN);
    expect(update.$set['students.$.withdrawnAt']).toBeInstanceOf(Date);
    expect(filter['students.studentId']).toEqual(studentOid);
  });

  it('still deletes the entry before the group starts', async () => {
    const { service, groupModel, state } = setup();
    state.loadForWrite.mockResolvedValue({ _id: groupId, status: GroupStatus.FORMING, students: [{ studentId: studentOid, status: GroupStudentStatus.ACTIVE }] });
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await service.removeStudent(staff, String(groupId), String(studentOid));
    expect(groupModel.updateOne.mock.calls[0][1].$pull).toBeDefined();
  });

  it('cannot remove a student who is already WITHDRAWN', async () => {
    const { service, state } = setup();
    state.loadForWrite.mockResolvedValue({ _id: groupId, status: GroupStatus.RUNNING, students: [{ studentId: studentOid, status: GroupStudentStatus.WITHDRAWN }] });
    await expect(service.removeStudent(staff, String(groupId), String(studentOid))).rejects.toThrow(new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP));
  });

  it('markWithdrawn flips only that student entry', async () => {
    const { service, groupModel } = setup();
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await service.markWithdrawn(groupId, String(studentOid));
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: groupId, 'students.studentId': studentOid });
    expect(update.$set['students.$.status']).toBe(GroupStudentStatus.WITHDRAWN);
  });
```

`group/group-teacher.service.spec.ts` — add:

```ts
  it('refuses to assign or unassign a teacher while the group is RUNNING', async () => {
    const { service, state } = setup();
    state.loadForWrite.mockResolvedValue({ _id: groupId, status: GroupStatus.RUNNING, teacherId: teacherOid });
    await expect(service.assign(staff, String(groupId), String(teacherOid))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_RUNNING_TEACHER_LOCKED));
    await expect(service.unassign(staff, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_RUNNING_TEACHER_LOCKED));
  });
```

`group/group.service.spec.ts` — add `totalSessions: 12` to `validDto`, and:

```ts
  describe('create with totalSessions', () => {
    it('stores totalSessions', async () => {
      const { service, cohortModel, levelModel, groupModel } = setup();
      cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, levelId }));
      levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
      groupModel.create.mockResolvedValue({ toObject: () => baseGroup({ totalSessions: 12 }) });
      await service.create(staff, validDto);
      expect(groupModel.create).toHaveBeenCalledWith(expect.objectContaining({ totalSessions: 12 }));
    });
  });

  describe('update while RUNNING', () => {
    const running = (over = {}) => baseGroup({ status: GroupStatus.RUNNING, totalSessions: 12, timezone: 'UTC', schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }], ...over });

    it('rejects a real schedule, timezone or totalSessions change', async () => {
      const { service, state, groupModel } = setup();
      state.loadForWrite.mockResolvedValue(running());
      await expect(service.update(staff, String(groupId), { timezone: 'Asia/Riyadh' })).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED));
      await expect(service.update(staff, String(groupId), { schedule: [{ dayOfWeek: 2, startTime: '10:00', durationMinutes: 60 }] })).rejects.toThrow(
        new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED)
      );
      await expect(service.update(staff, String(groupId), { totalSessions: 20 })).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED));
      expect(groupModel.updateOne).not.toHaveBeenCalled();
    });

    it('accepts the unchanged schedule re-posted with another field and skips the teacher-fit re-check', async () => {
      const { service, state, groupModel, groupTeacher } = setup();
      state.loadForWrite.mockResolvedValue(running());
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.update(staff, String(groupId), {
        meetingLink: 'https://meet.example.com/x',
        timezone: 'UTC',
        schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
        totalSessions: 12,
      });
      expect(groupModel.updateOne).toHaveBeenCalled();
      expect(groupTeacher.assertScheduleChangeFits).not.toHaveBeenCalled();
    });
  });
```
(`staff`, `baseGroup`, `groupId`, `setup`, `mockQuery` are already defined in that spec.)

- [ ] **Step 3: Run the tests to verify they fail**

Run each, one after another:
- `pnpm --filter server exec jest readiness group-status schedule-change update-dtos --runInBand` → FAIL (new assertions; `schedule-change` module missing).
- `pnpm --filter server exec jest group.service group-state group-students group-teacher --runInBand` → FAIL (new behaviour missing).

- [ ] **Step 4: Implement the domain pieces**

`domain/schedule-change.ts`:

```ts
import { ScheduleSlot } from '@darnozom/shared-types';

const keyOf = (slots: ScheduleSlot[]) => {
  const keys = slots.map((slot) => `${slot.dayOfWeek}|${slot.startTime}|${slot.durationMinutes}`);
  // eslint-disable-next-line unicorn/no-array-sort -- sorting a local copy
  keys.sort();
  return keys.join(',');
};

/** True only when the posted schedule/timezone differs from the stored one (forms re-post unchanged values). */
export function isScheduleChange(current: { schedule: ScheduleSlot[]; timezone: string }, next: { schedule?: ScheduleSlot[]; timezone?: string }): boolean {
  if (next.timezone !== undefined && next.timezone !== current.timezone) return true;
  return next.schedule !== undefined && keyOf(next.schedule) !== keyOf(current.schedule);
}
```

`domain/readiness.ts` — change the import and `ReadinessInput.students` type, and the `students` line:

```ts
import { GroupPaymentStatus, GroupStudentStatus, Readiness, ReadinessKey } from '@darnozom/shared-types';

export interface ReadinessInput {
  teacherId?: unknown;
  minStudents: number;
  students?: { paymentStatus: string; status?: string }[];
  contentSent?: { done?: boolean } | null;
  meetingLink?: string | null;
}

/** The concept's five mandatory readiness items, computed from the group's ACTIVE students. */
export function computeReadiness(group: ReadinessInput): Readiness {
  const students = (group.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN);
```
(leave the `items` array and the return untouched.)

`domain/group-status.ts` — in `checkStatusTransition`, right after the `CANCELLED` line add:

```ts
  if (from === GroupStatus.COMPLETED) return AcademicsErrors.GROUP_COMPLETED;
  if (from === GroupStatus.RUNNING) return AcademicsErrors.INVALID_STATUS_TRANSITION;
```

- [ ] **Step 5: Implement the entity, types and DTOs**

`group/entities/group.entity.ts` — add `GroupStudentStatus` to the shared-types import; in `GroupStudent` after `addedBy`:

```ts
  @Prop({ type: String, enum: Object.values(GroupStudentStatus), default: GroupStudentStatus.ACTIVE })
  status: GroupStudentStatus;

  @Prop({ type: Date, required: false })
  withdrawnAt?: Date;
```

and in `Group` after `maxStudents`:

```ts
  /** Sessions generated when the group starts; null on groups created before sub-project 2. */
  @Prop({ type: Number, required: false, min: 1, max: 500, default: null })
  totalSessions?: number | null;
```

`group/group.types.ts` — import `GroupStudentStatus`; add `status?: GroupStudentStatus; withdrawnAt?: Date;` to `GroupStudentLean` and `totalSessions?: number | null;` to `GroupLean` (after `maxStudents`).

`group/dto/group.dto.ts` — in `CreateGroupDto`, after `maxStudents`:

```ts
  @IsInt()
  @Min(1)
  @Max(500)
  totalSessions!: number;
```

and in `UpdateGroupDto`, after `maxStudents`:

```ts
  @OptionalNonNull()
  @IsInt()
  @Min(1)
  @Max(500)
  totalSessions?: number;
```

- [ ] **Step 6: Implement the service changes**

`group/group-state.service.ts` — in `loadForWrite`, after the CANCELLED line:

```ts
    if (group.status === GroupStatus.COMPLETED) throw new ConflictException(AcademicsErrors.GROUP_COMPLETED);
```

`group/group-students.service.ts`:
1. Add `GroupStudentStatus` to the shared-types import.
2. In `addStudent`, replace the `$expr` line and the pushed object:

```ts
          $expr: {
            $lt: [{ $size: { $filter: { input: '$students', cond: { $ne: ['$$this.status', GroupStudentStatus.WITHDRAWN] } } } }, '$maxStudents'],
          },
```
```ts
        {
          $push: {
            students: {
              studentId: oid(studentId),
              paymentStatus: GroupPaymentStatus.UNPAID,
              whatsappAdded: false,
              status: GroupStudentStatus.ACTIVE,
              addedAt: new Date(),
              addedBy: oid(actor._id),
            },
          },
        }
```
3. Replace `removeStudent` and add `markWithdrawn`:

```ts
  async removeStudent(actor: AcademicsActor, id: string, studentId: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const entry = group.students.find((s) => String(s.studentId) === studentId);
    if (!entry || entry.status === GroupStudentStatus.WITHDRAWN) throw new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP);
    if (group.status === GroupStatus.RUNNING) {
      // Keep the entry so attendance history still points at a student.
      await this.markWithdrawn(group._id, studentId);
    } else {
      await this.groupModel.updateOne({ _id: group._id }, { $pull: { students: { studentId: oid(studentId) } } }).exec();
    }
    return this.state.syncReadiness(group._id);
  }

  /** Sets the student's entry to WITHDRAWN (kept for history). Used when removing from a running group and by follow-up decisions. */
  async markWithdrawn(groupId: Types.ObjectId, studentId: string): Promise<void> {
    await this.groupModel
      .updateOne(
        { _id: groupId, 'students.studentId': oid(studentId) },
        { $set: { 'students.$.status': GroupStudentStatus.WITHDRAWN, 'students.$.withdrawnAt': new Date() } }
      )
      .exec();
  }
```

`group/group-teacher.service.ts` — in `assign` and `unassign`, directly after `const group = await this.state.loadForWrite(actor, id);` add:

```ts
    if (group.status === GroupStatus.RUNNING) throw new ConflictException(AcademicsErrors.GROUP_RUNNING_TEACHER_LOCKED);
```
(`GroupStatus` is already imported there.)

`group/group.service.ts`:
1. Import `isScheduleChange` from `../domain/schedule-change`.
2. In `create`, add `totalSessions: dto.totalSessions,` after `maxStudents: dto.maxStudents,` in the `groupModel.create({...})` call.
3. Replace the body of `update` from the `isValidSchedule` line through the fit check with:

```ts
    if (dto.schedule !== undefined && !isValidSchedule(dto.schedule)) throw new BadRequestException(AcademicsErrors.INVALID_SCHEDULE);
    const scheduleChanged = isScheduleChange(group, dto);
    const totalChanged = dto.totalSessions !== undefined && dto.totalSessions !== group.totalSessions;
    if (group.status === GroupStatus.RUNNING && (scheduleChanged || totalChanged)) {
      throw new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED);
    }
    const minStudents = dto.minStudents ?? group.minStudents;
    const maxStudents = dto.maxStudents ?? group.maxStudents;
    const activeCount = group.students.filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).length;
    if (maxStudents < minStudents || maxStudents < activeCount) throw new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS);
    if (scheduleChanged) {
      await this.groupTeacher.assertScheduleChangeFits(actor, group, { schedule: dto.schedule ?? group.schedule, timezone: dto.timezone ?? group.timezone });
    }
```
(add `GroupStudentStatus` to the shared-types import). Keep the lines after it (`changes`, `updateOne`, `syncReadiness`) as they are.

- [ ] **Step 7: Run the tests to verify they pass**

Run, one after another:
- `pnpm --filter server exec jest readiness group-status schedule-change update-dtos --runInBand` → PASS.
- `pnpm --filter server exec jest src/academics --runInBand` → PASS (the whole academics folder; fix any existing fixture that now needs `totalSessions`/`status`).

- [ ] **Step 8: Type-check and commit**

```bash
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-t4.txt 2>&1; grep -c "error TS" .superpowers/tsc-sp2-t4.txt
pnpm --filter server exec eslint --fix src/academics/domain src/academics/group
git add apps/server/src/academics
git commit -m "feat(academics): totalSessions, student status and running-group locks"
```
Expected: `0` errors (server baseline is 0). The client is untouched in this task.

---

### Task 5: Session & follow-up entities, state service, "start group"

**Files:**
- Create: `apps/server/src/academics/session/entities/session.entity.ts`
- Create: `apps/server/src/academics/follow-up/entities/follow-up.entity.ts`
- Create: `apps/server/src/academics/session/session.types.ts`
- Create: `apps/server/src/academics/session/session-state.service.ts`
- Create: `apps/server/src/academics/session/group-start.service.ts`
- Test: `apps/server/src/academics/session/session-state.service.spec.ts`, `apps/server/src/academics/session/group-start.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 `generateSessions`; Task 3 `effectiveSessionStatus`; SP1 `GroupStateService.loadInOrg/syncReadiness`, `AcademicsActor`; Task 4 `GroupLean.totalSessions`, `GroupStudentLean.status`.
- Produces:
  - Entities `Session` (`Session.name`, `SessionSchema`) and `FollowUp` (`FollowUp.name`, `FollowUpSchema`).
  - Types (`session.types.ts`): `SessionAttendanceLean`, `SessionEvaluationLean`, `SessionReportLean`, `SessionLean`, `SessionView = SessionLean & { groupName?: string }` (its `status` is the **effective** status), `SessionDetailView = SessionView & { people: Record<string, string>; roster: string[] }`, `FollowUpLean`.
  - `SessionStateService` — `loadInOrg(actor: AcademicsActor, id: string): Promise<SessionLean>` (404 `SESSION_NOT_FOUND`), `activeStudentIds(groupId: Types.ObjectId): Promise<string[]>`, `toView(session: SessionLean, now?: Date): SessionView`, `reload(id: Types.ObjectId, now?: Date): Promise<SessionView>`.
  - `GroupStartService.start(actor: AcademicsActor, groupId: string): Promise<GroupView>`.

- [ ] **Step 1: Write the entities and types**

`session/entities/session.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';

@Schema({ _id: false })
export class SessionAttendance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(AttendanceStatus), required: true })
  status: AttendanceStatus;

  @Prop({ type: String, required: false, trim: true })
  note?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  markedBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  markedAt: Date;
}
export const SessionAttendanceSchema = SchemaFactory.createForClass(SessionAttendance);

@Schema({ _id: false })
export class SessionEvaluation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  participation: number;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  understanding: number;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  behavior: number;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  homework: number;

  @Prop({ type: String, required: false, trim: true })
  note?: string;
}
export const SessionEvaluationSchema = SchemaFactory.createForClass(SessionEvaluation);

@Schema({ _id: false })
export class SessionReport {
  @Prop({ type: [SessionEvaluationSchema], default: [] })
  evaluations: SessionEvaluation[];

  @Prop({ type: String, required: false, trim: true })
  summary?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  submittedAt: Date;
}
export const SessionReportSchema = SchemaFactory.createForClass(SessionReport);

@Schema({ timestamps: true })
export class Session extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  /** Copied from the group when the session is generated. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  sequence: number;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, required: true })
  endsAt: Date;

  @Prop({ type: String, enum: Object.values(SessionStatus), default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Prop({ type: String, enum: Object.values(AttendanceStatus), required: false, default: null })
  teacherAttendance?: AttendanceStatus | null;

  @Prop({ type: [SessionAttendanceSchema], default: [] })
  attendance: SessionAttendance[];

  @Prop({ type: SessionReportSchema, required: false, default: null })
  report?: SessionReport | null;

  @Prop({ type: String, required: false })
  cancelReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  cancelledBy?: Types.ObjectId;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ groupId: 1, sequence: 1 }, { unique: true });
SessionSchema.index({ teacherId: 1, startsAt: 1 });
SessionSchema.index({ organizationId: 1, status: 1, startsAt: 1 });
```

`follow-up/entities/follow-up.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FollowUpDecision } from '@darnozom/shared-types';

@Schema({ timestamps: true })
export class FollowUp extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  parentFeedback?: string;

  @Prop({ type: String, enum: Object.values(FollowUpDecision), required: false })
  decision?: FollowUpDecision;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  recordedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  recordedAt?: Date;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
FollowUpSchema.index({ groupId: 1, studentId: 1 }, { unique: true });
```

`session/session.types.ts`:

```ts
import { Types } from 'mongoose';
import { AttendanceStatus, FollowUpDecision, SessionStatus } from '@darnozom/shared-types';

export interface SessionAttendanceLean {
  studentId: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
  markedBy: Types.ObjectId;
  markedAt: Date;
}

export interface SessionEvaluationLean {
  studentId: Types.ObjectId;
  participation: number;
  understanding: number;
  behavior: number;
  homework: number;
  note?: string;
}

export interface SessionReportLean {
  evaluations: SessionEvaluationLean[];
  summary?: string;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
}

export interface SessionLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sequence: number;
  startsAt: Date;
  endsAt: Date;
  status: SessionStatus;
  teacherAttendance?: AttendanceStatus | null;
  attendance: SessionAttendanceLean[];
  report?: SessionReportLean | null;
  cancelReason?: string;
  cancelledBy?: Types.ObjectId;
}

/** What the API returns: `status` is the effective (derived) status. */
export type SessionView = SessionLean & { groupName?: string };

/** findOne adds the roster (ACTIVE students visible to the caller) and display names (id → "First Last"). */
export type SessionDetailView = SessionView & { people: Record<string, string>; roster: string[] };

export interface FollowUpLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  sessionId: Types.ObjectId;
  studentId: Types.ObjectId;
  parentFeedback?: string;
  decision?: FollowUpDecision;
  recordedBy?: Types.ObjectId;
  recordedAt?: Date;
}
```

- [ ] **Step 2: Write the failing state-service tests**

`session/session-state.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionStateService } from './session-state.service';

const ORG = '64b0000000000000000000bb';
const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const sessionId = new Types.ObjectId('64b000000000000000000011');
const groupId = new Types.ObjectId('64b000000000000000000022');
const a = new Types.ObjectId('64b0000000000000000000a1');
const b = new Types.ObjectId('64b0000000000000000000a2');

function setup() {
  const sessionModel = { findOne: jest.fn() };
  const groupModel = { findOne: jest.fn() };
  return { service: new SessionStateService(sessionModel as never, groupModel as never), sessionModel, groupModel };
}

describe('SessionStateService', () => {
  it('loads a session only inside the actor organization', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery({ _id: sessionId }));
    await service.loadInOrg(actor, String(sessionId));
    expect(sessionModel.findOne).toHaveBeenCalledWith({ _id: sessionId, organizationId: new Types.ObjectId(ORG) });
  });

  it('404s when the session is not in the organization', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.loadInOrg(actor, String(sessionId))).rejects.toThrow(new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND));
  });

  it('lists ACTIVE students only (legacy entries without a status are active)', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(
      mockQuery({ students: [{ studentId: a, status: GroupStudentStatus.ACTIVE }, { studentId: b, status: GroupStudentStatus.WITHDRAWN }, { studentId: new Types.ObjectId() }] })
    );
    const ids = await service.activeStudentIds(groupId);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(String(a));
    expect(ids).not.toContain(String(b));
  });

  it('derives REPORT_PENDING in the view once the session has ended', () => {
    const { service } = setup();
    const session = { _id: sessionId, status: SessionStatus.SCHEDULED, endsAt: new Date('2026-10-12T15:00:00Z') } as never;
    expect(service.toView(session, new Date('2026-10-12T15:00:00Z')).status).toBe(SessionStatus.REPORT_PENDING);
    expect(service.toView(session, new Date('2026-10-12T14:59:00Z')).status).toBe(SessionStatus.SCHEDULED);
  });
});
```

- [ ] **Step 3: Write the failing start-group tests**

`session/group-start.service.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupStartService } from './group-start.service';

const ORG = new Types.ObjectId('64b0000000000000000000bb');
const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: String(ORG), roleName: Roles.COORDINATOR, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const cohortId = new Types.ObjectId('64b000000000000000000022');
const teacherId = new Types.ObjectId('64b0000000000000000000a1');

const readyGroup = (over: Record<string, unknown> = {}) => ({
  _id: groupId,
  organizationId: ORG,
  cohortId,
  status: GroupStatus.READY_TO_START,
  teacherId,
  schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
  timezone: 'UTC',
  totalSessions: 3,
  ...over,
});

function setup(group = readyGroup()) {
  const dbSession = { withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()), endSession: jest.fn() };
  const connection = { startSession: jest.fn().mockResolvedValue(dbSession) };
  const groupModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const cohortModel = { findOne: jest.fn().mockReturnValue(mockQuery({ startDate: new Date('2026-10-12T00:00:00Z') })) };
  const sessionModel = { insertMany: jest.fn().mockResolvedValue([]) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(group),
    syncReadiness: jest.fn(async (id) => ({ _id: id, status: GroupStatus.RUNNING })),
  };
  const service = new GroupStartService(groupModel as never, cohortModel as never, sessionModel as never, connection as never, state as never);
  return { service, groupModel, cohortModel, sessionModel, state, dbSession, connection };
}

describe('GroupStartService', () => {
  it('moves the group to RUNNING and creates every session inside one transaction', async () => {
    const { service, groupModel, sessionModel, dbSession } = setup();
    await service.start(actor, String(groupId));

    const [filter, update, options] = groupModel.updateOne.mock.calls[0];
    expect(filter).toMatchObject({ _id: groupId, status: GroupStatus.READY_TO_START });
    expect(update.$set).toEqual({ status: GroupStatus.RUNNING });
    expect(update.$push.statusHistory).toMatchObject({ from: GroupStatus.READY_TO_START, to: GroupStatus.RUNNING });
    expect(options).toEqual({ session: dbSession });

    const [docs, insertOptions] = sessionModel.insertMany.mock.calls[0];
    expect(insertOptions).toEqual({ session: dbSession });
    expect(docs.map((d: { sequence: number }) => d.sequence)).toEqual([1, 2, 3]);
    expect(docs.map((d: { startsAt: Date }) => d.startsAt.toISOString())).toEqual(['2026-10-12T10:00:00.000Z', '2026-10-19T10:00:00.000Z', '2026-10-26T10:00:00.000Z']);
    expect(docs[0]).toMatchObject({ organizationId: ORG, groupId, teacherId, status: SessionStatus.SCHEDULED, attendance: [] });
    expect(dbSession.endSession).toHaveBeenCalled();
  });

  it.each([
    [GroupStatus.FORMING, AcademicsErrors.GROUP_NOT_READY],
    [GroupStatus.RUNNING, AcademicsErrors.GROUP_NOT_READY],
    [GroupStatus.CANCELLED, AcademicsErrors.GROUP_CANCELLED],
    [GroupStatus.COMPLETED, AcademicsErrors.GROUP_COMPLETED],
  ])('refuses to start a %s group', async (status, error) => {
    const { service, sessionModel } = setup(readyGroup({ status }));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new ConflictException(error));
    expect(sessionModel.insertMany).not.toHaveBeenCalled();
  });

  it('asks for totalSessions on groups created before the field existed', async () => {
    const { service } = setup(readyGroup({ totalSessions: null }));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_TOTAL_SESSIONS_REQUIRED));
  });

  it('does not create sessions when the group is no longer READY_TO_START', async () => {
    const { service, groupModel, sessionModel, dbSession } = setup();
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_NOT_READY));
    expect(sessionModel.insertMany).not.toHaveBeenCalled();
    expect(dbSession.endSession).toHaveBeenCalled();
  });

  it('404s when the cohort is gone', async () => {
    const { service, cohortModel } = setup();
    cohortModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND));
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-state group-start --runInBand`
Expected: FAIL — `Cannot find module './session-state.service'` / `'./group-start.service'`.

- [ ] **Step 5: Implement `session-state.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { effectiveSessionStatus } from '../domain/session-rules';
import { Group } from '../group/entities/group.entity';
import { Session } from './entities/session.entity';
import { SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class SessionStateService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  async loadInOrg(actor: AcademicsActor, id: string): Promise<SessionLean> {
    const session = await this.sessionModel
      .findOne({ _id: oid(id), organizationId: oid(actor.organizationId) })
      .lean<SessionLean>()
      .exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    return session;
  }

  /** Students who count for attendance and evaluations: everyone not WITHDRAWN (legacy entries have no status). */
  async activeStudentIds(groupId: Types.ObjectId): Promise<string[]> {
    const group = await this.groupModel
      .findOne({ _id: groupId })
      .select('students')
      .lean<{ students?: { studentId: Types.ObjectId; status?: GroupStudentStatus }[] }>()
      .exec();
    return (group?.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).map((s) => String(s.studentId));
  }

  toView(session: SessionLean, now: Date = new Date()): SessionView {
    return { ...session, status: effectiveSessionStatus(session, now) };
  }

  async reload(id: Types.ObjectId, now: Date = new Date()): Promise<SessionView> {
    const session = await this.sessionModel.findOne({ _id: id }).lean<SessionLean>().exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    return this.toView(session, now);
  }
}
```

- [ ] **Step 6: Implement `group-start.service.ts`**

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { generateSessions } from '../domain/session-generation';
import { Group } from '../group/entities/group.entity';
import { GroupStateService } from '../group/group-state.service';
import { GroupView } from '../group/group.types';
import { Session } from './entities/session.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class GroupStartService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectConnection() private readonly connection: Connection,
    private readonly state: GroupStateService
  ) {}

  /** READY_TO_START → RUNNING and every session created in one transaction. */
  async start(actor: AcademicsActor, groupId: string): Promise<GroupView> {
    const group = await this.state.loadInOrg(actor, groupId);
    if (group.status === GroupStatus.CANCELLED) throw new ConflictException(AcademicsErrors.GROUP_CANCELLED);
    if (group.status === GroupStatus.COMPLETED) throw new ConflictException(AcademicsErrors.GROUP_COMPLETED);
    if (group.status !== GroupStatus.READY_TO_START || !group.teacherId) throw new ConflictException(AcademicsErrors.GROUP_NOT_READY);
    if (!group.totalSessions) throw new ConflictException(AcademicsErrors.GROUP_TOTAL_SESSIONS_REQUIRED);

    const cohort = await this.cohortModel.findOne({ _id: group.cohortId }).select('startDate').lean<{ startDate: Date }>().exec();
    if (!cohort) throw new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND);

    const generated = generateSessions(group.schedule, group.timezone, cohort.startDate, group.totalSessions);
    const now = new Date();
    const dbSession = await this.connection.startSession();
    try {
      await dbSession.withTransaction(async () => {
        // Conditional update: a concurrent start matches nothing, so its sessions are never inserted.
        const started = await this.groupModel
          .updateOne(
            { _id: group._id, status: GroupStatus.READY_TO_START, deletedAt: null },
            {
              $set: { status: GroupStatus.RUNNING },
              $push: { statusHistory: { from: GroupStatus.READY_TO_START, to: GroupStatus.RUNNING, by: oid(actor._id), at: now } },
            },
            { session: dbSession }
          )
          .exec();
        if (started.modifiedCount === 0) throw new ConflictException(AcademicsErrors.GROUP_NOT_READY);
        await this.sessionModel.insertMany(
          generated.map((item) => ({
            organizationId: group.organizationId,
            groupId: group._id,
            teacherId: group.teacherId,
            sequence: item.sequence,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            status: SessionStatus.SCHEDULED,
            attendance: [],
          })),
          { session: dbSession }
        );
      });
    } finally {
      await dbSession.endSession();
    }
    return this.state.syncReadiness(group._id);
  }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest session-state group-start --runInBand`
Expected: PASS (state 4 tests, start 8 tests).

- [ ] **Step 8: Lint, type-check and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/session src/academics/follow-up
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-t5.txt 2>&1; grep -c "error TS" .superpowers/tsc-sp2-t5.txt
git add apps/server/src/academics/session apps/server/src/academics/follow-up
git commit -m "feat(academics): session and follow-up entities, start-group transaction"
```
Expected: `0` errors.

---

### Task 6: Session queries — list and detail with scoping and redaction

**Files:**
- Create: `apps/server/src/academics/session/dto/session.dto.ts`
- Create: `apps/server/src/academics/session/session-query.service.ts`
- Test: `apps/server/src/academics/session/session-query.service.spec.ts`

**Interfaces:**
- Consumes: Task 3 `resolveSessionScope`, `redactSession`, `statusFilterFor`, `effectiveSessionStatus`, `SessionAudience`; Task 5 `Session`, `SessionLean`, `SessionView`, `SessionDetailView`; SP1 `ParentService.validateParentChildLink(parentId: ObjectId, childId: ObjectId)`, `withNotDeletedFilter`.
- Produces: `FindSessionsPayload { groupId?, teacherId?, from?, to?, status?, childId? }` (DTO) and `SessionQueryService.findAll(actor, query): Promise<SessionView[]>`, `SessionQueryService.findOne(actor, id): Promise<SessionDetailView>`.

- [ ] **Step 1: Write the DTO**

`session/dto/session.dto.ts` (later tasks append more classes to this file):

```ts
import { IsDateString, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { SessionStatus } from '@darnozom/shared-types';

export class FindSessionsPayload {
  @IsOptional()
  @IsMongoId()
  groupId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  /** Inclusive lower bound on startsAt (ISO date or date-time). */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Exclusive upper bound on startsAt. */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  /** A parent narrows to one child (must be their own). */
  @IsOptional()
  @IsMongoId()
  childId?: string;
}
```

- [ ] **Step 2: Write the failing tests**

`session/session-query.service.spec.ts`:

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, GroupStudentStatus, ParentErrors, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionQueryService } from './session-query.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const CHILD_A = id(2);
const CHILD_B = id(3);
const WITHDRAWN = id(4);
const GROUP = id(10);
const SESSION = id(11);

const actorOf = (roleName: Roles, _id = String(id(90)), additionalRoles: Roles[] = []): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles });

const lean = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  organizationId: new Types.ObjectId(ORG),
  groupId: GROUP,
  teacherId: TEACHER,
  sequence: 1,
  startsAt: new Date('2026-10-12T10:00:00Z'),
  endsAt: new Date('2026-10-12T11:00:00Z'),
  status: SessionStatus.COMPLETED,
  attendance: [
    { studentId: CHILD_A, status: AttendanceStatus.PRESENT, note: 'on time', markedBy: TEACHER, markedAt: new Date() },
    { studentId: CHILD_B, status: AttendanceStatus.ABSENT, note: 'sick', markedBy: TEACHER, markedAt: new Date() },
  ],
  report: {
    evaluations: [
      { studentId: CHILD_A, participation: 5, understanding: 5, behavior: 5, homework: 5, note: 'great' },
      { studentId: CHILD_B, participation: 1, understanding: 1, behavior: 1, homework: 1, note: 'struggling' },
    ],
    summary: 'class summary',
    submittedBy: TEACHER,
    submittedAt: new Date('2026-10-12T11:30:00Z'),
  },
  ...over,
});

function setup() {
  const sessionModel = { find: jest.fn(), findOne: jest.fn() };
  const groupModel = { find: jest.fn(), findOne: jest.fn() };
  const userModel = { find: jest.fn(), findOne: jest.fn() };
  const parentService = { validateParentChildLink: jest.fn().mockResolvedValue(undefined) };
  groupModel.find.mockReturnValue(mockQuery([{ _id: GROUP, name: 'Group A' }]));
  userModel.find.mockReturnValue(mockQuery([]));
  const service = new SessionQueryService(sessionModel as never, groupModel as never, userModel as never, parentService as never);
  return { service, sessionModel, groupModel, userModel, parentService };
}

describe('SessionQueryService.findAll', () => {
  it('scopes organization staff by organizationId and applies the requested filters before it', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([]));
    await service.findAll(actorOf(Roles.COORDINATOR), { groupId: String(GROUP), from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z' });
    const filter = sessionModel.find.mock.calls[0][0];
    expect(filter.$and[0]).toEqual({ groupId: GROUP, startsAt: { $gte: new Date('2026-10-01T00:00:00Z'), $lt: new Date('2026-11-01T00:00:00Z') } });
    expect(filter.$and[2]).toEqual({ organizationId: new Types.ObjectId(ORG) });
  });

  it("limits a teacher to their own sessions even when another teacher's id is requested", async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([]));
    await service.findAll(actorOf(Roles.INSTRUCTOR, String(TEACHER)), { teacherId: String(id(77)) });
    const filter = sessionModel.find.mock.calls[0][0];
    expect(filter.$and[2]).toEqual({ teacherId: TEACHER });
  });

  it('matches the derived status: REPORT_PENDING also finds ended SCHEDULED sessions', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([]));
    await service.findAll(actorOf(Roles.COORDINATOR), { status: SessionStatus.REPORT_PENDING });
    expect(sessionModel.find.mock.calls[0][0].$and[1].$or).toHaveLength(2);
  });

  it('reports the effective status and the group name', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([lean({ status: SessionStatus.SCHEDULED, report: null, endsAt: new Date(Date.now() - 60_000) })]));
    const [view] = await service.findAll(actorOf(Roles.COORDINATOR), {});
    expect(view.status).toBe(SessionStatus.REPORT_PENDING);
    expect(view.groupName).toBe('Group A');
  });

  it("a parent receives only their own child's rows and never the class summary", async () => {
    const { service, sessionModel, groupModel, userModel, parentService } = setup();
    userModel.findOne.mockReturnValue(mockQuery({ childUsersIds: [CHILD_A] }));
    groupModel.find.mockReturnValueOnce(mockQuery([{ _id: GROUP }])).mockReturnValue(mockQuery([{ _id: GROUP, name: 'Group A' }]));
    sessionModel.find.mockReturnValue(mockQuery([lean()]));
    const parent = actorOf(Roles.PARENT);
    const [view] = await service.findAll(parent, { childId: String(CHILD_A) });

    expect(parentService.validateParentChildLink).toHaveBeenCalledWith(new Types.ObjectId(parent._id), CHILD_A);
    expect(view.attendance.map((a) => String(a.studentId))).toEqual([String(CHILD_A)]);
    expect(view.report?.evaluations.map((e) => String(e.studentId))).toEqual([String(CHILD_A)]);
    expect(view.report?.summary).toBeUndefined();
    const text = JSON.stringify(view);
    expect(text).not.toContain('struggling');
    expect(text).not.toContain('sick');
    expect(String(sessionModel.find.mock.calls[0][0].$and[2].groupId.$in[0])).toBe(String(GROUP));
  });

  it("rejects a parent asking for another family's child before reading any session", async () => {
    const { service, sessionModel, parentService } = setup();
    parentService.validateParentChildLink.mockRejectedValue(new ForbiddenException(ParentErrors.CHILD_NOT_LINKED));
    await expect(service.findAll(actorOf(Roles.PARENT), { childId: String(CHILD_B) })).rejects.toThrow(ParentErrors.CHILD_NOT_LINKED);
    expect(sessionModel.find).not.toHaveBeenCalled();
  });

  it('an accountant sees attendance without notes and no evaluations', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([lean()]));
    const [view] = await service.findAll(actorOf(Roles.ACCOUNTANT), {});
    expect(view.attendance).toHaveLength(2);
    expect(view.attendance.every((a) => a.note === undefined)).toBe(true);
    expect(view.report?.evaluations).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('class summary');
  });

  it('shows the full session to its own teacher even when they are also an accountant', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([lean()]));
    const [view] = await service.findAll(actorOf(Roles.ACCOUNTANT, String(TEACHER), [Roles.INSTRUCTOR]), {});
    expect(view.report?.evaluations).toHaveLength(2);
  });

  it('returns nothing for roles with no session scope', async () => {
    const { service, sessionModel } = setup();
    expect(await service.findAll(actorOf(Roles.HR), {})).toEqual([]);
    expect(sessionModel.find).not.toHaveBeenCalled();
  });
});

describe('SessionQueryService.findOne', () => {
  it('404s when the session is outside the actor scope', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.findOne(actorOf(Roles.COORDINATOR), String(SESSION))).rejects.toThrow(new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND));
    await expect(service.findOne(actorOf(Roles.HR), String(SESSION))).rejects.toThrow(new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND));
  });

  it('builds the roster from ACTIVE students only and names everyone involved', async () => {
    const { service, sessionModel, groupModel, userModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(lean()));
    groupModel.findOne.mockReturnValue(
      mockQuery({
        name: 'Group A',
        students: [
          { studentId: CHILD_A, status: GroupStudentStatus.ACTIVE },
          { studentId: CHILD_B },
          { studentId: WITHDRAWN, status: GroupStudentStatus.WITHDRAWN },
        ],
      })
    );
    userModel.find.mockReturnValue(mockQuery([{ _id: CHILD_A, firstName: 'Amal', lastName: 'K' }]));
    const view = await service.findOne(actorOf(Roles.COORDINATOR), String(SESSION));
    expect(view.roster).toEqual([String(CHILD_A), String(CHILD_B)]);
    expect(view.people[String(CHILD_A)]).toBe('Amal K');
    expect(view.groupName).toBe('Group A');
  });

  it('limits a family roster to their own child', async () => {
    const { service, sessionModel, groupModel, userModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(lean()));
    groupModel.find.mockReturnValue(mockQuery([{ _id: GROUP }]));
    groupModel.findOne.mockReturnValue(mockQuery({ name: 'Group A', students: [{ studentId: CHILD_A }, { studentId: CHILD_B }] }));
    userModel.find.mockReturnValue(mockQuery([]));
    const view = await service.findOne(actorOf(Roles.STUDENT, String(CHILD_A)), String(SESSION));
    expect(view.roster).toEqual([String(CHILD_A)]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-query --runInBand`
Expected: FAIL — `Cannot find module './session-query.service'`.

- [ ] **Step 4: Implement `session-query.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { ParentService } from 'src/user/services/parent.service';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { effectiveSessionStatus, redactSession, SessionAudience, statusFilterFor } from '../domain/session-rules';
import { resolveSessionScope } from '../domain/session-scope';
import { Group } from '../group/entities/group.entity';
import { FindSessionsPayload } from './dto/session.dto';
import { Session } from './entities/session.entity';
import { SessionDetailView, SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const LIST_LIMIT = 500;

interface ResolvedScope {
  filter: FilterQuery<Session>;
  audience: SessionAudience;
  visibleStudentIds: string[] | null;
}

@Injectable()
export class SessionQueryService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly parentService: ParentService
  ) {}

  private async groupIdsOf(studentIds: string[]): Promise<Types.ObjectId[]> {
    const groups = await this.groupModel
      .find(withNotDeletedFilter({ 'students.studentId': { $in: studentIds.map((id) => oid(id)) } }))
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    return groups.map((group) => group._id);
  }

  /** Null means the actor may not read any session. */
  private async resolveScope(actor: AcademicsActor, childId?: string): Promise<ResolvedScope | null> {
    const scope = resolveSessionScope(actor);
    switch (scope.kind) {
      case 'ORG': {
        return { filter: { organizationId: oid(actor.organizationId) }, audience: scope.audience, visibleStudentIds: null };
      }
      case 'TEACHER': {
        return { filter: { teacherId: oid(scope.teacherId) }, audience: 'STAFF', visibleStudentIds: null };
      }
      case 'PARENT': {
        let childIds: string[];
        if (childId) {
          await this.parentService.validateParentChildLink(oid(scope.parentId), oid(childId));
          childIds = [childId];
        } else {
          const parent = await this.userModel.findOne({ _id: oid(scope.parentId) }).select('childUsersIds').lean<{ childUsersIds?: Types.ObjectId[] }>().exec();
          childIds = (parent?.childUsersIds ?? []).map(String);
        }
        return { filter: { groupId: { $in: await this.groupIdsOf(childIds) } }, audience: 'FAMILY', visibleStudentIds: childIds };
      }
      case 'STUDENT': {
        return { filter: { groupId: { $in: await this.groupIdsOf([scope.studentId]) } }, audience: 'FAMILY', visibleStudentIds: [scope.studentId] };
      }
      default: {
        return null;
      }
    }
  }

  /** The session's own teacher always gets the full view of it; everyone else gets their scope's redaction. */
  private present(session: SessionLean, resolved: ResolvedScope, actorId: string, now: Date, groupName?: string): SessionView {
    const own = String(session.teacherId) === actorId;
    const redacted = redactSession(session, own ? 'STAFF' : resolved.audience, own ? null : resolved.visibleStudentIds);
    return { ...redacted, status: effectiveSessionStatus(session, now), ...(groupName ? { groupName } : {}) };
  }

  private async peopleNames(ids: string[]): Promise<Record<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return {};
    const users = await this.userModel
      .find({ _id: { $in: unique.map((id) => oid(id)) } })
      .select('_id firstName lastName')
      .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
      .exec();
    return Object.fromEntries(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
  }

  async findAll(actor: AcademicsActor, query: FindSessionsPayload): Promise<SessionView[]> {
    const now = new Date();
    const resolved = await this.resolveScope(actor, query.childId);
    if (!resolved) return [];

    const requested: FilterQuery<Session> = {};
    if (query.groupId) requested.groupId = oid(query.groupId);
    if (query.teacherId) requested.teacherId = oid(query.teacherId);
    if (query.from || query.to) {
      requested.startsAt = { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lt: new Date(query.to) } : {}) };
    }
    const statusFilter = query.status ? statusFilterFor(query.status, now) : {};

    // The scope goes last so it always overrides the requested filters.
    const sessions = await this.sessionModel
      .find({ $and: [requested, statusFilter, resolved.filter] })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ startsAt: 1 })
      .limit(LIST_LIMIT)
      .lean<SessionLean[]>()
      .exec();

    const groupIds = [...new Set(sessions.map((s) => String(s.groupId)))];
    const groups = groupIds.length
      ? await this.groupModel.find({ _id: { $in: groupIds.map((id) => oid(id)) } }).select('_id name').lean<{ _id: Types.ObjectId; name: string }[]>().exec()
      : [];
    const names = new Map(groups.map((g) => [String(g._id), g.name]));
    return sessions.map((session) => this.present(session, resolved, actor._id, now, names.get(String(session.groupId))));
  }

  async findOne(actor: AcademicsActor, id: string): Promise<SessionDetailView> {
    const now = new Date();
    const resolved = await this.resolveScope(actor);
    if (!resolved) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    const session = await this.sessionModel.findOne({ $and: [{ _id: oid(id) }, resolved.filter] }).lean<SessionLean>().exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);

    const group = await this.groupModel
      .findOne({ _id: session.groupId })
      .select('name students')
      .lean<{ name: string; students?: { studentId: Types.ObjectId; status?: GroupStudentStatus }[] }>()
      .exec();
    const view = this.present(session, resolved, actor._id, now, group?.name);
    const visibleIds = String(session.teacherId) === actor._id ? null : resolved.visibleStudentIds;
    const active = (group?.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).map((s) => String(s.studentId));
    const roster = visibleIds ? active.filter((studentId) => visibleIds.includes(studentId)) : active;
    const people = await this.peopleNames([
      ...roster,
      String(session.teacherId),
      ...view.attendance.map((a) => String(a.studentId)),
      ...(view.report?.evaluations ?? []).map((e) => String(e.studentId)),
    ]);
    return { ...view, roster, people };
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest session-query --runInBand`
Expected: PASS (12 tests).

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/session
git add apps/server/src/academics/session
git commit -m "feat(academics): session list and detail with scoping and redaction"
```

---

### Task 7: Attendance — students and teacher

**Files:**
- Modify: `apps/server/src/academics/session/dto/session.dto.ts` (append classes)
- Create: `apps/server/src/academics/session/session-attendance.service.ts`
- Test: `apps/server/src/academics/session/session-attendance.service.spec.ts`

**Interfaces:**
- Consumes: Task 5 `SessionStateService` (`loadInOrg`, `activeStudentIds`, `reload`), Task 3 `checkAttendanceWindow`, shared-types `GROUP_EDITOR_ROLES`, `hasAnyRole`.
- Produces: DTOs `AttendanceEntryDto { studentId, status, note? }`, `MarkAttendancePayload { id, entries }`, `TeacherAttendancePayload { id, status }`; `SessionAttendanceService.markStudents(actor, id, entries: { studentId: string; status: AttendanceStatus; note?: string }[], now?: Date): Promise<SessionView>` and `markTeacher(actor, id, status: AttendanceStatus, now?: Date): Promise<SessionView>`.

- [ ] **Step 1: Append the DTOs**

Add these imports to the top of `session/dto/session.dto.ts` (merge with the existing ones) and the classes at the end:

```ts
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '@darnozom/shared-types';

export class AttendanceEntryDto {
  @IsMongoId()
  studentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class MarkAttendancePayload {
  @IsMongoId()
  id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class TeacherAttendancePayload {
  @IsMongoId()
  id!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}
```

- [ ] **Step 2: Write the failing tests**

`session/session-attendance.service.spec.ts`:

```ts
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionAttendanceService } from './session-attendance.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const A = id(2);
const B = id(3);
const WITHDRAWN = id(4);
const SESSION = id(11);
const GROUP = id(10);
const START = new Date('2026-10-12T14:00:00Z');
const during = new Date('2026-10-12T14:10:00Z');

const actorOf = (roleName: Roles, _id = String(id(90))): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles: [] });
const teacher = actorOf(Roles.INSTRUCTOR, String(TEACHER));
const coordinator = actorOf(Roles.COORDINATOR);

const sessionDoc = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  groupId: GROUP,
  teacherId: TEACHER,
  startsAt: START,
  endsAt: new Date('2026-10-12T15:00:00Z'),
  status: SessionStatus.SCHEDULED,
  teacherAttendance: null,
  attendance: [],
  ...over,
});

function setup(session = sessionDoc()) {
  const sessionModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ matchedCount: 1, modifiedCount: 1 })) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(session),
    activeStudentIds: jest.fn().mockResolvedValue([String(A), String(B)]), // WITHDRAWN student is not listed
    reload: jest.fn().mockResolvedValue({ reloaded: true }),
  };
  return { service: new SessionAttendanceService(sessionModel as never, state as never), sessionModel, state };
}

const entry = (studentId: Types.ObjectId, status = AttendanceStatus.PRESENT, note?: string) => ({ studentId: String(studentId), status, ...(note ? { note } : {}) });

describe('SessionAttendanceService.markStudents', () => {
  it("records the rows and defaults the teacher's own attendance to PRESENT", async () => {
    const { service, sessionModel } = setup();
    await service.markStudents(teacher, String(SESSION), [entry(A), entry(B, AttendanceStatus.LATE, ' bus ')], during);
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } });
    expect(update.$set.teacherAttendance).toBe(AttendanceStatus.PRESENT);
    expect(update.$set.attendance).toEqual([
      { studentId: A, status: AttendanceStatus.PRESENT, markedBy: TEACHER, markedAt: during },
      { studentId: B, status: AttendanceStatus.LATE, note: 'bus', markedBy: TEACHER, markedAt: during },
    ]);
  });

  it('does not touch teacherAttendance when staff record attendance or it is already set', async () => {
    const staffRun = setup();
    await staffRun.service.markStudents(coordinator, String(SESSION), [entry(A)], during);
    expect(staffRun.sessionModel.updateOne.mock.calls[0][1].$set.teacherAttendance).toBeUndefined();

    const setRun = setup(sessionDoc({ teacherAttendance: AttendanceStatus.LATE }));
    await setRun.service.markStudents(teacher, String(SESSION), [entry(A)], during);
    expect(setRun.sessionModel.updateOne.mock.calls[0][1].$set.teacherAttendance).toBeUndefined();
  });

  it('keeps rows for students not in this request and replaces re-marked ones', async () => {
    const existing = [
      { studentId: A, status: AttendanceStatus.ABSENT, markedBy: TEACHER, markedAt: START },
      { studentId: B, status: AttendanceStatus.PRESENT, markedBy: TEACHER, markedAt: START },
    ];
    const { service, sessionModel } = setup(sessionDoc({ attendance: existing }));
    await service.markStudents(teacher, String(SESSION), [entry(A, AttendanceStatus.EXCUSED)], during);
    const written = sessionModel.updateOne.mock.calls[0][1].$set.attendance;
    expect(written).toHaveLength(2);
    expect(written.find((r: { studentId: Types.ObjectId }) => String(r.studentId) === String(B)).status).toBe(AttendanceStatus.PRESENT);
    expect(written.find((r: { studentId: Types.ObjectId }) => String(r.studentId) === String(A)).status).toBe(AttendanceStatus.EXCUSED);
  });

  it("only the session's teacher or a group editor may record attendance", async () => {
    const { service, sessionModel } = setup();
    await expect(service.markStudents(actorOf(Roles.INSTRUCTOR), String(SESSION), [entry(A)], during)).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER)
    );
    await expect(service.markStudents(actorOf(Roles.ACCOUNTANT), String(SESSION), [entry(A)], during)).rejects.toThrow(ForbiddenException);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('is closed before the 15-minute window, after the report, and for cancelled sessions', async () => {
    const early = setup();
    await expect(early.service.markStudents(teacher, String(SESSION), [entry(A)], new Date('2026-10-12T13:44:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.ATTENDANCE_NOT_OPEN)
    );
    const done = setup(sessionDoc({ status: SessionStatus.COMPLETED }));
    await expect(done.service.markStudents(teacher, String(SESSION), [entry(A)], during)).rejects.toThrow(new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED));
    const cancelled = setup(sessionDoc({ status: SessionStatus.CANCELLED }));
    await expect(cancelled.service.markStudents(teacher, String(SESSION), [entry(A)], during)).rejects.toThrow(new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED));
  });

  it('ignores withdrawn students: they and strangers cannot be marked, nor can a student appear twice', async () => {
    const { service, sessionModel } = setup();
    await expect(service.markStudents(teacher, String(SESSION), [entry(WITHDRAWN)], during)).rejects.toThrow(
      new BadRequestException(AcademicsErrors.ATTENDANCE_STUDENT_INVALID)
    );
    await expect(service.markStudents(teacher, String(SESSION), [entry(id(99))], during)).rejects.toThrow(BadRequestException);
    await expect(service.markStudents(teacher, String(SESSION), [entry(A), entry(A, AttendanceStatus.LATE)], during)).rejects.toThrow(BadRequestException);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('closes the race with a submitted report: the guarded update matching nothing is ATTENDANCE_CLOSED', async () => {
    const { service, sessionModel } = setup();
    sessionModel.updateOne.mockReturnValue(mockQuery({ matchedCount: 0, modifiedCount: 0 }));
    await expect(service.markStudents(teacher, String(SESSION), [entry(A)], during)).rejects.toThrow(new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED));
  });
});

describe('SessionAttendanceService.markTeacher', () => {
  it("sets the teacher's attendance, also after the report was submitted", async () => {
    const { service, sessionModel } = setup(sessionDoc({ status: SessionStatus.COMPLETED }));
    await service.markTeacher(coordinator, String(SESSION), AttendanceStatus.ABSENT, during);
    expect(sessionModel.updateOne).toHaveBeenCalledWith({ _id: SESSION }, { $set: { teacherAttendance: AttendanceStatus.ABSENT } });
  });

  it('refuses a cancelled session', async () => {
    const { service, sessionModel } = setup(sessionDoc({ status: SessionStatus.CANCELLED }));
    await expect(service.markTeacher(coordinator, String(SESSION), AttendanceStatus.PRESENT, during)).rejects.toThrow(
      new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-attendance --runInBand`
Expected: FAIL — `Cannot find module './session-attendance.service'`.

- [ ] **Step 4: Implement**

```ts
import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, GROUP_EDITOR_ROLES, hasAnyRole, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { checkAttendanceWindow } from '../domain/session-rules';
import { Session } from './entities/session.entity';
import { SessionStateService } from './session-state.service';
import { SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface AttendanceEntryInput {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

@Injectable()
export class SessionAttendanceService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    private readonly state: SessionStateService
  ) {}

  /** Student attendance: the session's teacher or a group editor, from 15 minutes before the start until the report is submitted. */
  async markStudents(actor: AcademicsActor, id: string, entries: AttendanceEntryInput[], now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    const isTeacher = String(session.teacherId) === actor._id;
    if (!isTeacher && !hasAnyRole(actor, GROUP_EDITOR_ROLES)) throw new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER);

    const windowError = checkAttendanceWindow(session, now);
    if (windowError) throw new ConflictException(windowError);

    const active = await this.state.activeStudentIds(session.groupId);
    const ids = entries.map((entry) => entry.studentId);
    if (new Set(ids).size !== ids.length || ids.some((studentId) => !active.includes(studentId))) {
      throw new BadRequestException(AcademicsErrors.ATTENDANCE_STUDENT_INVALID);
    }

    const incoming = entries.map((entry) => ({
      studentId: oid(entry.studentId),
      status: entry.status,
      ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
      markedBy: oid(actor._id),
      markedAt: now,
    }));
    const kept = session.attendance.filter((row) => !ids.includes(String(row.studentId)));
    const $set: Record<string, unknown> = { attendance: [...kept, ...incoming] };
    // Assumption A1: the teacher recording student attendance means the teacher was present, unless someone already set it.
    if (isTeacher && session.teacherAttendance == null) $set.teacherAttendance = AttendanceStatus.PRESENT;

    const result = await this.sessionModel
      .updateOne({ _id: session._id, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } }, { $set })
      .exec();
    if (result.matchedCount === 0) throw new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED);
    return this.state.reload(session._id, now);
  }

  /** Teacher attendance is set by group editors (the controller requires UPDATE GROUP). */
  async markTeacher(actor: AcademicsActor, id: string, status: AttendanceStatus, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    if (session.status === SessionStatus.CANCELLED) throw new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED);
    await this.sessionModel.updateOne({ _id: session._id }, { $set: { teacherAttendance: status } }).exec();
    return this.state.reload(session._id, now);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest session-attendance --runInBand`
Expected: PASS (9 tests).

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/session
git add apps/server/src/academics/session
git commit -m "feat(academics): student and teacher attendance"
```

---

### Task 8: Completion — cancel, follow-up creation, group auto-complete, overdue sweep

**Files:**
- Modify: `apps/server/src/academics/session/dto/session.dto.ts` (append `CancelSessionPayload`)
- Create: `apps/server/src/academics/session/session-completion.service.ts`
- Test: `apps/server/src/academics/session/session-completion.service.spec.ts`

**Interfaces:**
- Consumes: Task 5 `SessionStateService`, `Session`/`FollowUp` entities, `SessionLean`; Task 3 `effectiveSessionStatus`.
- Produces: `CancelSessionPayload { id, reason }`; `SessionCompletionService` with
  - `onClosed(session: SessionLean, closedAs: SessionStatus.COMPLETED | SessionStatus.CANCELLED): Promise<void>` — when `closedAs === COMPLETED && session.sequence === 1`, upserts one `FollowUp` per ACTIVE student (idempotent); then moves the group `RUNNING → COMPLETED` if no session is left open;
  - `cancel(actor, id, reason, now?): Promise<SessionView>`;
  - `sweepOverdue(now: Date): Promise<number>` — persists `SCHEDULED → REPORT_PENDING` for ended sessions and returns the modified count.

- [ ] **Step 1: Append the DTO**

```ts
import { IsNotEmpty } from 'class-validator'; // merge into the existing class-validator import

export class CancelSessionPayload {
  @IsMongoId()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
```

- [ ] **Step 2: Write the failing tests**

`session/session-completion.service.spec.ts`:

```ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionCompletionService } from './session-completion.service';

const ORG = new Types.ObjectId('64b0000000000000000000bb');
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const GROUP = id(10);
const SESSION = id(11);
const A = id(2);
const B = id(3);
const actor: AcademicsActor = { _id: String(id(90)), organizationId: String(ORG), roleName: Roles.COORDINATOR, additionalRoles: [] };
const START = new Date('2026-10-12T14:00:00Z');
const END = new Date('2026-10-12T15:00:00Z');

const sessionDoc = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  organizationId: ORG,
  groupId: GROUP,
  teacherId: id(1),
  sequence: 1,
  startsAt: START,
  endsAt: END,
  status: SessionStatus.SCHEDULED,
  attendance: [],
  ...over,
});

function setup(openSessions = 0) {
  const sessionModel = {
    countDocuments: jest.fn().mockReturnValue(mockQuery(openSessions)),
    updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })),
    updateMany: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 3 })),
  };
  const groupModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const followUpModel = { bulkWrite: jest.fn().mockResolvedValue({}) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(sessionDoc()),
    activeStudentIds: jest.fn().mockResolvedValue([String(A), String(B)]),
    reload: jest.fn().mockResolvedValue({ reloaded: true }),
  };
  const service = new SessionCompletionService(sessionModel as never, groupModel as never, followUpModel as never, state as never);
  return { service, sessionModel, groupModel, followUpModel, state };
}

describe('SessionCompletionService.onClosed', () => {
  it('creates one follow-up per ACTIVE student when session 1 completes, idempotently', async () => {
    const { service, followUpModel } = setup(2);
    await service.onClosed(sessionDoc({ status: SessionStatus.COMPLETED }) as never, SessionStatus.COMPLETED);
    const ops = followUpModel.bulkWrite.mock.calls[0][0];
    expect(ops).toHaveLength(2);
    expect(ops[0].updateOne.filter).toEqual({ groupId: GROUP, studentId: A });
    expect(ops[0].updateOne.upsert).toBe(true);
    expect(ops[0].updateOne.update.$setOnInsert).toEqual({ organizationId: ORG, groupId: GROUP, sessionId: SESSION, studentId: A });
  });

  it('creates no follow-ups for later sessions or when session 1 is cancelled', async () => {
    const later = setup(2);
    await later.service.onClosed(sessionDoc({ sequence: 2 }) as never, SessionStatus.COMPLETED);
    const cancelled = setup(2);
    await cancelled.service.onClosed(sessionDoc() as never, SessionStatus.CANCELLED);
    expect(later.followUpModel.bulkWrite).not.toHaveBeenCalled();
    expect(cancelled.followUpModel.bulkWrite).not.toHaveBeenCalled();
  });

  it('completes the RUNNING group once no session is left open', async () => {
    const { service, sessionModel, groupModel } = setup(0);
    await service.onClosed(sessionDoc({ sequence: 5 }) as never, SessionStatus.COMPLETED);
    expect(sessionModel.countDocuments).toHaveBeenCalledWith({ groupId: GROUP, status: { $nin: [SessionStatus.COMPLETED, SessionStatus.CANCELLED] } });
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: GROUP, status: GroupStatus.RUNNING });
    expect(update.$set).toEqual({ status: GroupStatus.COMPLETED });
    expect(update.$push.statusHistory).toMatchObject({ from: GroupStatus.RUNNING, to: GroupStatus.COMPLETED, by: null });
  });

  it('keeps the group RUNNING while a session is still open', async () => {
    const { service, groupModel } = setup(1);
    await service.onClosed(sessionDoc({ sequence: 2 }) as never, SessionStatus.COMPLETED);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('SessionCompletionService.cancel', () => {
  it('cancels a session that has not ended, with the reason and who did it', async () => {
    const { service, sessionModel } = setup(2);
    await service.cancel(actor, String(SESSION), '  teacher is ill ', new Date('2026-10-12T13:00:00Z'));
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: SessionStatus.SCHEDULED });
    expect(update.$set).toEqual({ status: SessionStatus.CANCELLED, cancelReason: 'teacher is ill', cancelledBy: new Types.ObjectId(actor._id) });
  });

  it('needs a reason', async () => {
    const { service, sessionModel } = setup();
    await expect(service.cancel(actor, String(SESSION), '   ', new Date('2026-10-12T13:00:00Z'))).rejects.toThrow(new BadRequestException(AcademicsErrors.CANCEL_REASON_REQUIRED));
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('refuses sessions that already ended, were reported or were cancelled', async () => {
    const ended = setup();
    await expect(ended.service.cancel(actor, String(SESSION), 'x', new Date('2026-10-12T15:00:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED)
    );
    for (const status of [SessionStatus.COMPLETED, SessionStatus.CANCELLED]) {
      const run = setup();
      run.state.loadInOrg.mockResolvedValue(sessionDoc({ status }));
      await expect(run.service.cancel(actor, String(SESSION), 'x', new Date('2026-10-12T13:00:00Z'))).rejects.toThrow(ConflictException);
    }
  });

  it('turns a lost race into a conflict', async () => {
    const { service, sessionModel } = setup();
    sessionModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
    await expect(service.cancel(actor, String(SESSION), 'x', new Date('2026-10-12T13:00:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED)
    );
  });

  it('completes the group when the cancelled session was the last open one, without creating follow-ups', async () => {
    const { service, groupModel, followUpModel } = setup(0);
    await service.cancel(actor, String(SESSION), 'holiday', new Date('2026-10-12T13:00:00Z'));
    expect(groupModel.updateOne).toHaveBeenCalled();
    expect(followUpModel.bulkWrite).not.toHaveBeenCalled();
  });
});

describe('SessionCompletionService.sweepOverdue', () => {
  it('persists REPORT_PENDING for ended SCHEDULED sessions and returns how many changed', async () => {
    const { service, sessionModel } = setup();
    const now = new Date('2026-10-12T16:00:00Z');
    expect(await service.sweepOverdue(now)).toBe(3);
    expect(sessionModel.updateMany).toHaveBeenCalledWith(
      { status: SessionStatus.SCHEDULED, endsAt: { $lte: now } },
      { $set: { status: SessionStatus.REPORT_PENDING } }
    );
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-completion --runInBand`
Expected: FAIL — `Cannot find module './session-completion.service'`.

- [ ] **Step 4: Implement**

```ts
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { effectiveSessionStatus } from '../domain/session-rules';
import { FollowUp } from '../follow-up/entities/follow-up.entity';
import { Group } from '../group/entities/group.entity';
import { Session } from './entities/session.entity';
import { SessionStateService } from './session-state.service';
import { SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class SessionCompletionService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUp>,
    private readonly state: SessionStateService
  ) {}

  /** Runs after a session became COMPLETED (report submitted) or CANCELLED. */
  async onClosed(session: SessionLean, closedAs: SessionStatus.COMPLETED | SessionStatus.CANCELLED): Promise<void> {
    if (closedAs === SessionStatus.COMPLETED && session.sequence === 1) await this.createFollowUps(session);
    await this.completeGroupIfDone(session.groupId);
  }

  /** One row per ACTIVE student; $setOnInsert keeps an already-recorded follow-up untouched. */
  private async createFollowUps(session: SessionLean): Promise<void> {
    const studentIds = await this.state.activeStudentIds(session.groupId);
    if (studentIds.length === 0) return;
    await this.followUpModel.bulkWrite(
      studentIds.map((studentId) => ({
        updateOne: {
          filter: { groupId: session.groupId, studentId: oid(studentId) },
          update: { $setOnInsert: { organizationId: session.organizationId, groupId: session.groupId, sessionId: session._id, studentId: oid(studentId) } },
          upsert: true,
        },
      }))
    );
  }

  private async completeGroupIfDone(groupId: Types.ObjectId): Promise<void> {
    const open = await this.sessionModel.countDocuments({ groupId, status: { $nin: [SessionStatus.COMPLETED, SessionStatus.CANCELLED] } }).exec();
    if (open > 0) return;
    await this.groupModel
      .updateOne(
        { _id: groupId, status: GroupStatus.RUNNING },
        {
          $set: { status: GroupStatus.COMPLETED },
          $push: { statusHistory: { from: GroupStatus.RUNNING, to: GroupStatus.COMPLETED, by: null, at: new Date() } },
        }
      )
      .exec();
  }

  /** SCHEDULED → CANCELLED, only while the session has not ended; a cancelled session is not replaced. */
  async cancel(actor: AcademicsActor, id: string, reason: string, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    const trimmed = reason?.trim();
    if (!trimmed) throw new BadRequestException(AcademicsErrors.CANCEL_REASON_REQUIRED);
    if (effectiveSessionStatus(session, now) !== SessionStatus.SCHEDULED) throw new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED);

    const result = await this.sessionModel
      .updateOne({ _id: session._id, status: SessionStatus.SCHEDULED }, { $set: { status: SessionStatus.CANCELLED, cancelReason: trimmed, cancelledBy: oid(actor._id) } })
      .exec();
    if (result.modifiedCount === 0) throw new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED);
    await this.onClosed({ ...session, status: SessionStatus.CANCELLED }, SessionStatus.CANCELLED);
    return this.state.reload(session._id, now);
  }

  /** The BullMQ job: persists the derived REPORT_PENDING status. */
  async sweepOverdue(now: Date): Promise<number> {
    const result = await this.sessionModel
      .updateMany({ status: SessionStatus.SCHEDULED, endsAt: { $lte: now } }, { $set: { status: SessionStatus.REPORT_PENDING } })
      .exec();
    return result.modifiedCount;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest session-completion --runInBand`
Expected: PASS (11 tests).

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/session
git add apps/server/src/academics/session
git commit -m "feat(academics): session cancel, follow-up creation, group auto-complete and overdue sweep"
```

---

### Task 9: Report — submit and edit

**Files:**
- Modify: `apps/server/src/academics/session/dto/session.dto.ts` (append report DTOs)
- Create: `apps/server/src/academics/session/session-report.service.ts`
- Test: `apps/server/src/academics/session/session-report.service.spec.ts`

**Interfaces:**
- Consumes: Task 3 `checkReportOpen`, `checkReportEditable`, `missingAttendance`, `validateEvaluations`; Task 5 `SessionStateService`; Task 8 `SessionCompletionService.onClosed`.
- Produces: DTOs `EvaluationDto { studentId, participation, understanding, behavior, homework, note? }`, `ReportDto { evaluations, summary? }`, `ReportPayload { id, data: ReportDto }`; `SessionReportService.submit(actor, id, dto: ReportDto, now?): Promise<SessionView>` and `edit(actor, id, dto: ReportDto, now?): Promise<SessionView>` (both: session's teacher only).

- [ ] **Step 1: Append the DTOs**

```ts
// merge IsInt, Max, Min into the existing class-validator import
export class EvaluationDto {
  @IsMongoId()
  studentId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  participation!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  understanding!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  behavior!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  homework!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReportDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => EvaluationDto)
  evaluations!: EvaluationDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;
}

export class ReportPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => ReportDto)
  data!: ReportDto;
}
```

- [ ] **Step 2: Write the failing tests**

`session/session-report.service.spec.ts`:

```ts
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionReportService } from './session-report.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const A = id(2);
const B = id(3);
const WITHDRAWN = id(4);
const SESSION = id(11);
const GROUP = id(10);
const START = new Date('2026-10-12T14:00:00Z');
const after = new Date('2026-10-12T15:10:00Z');

const actorOf = (roleName: Roles, _id = String(id(90))): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles: [] });
const teacher = actorOf(Roles.INSTRUCTOR, String(TEACHER));

const marked = (studentId: Types.ObjectId) => ({ studentId, status: AttendanceStatus.PRESENT, markedBy: TEACHER, markedAt: START });
const sessionDoc = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  organizationId: new Types.ObjectId(ORG),
  groupId: GROUP,
  teacherId: TEACHER,
  sequence: 1,
  startsAt: START,
  endsAt: new Date('2026-10-12T15:00:00Z'),
  status: SessionStatus.REPORT_PENDING,
  attendance: [marked(A), marked(B)],
  report: null,
  ...over,
});

const ev = (studentId: Types.ObjectId, score = 4, note?: string) => ({ studentId: String(studentId), participation: score, understanding: score, behavior: score, homework: score, ...(note ? { note } : {}) });

function setup(session = sessionDoc()) {
  const sessionModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(session),
    activeStudentIds: jest.fn().mockResolvedValue([String(A), String(B)]), // WITHDRAWN student is not active
    reload: jest.fn().mockResolvedValue({ reloaded: true }),
  };
  const completion = { onClosed: jest.fn().mockResolvedValue(undefined) };
  return { service: new SessionReportService(sessionModel as never, state as never, completion as never), sessionModel, state, completion };
}

describe('SessionReportService.submit', () => {
  it('stores the report, completes the session and triggers the completion hooks', async () => {
    const { service, sessionModel, completion } = setup();
    await service.submit(teacher, String(SESSION), { evaluations: [ev(A, 5, ' great '), ev(B, 2)], summary: ' good class ' }, after);
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } });
    expect(update.$set.status).toBe(SessionStatus.COMPLETED);
    expect(update.$set.report).toEqual({
      evaluations: [
        { studentId: A, participation: 5, understanding: 5, behavior: 5, homework: 5, note: 'great' },
        { studentId: B, participation: 2, understanding: 2, behavior: 2, homework: 2 },
      ],
      summary: 'good class',
      submittedBy: TEACHER,
      submittedAt: after,
    });
    expect(completion.onClosed).toHaveBeenCalledWith(expect.objectContaining({ _id: SESSION, status: SessionStatus.COMPLETED }), SessionStatus.COMPLETED);
  });

  it('may be submitted while still SCHEDULED once the class has started', async () => {
    const { service } = setup(sessionDoc({ status: SessionStatus.SCHEDULED }));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-12T14:30:00Z'))).resolves.toBeDefined();
  });

  it('is not open before the session starts', async () => {
    const { service, sessionModel } = setup(sessionDoc({ status: SessionStatus.SCHEDULED }));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-12T13:59:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_NOT_OPEN)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('only the session teacher may submit — not staff, not another teacher', async () => {
    const { service, sessionModel } = setup();
    await expect(service.submit(actorOf(Roles.COORDINATOR), String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER)
    );
    await expect(service.submit(actorOf(Roles.INSTRUCTOR), String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(ForbiddenException);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('rejects a second submission, including when two submissions race', async () => {
    const done = setup(sessionDoc({ status: SessionStatus.COMPLETED }));
    await expect(done.service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_ALREADY_SUBMITTED)
    );
    const race = setup();
    race.sessionModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
    await expect(race.service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_ALREADY_SUBMITTED)
    );
    expect(race.completion.onClosed).not.toHaveBeenCalled();
  });

  it('needs attendance for every ACTIVE student first', async () => {
    const { service, sessionModel } = setup(sessionDoc({ attendance: [marked(A)] }));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.ATTENDANCE_INCOMPLETE)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('ignores withdrawn students: no attendance or evaluation is needed for them, and one cannot be added', async () => {
    const { service } = setup(sessionDoc({ attendance: [marked(A), marked(B)] })); // nothing recorded for WITHDRAWN
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).resolves.toBeDefined();
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B), ev(WITHDRAWN)] }, after)).rejects.toThrow(
      new BadRequestException(AcademicsErrors.REPORT_INVALID)
    );
  });

  it('requires one in-range evaluation per student', async () => {
    const { service } = setup();
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A)] }, after)).rejects.toThrow(new BadRequestException(AcademicsErrors.REPORT_INVALID));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A, 6), ev(B)] }, after)).rejects.toThrow(BadRequestException);
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A, 0), ev(B)] }, after)).rejects.toThrow(BadRequestException);
  });
});

describe('SessionReportService.edit', () => {
  const submittedAt = new Date('2026-10-12T15:30:00Z');
  const done = (over: Record<string, unknown> = {}) =>
    sessionDoc({
      status: SessionStatus.COMPLETED,
      report: {
        evaluations: [
          { studentId: A, participation: 3, understanding: 3, behavior: 3, homework: 3 },
          { studentId: WITHDRAWN, participation: 2, understanding: 2, behavior: 2, homework: 2 },
        ],
        submittedBy: TEACHER,
        submittedAt,
      },
      ...over,
    });

  it('replaces the evaluations within 24 hours and keeps who/when it was first submitted', async () => {
    const { service, sessionModel, completion } = setup(done());
    await service.edit(teacher, String(SESSION), { evaluations: [ev(A, 5), ev(B, 5), ev(WITHDRAWN, 2)], summary: 'updated' }, new Date('2026-10-13T10:00:00Z'));
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: SessionStatus.COMPLETED });
    expect(update.$set.report.submittedAt).toBe(submittedAt);
    expect(update.$set.report.submittedBy).toBe(TEACHER);
    expect(update.$set.report.summary).toBe('updated');
    expect(update.$set.report.evaluations).toHaveLength(3);
    expect(completion.onClosed).not.toHaveBeenCalled();
  });

  it('is closed after 24 hours', async () => {
    const { service, sessionModel } = setup(done());
    await expect(service.edit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-13T15:31:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_EDIT_WINDOW_CLOSED)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('rejects edits by staff and by a session without a report', async () => {
    const staff = setup(done());
    await expect(staff.service.edit(actorOf(Roles.COORDINATOR), String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-13T10:00:00Z'))).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER)
    );
    const none = setup();
    await expect(none.service.edit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_NOT_SUBMITTED)
    );
  });

  it('still validates the evaluations', async () => {
    const { service } = setup(done());
    await expect(service.edit(teacher, String(SESSION), { evaluations: [ev(A, 9), ev(B)] }, new Date('2026-10-13T10:00:00Z'))).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-report --runInBand`
Expected: FAIL — `Cannot find module './session-report.service'`.

- [ ] **Step 4: Implement**

```ts
import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { checkReportEditable, checkReportOpen, missingAttendance, validateEvaluations } from '../domain/session-rules';
import { ReportDto } from './dto/session.dto';
import { Session } from './entities/session.entity';
import { SessionCompletionService } from './session-completion.service';
import { SessionStateService } from './session-state.service';
import { SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

function evaluationsOf(dto: ReportDto) {
  return dto.evaluations.map((entry) => ({
    studentId: oid(entry.studentId),
    participation: entry.participation,
    understanding: entry.understanding,
    behavior: entry.behavior,
    homework: entry.homework,
    ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
  }));
}

@Injectable()
export class SessionReportService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    private readonly state: SessionStateService,
    private readonly completion: SessionCompletionService
  ) {}

  private assertTeacher(actor: AcademicsActor, session: SessionLean) {
    if (String(session.teacherId) !== actor._id) throw new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER);
  }

  /** The session's teacher submits once the class has started; attendance for every ACTIVE student must exist. */
  async submit(actor: AcademicsActor, id: string, dto: ReportDto, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    this.assertTeacher(actor, session);
    const openError = checkReportOpen(session, now);
    if (openError) throw new ConflictException(openError);

    const active = await this.state.activeStudentIds(session.groupId);
    if (missingAttendance(active, session.attendance).length > 0) throw new ConflictException(AcademicsErrors.ATTENDANCE_INCOMPLETE);
    const invalid = validateEvaluations(active, active, dto.evaluations);
    if (invalid) throw new BadRequestException(invalid);

    const report = {
      evaluations: evaluationsOf(dto),
      ...(dto.summary?.trim() ? { summary: dto.summary.trim() } : {}),
      submittedBy: oid(actor._id),
      submittedAt: now,
    };
    const result = await this.sessionModel
      .updateOne({ _id: session._id, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } }, { $set: { report, status: SessionStatus.COMPLETED } })
      .exec();
    if (result.modifiedCount === 0) throw new ConflictException(AcademicsErrors.REPORT_ALREADY_SUBMITTED);

    await this.completion.onClosed({ ...session, status: SessionStatus.COMPLETED }, SessionStatus.COMPLETED);
    return this.state.reload(session._id, now);
  }

  /** The same teacher may correct the report for 24 hours after submitting it (the window is not extended by edits). */
  async edit(actor: AcademicsActor, id: string, dto: ReportDto, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    this.assertTeacher(actor, session);
    const editError = checkReportEditable(session, now);
    if (editError) throw new ConflictException(editError);
    const existing = session.report!;

    const active = await this.state.activeStudentIds(session.groupId);
    // Students withdrawn since the first submission keep their evaluation, but are not required.
    const allowed = [...new Set([...active, ...existing.evaluations.map((entry) => String(entry.studentId))])];
    const invalid = validateEvaluations(active, allowed, dto.evaluations);
    if (invalid) throw new BadRequestException(invalid);

    const report = {
      evaluations: evaluationsOf(dto),
      ...(dto.summary?.trim() ? { summary: dto.summary.trim() } : {}),
      submittedBy: existing.submittedBy,
      submittedAt: existing.submittedAt,
    };
    await this.sessionModel.updateOne({ _id: session._id, status: SessionStatus.COMPLETED }, { $set: { report } }).exec();
    return this.state.reload(session._id, now);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest session-report --runInBand`
Expected: PASS (12 tests).

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/session
git add apps/server/src/academics/session
git commit -m "feat(academics): session report submit and 24-hour edit"
```

---

### Task 10: First-session follow-ups

**Files:**
- Create: `apps/server/src/academics/follow-up/dto/follow-up.dto.ts`
- Create: `apps/server/src/academics/follow-up/follow-up.service.ts`
- Test: `apps/server/src/academics/follow-up/follow-up.service.spec.ts`

**Interfaces:**
- Consumes: Task 5 `FollowUp` entity, `FollowUpLean`; Task 4 `GroupStudentsService.markWithdrawn(groupId: Types.ObjectId, studentId: string): Promise<void>`; shared-types `FollowUpDecision`; `OptionalNonNull`.
- Produces: DTOs `FollowUpDto { parentFeedback?, decision? }`, `UpdateFollowUpPayload { id, data }`; `FollowUpService.list(actor, groupId: string): Promise<{ rows: FollowUpLean[]; people: Record<string, string> }>` and `update(actor, id: string, dto: FollowUpDto): Promise<FollowUpLean>`.

- [ ] **Step 1: Write the DTOs**

`follow-up/dto/follow-up.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsString, MaxLength, ValidateNested } from 'class-validator';
import { FollowUpDecision } from '@darnozom/shared-types';
import { OptionalNonNull } from '../../common/optional-non-null';

export class FollowUpDto {
  @OptionalNonNull()
  @IsString()
  @MaxLength(2000)
  parentFeedback?: string;

  @OptionalNonNull()
  @IsEnum(FollowUpDecision)
  decision?: FollowUpDecision;
}

export class UpdateFollowUpPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => FollowUpDto)
  data!: FollowUpDto;
}
```

- [ ] **Step 2: Write the failing tests**

`follow-up/follow-up.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, FollowUpDecision, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { FollowUpService } from './follow-up.service';

const ORG = new Types.ObjectId('64b0000000000000000000bb');
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const GROUP = id(10);
const FOLLOW_UP = id(20);
const STUDENT = id(2);
const actor: AcademicsActor = { _id: String(id(90)), organizationId: String(ORG), roleName: Roles.COORDINATOR, additionalRoles: [] };

const row = (over: Record<string, unknown> = {}) => ({ _id: FOLLOW_UP, organizationId: ORG, groupId: GROUP, sessionId: id(11), studentId: STUDENT, ...over });

function setup() {
  const followUpModel = { find: jest.fn(), findOne: jest.fn(), updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const groupModel = { findOne: jest.fn() };
  const userModel = { find: jest.fn().mockReturnValue(mockQuery([{ _id: STUDENT, firstName: 'Amal', lastName: 'K' }])) };
  const groupStudents = { markWithdrawn: jest.fn().mockResolvedValue(undefined) };
  const service = new FollowUpService(followUpModel as never, groupModel as never, userModel as never, groupStudents as never);
  return { service, followUpModel, groupModel, userModel, groupStudents };
}

describe('FollowUpService.list', () => {
  it("lists a group's rows with student names, only inside the actor organization", async () => {
    const { service, followUpModel, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery({ _id: GROUP }));
    followUpModel.find.mockReturnValue(mockQuery([row()]));
    const result = await service.list(actor, String(GROUP));
    expect(groupModel.findOne.mock.calls[0][0]).toMatchObject({ _id: GROUP, organizationId: ORG });
    expect(followUpModel.find).toHaveBeenCalledWith({ groupId: GROUP, organizationId: ORG });
    expect(result.rows).toHaveLength(1);
    expect(result.people[String(STUDENT)]).toBe('Amal K');
  });

  it('404s for a group outside the organization', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.list(actor, String(GROUP))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
  });
});

describe('FollowUpService.update', () => {
  it('records the feedback and decision with who and when', async () => {
    const { service, followUpModel, groupStudents } = setup();
    followUpModel.findOne.mockReturnValueOnce(mockQuery(row())).mockReturnValueOnce(mockQuery(row({ decision: FollowUpDecision.CONTINUE })));
    await service.update(actor, String(FOLLOW_UP), { parentFeedback: '  very happy ', decision: FollowUpDecision.CONTINUE });
    const [filter, update] = followUpModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: FOLLOW_UP });
    expect(update.$set).toMatchObject({ parentFeedback: 'very happy', decision: FollowUpDecision.CONTINUE, recordedBy: new Types.ObjectId(actor._id) });
    expect(update.$set.recordedAt).toBeInstanceOf(Date);
    expect(groupStudents.markWithdrawn).not.toHaveBeenCalled();
  });

  it('WITHDRAW sets the student to WITHDRAWN in the group', async () => {
    const { service, followUpModel, groupStudents } = setup();
    followUpModel.findOne.mockReturnValue(mockQuery(row()));
    await service.update(actor, String(FOLLOW_UP), { decision: FollowUpDecision.WITHDRAW });
    expect(groupStudents.markWithdrawn).toHaveBeenCalledWith(GROUP, String(STUDENT));
  });

  it('only writes the fields that were sent', async () => {
    const { service, followUpModel } = setup();
    followUpModel.findOne.mockReturnValue(mockQuery(row()));
    await service.update(actor, String(FOLLOW_UP), { parentFeedback: 'note' });
    expect(followUpModel.updateOne.mock.calls[0][1].$set.decision).toBeUndefined();
  });

  it('404s for a follow-up outside the organization', async () => {
    const { service, followUpModel, groupStudents } = setup();
    followUpModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.update(actor, String(FOLLOW_UP), { decision: FollowUpDecision.WITHDRAW })).rejects.toThrow(new NotFoundException(AcademicsErrors.FOLLOW_UP_NOT_FOUND));
    expect(followUpModel.findOne.mock.calls[0][0]).toEqual({ _id: FOLLOW_UP, organizationId: ORG });
    expect(groupStudents.markWithdrawn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest follow-up --runInBand`
Expected: FAIL — `Cannot find module './follow-up.service'`.

- [ ] **Step 4: Implement**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, FollowUpDecision } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Group } from '../group/entities/group.entity';
import { GroupStudentsService } from '../group/group-students.service';
import { FollowUpLean } from '../session/session.types';
import { FollowUpDto } from './dto/follow-up.dto';
import { FollowUp } from './entities/follow-up.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class FollowUpService {
  constructor(
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUp>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly groupStudents: GroupStudentsService
  ) {}

  async list(actor: AcademicsActor, groupId: string): Promise<{ rows: FollowUpLean[]; people: Record<string, string> }> {
    const organizationId = oid(actor.organizationId);
    const group = await this.groupModel.findOne(withNotDeletedFilter({ _id: oid(groupId), organizationId })).select('_id').lean().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const rows = await this.followUpModel.find({ groupId: oid(groupId), organizationId }).lean<FollowUpLean[]>().exec();
    const users = rows.length
      ? await this.userModel
          .find({ _id: { $in: rows.map((r) => r.studentId) } })
          .select('_id firstName lastName')
          .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
          .exec()
      : [];
    const people = Object.fromEntries(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
    return { rows, people };
  }

  /** Records the parent's feedback and the continue/withdraw decision; WITHDRAW marks the student WITHDRAWN in the group (R9: not reversible here). */
  async update(actor: AcademicsActor, id: string, dto: FollowUpDto): Promise<FollowUpLean> {
    const query = { _id: oid(id), organizationId: oid(actor.organizationId) };
    const row = await this.followUpModel.findOne(query).lean<FollowUpLean>().exec();
    if (!row) throw new NotFoundException(AcademicsErrors.FOLLOW_UP_NOT_FOUND);

    const $set: Record<string, unknown> = { recordedBy: oid(actor._id), recordedAt: new Date() };
    if (dto.parentFeedback !== undefined) $set.parentFeedback = dto.parentFeedback.trim();
    if (dto.decision !== undefined) $set.decision = dto.decision;
    await this.followUpModel.updateOne({ _id: row._id }, { $set }).exec();

    if (dto.decision === FollowUpDecision.WITHDRAW) await this.groupStudents.markWithdrawn(row.groupId, String(row.studentId));
    const updated = await this.followUpModel.findOne(query).lean<FollowUpLean>().exec();
    return updated ?? row;
  }
}
```


- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest follow-up --runInBand`
Expected: PASS (6 tests).

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint --fix src/academics/follow-up
git add apps/server/src/academics/follow-up
git commit -m "feat(academics): first-session follow-ups"
```

---

### Task 11: Controller, BullMQ sweep, module wiring

**Files:**
- Create: `apps/server/src/academics/session/session.queue.ts`
- Create: `apps/server/src/academics/session/session-status.processor.ts`
- Create: `apps/server/src/academics/session/session-status.scheduler.ts`
- Create: `apps/server/src/academics/session/session.controller.message.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Test: `apps/server/src/academics/session/session-status.processor.spec.ts`, `session-status.scheduler.spec.ts`, `session.controller.message.spec.ts`

**Interfaces:**
- Consumes: every service from Tasks 5–10; `IdPayload`, `actorFromContext`.
- Produces: queue constants `SESSION_STATUS_QUEUE = 'academics-session-status'`, `SWEEP_OVERDUE_JOB = 'sweep-overdue-sessions'`, `SWEEP_EVERY_MS = 300_000`; the NATS patterns below.

| Pattern | Permission | Payload | Calls |
|---|---|---|---|
| `academics.groups.start` | UPDATE GROUP | `IdPayload` | `GroupStartService.start` |
| `academics.sessions.findAll` | READ SESSION | `FindSessionsPayload` | `SessionQueryService.findAll` |
| `academics.sessions.findOne` | READ SESSION | `IdPayload` | `SessionQueryService.findOne` |
| `academics.sessions.cancel` | UPDATE GROUP | `CancelSessionPayload` | `SessionCompletionService.cancel` |
| `academics.sessions.markAttendance` | UPDATE SESSION | `MarkAttendancePayload` | `SessionAttendanceService.markStudents` |
| `academics.sessions.markTeacherAttendance` | UPDATE GROUP | `TeacherAttendancePayload` | `SessionAttendanceService.markTeacher` |
| `academics.sessions.submitReport` | UPDATE SESSION | `ReportPayload` | `SessionReportService.submit` |
| `academics.sessions.editReport` | UPDATE SESSION | `ReportPayload` | `SessionReportService.edit` |
| `academics.followUps.list` | UPDATE GROUP | `IdPayload` (the group id) | `FollowUpService.list` |
| `academics.followUps.update` | UPDATE GROUP | `UpdateFollowUpPayload` | `FollowUpService.update` |

- [ ] **Step 1: Write the failing tests**

`session/session-status.processor.spec.ts`:

```ts
import { SessionStatusProcessor } from './session-status.processor';
import { SWEEP_OVERDUE_JOB } from './session.queue';

describe('SessionStatusProcessor', () => {
  it('runs the overdue sweep for its job and returns the number of sessions changed', async () => {
    const completion = { sweepOverdue: jest.fn().mockResolvedValue(4) };
    const processor = new SessionStatusProcessor(completion as never);
    expect(await processor.process({ name: SWEEP_OVERDUE_JOB } as never)).toBe(4);
    expect(completion.sweepOverdue).toHaveBeenCalledWith(expect.any(Date));
  });

  it('ignores other job names', async () => {
    const completion = { sweepOverdue: jest.fn() };
    const processor = new SessionStatusProcessor(completion as never);
    expect(await processor.process({ name: 'something-else' } as never)).toBe(0);
    expect(completion.sweepOverdue).not.toHaveBeenCalled();
  });
});
```

`session/session-status.scheduler.spec.ts`:

```ts
import { SessionStatusScheduler } from './session-status.scheduler';
import { SWEEP_EVERY_MS, SWEEP_OVERDUE_JOB } from './session.queue';

describe('SessionStatusScheduler', () => {
  it('registers one repeatable sweep every 5 minutes', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockResolvedValue({}) };
    await new SessionStatusScheduler(queue as never).onModuleInit();
    expect(SWEEP_EVERY_MS).toBe(5 * 60 * 1000);
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(SWEEP_OVERDUE_JOB, { every: SWEEP_EVERY_MS }, { name: SWEEP_OVERDUE_JOB });
  });

  it('does not crash the app when Redis is unavailable at startup', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockRejectedValue(new Error('redis down')) };
    await expect(new SessionStatusScheduler(queue as never).onModuleInit()).resolves.toBeUndefined();
  });
});
```

`session/session.controller.message.spec.ts` (pins the pattern → permission table):

```ts
import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Subjects } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { SessionControllerMessage } from './session.controller.message';

const proto = SessionControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

const expected: [string, string, Actions, Subjects][] = [
  ['start', 'academics.groups.start', Actions.UPDATE, Subjects.GROUP],
  ['findAll', 'academics.sessions.findAll', Actions.READ, Subjects.SESSION],
  ['findOne', 'academics.sessions.findOne', Actions.READ, Subjects.SESSION],
  ['cancel', 'academics.sessions.cancel', Actions.UPDATE, Subjects.GROUP],
  ['markAttendance', 'academics.sessions.markAttendance', Actions.UPDATE, Subjects.SESSION],
  ['markTeacherAttendance', 'academics.sessions.markTeacherAttendance', Actions.UPDATE, Subjects.GROUP],
  ['submitReport', 'academics.sessions.submitReport', Actions.UPDATE, Subjects.SESSION],
  ['editReport', 'academics.sessions.editReport', Actions.UPDATE, Subjects.SESSION],
  ['listFollowUps', 'academics.followUps.list', Actions.UPDATE, Subjects.GROUP],
  ['updateFollowUp', 'academics.followUps.update', Actions.UPDATE, Subjects.GROUP],
];

describe('SessionControllerMessage', () => {
  it.each(expected)('%s answers %s and requires %s %s (never MANAGE)', (method, pattern, action, subject) => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto[method])).toEqual([pattern]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto[method])).toEqual([{ action, subject }]);
    expect(action).not.toBe(Actions.MANAGE);
  });

  it('exposes exactly the documented handlers', () => {
    const handlers = Object.getOwnPropertyNames(SessionControllerMessage.prototype).filter((name) => name !== 'constructor');
    expect(handlers.sort()).toEqual(expected.map(([method]) => method).sort());
  });
});
```

(`Reflect.getMetadata(PATTERN_METADATA, fn)` returns an array of patterns; if your Nest version stores a bare string, change the expectation to `expect([].concat(Reflect.getMetadata(...)))`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest session-status session.controller --runInBand`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the queue pieces**

`session/session.queue.ts`:

```ts
export const SESSION_STATUS_QUEUE = 'academics-session-status';
export const SWEEP_OVERDUE_JOB = 'sweep-overdue-sessions';
/** Spec §5.2: a repeatable job every 5 minutes. */
export const SWEEP_EVERY_MS = 5 * 60 * 1000;
```

`session/session-status.processor.ts`:

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SessionCompletionService } from './session-completion.service';
import { SESSION_STATUS_QUEUE, SWEEP_OVERDUE_JOB } from './session.queue';

@Processor(SESSION_STATUS_QUEUE)
export class SessionStatusProcessor extends WorkerHost {
  constructor(private readonly completion: SessionCompletionService) {
    super();
  }

  async process(job: Job): Promise<number> {
    if (job.name !== SWEEP_OVERDUE_JOB) return 0;
    return this.completion.sweepOverdue(new Date());
  }
}
```

`session/session-status.scheduler.ts`:

```ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SESSION_STATUS_QUEUE, SWEEP_EVERY_MS, SWEEP_OVERDUE_JOB } from './session.queue';

@Injectable()
export class SessionStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(SessionStatusScheduler.name);

  constructor(@InjectQueue(SESSION_STATUS_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    try {
      // upsert keeps exactly one repeatable schedule across restarts and multiple instances.
      await this.queue.upsertJobScheduler(SWEEP_OVERDUE_JOB, { every: SWEEP_EVERY_MS }, { name: SWEEP_OVERDUE_JOB });
    } catch (error) {
      // Session status is also derived on read, so a missing sweep never shows a wrong status.
      this.logger.error(`Could not schedule the overdue-session sweep: ${(error as Error).message}`);
    }
  }
}
```

- [ ] **Step 4: Implement the controller**

`session/session.controller.message.ts`:

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
import { UpdateFollowUpPayload } from '../follow-up/dto/follow-up.dto';
import { FollowUpService } from '../follow-up/follow-up.service';
import {
  CancelSessionPayload,
  FindSessionsPayload,
  MarkAttendancePayload,
  ReportPayload,
  TeacherAttendancePayload,
} from './dto/session.dto';
import { GroupStartService } from './group-start.service';
import { SessionAttendanceService } from './session-attendance.service';
import { SessionCompletionService } from './session-completion.service';
import { SessionQueryService } from './session-query.service';
import { SessionReportService } from './session-report.service';

@Controller()
@ApplyRpcErrorHandling
export class SessionControllerMessage {
  constructor(
    private readonly groupStart: GroupStartService,
    private readonly queries: SessionQueryService,
    private readonly attendance: SessionAttendanceService,
    private readonly completion: SessionCompletionService,
    private readonly reports: SessionReportService,
    private readonly followUps: FollowUpService
  ) {}

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.start')
  start(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupStart.start(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindSessionsPayload, @Ctx() context: IUserContext) {
    return this.queries.findAll(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.queries.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.sessions.cancel')
  cancel(@Payload(new RpcValidationPipe()) payload: CancelSessionPayload, @Ctx() context: IUserContext) {
    return this.completion.cancel(actorFromContext(context), payload.id, payload.reason);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.markAttendance')
  markAttendance(@Payload(new RpcValidationPipe()) payload: MarkAttendancePayload, @Ctx() context: IUserContext) {
    return this.attendance.markStudents(actorFromContext(context), payload.id, payload.entries);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.sessions.markTeacherAttendance')
  markTeacherAttendance(@Payload(new RpcValidationPipe()) payload: TeacherAttendancePayload, @Ctx() context: IUserContext) {
    return this.attendance.markTeacher(actorFromContext(context), payload.id, payload.status);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.submitReport')
  submitReport(@Payload(new RpcValidationPipe()) payload: ReportPayload, @Ctx() context: IUserContext) {
    return this.reports.submit(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.editReport')
  editReport(@Payload(new RpcValidationPipe()) payload: ReportPayload, @Ctx() context: IUserContext) {
    return this.reports.edit(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.followUps.list')
  listFollowUps(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.followUps.list(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.followUps.update')
  updateFollowUp(@Payload(new RpcValidationPipe()) payload: UpdateFollowUpPayload, @Ctx() context: IUserContext) {
    return this.followUps.update(actorFromContext(context), payload.id, payload.data);
  }
}
```

- [ ] **Step 5: Wire the module**

In `academics/academics.module.ts`:

1. Add imports:

```ts
import { BullModule } from '@nestjs/bullmq';
import { FollowUp, FollowUpSchema } from './follow-up/entities/follow-up.entity';
import { FollowUpService } from './follow-up/follow-up.service';
import { Session, SessionSchema } from './session/entities/session.entity';
import { GroupStartService } from './session/group-start.service';
import { SessionAttendanceService } from './session/session-attendance.service';
import { SessionCompletionService } from './session/session-completion.service';
import { SessionQueryService } from './session/session-query.service';
import { SessionReportService } from './session/session-report.service';
import { SessionStateService } from './session/session-state.service';
import { SessionStatusProcessor } from './session/session-status.processor';
import { SessionStatusScheduler } from './session/session-status.scheduler';
import { SessionControllerMessage } from './session/session.controller.message';
import { SESSION_STATUS_QUEUE } from './session/session.queue';
```

2. In `MongooseModule.forFeature([...])` add `{ name: Session.name, schema: SessionSchema }` and `{ name: FollowUp.name, schema: FollowUpSchema }`, and in `imports` add `BullModule.registerQueue({ name: SESSION_STATUS_QUEUE }),` (before `RoleModule`).
3. Add `SessionControllerMessage` to `controllers`.
4. Add to `providers`: `SessionStateService, GroupStartService, SessionQueryService, SessionAttendanceService, SessionCompletionService, SessionReportService, FollowUpService, SessionStatusProcessor, SessionStatusScheduler`.

(`ParentService` and the `Cohort` model that these services need are already provided via the existing `UserModule` import and the Cohort entry in `forFeature`, exactly as `GroupService` already uses them.)

- [ ] **Step 6: Run the tests**

Run, one after another:
- `pnpm --filter server exec jest session-status session.controller --runInBand` → PASS (2 + 2 + 11 tests).
- `pnpm --filter server exec jest src/academics --runInBand` → PASS (the whole folder).

- [ ] **Step 7: Type-check, build, lint and commit**

```bash
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-t11.txt 2>&1; grep -c "error TS" .superpowers/tsc-sp2-t11.txt
pnpm --filter server exec eslint --fix src/academics
git add apps/server/src/academics
git commit -m "feat(academics): session patterns, overdue sweep job and module wiring"
```
Expected: `0` type errors. Do not start the server here; Nest DI resolution is verified in the last task.

---

### Task 12: Client foundation — types, actions, hooks, translations, utils

**Files:**
- Create: `.superpowers/sp2_edit.py` (scratch helper, not committed)
- Create: `apps/client/src/lib/utils/academics/session-time.ts`, `session-time.test.ts`
- Create: `apps/client/src/lib/utils/academics/week-range.ts`, `week-range.test.ts`
- Create: `apps/client/src/lib/actions/academics/sessions.action.ts`, `follow-ups.action.ts`
- Modify: `apps/client/src/lib/types/academics/academics.ts`
- Modify: `apps/client/src/lib/hooks/academics/use-academics.hook.ts`
- Modify: `apps/client/src/lib/data/constants/routes.constants.ts`
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json`

**Interfaces:**
- Consumes: server patterns from Task 11; shared-types enums (rebuild shared-types first: `pnpm --filter @darnozom/shared-types run build`, already done in Task 1).
- Produces:
  - Types: `ISessionAttendance`, `ISessionEvaluation`, `ISession`, `ISessionDetail`, `IFollowUp`, `IFollowUps`, `SessionQuery`, `AttendanceEntry`, `ReportValues`; `IGroup.totalSessions?`, `IGroupStudent.status?`, `GroupFormValues.totalSessions`.
  - Utils: `formatSessionTime(iso: string, locale: string, timeZone?: string): string`, `formatClock(iso, locale, timeZone?)`, `dayKey(iso: string): string` (local `YYYY-MM-DD`), `weekRange(anchor: Date): { from: Date; to: Date }` (local Sunday 00:00 → next Sunday 00:00), `addWeeks(date: Date, weeks: number): Date`.
  - Hooks (all in `use-academics.hook.ts`): `useSessions(query, enabled?)`, `useSession(id)`, `useFollowUps(groupId, enabled?)`, `useStartGroup()`, `useCancelSession()`, `useMarkAttendance()`, `useMarkTeacherAttendance()`, `useSubmitReport()`, `useEditReport()`, `useUpdateFollowUp()`.
  - Routes: `ROUTE_ORG_MY_SESSIONS`, `ROUTE_ORG_SESSION(id)`, `ROUTE_STUDENT_MY_SESSIONS`.
  - Translations `Academics.sessions.*`, `Academics.followUps.*`, `Academics.form.totalSessions`, `Academics.students.withdrawn`, `Academics.groups.statuses.{RUNNING,COMPLETED}`, `OrgSidebar.navMain.mySessions`, `StudentSidebar.navMain.mySessions`.

- [ ] **Step 1: Create the scratch edit helper**

`.superpowers/sp2_edit.py` (used by the scripted edits in this and later tasks; it converts a file to LF, requires each anchor to match exactly once, and writes it back):

```python
import io

def edit(path, pairs):
    s = io.open(path, encoding='utf8', newline='').read().replace('\r\n', '\n')
    for old, new in pairs:
        count = s.count(old)
        assert count == 1, f'{path}: expected exactly one match, found {count} for: {old[:70]!r}'
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf8', newline='').write(s)

def append(path, text):
    s = io.open(path, encoding='utf8', newline='').read().replace('\r\n', '\n')
    io.open(path, 'w', encoding='utf8', newline='').write(s.rstrip('\n') + '\n' + text)
```

- [ ] **Step 2: Write the failing util tests**

`session-time.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dayKey, formatClock, formatSessionTime } from './session-time';

describe('session-time', () => {
  it('formats a UTC instant in the requested time zone', () => {
    expect(formatSessionTime('2026-10-12T14:00:00.000Z', 'en', 'UTC')).toMatch(/Oct 12, 2026.*2:00/);
    expect(formatSessionTime('2026-10-12T14:00:00.000Z', 'en', 'Asia/Riyadh')).toMatch(/Oct 12, 2026.*5:00/);
  });

  it('formats only the clock time', () => {
    expect(formatClock('2026-10-12T14:00:00.000Z', 'en', 'UTC')).toMatch(/^2:00/);
  });

  it('groups by the viewer-local calendar day', () => {
    expect(dayKey(new Date(2026, 9, 14, 23, 30).toISOString())).toBe('2026-10-14');
    expect(dayKey(new Date(2026, 9, 14, 0, 5).toISOString())).toBe('2026-10-14');
  });
});
```

`week-range.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addWeeks, weekRange } from './week-range';

describe('weekRange', () => {
  it('runs from local Sunday 00:00 to the next Sunday 00:00', () => {
    const { from, to } = weekRange(new Date(2026, 9, 14, 15, 30)); // Wednesday
    expect([from.getFullYear(), from.getMonth(), from.getDate(), from.getDay(), from.getHours()]).toEqual([2026, 9, 11, 0, 0]);
    expect([to.getFullYear(), to.getMonth(), to.getDate(), to.getDay(), to.getHours()]).toEqual([2026, 9, 18, 0, 0]);
  });

  it('keeps a Sunday in its own week and a Saturday at the end of it', () => {
    expect(weekRange(new Date(2026, 9, 11, 9)).from.getDate()).toBe(11);
    expect(weekRange(new Date(2026, 9, 17, 23, 59)).from.getDate()).toBe(11);
  });

  it('moves by whole weeks', () => {
    const next = addWeeks(new Date(2026, 9, 14, 15), 1);
    expect([next.getMonth(), next.getDate()]).toEqual([9, 21]);
    expect(addWeeks(new Date(2026, 9, 14), -2).getDate()).toBe(30); // 14 October minus 14 days = 30 September
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter client exec vitest run session-time week-range --no-file-parallelism`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement the utils**

`session-time.ts`:

```ts
/** Date and time of an instant; pass a timeZone to show the group's clock, omit it for the viewer's own. */
export function formatSessionTime(iso: string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso));
}

export function formatClock(iso: string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(new Date(iso));
}

/** Viewer-local calendar day as YYYY-MM-DD, for grouping a week view. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
```

`week-range.ts`:

```ts
/** The local week (Sunday-first, like the schedule's dayOfWeek) containing `anchor`. */
export function weekRange(anchor: Date): { from: Date; to: Date } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
  return { from, to };
}

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);
}
```

- [ ] **Step 5: Run the util tests to verify they pass**

Run: `pnpm --filter client exec vitest run session-time week-range --no-file-parallelism`
Expected: PASS (6 tests).

- [ ] **Step 6: Types, actions, hooks, routes**

Create `.superpowers/sp2-client-foundation.py` (scratch) and run `python .superpowers/sp2-client-foundation.py`:

```python
import sys
sys.path.insert(0, '.superpowers')
from sp2_edit import edit, append

CLIENT = 'apps/client/src/'

edit(CLIENT + 'lib/types/academics/academics.ts', [
    ("""import type {
  AvailabilitySlot,
  GroupPaymentStatus,
  GroupStatus,
  Readiness,
  ScheduleSlot,
  TeacherFitReason,
} from '@darnozom/shared-types';""",
     """import type {
  AttendanceStatus,
  AvailabilitySlot,
  FollowUpDecision,
  GroupPaymentStatus,
  GroupStatus,
  GroupStudentStatus,
  Readiness,
  ScheduleSlot,
  SessionStatus,
  TeacherFitReason,
} from '@darnozom/shared-types';"""),
    ("  whatsappAdded: boolean;\n  addedAt: string;\n}", "  whatsappAdded: boolean;\n  addedAt: string;\n  status?: GroupStudentStatus;\n}"),
    ("  maxStudents: number;\n  meetingLink?: string | null;", "  maxStudents: number;\n  totalSessions?: number | null;\n  meetingLink?: string | null;"),
    ("  maxStudents: number;\n  meetingLink: string | null;", "  maxStudents: number;\n  totalSessions: number;\n  meetingLink: string | null;"),
])
append(CLIENT + 'lib/types/academics/academics.ts', """
export interface ISessionAttendance {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  markedAt: string;
}

export interface ISessionEvaluation {
  studentId: string;
  participation: number;
  understanding: number;
  behavior: number;
  homework: number;
  note?: string;
}

export interface ISession {
  _id: string;
  groupId: string;
  groupName?: string;
  teacherId: string;
  sequence: number;
  startsAt: string;
  endsAt: string;
  /** The effective status (SCHEDULED turns REPORT_PENDING once the session has ended). */
  status: SessionStatus;
  teacherAttendance?: AttendanceStatus | null;
  attendance: ISessionAttendance[];
  report?: {
    evaluations: ISessionEvaluation[];
    summary?: string;
    submittedBy: string;
    submittedAt: string;
  } | null;
  cancelReason?: string;
}

export interface ISessionDetail extends ISession {
  /** ACTIVE students visible to the caller. */
  roster: string[];
  people: Record<string, string>;
}

export interface SessionQuery {
  groupId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
  status?: SessionStatus;
  childId?: string;
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface ReportValues {
  evaluations: ISessionEvaluation[];
  summary?: string;
}

export interface IFollowUp {
  _id: string;
  groupId: string;
  sessionId: string;
  studentId: string;
  parentFeedback?: string;
  decision?: FollowUpDecision;
  recordedAt?: string;
}

export interface IFollowUps {
  rows: IFollowUp[];
  people: Record<string, string>;
}
""")

edit(CLIENT + 'lib/hooks/academics/use-academics.hook.ts', [
    ("import type { AvailabilitySlot, GroupPaymentStatus, Roles } from '@darnozom/shared-types';",
     "import type { AttendanceStatus, AvailabilitySlot, FollowUpDecision, GroupPaymentStatus, Roles } from '@darnozom/shared-types';"),
    ("import * as availabilityApi from '@/lib/actions/academics/teacher-availability.action';",
     "import * as availabilityApi from '@/lib/actions/academics/teacher-availability.action';\nimport * as sessionsApi from '@/lib/actions/academics/sessions.action';\nimport * as followUpsApi from '@/lib/actions/academics/follow-ups.action';"),
    ("import type { GroupFormValues, GroupQuery } from '@/lib/types/academics/academics';",
     "import type { AttendanceEntry, GroupFormValues, GroupQuery, ReportValues, SessionQuery } from '@/lib/types/academics/academics';"),
    ("  myAvailability: [ROOT, 'my-availability'] as const,\n};",
     "  myAvailability: [ROOT, 'my-availability'] as const,\n  sessions: (query: SessionQuery) => [ROOT, 'sessions', query] as const,\n  session: (id: string) => [ROOT, 'session', id] as const,\n  followUps: (groupId: string) => [ROOT, 'follow-ups', groupId] as const,\n};"),
])
append(CLIENT + 'lib/hooks/academics/use-academics.hook.ts', """
export const useSessions = (query: SessionQuery, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.sessions(query),
    queryFn: async () => unwrap(await sessionsApi.getSessions(query)),
    enabled,
  });
export const useSession = (id: string) =>
  useQuery({
    queryKey: academicsKeys.session(id),
    queryFn: async () => unwrap(await sessionsApi.getSession(id)),
    enabled: !!id,
  });
export const useFollowUps = (groupId: string, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.followUps(groupId),
    queryFn: async () => unwrap(await followUpsApi.getFollowUps(groupId)),
    enabled: enabled && !!groupId,
  });
export const useStartGroup = () =>
  useAcademicsMutation(async (id: string) => unwrap(await sessionsApi.startGroup(id)));
export const useCancelSession = () =>
  useAcademicsMutation(async (v: { id: string; reason: string }) =>
    unwrap(await sessionsApi.cancelSession(v.id, v.reason))
  );
export const useMarkAttendance = () =>
  useAcademicsMutation(async (v: { id: string; entries: AttendanceEntry[] }) =>
    unwrap(await sessionsApi.markAttendance(v.id, v.entries))
  );
export const useMarkTeacherAttendance = () =>
  useAcademicsMutation(async (v: { id: string; status: AttendanceStatus }) =>
    unwrap(await sessionsApi.markTeacherAttendance(v.id, v.status))
  );
export const useSubmitReport = () =>
  useAcademicsMutation(async (v: { id: string; data: ReportValues }) =>
    unwrap(await sessionsApi.submitReport(v.id, v.data))
  );
export const useEditReport = () =>
  useAcademicsMutation(async (v: { id: string; data: ReportValues }) =>
    unwrap(await sessionsApi.editReport(v.id, v.data))
  );
export const useUpdateFollowUp = () =>
  useAcademicsMutation(
    async (v: { id: string; data: { parentFeedback?: string; decision?: FollowUpDecision } }) =>
      unwrap(await followUpsApi.updateFollowUp(v.id, v.data))
  );
""")

append(CLIENT + 'lib/data/constants/routes.constants.ts', """export const ROUTE_ORG_MY_SESSIONS = '/organization-dashboard/my-sessions';
export const ROUTE_ORG_SESSION = (id: string) => `/organization-dashboard/sessions/${id}`;
export const ROUTE_STUDENT_MY_SESSIONS = '/student-dashboard/my-sessions';
""")
print('ok')
```

Expected: prints `ok`. (`useAcademicsMutation`, `useQuery`, `unwrap` are already defined/imported in that hook file from SP1.)

Create the two action files.

`lib/actions/academics/sessions.action.ts`:

```ts
'use server';

import type { AttendanceStatus } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  AttendanceEntry,
  IGroup,
  ISession,
  ISessionDetail,
  ReportValues,
  SessionQuery,
} from '@/lib/types/academics/academics';

export async function getSessions(query: SessionQuery) {
  return createAuthorizedNatsRequest<ISession[]>('academics.sessions.findAll', query);
}
export async function getSession(id: string) {
  return createAuthorizedNatsRequest<ISessionDetail>('academics.sessions.findOne', { id });
}
export async function startGroup(id: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.start', { id });
}
export async function cancelSession(id: string, reason: string) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.cancel', { id, reason });
}
export async function markAttendance(id: string, entries: AttendanceEntry[]) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.markAttendance', { id, entries });
}
export async function markTeacherAttendance(id: string, status: AttendanceStatus) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.markTeacherAttendance', { id, status });
}
export async function submitReport(id: string, data: ReportValues) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.submitReport', { id, data });
}
export async function editReport(id: string, data: ReportValues) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.editReport', { id, data });
}
```

`lib/actions/academics/follow-ups.action.ts`:

```ts
'use server';

import type { FollowUpDecision } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { IFollowUp, IFollowUps } from '@/lib/types/academics/academics';

export async function getFollowUps(groupId: string) {
  return createAuthorizedNatsRequest<IFollowUps>('academics.followUps.list', { id: groupId });
}
export async function updateFollowUp(id: string, data: { parentFeedback?: string; decision?: FollowUpDecision }) {
  return createAuthorizedNatsRequest<IFollowUp>('academics.followUps.update', { id, data });
}
```

- [ ] **Step 7: Add the translations**

Create `.superpowers/i18n-sp2-client.cjs` (scratch) and run `node .superpowers/i18n-sp2-client.cjs`:

```js
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'apps', 'client', 'messages');

const academics = {
  en: {
    groups: { statuses: { RUNNING: 'Running', COMPLETED: 'Completed' } },
    form: { totalSessions: 'Number of sessions' },
    students: { withdrawn: 'Withdrawn' },
    sessions: {
      title: 'Sessions', empty: 'No sessions yet.', start: 'Start group', startHint: 'Generates all sessions from the weekly schedule.',
      startMissingTotal: 'Set the number of sessions in the group details first.',
      number: 'Session', when: 'When', status: 'Status', open: 'Open', teacher: 'Teacher', detailTitle: 'Session {number}',
      statuses: { SCHEDULED: 'Scheduled', REPORT_PENDING: 'Report pending', COMPLETED: 'Completed', CANCELLED: 'Cancelled' },
      cancel: 'Cancel session', cancelReason: 'Reason for cancelling', cancelConfirm: 'Cancel session',
      attendance: {
        title: 'Attendance', student: 'Student', note: 'Note (optional)', save: 'Save attendance', teacher: 'Teacher attendance',
        locked: 'Attendance is closed.',
        statuses: { PRESENT: 'Present', LATE: 'Late', EXCUSED: 'Excused', ABSENT: 'Absent' },
      },
      report: {
        title: 'Session report', participation: 'Participation', understanding: 'Understanding', behavior: 'Behavior', homework: 'Homework',
        note: 'Note (optional)', summary: 'Class summary (optional)', submit: 'Submit report', saveChanges: 'Save changes',
        editHint: 'You can edit this report for 24 hours after submitting it.', pendingAttendance: 'Record attendance for every student first.',
        submittedAt: 'Submitted', empty: 'No report yet.',
      },
      mySessions: { title: 'My sessions', previousWeek: 'Previous week', nextWeek: 'Next week', thisWeek: 'This week', noSessions: 'No sessions this week.' },
      family: { title: 'Sessions', empty: 'No sessions yet.', attendance: 'Attendance', evaluation: 'Evaluation', notRecorded: 'Not recorded yet' },
    },
    followUps: {
      title: 'First-session follow-up', empty: 'Follow-ups appear after the first session is completed.', student: 'Student',
      parentFeedback: 'Parent feedback', decision: 'Decision', decisions: { CONTINUE: 'Continue', WITHDRAW: 'Withdraw' },
      undecided: 'Undecided', save: 'Save', recorded: 'Recorded',
    },
  },
  ar: {
    groups: { statuses: { RUNNING: 'جارية', COMPLETED: 'مكتملة' } },
    form: { totalSessions: 'عدد الجلسات' },
    students: { withdrawn: 'منسحب' },
    sessions: {
      title: 'الجلسات', empty: 'لا توجد جلسات بعد.', start: 'بدء المجموعة', startHint: 'يُنشئ جميع الجلسات من الجدول الأسبوعي.',
      startMissingTotal: 'حدّد عدد الجلسات في بيانات المجموعة أولًا.',
      number: 'الجلسة', when: 'الموعد', status: 'الحالة', open: 'فتح', teacher: 'المعلم', detailTitle: 'الجلسة {number}',
      statuses: { SCHEDULED: 'مجدولة', REPORT_PENDING: 'بانتظار التقرير', COMPLETED: 'مكتملة', CANCELLED: 'ملغاة' },
      cancel: 'إلغاء الجلسة', cancelReason: 'سبب الإلغاء', cancelConfirm: 'إلغاء الجلسة',
      attendance: {
        title: 'الحضور', student: 'الطالب', note: 'ملاحظة (اختيارية)', save: 'حفظ الحضور', teacher: 'حضور المعلم',
        locked: 'الحضور مغلق.',
        statuses: { PRESENT: 'حاضر', LATE: 'متأخر', EXCUSED: 'معذور', ABSENT: 'غائب' },
      },
      report: {
        title: 'تقرير الجلسة', participation: 'المشاركة', understanding: 'الفهم', behavior: 'السلوك', homework: 'الواجب',
        note: 'ملاحظة (اختيارية)', summary: 'ملخص الحصة (اختياري)', submit: 'إرسال التقرير', saveChanges: 'حفظ التعديلات',
        editHint: 'يمكنك تعديل هذا التقرير خلال 24 ساعة من إرساله.', pendingAttendance: 'سجّل حضور جميع الطلاب أولًا.',
        submittedAt: 'تاريخ الإرسال', empty: 'لا يوجد تقرير بعد.',
      },
      mySessions: { title: 'جلساتي', previousWeek: 'الأسبوع السابق', nextWeek: 'الأسبوع التالي', thisWeek: 'هذا الأسبوع', noSessions: 'لا توجد جلسات هذا الأسبوع.' },
      family: { title: 'الجلسات', empty: 'لا توجد جلسات بعد.', attendance: 'الحضور', evaluation: 'التقييم', notRecorded: 'لم يُسجَّل بعد' },
    },
    followUps: {
      title: 'متابعة الجلسة الأولى', empty: 'تظهر المتابعات بعد اكتمال الجلسة الأولى.', student: 'الطالب',
      parentFeedback: 'ملاحظات ولي الأمر', decision: 'القرار', decisions: { CONTINUE: 'يستمر', WITHDRAW: 'ينسحب' },
      undecided: 'لم يُحسم بعد', save: 'حفظ', recorded: 'تم التسجيل',
    },
  },
};
const nav = { en: 'My sessions', ar: 'جلساتي' };

/** Deep merge; adding a leaf that already exists is an error (nothing is overwritten silently). */
function merge(target, source, trail) {
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && typeof value === 'object') {
      if (target[key] === undefined) target[key] = {};
      else if (typeof target[key] !== 'object') throw new Error(`${trail}${key} is a leaf in the target`);
      merge(target[key], value, `${trail}${key}.`);
    } else {
      if (target[key] !== undefined) throw new Error(`${trail}${key} already exists`);
      target[key] = value;
    }
  }
}

for (const lang of ['en', 'ar']) {
  const file = path.join(dir, `${lang}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  merge(json.Academics, academics[lang], 'Academics.');
  json.OrgSidebar.navMain.mySessions = nav[lang];
  json.StudentSidebar.navMain.mySessions = nav[lang];
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(lang, 'ok');
}
```

Expected: prints `en ok` and `ar ok`.

- [ ] **Step 8: Verify and commit**

Run, one after another:
- `pnpm --filter client exec vitest run session-time week-range --no-file-parallelism` → PASS.
- `pnpm --filter client run i18n:check-keys` → exit 0.
- `pnpm --filter client exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-t12.txt 2>&1; diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-sp2-t12.txt | sort)` → Expected: only `>` lines about `StatusBadge` (`Record<GroupStatus, ...>` is missing `RUNNING`/`COMPLETED`) and about `totalSessions` missing from the `GroupFormValues` object in `groups/new/page.tsx` / the formation screen — both are fixed in Task 13. Any other new error is a defect in this task.

```bash
pnpm --filter client exec eslint --fix --no-warn-ignored src/lib/utils/academics src/lib/actions/academics src/lib/hooks/academics src/lib/types/academics
git add apps/client/src/lib apps/client/messages
git commit -m "feat(client): session types, actions, hooks, translations and date utils"
```

---

### Task 13: Group page — total sessions, start, sessions list, follow-ups, withdrawn students

**Files:**
- Create: `apps/client/src/components/organs/academics/session-status-badge.tsx`
- Create: `.../academics/groups/[id]/__components/cancel-session-dialog.tsx`, `group-sessions-card.tsx`, `follow-ups-card.tsx`, `follow-ups-card.test.tsx`
- Modify: `apps/client/src/lib/utils/academics/group-access.ts` and `group-access.test.ts`
- Modify: `.../academics/groups/__components/group-form.tsx`, `status-badge.tsx`
- Modify: `.../academics/groups/new/page.tsx`
- Modify: `.../academics/groups/[id]/__components/group-formation-screen.tsx`, `students-card.tsx`, `teacher-card.tsx`

(`...` = `apps/client/src/app/[locale]/(dashboard)/organization-dashboard`.)

**Interfaces:**
- Consumes: Task 12 hooks/types/utils; SP1 `GROUP_EDITOR_ROLES`, `GROUP_PAYMENT_EDITOR_ROLES`, `hasAnyRole`.
- Produces:
  - `groupScreenAccess(user, status): { locked: boolean; paymentLocked: boolean; scheduleLocked: boolean; canStart: boolean; canCancel: boolean; canManage: boolean }` where `locked` = cancelled/completed or not a group editor; `paymentLocked` as before plus completed; `scheduleLocked` = status `RUNNING` (schedule, time zone, number of sessions and teacher cannot change); `canStart` = editor and `READY_TO_START`; `canCancel` = editor and status `FORMING`/`READY_TO_START`; `canManage` = editor.
  - `SessionStatusBadge({ status: SessionStatus })`.
  - `GroupForm` prop `lockSchedule?: boolean`.

- [ ] **Step 1: Rewrite the access test (RED)**

Replace the whole of `apps/client/src/lib/utils/academics/group-access.test.ts`:

```ts
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
```

Run: `pnpm --filter client exec vitest run group-access --no-file-parallelism`
Expected: FAIL (the current helper returns only `locked` and `paymentLocked`).

- [ ] **Step 2: Implement the access helper**

Replace `apps/client/src/lib/utils/academics/group-access.ts`:

```ts
import {
  GROUP_EDITOR_ROLES,
  GROUP_PAYMENT_EDITOR_ROLES,
  GroupStatus,
  hasAnyRole,
  type RoleHolder,
} from '@darnozom/shared-types';

/** What the formation screen lets this user change; mirrors the server's UPDATE GROUP / GROUP_PAYMENT_STATUS seeds and the running-group locks. */
export function groupScreenAccess(user: RoleHolder | null | undefined, status: GroupStatus) {
  const closed = status === GroupStatus.CANCELLED || status === GroupStatus.COMPLETED;
  const canManage = hasAnyRole(user, GROUP_EDITOR_ROLES);
  return {
    locked: closed || !canManage,
    paymentLocked: closed || !hasAnyRole(user, GROUP_PAYMENT_EDITOR_ROLES),
    scheduleLocked: status === GroupStatus.RUNNING,
    canStart: canManage && status === GroupStatus.READY_TO_START,
    canCancel: canManage && (status === GroupStatus.FORMING || status === GroupStatus.READY_TO_START),
    canManage,
  };
}
```

Run: `pnpm --filter client exec vitest run group-access --no-file-parallelism`
Expected: PASS (7 tests).

- [ ] **Step 3: Write the follow-ups card test (RED)**

`.../academics/groups/[id]/__components/follow-ups-card.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FollowUpDecision } from '@darnozom/shared-types';
import { FollowUpsCard } from './follow-ups-card';

const mutate = vi.fn();

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/lib/hooks/academics/use-academics.hook', () => ({
  useFollowUps: () => ({
    isLoading: false,
    data: {
      rows: [
        { _id: 'f1', groupId: 'g', sessionId: 's', studentId: 'stu1', decision: FollowUpDecision.CONTINUE, parentFeedback: 'happy' },
        { _id: 'f2', groupId: 'g', sessionId: 's', studentId: 'stu2' },
      ],
      people: { stu1: 'Amal K', stu2: 'Bilal R' },
    },
  }),
  useUpdateFollowUp: () => ({ mutate, isPending: false }),
}));

describe('FollowUpsCard', () => {
  it('lists every student with their recorded feedback', () => {
    render(<FollowUpsCard groupId="g" />);
    expect(screen.getByText('Amal K')).toBeTruthy();
    expect(screen.getByText('Bilal R')).toBeTruthy();
    expect((screen.getAllByLabelText('followUps.parentFeedback')[0] as HTMLTextAreaElement).value).toBe('happy');
  });

  it('saves only the fields the coordinator filled in', () => {
    render(<FollowUpsCard groupId="g" />);
    fireEvent.change(screen.getAllByLabelText('followUps.parentFeedback')[1], { target: { value: ' wants evening class ' } });
    fireEvent.click(screen.getAllByText('followUps.save')[1]);
    expect(mutate).toHaveBeenCalledWith({ id: 'f2', data: { parentFeedback: 'wants evening class' } });
  });
});
```

Run: `pnpm --filter client exec vitest run follow-ups-card --no-file-parallelism`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the shared badge and the follow-ups card**

`apps/client/src/components/organs/academics/session-status-badge.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { SessionStatus } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';

const VARIANT: Record<SessionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [SessionStatus.SCHEDULED]: 'secondary',
  [SessionStatus.REPORT_PENDING]: 'outline',
  [SessionStatus.COMPLETED]: 'default',
  [SessionStatus.CANCELLED]: 'destructive',
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const t = useTranslations('Academics');
  return <Badge variant={VARIANT[status]}>{t(`sessions.statuses.${status}`)}</Badge>;
}
```

`.../academics/groups/[id]/__components/follow-ups-card.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FollowUpDecision } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { Textarea } from '@/components/atoms/textarea';
import { useFollowUps, useUpdateFollowUp } from '@/lib/hooks/academics/use-academics.hook';
import type { IFollowUp } from '@/lib/types/academics/academics';

function FollowUpRow({ row, name }: { row: IFollowUp; name: string }) {
  const t = useTranslations('Academics');
  const update = useUpdateFollowUp();
  const [feedback, setFeedback] = useState(row.parentFeedback ?? '');
  const [decision, setDecision] = useState<FollowUpDecision | ''>(row.decision ?? '');

  const save = () => {
    const data: { parentFeedback?: string; decision?: FollowUpDecision } = {};
    if (feedback.trim()) data.parentFeedback = feedback.trim();
    if (decision) data.decision = decision;
    update.mutate({ id: row._id, data });
  };

  return (
    <li className="space-y-2 rounded-md border p-3">
      <p className="font-medium">{name}</p>
      <Textarea
        aria-label={t('followUps.parentFeedback')}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select value={decision} onValueChange={(value) => setDecision(value as FollowUpDecision)}>
          <SelectTrigger className="w-48" aria-label={t('followUps.decision')}>
            <SelectValue placeholder={t('followUps.undecided')} />
          </SelectTrigger>
          <SelectContent>
            {Object.values(FollowUpDecision).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`followUps.decisions.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={update.isPending || (!feedback.trim() && !decision)} onClick={save}>
          {t('followUps.save')}
        </Button>
        {row.decision ? <span className="text-muted-foreground text-sm">{t('followUps.recorded')}</span> : null}
      </div>
    </li>
  );
}

export function FollowUpsCard({ groupId }: { groupId: string }) {
  const t = useTranslations('Academics');
  const { data, isLoading } = useFollowUps(groupId);
  const rows = data?.rows ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('followUps.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">{t('followUps.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <FollowUpRow key={row._id} row={row} name={data?.people[row.studentId] ?? row.studentId} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

Run: `pnpm --filter client exec vitest run follow-ups-card --no-file-parallelism`
Expected: PASS (2 tests). (The disabled Save on a row with neither text nor decision is intentional; the test fills the feedback first.)

- [ ] **Step 5: Cancel-session dialog and sessions card**

`.../academics/groups/[id]/__components/cancel-session-dialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/atoms/dialog';
import { Textarea } from '@/components/atoms/textarea';

export function CancelSessionDialog({ pending, onConfirm }: { pending: boolean; onConfirm: (reason: string) => void }) {
  const t = useTranslations('Academics');
  const [reason, setReason] = useState('');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t('sessions.cancel')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sessions.cancel')}</DialogTitle>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('sessions.cancelReason')} rows={3} />
        <Button variant="destructive" disabled={!reason.trim() || pending} onClick={() => onConfirm(reason)}>
          {t('sessions.cancelConfirm')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

`.../academics/groups/[id]/__components/group-sessions-card.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SessionStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { Link } from '@/i18n/navigation';
import { ROUTE_ORG_SESSION } from '@/lib/data/constants/routes.constants';
import { useCancelSession, useSessions } from '@/lib/hooks/academics/use-academics.hook';
import type { IGroupDetail } from '@/lib/types/academics/academics';
import { formatSessionTime } from '@/lib/utils/academics/session-time';
import { CancelSessionDialog } from './cancel-session-dialog';

export function GroupSessionsCard({ group, canManage }: { group: IGroupDetail; canManage: boolean }) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: sessions = [], isLoading } = useSessions({ groupId: group._id });
  const cancelSession = useCancelSession();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sessions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground">{t('sessions.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sessions.number')}</TableHead>
                <TableHead>{t('sessions.when')}</TableHead>
                <TableHead>{t('sessions.status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session._id}>
                  <TableCell>{session.sequence}</TableCell>
                  <TableCell>{formatSessionTime(session.startsAt, locale, group.timezone)}</TableCell>
                  <TableCell>
                    <SessionStatusBadge status={session.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={ROUTE_ORG_SESSION(session._id)}>{t('sessions.open')}</Link>
                      </Button>
                      {canManage && session.status === SessionStatus.SCHEDULED ? (
                        <CancelSessionDialog
                          pending={cancelSession.isPending}
                          onConfirm={(reason) => cancelSession.mutate({ id: session._id, reason })}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Edit the form, badge, new-group page, students and teacher cards**

Create `.superpowers/sp2-group-page.py` (scratch) and run `python .superpowers/sp2-group-page.py`:

```python
import sys
sys.path.insert(0, '.superpowers')
from sp2_edit import edit

ORG = 'apps/client/src/app/[locale]/(dashboard)/organization-dashboard/'
GROUPS = ORG + 'academics/groups/'

edit(GROUPS + '__components/status-badge.tsx', [
    ("  [GroupStatus.READY_TO_START]: 'default',\n", "  [GroupStatus.READY_TO_START]: 'default',\n  [GroupStatus.RUNNING]: 'default',\n  [GroupStatus.COMPLETED]: 'secondary',\n"),
])

edit(GROUPS + 'new/page.tsx', [
    ("          maxStudents: 10,\n", "          maxStudents: 10,\n          totalSessions: 12,\n"),
])

edit(GROUPS + '__components/group-form.tsx', [
    ("  pending: boolean;\n  onSubmit: (values: GroupFormValues) => void;\n}",
     "  pending: boolean;\n  /** Running groups: schedule, time zone and number of sessions cannot change. */\n  lockSchedule?: boolean;\n  onSubmit: (values: GroupFormValues) => void;\n}"),
    ("export function GroupForm({ initial, submitLabel, pending, onSubmit }: GroupFormProps) {",
     "export function GroupForm({ initial, submitLabel, pending, lockSchedule = false, onSubmit }: GroupFormProps) {"),
    ("          onChange={(e) => set('timezone', e.target.value)}\n          required\n",
     "          onChange={(e) => set('timezone', e.target.value)}\n          disabled={lockSchedule}\n          required\n"),
    ("""        <ScheduleEditor
          value={values.schedule}
          onChange={(schedule) => set('schedule', schedule)}
        />
      </div>""",
     """        <fieldset disabled={lockSchedule}>
          <ScheduleEditor
            value={values.schedule}
            onChange={(schedule) => set('schedule', schedule)}
          />
        </fieldset>
      </div>"""),
    ("""      <div className="space-y-1">
        <Label htmlFor="group-meeting">{t('form.meetingLink')}</Label>""",
     """      <div className="space-y-1">
        <Label htmlFor="group-total">{t('form.totalSessions')}</Label>
        <Input
          id="group-total"
          type="number"
          min={1}
          max={500}
          value={values.totalSessions}
          onChange={(e) => set('totalSessions', Number(e.target.value))}
          disabled={lockSchedule}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="group-meeting">{t('form.meetingLink')}</Label>"""),
])

edit(GROUPS + '[id]/__components/students-card.tsx', [
    ("import { GroupPaymentStatus } from '@darnozom/shared-types';", "import { GroupPaymentStatus, GroupStudentStatus } from '@darnozom/shared-types';"),
    ("import type { IGroupDetail } from '@/lib/types/academics/academics';", "import type { IGroupDetail, IGroupStudent } from '@/lib/types/academics/academics';"),
    ("export function StudentsCard({", "const isWithdrawn = (student: IGroupStudent) => student.status === GroupStudentStatus.WITHDRAWN;\n\nexport function StudentsCard({"),
    ("<TableCell>{group.people[student.studentId] ?? student.studentId}</TableCell>",
     """<TableCell>
                  {group.people[student.studentId] ?? student.studentId}
                  {isWithdrawn(student) ? (
                    <span className="text-muted-foreground ms-2 text-sm">{t('students.withdrawn')}</span>
                  ) : null}
                </TableCell>"""),
    ("                      disabled={paymentDisabled}", "                      disabled={paymentDisabled || isWithdrawn(student)}"),
    ("                    checked={student.whatsappAdded}\n                    disabled={disabled}",
     "                    checked={student.whatsappAdded}\n                    disabled={disabled || isWithdrawn(student)}"),
    ("                    size=\"sm\"\n                    disabled={disabled}\n                    onClick={() =>\n                      removeStudent.mutate",
     "                    size=\"sm\"\n                    disabled={disabled || isWithdrawn(student)}\n                    onClick={() =>\n                      removeStudent.mutate"),
])
print('ok')
```

Expected: prints `ok`. (If an `assert` reports a count other than 1, open the named file, find the intended text and adjust that one anchor — the intent of each pair is stated in the replacement.)

- [ ] **Step 7: Replace the formation screen**

Write the complete new `.../academics/groups/[id]/__components/group-formation-screen.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  useCancelGroup,
  useGroup,
  useMarkGroupReady,
  useSetContentSent,
  useStartGroup,
  useUpdateGroup,
} from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { groupScreenAccess } from '@/lib/utils/academics/group-access';
import { safeHref } from '@/lib/utils/academics/safe-href';
import { GroupForm } from '../../__components/group-form';
import { StatusBadge } from '../../__components/status-badge';
import { CancelGroupDialog } from './cancel-group-dialog';
import { FollowUpsCard } from './follow-ups-card';
import { GroupSessionsCard } from './group-sessions-card';
import { ReadinessPanel } from './readiness-panel';
import { StudentsCard } from './students-card';
import { TeacherCard } from './teacher-card';

export function GroupFormationScreen({ groupId }: { groupId: string }) {
  const t = useTranslations('Academics');
  const { data: group, isLoading } = useGroup(groupId);
  const { data: user } = useAuthUser();
  const updateGroup = useUpdateGroup();
  const markReady = useMarkGroupReady();
  const startGroup = useStartGroup();
  const cancelGroup = useCancelGroup();
  const setContentSent = useSetContentSent();

  if (isLoading || !group) return <p className="p-4">{t('loading')}</p>;
  const { locked, paymentLocked, scheduleLocked, canStart, canCancel, canManage } = groupScreenAccess(user, group.status);
  const started = group.status === GroupStatus.RUNNING || group.status === GroupStatus.COMPLETED;
  const missingTotal = !group.totalSessions;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <StatusBadge status={group.status} />
        </div>
        <div className="flex items-center gap-2">
          {canStart ? (
            <Button
              disabled={startGroup.isPending || missingTotal}
              title={missingTotal ? t('sessions.startMissingTotal') : t('sessions.startHint')}
              onClick={() => startGroup.mutate(group._id)}>
              {t('sessions.start')}
            </Button>
          ) : null}
          {canCancel ? (
            <CancelGroupDialog
              pending={cancelGroup.isPending}
              onConfirm={(reason) => cancelGroup.mutate({ id: group._id, reason })}
            />
          ) : null}
        </div>
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
                  totalSessions: group.totalSessions ?? 12,
                  meetingLink: group.meetingLink ?? null,
                  whatsappGroupLink: group.whatsappGroupLink ?? null,
                }}
                submitLabel={t('save')}
                pending={updateGroup.isPending || locked}
                lockSchedule={scheduleLocked}
                onSubmit={(data) => updateGroup.mutate({ id: group._id, data })}
              />
            </CardContent>
          </Card>
          <StudentsCard group={group} disabled={locked} paymentDisabled={paymentLocked} />
          {started ? <GroupSessionsCard group={group} canManage={canManage} /> : null}
          {started && canManage ? <FollowUpsCard groupId={group._id} /> : null}
        </div>
        <div className="space-y-6">
          {started ? null : (
            <ReadinessPanel
              readiness={group.readiness}
              status={group.status}
              contentSent={group.contentSent.done}
              disabled={locked || markReady.isPending}
              onToggleContentSent={(done) => setContentSent.mutate({ id: group._id, done })}
              onMarkReady={() => markReady.mutate(group._id)}
            />
          )}
          <TeacherCard group={group} disabled={locked || scheduleLocked} />
          <Card>
            <CardHeader>
              <CardTitle>{t('form.whatsappGroupLink')}</CardTitle>
            </CardHeader>
            <CardContent>
              {safeHref(group.whatsappGroupLink) ? (
                <a
                  className="break-all underline"
                  href={safeHref(group.whatsappGroupLink)}
                  target="_blank"
                  rel="noreferrer">
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

- [ ] **Step 8: Run the checks**

Run, one after another:
- `pnpm --filter client exec vitest run group-access follow-ups-card readiness-panel --no-file-parallelism` → PASS.
- `pnpm --filter client run i18n:check-keys` → exit 0.
- `pnpm --filter client exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-t13.txt 2>&1; diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-sp2-t13.txt | sort)` → Expected: no `>` lines.

- [ ] **Step 9: Lint and commit**

```bash
pnpm --filter client exec eslint --fix --no-warn-ignored src/components/organs/academics src/lib/utils/academics "src/app/[locale]/(dashboard)/organization-dashboard/academics" 
git add apps/client
git commit -m "feat(client): start group, sessions list, follow-ups and withdrawn students on the group page"
```

---

### Task 14: Session page (attendance + report) and the teacher's "My sessions" week

**Files** (`...` = `apps/client/src/app/[locale]/(dashboard)/organization-dashboard`):
- Create: `.../sessions/[id]/page.tsx`
- Create: `.../sessions/[id]/__components/attendance-table.tsx`, `attendance-table.test.tsx`, `report-form.tsx`, `report-form.test.tsx`, `report-view.tsx`, `session-detail-screen.tsx`
- Create: `.../my-sessions/page.tsx`, `.../my-sessions/__components/week-sessions.tsx`
- Modify: `.../data.ts` (nav entry)

**Interfaces:**
- Consumes: Task 12 hooks/types/utils/routes; Task 13 `SessionStatusBadge`, `CancelSessionDialog`; shared-types `AttendanceStatus`, `GROUP_EDITOR_ROLES`, `REPORT_EDIT_WINDOW_HOURS`, `SESSION_SCORE_MIN/MAX`, `hasAnyRole`; `useAuthUser`.
- Produces: `AttendanceTable({ roster, people, attendance, disabled, pending, onSave })`, `ReportForm({ roster, people, initial, disabled, pending, submitLabel, onSubmit })`, `ReportView({ report, people })`, `SessionDetailScreen({ sessionId })`, `WeekSessions()`.

- [ ] **Step 1: Write the failing component tests**

`.../sessions/[id]/__components/attendance-table.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AttendanceStatus } from '@darnozom/shared-types';
import { AttendanceTable } from './attendance-table';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const people = { a: 'Amal K', b: 'Bilal R' };
const present = 'sessions.attendance.statuses.PRESENT';
const late = 'sessions.attendance.statuses.LATE';

describe('AttendanceTable', () => {
  it('cannot be saved until at least one student has a status', () => {
    render(<AttendanceTable roster={['a', 'b']} people={people} attendance={[]} disabled={false} pending={false} onSave={vi.fn()} />);
    expect((screen.getByText('sessions.attendance.save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends one entry per student that was marked, with the trimmed note', () => {
    const onSave = vi.fn();
    render(<AttendanceTable roster={['a', 'b']} people={people} attendance={[]} disabled={false} pending={false} onSave={onSave} />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Amal K' })).getByText(present));
    fireEvent.click(within(screen.getByRole('group', { name: 'Bilal R' })).getByText(late));
    fireEvent.change(screen.getAllByLabelText('sessions.attendance.note')[1], { target: { value: ' bus ' } });
    fireEvent.click(screen.getByText('sessions.attendance.save'));
    expect(onSave).toHaveBeenCalledWith([
      { studentId: 'a', status: AttendanceStatus.PRESENT },
      { studentId: 'b', status: AttendanceStatus.LATE, note: 'bus' },
    ]);
  });

  it('starts from the attendance already recorded', () => {
    render(
      <AttendanceTable
        roster={['a']}
        people={people}
        attendance={[{ studentId: 'a', status: AttendanceStatus.ABSENT, markedAt: '2026-10-12T14:00:00Z' }]}
        disabled={false}
        pending={false}
        onSave={vi.fn()}
      />
    );
    const button = within(screen.getByRole('group', { name: 'Amal K' })).getByText('sessions.attendance.statuses.ABSENT');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('is read-only when disabled', () => {
    render(<AttendanceTable roster={['a']} people={people} attendance={[]} disabled pending={false} onSave={vi.fn()} />);
    expect((within(screen.getByRole('group', { name: 'Amal K' })).getByText(present) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

`.../sessions/[id]/__components/report-form.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ReportForm } from './report-form';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const people = { a: 'Amal K' };
const criteria = ['participation', 'understanding', 'behavior', 'homework'] as const;

const score = (student: string, criterion: string, value: number) => {
  const card = screen.getByRole('group', { name: `${student} — sessions.report.${criterion}` });
  fireEvent.click(within(card).getByText(String(value)));
};

describe('ReportForm', () => {
  it('needs all four scores for every student before it can be submitted', () => {
    render(<ReportForm roster={['a']} people={people} disabled={false} pending={false} submitLabel="send" onSubmit={vi.fn()} />);
    const submit = screen.getByText('send') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    score('Amal K', 'participation', 5);
    score('Amal K', 'understanding', 4);
    score('Amal K', 'behavior', 3);
    expect(submit.disabled).toBe(true);
    score('Amal K', 'homework', 1);
    expect(submit.disabled).toBe(false);
  });

  it('submits integer scores 1–5, the trimmed notes and the class summary', () => {
    const onSubmit = vi.fn();
    render(<ReportForm roster={['a']} people={people} disabled={false} pending={false} submitLabel="send" onSubmit={onSubmit} />);
    criteria.forEach((criterion, index) => score('Amal K', criterion, index + 2));
    fireEvent.change(screen.getByLabelText('sessions.report.note'), { target: { value: ' focused ' } });
    fireEvent.change(screen.getByLabelText('sessions.report.summary'), { target: { value: ' good class ' } });
    fireEvent.click(screen.getByText('send'));
    expect(onSubmit).toHaveBeenCalledWith({
      evaluations: [{ studentId: 'a', participation: 2, understanding: 3, behavior: 4, homework: 5, note: 'focused' }],
      summary: 'good class',
    });
  });

  it('keeps the evaluation of a student who has since withdrawn when editing', () => {
    const onSubmit = vi.fn();
    render(
      <ReportForm
        roster={['a']}
        people={people}
        initial={{
          evaluations: [
            { studentId: 'a', participation: 3, understanding: 3, behavior: 3, homework: 3 },
            { studentId: 'gone', participation: 2, understanding: 2, behavior: 2, homework: 2 },
          ],
          submittedBy: 't',
          submittedAt: '2026-10-12T15:00:00Z',
        }}
        disabled={false}
        pending={false}
        submitLabel="save"
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByText('save'));
    const sent = onSubmit.mock.calls[0][0];
    expect(sent.evaluations.map((e: { studentId: string }) => e.studentId)).toEqual(['a', 'gone']);
  });
});
```

Run: `pnpm --filter client exec vitest run attendance-table report-form --no-file-parallelism`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement the attendance table**

`.../sessions/[id]/__components/attendance-table.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AttendanceStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import type { AttendanceEntry, ISessionAttendance } from '@/lib/types/academics/academics';

interface AttendanceTableProps {
  roster: string[];
  people: Record<string, string>;
  attendance: ISessionAttendance[];
  disabled: boolean;
  pending: boolean;
  onSave: (entries: AttendanceEntry[]) => void;
}

interface RowState {
  status?: AttendanceStatus;
  note: string;
}

export function AttendanceTable({ roster, people, attendance, disabled, pending, onSave }: AttendanceTableProps) {
  const t = useTranslations('Academics');
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      roster.map((studentId) => {
        const saved = attendance.find((entry) => entry.studentId === studentId);
        return [studentId, { status: saved?.status, note: saved?.note ?? '' }];
      })
    )
  );
  const patch = (studentId: string, change: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...change } }));

  const entries: AttendanceEntry[] = roster.flatMap((studentId) => {
    const row = rows[studentId];
    if (!row?.status) return [];
    const note = row.note.trim();
    return [{ studentId, status: row.status, ...(note ? { note } : {}) }];
  });

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('sessions.attendance.student')}</TableHead>
            <TableHead>{t('sessions.status')}</TableHead>
            <TableHead>{t('sessions.attendance.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roster.map((studentId) => {
            const name = people[studentId] ?? studentId;
            return (
              <TableRow key={studentId}>
                <TableCell>{name}</TableCell>
                <TableCell>
                  <div role="group" aria-label={name} className="flex flex-wrap gap-1">
                    {Object.values(AttendanceStatus).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={rows[studentId]?.status === status ? 'default' : 'outline'}
                        aria-pressed={rows[studentId]?.status === status}
                        disabled={disabled}
                        onClick={() => patch(studentId, { status })}>
                        {t(`sessions.attendance.statuses.${status}`)}
                      </Button>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={t('sessions.attendance.note')}
                    value={rows[studentId]?.note ?? ''}
                    disabled={disabled}
                    onChange={(e) => patch(studentId, { note: e.target.value })}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Button disabled={disabled || pending || entries.length === 0} onClick={() => onSave(entries)}>
        {t('sessions.attendance.save')}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Implement the report form and the read-only view**

`.../sessions/[id]/__components/report-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import type { ISession, ISessionEvaluation, ReportValues } from '@/lib/types/academics/academics';

const CRITERIA = ['participation', 'understanding', 'behavior', 'homework'] as const;
type Criterion = (typeof CRITERIA)[number];
const SCORES = Array.from({ length: SESSION_SCORE_MAX - SESSION_SCORE_MIN + 1 }, (_, index) => SESSION_SCORE_MIN + index);

interface ReportFormProps {
  roster: string[];
  people: Record<string, string>;
  initial?: ISession['report'];
  disabled: boolean;
  pending: boolean;
  submitLabel: string;
  onSubmit: (data: ReportValues) => void;
}

interface StudentState {
  scores: Partial<Record<Criterion, number>>;
  note: string;
}

export function ReportForm({ roster, people, initial, disabled, pending, submitLabel, onSubmit }: ReportFormProps) {
  const t = useTranslations('Academics');
  const [students, setStudents] = useState<Record<string, StudentState>>(() =>
    Object.fromEntries(
      roster.map((studentId) => {
        const saved = initial?.evaluations.find((entry) => entry.studentId === studentId);
        return [
          studentId,
          {
            scores: saved ? { participation: saved.participation, understanding: saved.understanding, behavior: saved.behavior, homework: saved.homework } : {},
            note: saved?.note ?? '',
          },
        ];
      })
    )
  );
  const [summary, setSummary] = useState(initial?.summary ?? '');

  const setScore = (studentId: string, criterion: Criterion, value: number) =>
    setStudents((prev) => ({ ...prev, [studentId]: { ...prev[studentId], scores: { ...prev[studentId].scores, [criterion]: value } } }));
  const setNote = (studentId: string, note: string) => setStudents((prev) => ({ ...prev, [studentId]: { ...prev[studentId], note } }));

  const complete = roster.every((studentId) => CRITERIA.every((criterion) => students[studentId]?.scores[criterion] !== undefined));

  const submit = () => {
    const evaluations: ISessionEvaluation[] = roster.map((studentId) => {
      const { scores, note } = students[studentId];
      return {
        studentId,
        participation: scores.participation!,
        understanding: scores.understanding!,
        behavior: scores.behavior!,
        homework: scores.homework!,
        ...(note.trim() ? { note: note.trim() } : {}),
      };
    });
    // Students withdrawn since the first submission keep their evaluation untouched.
    const kept = (initial?.evaluations ?? []).filter((entry) => !roster.includes(entry.studentId));
    onSubmit({ evaluations: [...evaluations, ...kept], ...(summary.trim() ? { summary: summary.trim() } : {}) });
  };

  return (
    <div className="space-y-4">
      {roster.map((studentId) => {
        const name = people[studentId] ?? studentId;
        return (
          <div key={studentId} className="space-y-3 rounded-md border p-3">
            <p className="font-medium">{name}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {CRITERIA.map((criterion) => (
                <div key={criterion} role="group" aria-label={`${name} — ${t(`sessions.report.${criterion}`)}`} className="space-y-1">
                  <p className="text-muted-foreground text-sm">{t(`sessions.report.${criterion}`)}</p>
                  <div className="flex gap-1">
                    {SCORES.map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={students[studentId]?.scores[criterion] === value ? 'default' : 'outline'}
                        aria-pressed={students[studentId]?.scores[criterion] === value}
                        disabled={disabled}
                        onClick={() => setScore(studentId, criterion, value)}>
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Input
              aria-label={t('sessions.report.note')}
              placeholder={t('sessions.report.note')}
              value={students[studentId]?.note ?? ''}
              disabled={disabled}
              onChange={(e) => setNote(studentId, e.target.value)}
            />
          </div>
        );
      })}
      <div className="space-y-1">
        <Label htmlFor="report-summary">{t('sessions.report.summary')}</Label>
        <Textarea id="report-summary" aria-label={t('sessions.report.summary')} value={summary} disabled={disabled} onChange={(e) => setSummary(e.target.value)} rows={3} />
      </div>
      <Button disabled={disabled || pending || !complete} onClick={submit}>
        {submitLabel}
      </Button>
    </div>
  );
}
```

(In the test the group's accessible name is `Amal K — sessions.report.participation` because the mock translator returns the key; the component builds that same string.)

`.../sessions/[id]/__components/report-view.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ISession } from '@/lib/types/academics/academics';

const CRITERIA = ['participation', 'understanding', 'behavior', 'homework'] as const;

export function ReportView({ report, people }: { report: NonNullable<ISession['report']>; people: Record<string, string> }) {
  const t = useTranslations('Academics');
  return (
    <div className="space-y-3">
      {report.summary ? <p>{report.summary}</p> : null}
      <ul className="space-y-2">
        {report.evaluations.map((evaluation) => (
          <li key={evaluation.studentId} className="rounded-md border p-3">
            <p className="font-medium">{people[evaluation.studentId] ?? evaluation.studentId}</p>
            <p className="text-sm">
              {CRITERIA.map((criterion) => `${t(`sessions.report.${criterion}`)}: ${evaluation[criterion]}`).join(' · ')}
            </p>
            {evaluation.note ? <p className="text-muted-foreground text-sm">{evaluation.note}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Run: `pnpm --filter client exec vitest run attendance-table report-form --no-file-parallelism`
Expected: PASS (4 + 3 tests).

- [ ] **Step 4: The session page and detail screen**

`.../sessions/[id]/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { SessionDetailScreen } from './__components/session-detail-screen';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  return <SessionDetailScreen sessionId={id} />;
}
```

`.../sessions/[id]/__components/session-detail-screen.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AttendanceStatus, GROUP_EDITOR_ROLES, hasAnyRole, REPORT_EDIT_WINDOW_HOURS, SessionStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import {
  useCancelSession,
  useEditReport,
  useMarkAttendance,
  useMarkTeacherAttendance,
  useSession,
  useSubmitReport,
} from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { formatSessionTime } from '@/lib/utils/academics/session-time';
import { CancelSessionDialog } from '../../../academics/groups/[id]/__components/cancel-session-dialog';
import { AttendanceTable } from './attendance-table';
import { ReportForm } from './report-form';
import { ReportView } from './report-view';

const HOUR_MS = 60 * 60 * 1000;

export function SessionDetailScreen({ sessionId }: { sessionId: string }) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: session, isLoading } = useSession(sessionId);
  const { data: user } = useAuthUser();
  const markAttendance = useMarkAttendance();
  const markTeacher = useMarkTeacherAttendance();
  const submitReport = useSubmitReport();
  const editReport = useEditReport();
  const cancelSession = useCancelSession();

  if (isLoading || !session) return <p className="p-4">{t('loading')}</p>;

  const now = Date.now();
  const isTeacher = !!user && session.teacherId === user._id;
  const canManage = hasAnyRole(user, GROUP_EDITOR_ROLES);
  const closed = session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED;
  const started = now >= new Date(session.startsAt).getTime();
  const attendanceComplete = session.roster.every((studentId) => session.attendance.some((entry) => entry.studentId === studentId));
  const report = session.report;
  const editable = !!report && isTeacher && now - new Date(report.submittedAt).getTime() <= REPORT_EDIT_WINDOW_HOURS * HOUR_MS;
  const canSubmit = isTeacher && !report && started && !closed;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('sessions.detailTitle', { number: session.sequence })}</h1>
          <p className="text-muted-foreground">
            {session.groupName ? `${session.groupName} — ` : ''}
            {formatSessionTime(session.startsAt, locale)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SessionStatusBadge status={session.status} />
          {canManage && session.status === SessionStatus.SCHEDULED ? (
            <CancelSessionDialog pending={cancelSession.isPending} onConfirm={(reason) => cancelSession.mutate({ id: session._id, reason })} />
          ) : null}
        </div>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('sessions.attendance.teacher')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {Object.values(AttendanceStatus).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={session.teacherAttendance === status ? 'default' : 'outline'}
                aria-pressed={session.teacherAttendance === status}
                disabled={session.status === SessionStatus.CANCELLED || markTeacher.isPending}
                onClick={() => markTeacher.mutate({ id: session._id, status })}>
                {t(`sessions.attendance.statuses.${status}`)}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('sessions.attendance.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {closed ? <p className="text-muted-foreground mb-3 text-sm">{t('sessions.attendance.locked')}</p> : null}
          <AttendanceTable
            key={session.attendance.length}
            roster={session.roster}
            people={session.people}
            attendance={session.attendance}
            disabled={closed || !(isTeacher || canManage)}
            pending={markAttendance.isPending}
            onSave={(entries) => markAttendance.mutate({ id: session._id, entries })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('sessions.report.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canSubmit ? (
            <>
              {attendanceComplete ? null : <p className="text-muted-foreground text-sm">{t('sessions.report.pendingAttendance')}</p>}
              <ReportForm
                roster={session.roster}
                people={session.people}
                disabled={!attendanceComplete}
                pending={submitReport.isPending}
                submitLabel={t('sessions.report.submit')}
                onSubmit={(data) => submitReport.mutate({ id: session._id, data })}
              />
            </>
          ) : report && editable ? (
            <>
              <p className="text-muted-foreground text-sm">{t('sessions.report.editHint')}</p>
              <ReportForm
                key={report.submittedAt}
                roster={session.roster}
                people={session.people}
                initial={report}
                disabled={false}
                pending={editReport.isPending}
                submitLabel={t('sessions.report.saveChanges')}
                onSubmit={(data) => editReport.mutate({ id: session._id, data })}
              />
            </>
          ) : report ? (
            <ReportView report={report} people={session.people} />
          ) : (
            <p className="text-muted-foreground">{t('sessions.report.empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

(The relative import of `CancelSessionDialog` points at the Task 13 file: from `sessions/[id]/__components/` up to `organization-dashboard/` is `../../../`, then `academics/groups/[id]/__components/cancel-session-dialog`.)

- [ ] **Step 5: The "My sessions" week page and nav entry**

`.../my-sessions/__components/week-sessions.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { Link } from '@/i18n/navigation';
import { ROUTE_ORG_SESSION } from '@/lib/data/constants/routes.constants';
import { useSessions } from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { dayKey, formatClock } from '@/lib/utils/academics/session-time';
import { addWeeks, weekRange } from '@/lib/utils/academics/week-range';

export function WeekSessions() {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: user } = useAuthUser();
  const [anchor, setAnchor] = useState(() => new Date());
  const { from, to } = weekRange(anchor);
  const { data: sessions = [], isLoading } = useSessions(
    { teacherId: user?._id, from: from.toISOString(), to: to.toISOString() },
    !!user
  );

  const days = Array.from({ length: 7 }, (_, offset) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset));
  const byDay = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = dayKey(session.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), session]);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('sessions.mySessions.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor((prev) => addWeeks(prev, -1))}>
            {t('sessions.mySessions.previousWeek')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            {t('sessions.mySessions.thisWeek')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor((prev) => addWeeks(prev, 1))}>
            {t('sessions.mySessions.nextWeek')}
          </Button>
        </div>
      </div>
      {isLoading ? <p>{t('loading')}</p> : null}
      {!isLoading && sessions.length === 0 ? <p className="text-muted-foreground">{t('sessions.mySessions.noSessions')}</p> : null}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => {
          const list = byDay.get(dayKey(day.toISOString())) ?? [];
          if (list.length === 0) return null;
          return (
            <Card key={day.toISOString()}>
              <CardHeader>
                <CardTitle className="text-base">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(day)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((session) => (
                  <Link key={session._id} href={ROUTE_ORG_SESSION(session._id)} className="block rounded-md border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{formatClock(session.startsAt, locale)}</span>
                      <SessionStatusBadge status={session.status} />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {session.groupName} · #{session.sequence}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

`.../my-sessions/page.tsx`:

```tsx
import { WeekSessions } from './__components/week-sessions';

export default function MySessionsPage() {
  return <WeekSessions />;
}
```

Add the nav entry and its route import, with a scratch script `.superpowers/sp2-nav-org.py`:

```python
import sys
sys.path.insert(0, '.superpowers')
from sp2_edit import edit

edit('apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts', [
    ("\n  ROUTE_ORG_MY_GROUPS,\n", "\n  ROUTE_ORG_MY_GROUPS,\n  ROUTE_ORG_MY_SESSIONS,\n"),
    ("""      key: 'my-groups',
      requiredRoles: [Roles.INSTRUCTOR],
    },""",
     """      key: 'my-groups',
      requiredRoles: [Roles.INSTRUCTOR],
    },
    {
      titleKey: 'navMain.mySessions',
      url: ROUTE_ORG_MY_SESSIONS,
      icon: IconCalendarEvent,
      key: 'my-sessions',
      requiredRoles: [Roles.INSTRUCTOR],
    },"""),
])
print('ok')
```

Expected: prints `ok` (the import list in `data.ts` already contains `ROUTE_ORG_MY_GROUPS,` from SP1; `IconCalendarEvent` is already imported there).

- [ ] **Step 6: Run the checks and commit**

Run, one after another:
- `pnpm --filter client exec vitest run attendance-table report-form --no-file-parallelism` → PASS.
- `pnpm --filter client exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-t14.txt 2>&1; diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-sp2-t14.txt | sort)` → Expected: no `>` lines.

```bash
pnpm --filter client exec eslint --fix --no-warn-ignored "src/app/[locale]/(dashboard)/organization-dashboard/sessions" "src/app/[locale]/(dashboard)/organization-dashboard/my-sessions" "src/app/[locale]/(dashboard)/organization-dashboard/data.ts"
git add apps/client
git commit -m "feat(client): session page with attendance and report, and the teacher's weekly sessions"
```

---

### Task 15: Parent and student views

**Files:**
- Create: `apps/client/src/components/organs/academics/session-summary-list.tsx`, `session-summary-list.test.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/children/__components/child-sessions.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/my-sessions/page.tsx`
- Modify: `.../parent-dashboard/children/page.tsx`, `.../student-dashboard/__components/StudentSideBar.tsx`

**Interfaces:**
- Consumes: Task 12 `useSessions`, `formatSessionTime`, routes; Task 13 `SessionStatusBadge`.
- Produces: `SessionSummaryList({ sessions, studentId })` — shows, per session, the date, group, status, and **only** that student's attendance status and evaluation (the server already removed everyone else's).

- [ ] **Step 1: Write the failing test**

`session-summary-list.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import type { ISession } from '@/lib/types/academics/academics';
import { SessionSummaryList } from './session-summary-list';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const session = (over: Partial<ISession> = {}): ISession => ({
  _id: 's1',
  groupId: 'g',
  groupName: 'Group A',
  teacherId: 't',
  sequence: 2,
  startsAt: '2026-10-12T14:00:00.000Z',
  endsAt: '2026-10-12T15:00:00.000Z',
  status: SessionStatus.COMPLETED,
  attendance: [{ studentId: 'kid', status: AttendanceStatus.LATE, markedAt: '2026-10-12T14:05:00Z' }],
  report: {
    evaluations: [{ studentId: 'kid', participation: 5, understanding: 4, behavior: 3, homework: 2, note: 'keep going' }],
    submittedBy: 't',
    submittedAt: '2026-10-12T15:30:00Z',
  },
  ...over,
});

describe('SessionSummaryList', () => {
  it("shows the student's attendance and evaluation", () => {
    render(<SessionSummaryList sessions={[session()]} studentId="kid" />);
    expect(screen.getByText('Group A')).toBeTruthy();
    expect(screen.getByText('sessions.attendance.statuses.LATE')).toBeTruthy();
    expect(screen.getByText(/sessions\.report\.participation: 5/)).toBeTruthy();
    expect(screen.getByText('keep going')).toBeTruthy();
  });

  it('says so when nothing is recorded yet', () => {
    render(<SessionSummaryList sessions={[session({ attendance: [], report: null, status: SessionStatus.SCHEDULED })]} studentId="kid" />);
    expect(screen.getAllByText('sessions.family.notRecorded').length).toBeGreaterThan(0);
  });

  it('never shows another child that slipped into the payload', () => {
    render(
      <SessionSummaryList
        sessions={[
          session({
            attendance: [{ studentId: 'other', status: AttendanceStatus.ABSENT, markedAt: '2026-10-12T14:05:00Z' }],
            report: {
              evaluations: [{ studentId: 'other', participation: 1, understanding: 1, behavior: 1, homework: 1, note: 'secret' }],
              submittedBy: 't',
              submittedAt: '2026-10-12T15:30:00Z',
            },
          }),
        ]}
        studentId="kid"
      />
    );
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.queryByText('sessions.attendance.statuses.ABSENT')).toBeNull();
  });

  it('shows an empty message for no sessions', () => {
    render(<SessionSummaryList sessions={[]} studentId="kid" />);
    expect(screen.getByText('sessions.family.empty')).toBeTruthy();
  });
});
```

Run: `pnpm --filter client exec vitest run session-summary-list --no-file-parallelism`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement the list**

`session-summary-list.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ISession } from '@/lib/types/academics/academics';
import { formatSessionTime } from '@/lib/utils/academics/session-time';
import { SessionStatusBadge } from './session-status-badge';

const CRITERIA = ['participation', 'understanding', 'behavior', 'homework'] as const;

/** Defence in depth: only the given student's rows are shown, even though the server already removed everyone else's. */
export function SessionSummaryList({ sessions, studentId }: { sessions: ISession[]; studentId: string }) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  if (sessions.length === 0) return <p className="text-muted-foreground">{t('sessions.family.empty')}</p>;

  return (
    <ul className="space-y-3">
      {sessions.map((session) => {
        const attendance = session.attendance.find((entry) => entry.studentId === studentId);
        const evaluation = session.report?.evaluations.find((entry) => entry.studentId === studentId);
        return (
          <li key={session._id} className="space-y-1 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {session.groupName} · #{session.sequence}
              </span>
              <SessionStatusBadge status={session.status} />
            </div>
            <p className="text-muted-foreground text-sm">{formatSessionTime(session.startsAt, locale)}</p>
            <p className="text-sm">
              {t('sessions.family.attendance')}:{' '}
              <span>{attendance ? t(`sessions.attendance.statuses.${attendance.status}`) : t('sessions.family.notRecorded')}</span>
            </p>
            <p className="text-sm">
              {t('sessions.family.evaluation')}:{' '}
              <span>
                {evaluation
                  ? CRITERIA.map((criterion) => `${t(`sessions.report.${criterion}`)}: ${evaluation[criterion]}`).join(' · ')
                  : t('sessions.family.notRecorded')}
              </span>
            </p>
            {evaluation?.note ? <p className="text-muted-foreground text-sm">{evaluation.note}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
```

Run: `pnpm --filter client exec vitest run session-summary-list --no-file-parallelism`
Expected: PASS (4 tests).

- [ ] **Step 3: Parent and student pages, nav**

`.../parent-dashboard/children/__components/child-sessions.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { SessionSummaryList } from '@/components/organs/academics/session-summary-list';
import { useSessions } from '@/lib/hooks/academics/use-academics.hook';

export function ChildSessions({ childId, childName }: { childId: string; childName: string }) {
  const t = useTranslations('Academics');
  const { data: sessions = [], isLoading } = useSessions({ childId });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${childName} — ${t('sessions.family.title')}`}</CardTitle>
      </CardHeader>
      <CardContent>{isLoading ? <p>{t('loading')}</p> : <SessionSummaryList sessions={sessions} studentId={childId} />}</CardContent>
    </Card>
  );
}
```

`.../student-dashboard/my-sessions/page.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { SessionSummaryList } from '@/components/organs/academics/session-summary-list';
import { useSessions } from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';

export default function StudentMySessionsPage() {
  const t = useTranslations('Academics');
  const { data: user } = useAuthUser();
  const { data: sessions = [], isLoading } = useSessions({}, !!user);
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('sessions.family.title')}</h1>
      {isLoading || !user ? <p>{t('loading')}</p> : <SessionSummaryList sessions={sessions} studentId={user._id} />}
    </div>
  );
}
```

Scratch script `.superpowers/sp2-nav-family.py`, then run it:

```python
import sys
sys.path.insert(0, '.superpowers')
from sp2_edit import edit

DASH = 'apps/client/src/app/[locale]/(dashboard)/'

edit(DASH + 'parent-dashboard/children/page.tsx', [
    ("import { ChildGroups } from './__components/child-groups';",
     "import { ChildGroups } from './__components/child-groups';\nimport { ChildSessions } from './__components/child-sessions';"),
    ("<ChildGroups key={child._id} childId={child._id} childName={`${child.firstName ?? ''}`} />",
     "<div key={child._id} className=\"space-y-4\">\n<ChildGroups childId={child._id} childName={`${child.firstName ?? ''}`} />\n<ChildSessions childId={child._id} childName={`${child.firstName ?? ''}`} />\n</div>"),
])

edit(DASH + 'student-dashboard/__components/StudentSideBar.tsx', [
    ("  ROUTE_STUDENT_MY_GROUPS,\n} from '@/lib/data/constants/routes.constants';",
     "  ROUTE_STUDENT_MY_GROUPS,\n  ROUTE_STUDENT_MY_SESSIONS,\n} from '@/lib/data/constants/routes.constants';"),
    ("        key: 'my-groups',\n      },",
     "        key: 'my-groups',\n      },\n      {\n        title: t('navMain.mySessions'),\n        url: ROUTE_STUDENT_MY_SESSIONS,\n        icon: IconCalendar,\n        key: 'my-sessions',\n      },"),
])
print('ok')
```

Expected: prints `ok` (`IconCalendar` is already imported in `StudentSideBar.tsx`).

- [ ] **Step 4: Run the checks and commit**

Run, one after another:
- `pnpm --filter client exec vitest run session-summary-list --no-file-parallelism` → PASS.
- `pnpm --filter client run i18n:check-keys` → exit 0.
- `pnpm --filter client exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-t15.txt 2>&1; diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-sp2-t15.txt | sort)` → Expected: no `>` lines.

```bash
pnpm --filter client exec eslint --fix --no-warn-ignored src/components/organs/academics "src/app/[locale]/(dashboard)/parent-dashboard/children" "src/app/[locale]/(dashboard)/student-dashboard"
git add apps/client
git commit -m "feat(client): parent and student session views"
```

---

### Task 16: End-to-end verification

**Files:** none new. Runs everything once, one process at a time, and walks the golden path.

**Interfaces:** consumes everything above.

- [ ] **Step 1: Targeted checks, then the full suites (foreground, sequential)**

Run these one after another (never in parallel, never in the background):

```bash
pnpm --filter @darnozom/shared-types exec vitest run --no-file-parallelism
pnpm --filter server exec jest src/academics src/role src/auth/dto --maxWorkers=2
pnpm --filter client exec vitest run --maxWorkers=2 --minWorkers=1
pnpm --filter client run i18n:check-keys
pnpm --filter server exec jest --maxWorkers=2 > .superpowers/full-server-sp2.txt 2>&1; grep -E "^(Tests|Test Suites):" .superpowers/full-server-sp2.txt
```

Expected:
- shared-types, client and i18n all PASS.
- server targeted run: only the known pre-existing failure `src/role/role.controller.spec.ts` (Nest DI mock) — everything else PASS.
- server full run: failures are exactly the pre-existing baseline of **30 failed suites / 25 failed tests** (the list is in `.superpowers/full-server.txt` from SP1); every academics suite passes and the passed count is higher by the number of new tests. Confirm with: `diff <(grep -E "^FAIL" .superpowers/full-server.txt | awk '{print $2}' | sort -u) <(grep -E "^FAIL" .superpowers/full-server-sp2.txt | awk '{print $2}' | sort -u)` → no output.

- [ ] **Step 2: Type-check diffs**

```bash
pnpm --filter server exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-final-server.txt 2>&1
pnpm --filter client exec tsc --noEmit -p tsconfig.json > .superpowers/tsc-sp2-final-client.txt 2>&1
diff <(grep "error TS" .superpowers/tsc-baseline-server.txt | sort) <(grep "error TS" .superpowers/tsc-sp2-final-server.txt | sort)
diff <(grep "error TS" .superpowers/tsc-baseline-client.txt | sort) <(grep "error TS" .superpowers/tsc-sp2-final-client.txt | sort)
```
Expected: no `>` lines in either diff.

- [ ] **Step 3: Re-seed the roles (non-destructive)**

`pnpm --filter server run seed` deletes every collection; do NOT run it. Create `apps/server/src/upsert-roles.tmp.ts` (delete it right after), run it, then remove it:

```ts
import path from 'node:path';
import mongoose from 'mongoose';
import { getMongoUri } from 'src/config/mongo.config';
import { Role, RoleSchema } from 'src/role/entities/role.entity';
import { RoleSeeder } from 'src/role/seeds/role.seeder';

async function main() {
  process.loadEnvFile(path.join(process.cwd(), '.env'));
  await mongoose.connect(getMongoUri());
  const roleModel = mongoose.model(Role.name, RoleSchema);
  await new RoleSeeder(roleModel as never).seed();
  const instructor = await roleModel.findOne({ name: 'INSTRUCTOR' }).lean();
  console.log('instructor SESSION rules:', JSON.stringify((instructor?.permissions ?? []).filter((p: { subject: string }) => p.subject === 'SESSION')));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
```

```bash
cd apps/server && pnpm exec tsx -r tsconfig-paths/register src/upsert-roles.tmp.ts; rm -f src/upsert-roles.tmp.ts; cd ../..
```
Expected: prints `instructor SESSION rules:` with `READ` and `UPDATE` entries. Run `git status --short` — the temp file must not appear.

- [ ] **Step 4: Golden path in the browser**

Only now start servers, and only these two (Redis and MongoDB must already be running): `pnpm --filter server run start:dev` (port 5000) and `pnpm --filter client run dev` (port 3001) — one terminal each, nothing else running. Use an organization admin account, then:

1. **Group with sessions:** under a cohort whose **start date is today**, create a group with **Number of sessions = 2**, a weekly slot starting 5 minutes before the current time in your time zone (duration 60), min 1 / max 2, a meeting link. Assign a teacher (set their availability for that slot first), add one student, mark the payment paid, switch on "Content has been sent", click **Ready to start**.
2. Click **Start group**. The status badge becomes **Running**; the readiness panel is replaced by a **Sessions** card listing 2 sessions (one now, one next week); the schedule/time-zone/number-of-sessions inputs and the teacher card are disabled.
3. Click **Start group** is gone; try saving only a new meeting link — it saves (no "schedule locked" error).
4. Log in as the teacher → **My sessions** shows today's session; open it. Record attendance for the student (attendance opens 15 minutes before the start). The teacher-attendance row (staff view) can be set by the coordinator/admin.
5. Submit the report with all four scores — the **Submit report** button stays disabled until every score is chosen. After submitting, the status is **Completed** and the report is editable (edit hint visible).
6. As admin, open the group → **Follow-up** card now has one row for the student; enter feedback, choose **Withdraw**, save. The student shows **Withdrawn** in the students card and the group's remaining capacity frees up.
7. Cancel the second session with a reason → the group moves to **Completed** automatically (no open session left).
8. As the student (or the parent's child view) open **My sessions** / the child's sessions: the attendance and evaluation are those of that student only.
9. Switch the UI to Arabic (`/ar/...`): no raw keys on the new screens.

Stop both dev servers when done. Write down anything that misbehaves; fix issues caused by assumptions in this plan in place and note them in the ledger.

- [ ] **Step 5: Final commit**

```bash
git status --short
git add -A -- apps lib
git commit -m "fix(academics): corrections from end-to-end verification" 
```
Only run the commit if Step 4 produced fixes; otherwise there is nothing to commit.
