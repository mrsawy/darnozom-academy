# MVP Sub-project 2: Sessions, Attendance & Reports — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-project 1 (groups, teacher assignment)
**Scope authority:** `docs/MVP.md` §3 row 2, from the concept document's MVP list ("scheduling … attendance, session reports, first-session follow-up").

## 1. Goal

When a ready group starts, its sessions are generated automatically. The teacher records student attendance and submits a session report with a per-student evaluation. A session isn't complete until its report is submitted. After the group's first session, the coordinator records each student's follow-up.

## 2. Out of scope

- **Not in the MVP:** the live operations board, the "I'm ready" button, make-up sessions and video-platform monitoring.
- **Later sub-projects:** pre-start tasks (sub-project 3) and supervisor evaluations (sub-project 5).

## 3. Decisions (from your answers)

- **Session count:** `totalSessions` is a field on the group, set during formation.
- **Report evaluation:** each student is scored 1–5 on participation, understanding, behavior and homework, with an optional note per student.
- **First-session follow-up:** per student, the parent's feedback (a note) and a decision: `CONTINUE` or `WITHDRAW`.

## 4. Data model changes

### 4.1 Group (from sub-project 1)

- Add `totalSessions` (integer, 1–500), **required** when a group is created or edited. Groups created under sub-project 1 before this field existed are given a value from the group edit form before they can be started. The readiness checklist is unchanged and keeps the 5 concept items.
- Group status gains `RUNNING` and `COMPLETED` (the sub-project 1 "grow later" rule). The full set is now `FORMING`, `READY_TO_START`, `RUNNING`, `COMPLETED`, `CANCELLED`.
- Each group student gains `status: ACTIVE | WITHDRAWN` (default `ACTIVE`) and `withdrawnAt?`. Once a group is `RUNNING`, removing a student sets them to `WITHDRAWN` instead of deleting the entry, so their attendance history still has a student to point to.
  - Readiness and capacity count `ACTIVE` students only.

### 4.2 Session (new, `academics/session`)

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `groupId`, `teacherId` | ObjectId | `teacherId` is copied from the group when the session is generated |
| `sequence` | integer 1..totalSessions | unique per group |
| `startsAt`, `endsAt` | Date (UTC) | computed from the group's schedule and timezone |
| `status` | `SCHEDULED \| REPORT_PENDING \| COMPLETED \| CANCELLED` | |
| `teacherAttendance` | `AttendanceStatus?` | the existing shared enum: PRESENT, LATE, EXCUSED, ABSENT |
| `attendance` | `[{ studentId, status: AttendanceStatus, note?, markedBy, markedAt }]` | |
| `report` | `{ evaluations: [{ studentId, participation, understanding, behavior, homework (1–5), note? }], summary?, submittedBy, submittedAt }?` | |
| `cancelReason?`, `cancelledBy?` | | |

**Indexes:**
- `{ groupId, sequence }`, unique
- `{ teacherId, startsAt }`
- `{ organizationId, status, startsAt }`

### 4.3 FirstSessionFollowUp (new)

`{ organizationId, groupId, sessionId, studentId, parentFeedback?, decision?: 'CONTINUE' | 'WITHDRAW', recordedBy?, recordedAt? }`, unique on `{groupId, studentId}`.

## 5. Rules

### 5.1 Starting a group and generating sessions

`POST /groups/:id/start` (`MANAGE GROUP`):
- **Guard:** the group is `READY_TO_START`.
- **Effect:** status becomes `RUNNING`, and all `totalSessions` sessions are generated in one transaction.

How sessions are generated:
1. Walk forward from the cohort's `startDate`, in the group's timezone.
2. For each day, take the schedule slots for that weekday, in order.
3. Create one session per slot until `totalSessions` sessions exist.
4. Convert each slot's local time to UTC using `luxon`, so each date's own daylight-saving offset is applied.

The generator is a pure function, `generateSessions(schedule, timezone, startDate, totalSessions)`.

While the group is `RUNNING`, changing the schedule or timezone is rejected with `409 GROUP_RUNNING_SCHEDULE_LOCKED`. Make-up sessions and rescheduling are not in the MVP.

### 5.2 Session statuses

- **`SCHEDULED → REPORT_PENDING`:** automatic once `endsAt` has passed. A BullMQ repeatable job runs every 5 minutes; the status is also evaluated whenever the session is read.
- **`REPORT_PENDING → COMPLETED`:** when the report is submitted. Attendance must already be recorded for every `ACTIVE` student; otherwise `409 ATTENDANCE_INCOMPLETE`.
- **`SCHEDULED → CANCELLED`** (`MANAGE GROUP`, with a reason): a cancelled session doesn't count, and no replacement is generated.
- **Group completion:** when every session is `COMPLETED` or `CANCELLED`, the group moves `RUNNING → COMPLETED` automatically.

### 5.3 Attendance

- **Student attendance:** `PUT /sessions/:id/attendance` is allowed for the session's teacher, or anyone with `MANAGE GROUP`.
  - Allowed window: from 15 minutes before `startsAt` until the report is submitted.
  - Body: `[{ studentId, status, note? }]` for `ACTIVE` students only.
- **Teacher attendance:** `PUT /sessions/:id/teacher-attendance` is allowed for `MANAGE GROUP` or the group's supervisor.
  - If nobody has set it when the teacher submits student attendance, it is recorded as `PRESENT` (assumption A1).

### 5.4 Report

`POST /sessions/:id/report` (the session's teacher only):
- The session must be in `REPORT_PENDING`, or in `SCHEDULED` after `startsAt` (teachers may report as soon as class ends).
- The report needs one evaluation per `ACTIVE` student, each score an integer from 1 to 5.
- Submitting moves the session to `COMPLETED`.
- The report can be edited by the same teacher within 24 hours (assumption A2). After that it is read-only.

### 5.5 First-session follow-up

- When session `sequence = 1` becomes `COMPLETED`, one follow-up row is created for every `ACTIVE` student.
- The coordinator (`MANAGE GROUP`) fills in `parentFeedback` and `decision`.
- `decision = WITHDRAW` sets the student to `WITHDRAWN` in the group.

### 5.6 Visibility

- Sessions follow the group read-scoping from sub-project 1 §5.6.
- Parents and students see attendance and report evaluations **only for the child in question**; the evaluations of other students are removed from the response.
- Accountants see sessions and attendance, but not the report evaluations or notes. This follows the concept rule "Accountants can't see confidential pedagogical notes".

## 6. API

- `POST /groups/:id/start`
- `GET /sessions?groupId=&teacherId=&from=&to=&status=`
- `GET /sessions/:id`
- `POST /sessions/:id/cancel`
- `PUT /sessions/:id/attendance`
- `PUT /sessions/:id/teacher-attendance`
- `POST|PATCH /sessions/:id/report`
- `GET /groups/:id/follow-ups`
- `PATCH /follow-ups/:id`

## 7. Screens (en + ar)

- **Group page (sub-project 1):** a "Start group" button, a sessions tab (list with status), and a follow-up tab.
- **Teacher:** a "My sessions" week view, plus a session page with the attendance table and the report form (1–5 selectors per student per criterion).
- **Parent/student:** a child's sessions with attendance and their own evaluation.

## 8. Testing

- **`generateSessions`:** multiple slots per week; a daylight-saving transition inside the range; a start date in the middle of the week.
- **Status transitions**, including the auto `REPORT_PENDING` and group auto-complete.
- **Reports:** a report rejected while attendance is incomplete; scores outside 1–5 rejected.
- **Follow-up:** `WITHDRAW` sets the student to `WITHDRAWN`.
- **Visibility:** a parent never receives another student's evaluation; an accountant never receives evaluations.

## 9. Assumptions to confirm

- **A1:** Teacher attendance defaults to `PRESENT` when the teacher records student attendance; staff can change it.
- **A2:** Teachers can edit a submitted report for 24 hours.
