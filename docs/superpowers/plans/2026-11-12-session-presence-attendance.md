# Session Presence, In-Platform Meetings & Teacher Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attendance for students and teachers is recorded automatically when they join a group session through the platform, group sessions can run on Agora inside the platform, and permitted staff get a teacher details page plus group/session attendance views.

**Architecture:** A new `SessionPresence` record (one per user per session) is written by a `join` call that every participant must go through (the platform's "Join" button, which for Agora opens the in-app call and for an external link records the click, then opens the link). Join derives PRESENT/LATE and writes it onto the existing `Session.attendance` / `Session.teacherAttendance`; manual marks always override automatic ones. Agora group calls reuse `AgoraService.issueRtcToken` and the existing `AgoraCall` client component. Teacher and group views are read-only aggregations over `Session`, `SessionPresence` and `SupervisionEvaluation`.

**Tech Stack:** NestJS + Mongoose over NATS (`@MessagePattern`, `RpcValidationPipe`, `RequirePermissionsGuard`), `agora-token` / `agora-rtc-sdk-ng`, Next.js + next-intl (en/ar) + React Query + react-hook-form/yup, Jest (server) and the client's existing test runner.

**Spec:** none written. The requirements are the user's message of 2026-11-12 ("track the attendance for the students and for the teachers … calculate it automatically when the teacher or the student clicks on the link … Agora integrations … teacher details page … track attendance for the group teachers and students and sessions"). Calls I made are marked **(my call)**; the user has not agreed to them yet.

## Context found in the codebase (do not rebuild)

- `apps/server/src/academics/session/` already has `Session` (with `attendance[]`, `teacherAttendance`, `report`), `SessionAttendanceService.markStudents/markTeacher`, `SessionStateService.loadInOrg/activeStudentIds/reload`, and the status sweep. Group sessions use `Group.meetingLink` (external only).
- `apps/server/src/agora/` issues tokens only for course live sessions and private bookings. `AgoraService.issueRtcToken(channel, uid, role)` is public and reusable.
- The older `apps/server/src/attendance/` module is course/slot based and **out of scope**. Do not touch it.
- `Session.teacherAttendance` is currently read only by session code; payroll does not read it, so writing it automatically changes no pay.
- No git repository exists in this folder, so the plan has no commit steps. Run the verify step of each task instead.

## Global Constraints

- Validation lives in DTO decorators, never in services (validate-in-dto skill). NATS handlers use `@Payload(new RpcValidationPipe())`.
- Organization id always comes from `actorFromContext(context).organizationId`, never from the payload.
- Reuse `AttendanceStatus` (PRESENT, LATE, EXCUSED, ABSENT), `SessionStatus`, `MeetingProvider` from `@darnozom/shared-types`.
- Server tests: `cd apps/server && npx jest --config jest.config.cjs <spec path> --runInBand`. One jest process at a time.
- Client forms follow the repo rule: route-local `<form>/<form>.tsx` + `<form>.schema.ts`. All new strings go in both `apps/client/messages/en.json` and `ar.json`.
- Constants: `AUTO_LATE_AFTER_MINUTES = 10`, `PRESENCE_GRACE_MINUTES = 15` **(my call)**.

## Review Focus

Each line below has its test in the owning task.

1. A user joins twice, or reconnects after a drop: one presence record, the first join time is kept, an earlier PRESENT is never downgraded to LATE (Task 2, Task 4).
2. Join before the window opens, after the session is cancelled, or after the end plus grace: rejected, nothing written (Task 2, Task 4).
3. A withdrawn student, a student from another group, or a teacher who is not the session's teacher joins: Forbidden, nothing written (Task 4).
4. The teacher manually marked a student ABSENT/EXCUSED, then the student joins: the manual mark wins, join does not overwrite it (Task 4).
5. The tab is closed without a leave call: duration counts only up to the last heartbeat, never up to the session end (Task 2).

---

## Phase 1: Automatic attendance from joining

### Task 1: Shared constants, enums and errors

**Files:**
- Modify: `lib/shared-types/src/lib/types/academics/academics.types.ts`

**Interfaces:**
- Produces: `AUTO_LATE_AFTER_MINUTES`, `PRESENCE_GRACE_MINUTES` (numbers); `enum AttendanceSource { MANUAL = 'MANUAL', AUTO = 'AUTO' }`; `enum PresenceRole { TEACHER = 'TEACHER', STUDENT = 'STUDENT' }`; new `AcademicsErrors` members `NOT_SESSION_PARTICIPANT`, `JOIN_WINDOW_CLOSED`.

- [ ] **Step 1:** Add the constants, both enums and the two error members next to the existing academics enums. Confirm `AcademicsErrors` is a string enum and follow its value style.
- [ ] **Step 2:** Verify: `npx tsc --noEmit -p lib/shared-types/tsconfig.lib.json` prints no errors.

### Task 2: Pure presence rules

**Files:**
- Create: `apps/server/src/academics/domain/presence.ts`
- Test: `apps/server/src/academics/domain/presence.spec.ts`

**Interfaces:**
- Produces:
  - `checkJoinWindow(session: { status: SessionStatus; startsAt: Date; endsAt: Date }, now: Date): AcademicsErrors | null` (open from `ATTENDANCE_OPEN_MINUTES_BEFORE` before start until `endsAt + PRESENCE_GRACE_MINUTES`; cancelled is closed; returns `JOIN_WINDOW_CLOSED`).
  - `statusFromJoin(startsAt: Date, joinedAt: Date): AttendanceStatus.PRESENT | AttendanceStatus.LATE` (LATE when more than `AUTO_LATE_AFTER_MINUTES` after start).
  - `interface PresenceSegment { joinedAt: Date; leftAt?: Date }`
  - `totalSeconds(segments: PresenceSegment[], lastSeenAt: Date, cap: Date): number` (an open segment ends at `min(lastSeenAt, cap)`; segments never counted past `cap`).

- [ ] **Step 1: Write failing tests** in `presence.spec.ts`: `statusFromJoin` returns PRESENT at start-5min, start+10min exactly, LATE at start+11min; `checkJoinWindow` returns `JOIN_WINDOW_CLOSED` for CANCELLED, 16 min before start, and end+16 min, and `null` at 15 min before start and at end+15 min; `totalSeconds` for one closed segment of 30 min = 1800, for an open segment with `lastSeenAt` 5 min after join and a far-away `cap` = 300 (Review Focus 5), for two segments sums both.
- [ ] **Step 2:** Run the spec. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement the three functions per the signatures above.
- [ ] **Step 4:** Run the spec. Expected: PASS.

### Task 3: SessionPresence entity and attendance `source`

**Files:**
- Create: `apps/server/src/academics/session/entities/session-presence.entity.ts`
- Modify: `apps/server/src/academics/session/entities/session.entity.ts` (add `source` to `SessionAttendance`)
- Modify: `apps/server/src/academics/session/session.types.ts` (`SessionAttendanceLean.source`)
- Modify: `apps/server/src/academics/academics.module.ts` (register schema)

**Interfaces:**
- Produces: `SessionPresence` document `{ organizationId, groupId, sessionId, userId, role: PresenceRole, firstJoinedAt: Date, lastSeenAt: Date, segments: PresenceSegment[] }`. Unique index `{ sessionId: 1, userId: 1 }`; index `{ organizationId: 1, userId: 1, firstJoinedAt: -1 }` for the teacher page. `SessionAttendance.source: AttendanceSource` default `MANUAL`.

- [ ] **Step 1:** Create the entity with the fields and indexes above (follow `session.entity.ts` style, `timestamps: true`).
- [ ] **Step 2:** Add `source` to `SessionAttendance` (enum `AttendanceSource`, default MANUAL) and to the lean type.
- [ ] **Step 3:** Register `SessionPresence` in `MongooseModule.forFeature` in `academics.module.ts`.
- [ ] **Step 4:** Verify: `npx tsc --noEmit -p apps/server/tsconfig.json` shows no new errors in these files.

### Task 4: SessionPresenceService (join, heartbeat, leave)

**Files:**
- Create: `apps/server/src/academics/session/session-presence.service.ts`
- Create: `apps/server/src/academics/session/dto/presence.dto.ts` (`SessionIdPayload { @IsMongoId() id: string }`, reuse `IdPayload` from `../common/payloads` if it is identical)
- Modify: `apps/server/src/academics/session/session-attendance.service.ts` (markStudents writes `source: MANUAL`)
- Modify: `apps/server/src/academics/academics.module.ts` (provider)
- Test: `apps/server/src/academics/session/session-presence.service.spec.ts` (copy the `setup`/`mockQuery` style of `session-attendance.service.spec.ts`)

**Interfaces:**
- Consumes: `checkJoinWindow`, `statusFromJoin`, `totalSeconds` (Task 2); `SessionStateService.loadInOrg/activeStudentIds/reload`.
- Produces:
  - `join(actor: AcademicsActor, sessionId: string, now?: Date): Promise<JoinResult>` where `JoinResult = { provider: MeetingProvider; meetingLink?: string; agora?: AgoraTokenResult }` (`agora` is filled in Task 8; here it is always undefined and `provider` is `EXTERNAL_URL`).
  - `heartbeat(actor, sessionId, now?): Promise<void>` sets `lastSeenAt`; no-op if no presence exists.
  - `leave(actor, sessionId, now?): Promise<void>` closes the open segment at `now`.

- [ ] **Step 1: Write failing tests**: (a) student joins on time, presence upserted, attendance row `{status: PRESENT, source: AUTO, markedBy: student}` pushed; (b) 11 min late gives LATE; (c) teacher joins, `teacherAttendance` becomes PRESENT only when it was null (an existing ABSENT is untouched); (d) second join keeps `firstJoinedAt`, opens a new segment only if the last is closed, and does not change a PRESENT row to LATE (Review Focus 1); (e) a student with an existing MANUAL ABSENT row keeps it (Focus 4); (f) join outside the window rejects with `ConflictException(JOIN_WINDOW_CLOSED)` and calls no write (Focus 2); (g) a user who is neither the session teacher nor an active student of the group gets `ForbiddenException(NOT_SESSION_PARTICIPANT)` and no write (Focus 3).
- [ ] **Step 2:** Run the spec. Expected: FAIL.
- [ ] **Step 3: Implement the three methods.** Participant = `session.teacherId === actor._id` or `actor._id` in `activeStudentIds(session.groupId)`. Presence is one `updateOne({sessionId,userId}, {...}, {upsert:true})`. The attendance write uses a conditional `updateOne` that only pushes when no row exists for that student (`attendance.studentId: {$ne: id}`), so manual and earlier rows win. `meetingLink` comes from the group (`groupModel` lookup via `SessionStateService` if it already exposes the group, otherwise inject `Group` model).
- [ ] **Step 4:** Run the spec. Expected: PASS.

### Task 5: Handlers for join, heartbeat, leave

**Files:**
- Modify: `apps/server/src/academics/session/session.controller.message.ts`

**Interfaces:**
- Produces NATS patterns `academics.sessions.join`, `academics.sessions.heartbeat`, `academics.sessions.leave`, payload `{ id }`, guard `RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })`.

- [ ] **Step 1:** Add the three handlers delegating to `SessionPresenceService`.
- [ ] **Step 2:** Check that the STUDENT and INSTRUCTOR roles hold READ on SESSION in the role seed (grep the seed for `Subjects.SESSION`). If students lack it, add it to the seed and say so in the final report.
- [ ] **Step 3:** Run `session.controller.message` related specs and `tsc` for the server. Expected: no new failures.

### Task 6: Close-out auto-ABSENT

**Files:**
- Modify: `apps/server/src/academics/session/session-status.processor.ts` (the place that moves SCHEDULED to REPORT_PENDING)
- Test: `session-status.processor.spec.ts`

**Interfaces:**
- Consumes: `activeStudentIds`; `AttendanceSource`.
- Produces: when a session becomes REPORT_PENDING, every active student with no attendance row gets `{status: ABSENT, source: AUTO}`; a teacher with no presence and `teacherAttendance == null` stays null (a teacher no-show is a staff decision, **(my call)**).

- [ ] **Step 1: Failing test:** a session with students A (row present) and B (no row, no presence) transitions; B gets ABSENT/AUTO, A is untouched; a student who has a presence record but no row is not marked ABSENT.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement in the processor using a single `updateOne` with `$push`/`$each` guarded by the status transition filter.
- [ ] **Step 4:** Run it. Expected: PASS.

---

## Phase 2: Agora meetings for group sessions

### Task 7: Group meeting provider

**Files:**
- Modify: `apps/server/src/academics/group/entities/group.entity.ts` (add `meetingProvider: MeetingProvider`, default `EXTERNAL_URL`)
- Modify: `apps/server/src/academics/group/dto/group.dto.ts` (`@IsOptional() @IsEnum(MeetingProvider) meetingProvider?`)
- Modify: `apps/client/src/lib/types/academics/academics.ts`, `.../academics/groups/__components/group-form.tsx` and its schema (provider select; link field required only for EXTERNAL_URL)
- Test: extend `apps/server/src/academics/group/dto/group.dto.spec.ts`

- [ ] **Step 1: Failing test:** DTO accepts `AGORA` without `meetingLink`, rejects an unknown provider value.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement the field, DTO decorator and form changes. Run it. Expected: PASS.

### Task 8: Agora token for a group session

**Files:**
- Modify: `apps/server/src/agora/agora.service.ts` (add `issueGroupSessionToken(userId: string, sessionId: string)`; channel `grp_<sessionId>`; uid via `userIdToAgoraUid`)
- Modify: `apps/server/src/agora/agora.module.ts` (export `AgoraService`) and `academics.module.ts` (import `AgoraModule`)
- Modify: `session-presence.service.ts` (join fills `agora` when `group.meetingProvider === AGORA`)
- Test: extend `session-presence.service.spec.ts`

**Interfaces:**
- Produces: `AgoraService.issueRtcToken` is reused unchanged; `join` returns `{ provider: AGORA, agora: AgoraTokenResult }` and no `meetingLink`.

- [ ] **Step 1: Failing test:** for an AGORA group, `join` returns `agora.channelName === 'grp_' + sessionId` and the same presence/attendance writes as Task 4; for EXTERNAL_URL `agora` is undefined.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement. Run it. Expected: PASS.
- [ ] **Step 3:** Confirm no circular import: start check with `npx tsc --noEmit -p apps/server/tsconfig.json`, then boot the server once and watch for a Nest DI error.

### Task 9: Client join flow and call screen

**Files:**
- Modify: `apps/client/src/lib/actions/academics/sessions.action.ts` (`joinSession`, `heartbeatSession`, `leaveSession` via `createAuthorizedNatsRequest`)
- Modify: `apps/client/src/lib/hooks/academics/use-academics.hook.ts` (`useJoinSession`)
- Create: `apps/client/src/components/organs/academics/session-join-button.tsx` (calls join; if `agora` present routes to the call page, else `window.open(meetingLink)`)
- Create: org call page `.../organization-dashboard/sessions/[id]/call/page.tsx` and student call page under `student-dashboard/my-groups/[id]/` (both wrap the existing `AgoraCall`, send a heartbeat every 60s, call `leaveSession` on end and on `pagehide`)
- Modify: `session-detail-screen.tsx` and the student group page to render the join button; `routes.constants.ts`; `messages/en.json`, `ar.json`
- Test: `session-join-button.test.tsx` next to the component

- [ ] **Step 1: Failing test:** for an external session the button calls `joinSession` first and only then `window.open` with the returned link; for an Agora session it navigates to the call route and does not open a window; on a Forbidden/closed-window error it shows the message and opens nothing.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement. Run it. Expected: PASS.
- [ ] **Step 3:** Manual check with two browsers (teacher, student) on an AGORA group: both appear, attendance shows PRESENT on the session page, presence duration grows.

---

## Phase 3: Visibility for staff

### Task 10: Presence and source on the session detail

**Files:**
- Modify: `apps/server/src/academics/session/session-query.service.ts` (`findOne` adds `presence: { userId, role, firstJoinedAt, totalSeconds }[]`, STAFF audience only; use `totalSeconds` with `cap = endsAt + grace`)
- Modify: `apps/server/src/academics/session/session.types.ts` (`SessionDetailView.presence`)
- Modify: `apps/client/.../sessions/[id]/__components/attendance-table.tsx` (show an "Auto" badge for `source === 'AUTO'`, join time and minutes)
- Test: `session-query.service.spec.ts`

- [ ] **Step 1: Failing test:** STAFF gets presence rows with computed seconds; FAMILY and ACCOUNTANT audiences get `presence: []`.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement server then client. Run it. Expected: PASS.

### Task 11: Group attendance matrix

**Files:**
- Create: `apps/server/src/academics/group/group-attendance.service.ts` and a payload DTO (`{ id: string }`)
- Modify: `group.controller.message.ts` (`academics.groups.attendanceMatrix`, READ on GROUP) and `academics.module.ts`
- Create: client tab in `.../academics/groups/[id]/__components/group-attendance-tab.tsx`, wired into the group detail screen; i18n
- Test: `group-attendance.service.spec.ts`

**Interfaces:**
- Produces: `attendanceMatrix(actor, groupId): Promise<{ sessions: {id, sequence, startsAt, teacherAttendance}[]; students: {studentId, name, cells: Record<sessionId, AttendanceStatus | null>, presentRate: number}[] }>`. Group scope uses `resolveGroupScope` so a supervisor only sees their own groups.

- [ ] **Step 1: Failing test:** two sessions × two students produce the expected cells and `presentRate` (PRESENT and LATE count as attended); an out-of-scope group returns NotFound.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement. Run it. Expected: PASS.

### Task 12: Teacher overview (server)

**Files:**
- Create: `apps/server/src/academics/domain/teacher-stats.ts` + `teacher-stats.spec.ts`
- Create: `apps/server/src/academics/teacher/teacher-overview.service.ts`, `teacher.controller.message.ts`, `dto/teacher.dto.ts`
- Modify: `academics.module.ts`
- Test: `teacher-overview.service.spec.ts`

**Interfaces:**
- Produces: `computeTeacherStats(sessions: { status; startsAt; endsAt; teacherAttendance?; report?: {submittedAt} | null }[], presence: { sessionId; firstJoinedAt }[]): { total, completed, cancelled, reportsLate, reportsMissing, attendance: Record<AttendanceStatus, number>, avgJoinDelayMinutes: number | null }` (`reportsLate` uses the existing report-due rule in `session-report.service.ts`; read it first and do not invent a new one).
- NATS `academics.teachers.overview` payload `{ id: string; from?: string; to?: string }` (dates `@IsOptional @IsDateString`), guard `READ` on `INSTRUCTOR_REPORT`. Returns `{ teacher: {id, name, email, phone, avatar}, groups: [...], stats, evaluations: { averages, recent }, recentSessions: [...20] }`.
- Access: the teacher themself, org-wide staff roles, and SUPERVISOR/COORDINATOR only for teachers of groups in their scope; otherwise Forbidden.

- [ ] **Step 1: Failing tests:** `computeTeacherStats` counts and `avgJoinDelayMinutes` (join 4 min after start and 8 min after start gives 6; no presence gives null); service returns Forbidden for a supervisor whose groups do not include the teacher, and returns data for the teacher reading their own id.
- [ ] **Step 2:** Run both specs. Expected: FAIL. Implement. Run. Expected: PASS.
- [ ] **Step 3:** Check the INSTRUCTOR_REPORT permission is held by ADMIN, OWNER, MANAGER, SUPERVISOR, COORDINATOR and INSTRUCTOR in the role seed; add what is missing and report it.

### Task 13: Teacher details page (client)

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/teachers/[id]/page.tsx` and `__components/` (`teacher-header`, `teacher-stats-cards`, `teacher-sessions-table`, `teacher-evaluations`), tabs Overview / Sessions & attendance / Reports / Evaluations
- Modify: `routes.constants.ts` (`ROUTE_ORG_TEACHER(id)`), `lib/actions/academics/teachers.action.ts` (new), `use-academics.hook.ts` (`useTeacherOverview`), the users table and group detail screen (link teacher name to the page), `messages/en.json` + `ar.json`
- Test: `teacher-stats-cards.test.tsx`

- [ ] **Step 1: Failing test:** cards render counts from a fixture, show "No data" for a null `avgJoinDelayMinutes`, and render nothing for evaluations when the viewer lacks access.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement. Run it. Expected: PASS.
- [ ] **Step 3:** Manual check as admin, supervisor (own groups only), and the teacher themself; confirm the Arabic page renders right-to-left.

---

## Out of scope (non-goals) **(my call)**

- Agora cloud recording and Agora webhooks. Heartbeats give duration without them.
- Duration for external links: only the click is known. Platform-time duration exists for Agora sessions only. This must be stated in the UI help text.
- An org-wide attendance dashboard. Only the group matrix and the teacher page are built.
- The legacy `apps/server/src/attendance/` module and course live-session attendance.
- Payroll changes. Teacher attendance is displayed, not paid against.
- Automatic teacher ABSENT.

## Self-review notes

- Coverage: auto attendance (T1-6), Agora for groups (T7-9), teacher attendance saved and visible to admin/supervisors (T4, T10), teacher details page with work, attendance and reports (T12-13), group/teacher/student/session tracking (T10-11).
- Names checked across tasks: `checkJoinWindow`, `statusFromJoin`, `totalSeconds`, `JoinResult`, `AttendanceSource`, `PresenceRole`, `academics.sessions.join|heartbeat|leave`, `academics.groups.attendanceMatrix`, `academics.teachers.overview`.
- Task 12's late-report rule deliberately points at the existing rule; the implementer must read `session-report.service.ts` first.
