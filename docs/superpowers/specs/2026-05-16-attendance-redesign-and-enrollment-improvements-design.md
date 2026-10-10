# Attendance Redesign & Enrollment Improvements — Design Spec

**Date:** 2026-05-16
**Scope:** Sub-projects A (slot-aware attendance + derived absence + report rewrite), B (student-search bug in offline-schedule-slot), C (enrollment data table refactor + ORGAN-PATTERN compliance for `add-enrollment-dialog`).
**Out of scope:** Sub-project D (mobile profile attendance surface), session cancellations/reschedules/holidays, materialized session collection, live-session attendance, auto-absent notifications, configurable report color thresholds.

---

## 1. Problem statement

The current attendance subsystem has four structural defects:

1. **No session/slot identity on attendance rows.** Attendance is keyed by `(courseId, studentId, date)`. A course with two offline slots on the same weekday collapses both into one row.
2. **Absence is stored as an explicit status.** The org user can manually toggle `ABSENT`, which is brittle (forget to mark = silent miss) and conflates "the student didn't show up" with "the teacher hasn't recorded yet."
3. **Reports aggregate stored rows only**, so absence counts and `attendanceRate` reflect what was *written*, not what *should have happened*.
4. **Student search in `offline-schedule-slot.tsx` returns all students** regardless of search term — the server-side `enrollment.getCourseEnrollments` NATS handler doesn't apply the `search` filter that the client threads through correctly.

Additionally, the org enrollments `enrollment-data-table.tsx` is 670 lines doing five jobs (table shell, columns, progress dialog, subscription dialog, action menu) and `add-enrollment-dialog.tsx` violates the project's ORGAN-PATTERN rule from `CLAUDE.md`.

## 2. Goals

- Sessions have stable identity, so attendance can distinguish two slots on the same day.
- "Absent" is **derived**, never stored. The org user picks only Present / Late / Excused / Clear.
- Reports reflect *expected* sessions and *derived* absence; `attendanceRate` excludes EXCUSED from the denominator.
- Per-slot student rosters are authoritative for who is expected at a session.
- The org user's marking flow is: **course → mode (single slot | all slots) → date → roster**.
- The student-search bug in offline schedule slot picker is fixed.
- Enrollment data table is split into focused components following ORGAN-PATTERN.

## 3. Non-goals

Listed under "out of scope" in the header. Notably, this design assumes the recurring weekly schedule always happens — cancellations, reschedules, and holidays are a future spec.

## 4. Architecture

### 4.1 Session identity (hybrid model)

A "session" is the tuple `(courseId, slotId, date)` where `slotId` is the existing `_id` on a `course.offlineSchedule.timeSlots[]` subdocument. Sessions are **computed on the fly** by expanding each slot's `dayOfWeek` across a date range. There is no new `AttendanceSession` collection.

Consequence: if a timeSlot is *edited* (different time or weekday), historical attendance under that `slotId` remains associated with the new definition. If a timeSlot is *removed*, historical attendance under that `slotId` is orphaned. To keep this safe, **timeSlots must be soft-delete-only** (add `deletedAt` to the subdocument schema). The marking UI hides soft-deleted slots; the report includes them when historical data exists under that `slotId`.

### 4.2 Slot roster authority

A student is "expected" at a session iff they appear in that slot's `students[]` array. **Slots with empty `students[]` produce no expected sessions** — they are effectively invisible to attendance until the org user assigns a roster. This is intentional (the strictest model) and must be surfaced clearly in the marking UI ("This slot has no roster — assign students in the course editor").

### 4.3 Derived absence

For each expected session whose `endsAt` is in the past:

- Roster students with a recorded row (PRESENT / LATE / EXCUSED) → that status.
- Roster students with no row → derived absent.

The UI shows derived absence as a non-interactive muted pill. Clearing a recorded row returns the student to derived-absent state. No `ABSENT` row is ever written.

### 4.4 Report aggregation

`generateReport(courseId, dateRange)` builds:

1. Expected sessions via `AttendanceDerivationService.getExpectedSessions(courseId, dateRange)`.
2. For each `(slotId, date)` and each roster student, look up the recorded status.
3. Per student:
   - `presentCount`, `lateCount`, `excusedCount` from rows.
   - `expectedSessions` = count of sessions where the student is in the roster.
   - `absentCount = expectedSessions - (presentCount + lateCount + excusedCount)`.
   - `attendanceRate = (presentCount + lateCount) / (expectedSessions - excusedCount)`, expressed as `0` when the denominator is `0`.

Summary cards aggregate across all students.

## 5. Server-side changes

### 5.1 Schema

**`Attendance` entity** (`apps/server/src/attendance/attendance.entity.ts`):

- Add required `slotId: ObjectId`.
- Drop `AttendanceStatus.ABSENT` from the enum. Allowed values: `PRESENT | LATE | EXCUSED`.
- Drop existing unique index on `{ courseId, studentId, date }`.
- Add unique compound index on `{ courseId, studentId, slotId, date }`.

**`Course` entity** — `offlineSchedule.timeSlots[]` subdocument: add `deletedAt?: Date` for soft-delete.

### 5.2 New service

**`AttendanceDerivationService`** (`apps/server/src/attendance/attendance-derivation.service.ts`):

```ts
getExpectedSessions(courseId: string, range: { from: Date; to: Date }):
  Promise<{ slotId: string; date: Date; startsAt: Date; endsAt: Date; studentIds: string[] }[]>

getSessionRoster(courseId: string, slotId: string, date: Date):
  Promise<{ studentIds: string[]; startsAt: Date; endsAt: Date }>

deriveAbsences(courseId: string, range: { from: Date; to: Date }):
  Promise<{ studentId: string; slotId: string; date: Date }[]>
```

`getExpectedSessions` expands each non-soft-deleted timeSlot by `dayOfWeek` across the range, skipping slots with empty `students[]`. Each occurrence's `startsAt`/`endsAt` is computed by combining the date with the slot's time fields in the course's timezone (read from `course.timezone` if present, else UTC).

### 5.3 `AttendanceService` updates

- `markAttendance(dto, markedBy)` — `dto.slotId` is now required. Validates: slot exists on course and is not soft-deleted; student is in that slot's `students[]`; status is one of `PRESENT | LATE | EXCUSED`. Throws `SLOT_REQUIRED`, `SLOT_NOT_FOUND`, `STUDENT_NOT_IN_SLOT_ROSTER` accordingly.
- `bulkMarkAttendance({ courseId, slotId, date, records })` — one slot per call. Same validations applied to each record via `Promise.allSettled`.
- `generateReport(dto)` — rewritten per §4.4. Output shape:
  ```ts
  ReportData {
    summary: {
      totalStudents, totalSessions,
      totalPresent, totalLate, totalExcused, totalAbsent,
    },
    students: [{
      studentId, firstName, lastName, email, avatar,
      expectedSessions, presentCount, lateCount, excusedCount, absentCount,
      attendanceRate,
    }],
  }
  ```
- `getAttendanceByDate` → **renamed `getAttendanceBySession(courseId, slotId, date)`**. Returns roster + recorded rows + a `derivedAbsent: boolean` flag per roster entry computed against `now`.
- `clearAttendance({ courseId, slotId, date, studentId })` — new method. Deletes the row (returns the student to derived state).
- `updateEnrollmentAttendanceSummary(enrollmentId)` — recomputes from derivation + recorded rows; no longer triggered by ABSENT writes. Called on every mark/clear and inside `generateReport` for the students it touches. No cron — there is no scheduler infrastructure in `apps/server/src` today, and on-mark + on-read recomputation is sufficient given the data volumes.

### 5.4 Errors

`apps/server/src/attendance/attendance.errors.ts` adds:

- `SLOT_REQUIRED` — "Slot ID is required."
- `SLOT_NOT_FOUND` — "Slot does not exist on this course."
- `STUDENT_NOT_IN_SLOT_ROSTER` — "Student is not assigned to this slot."

### 5.5 Search bug fix (Sub-project B)

In `apps/server/src/enrollment/services/enrollment.service.ts`, the listing method behind the `enrollment.getCourseEnrollments` NATS handler:

- When `options.search` is non-empty, perform a `$lookup` to the users collection (or use the existing populated-user pattern from `enrollment.getEnrollmentsByOrganization` — whichever is already in use) and `$match` against `firstName`, `lastName`, `email` with a case-insensitive regex. Apply the filter **before** `$skip` / `$limit`.
- Mirror the exact pattern used in the org-level listing to avoid divergence.

No client-side changes needed for this — the offline-slot picker and all other consumers already pass `search` correctly.

### 5.6 Seeds

`apps/server/src/database/seeds/seed.ts`:

- Offline courses get `offlineSchedule.timeSlots[]` populated with realistic weekly slots, each with an explicit `students[]` roster drawn from that course's enrollments.
- Generate attendance rows for the last ~4 weeks, with `slotId` set, using only `PRESENT | LATE | EXCUSED` statuses. Leave gaps so derived absence is exercised in seeded data.
- Remove any existing seed code that writes `ABSENT` rows.

## 6. Client-side changes

### 6.1 New file structure under `attendance/`

```
apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/
  page.tsx                            # Tabs: Mark | Report (shell unchanged)
  _components/
    mark/
      attendance-mark.tsx             # Container: course → mode → date → slot
      slot-mode-toggle.tsx            # "Single slot" / "All slots"
      slot-picker.tsx                 # Dropdown of slots for chosen course+date
      slot-session-panel/
        slot-session-panel.tsx        # One slot's roster + mark controls
        slot-session-panel.schema.ts
      mark-status-buttons.tsx         # Present / Late / Excused / Clear
    report/
      attendance-report.tsx           # Refactored from current AttendanceReport
      report-filters.tsx
      report-summary-cards.tsx
      report-student-row.tsx
  _hooks/
    use-course-slots.hook.ts          # reads course.offlineSchedule.timeSlots
    use-session-roster.hook.ts        # useQuery → getAttendanceBySession
    use-mark-attendance.hook.ts       # useMutation → markAttendance
    use-bulk-mark-attendance.hook.ts  # useMutation → bulkMarkAttendance
    use-clear-attendance.hook.ts      # useMutation → clearAttendance
    use-attendance-report.hook.ts     # useMutation → generateReport
```

### 6.2 Marking flow

**Single-slot mode:**

1. Course `Select` (from `getCourses`).
2. Mode toggle: **Single slot** | **All slots**.
3. Date picker (defaults today; disables dates whose weekday has no non-soft-deleted slot with a roster).
4. `SlotPicker` lists matching slots for the chosen date with non-empty rosters. Empty-roster slots are listed but disabled, with helper text linking to the course editor.
5. `<SlotSessionPanel>` renders header (`09:00–10:30 — Slot label`, roster size), then the roster. Each row: avatar + name + email + `<MarkStatusButtons>` + notes input.
6. Save bar with "Mark all present" shortcut and "Save changes" (writes only diffed rows via `bulkMarkAttendance`).

**All-slots mode:**

- No slot dropdown. `<SlotSessionPanel>` is rendered once per slot occurring that date (rosters non-empty), stacked with sticky slot headers. Each panel manages its own dirty state and save bar so partial saves don't lose work.

**Derived-absent rendering:**

- Past sessions (`slot.endsAt < now`), roster student with no row → muted "Absent (auto)" pill, no buttons.
- Future / in-progress sessions, no row → "Not yet recorded" placeholder with the four buttons enabled.
- "Clear" on a recorded row deletes via `clearAttendance` and returns to the appropriate empty state.

### 6.3 Report

UI mostly survives; data shape and labels change per §4.4:

- Summary cards: `totalStudents`, `totalSessions`, `totalPresent`, `totalLate`, `totalExcused`, `totalAbsent` (6 cards instead of 5).
- Student rows show `expectedSessions` instead of `totalClasses`.
- Color thresholds unchanged (≥75 green, ≥50 yellow, <50 red).
- Absent badge gets a tooltip: "Derived from sessions with no recorded status."

### 6.4 Enrollment data table refactor (Sub-project C)

`apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/`:

```
enrollment-data-table/
  enrollment-data-table.tsx           # Table shell, columns, pagination (~200 lines)
  enrollment-data-table.schema.ts     # Column defs / shared types
enrollment-row-actions.tsx            # Action menu
enrollment-progress-dialog/
  enrollment-progress-dialog.tsx
  enrollment-progress-dialog.skeleton.tsx
enrollment-subscription-dialog/
  enrollment-subscription-dialog.tsx
  enrollment-subscription-dialog.skeleton.tsx
enrollment-filters-drawer.tsx         # unchanged unless oversize
add-enrollment-dialog/                # ORGAN-PATTERN compliance
  add-enrollment-dialog.tsx
  add-enrollment-dialog.schema.ts
```

Pure restructure. No behavior changes. Each dialog gets its own skeleton component.

### 6.5 Removed / renamed (client)

- Removed: `AttendanceDashboard` component (replaced by `attendance-mark.tsx`), the "Mark all absent" notion entirely.
- Removed action: `getAttendanceByDate.action.ts`.
- New action: `getAttendanceBySession.action.ts`.
- New action: `clearAttendance.action.ts`.

## 7. Testing

**Server:**

- Unit tests for `AttendanceDerivationService`: weekday expansion across DST boundaries; slots with empty rosters produce nothing; multiple slots on the same weekday both expand to distinct sessions; soft-deleted slots excluded; date-range edges.
- Unit tests for the rewritten `generateReport`: hand-computed fixtures with mixed present/late/excused + gaps; `attendanceRate` denominator excludes excused; `attendanceRate = 0` when denominator is `0`.
- Integration tests for `markAttendance`: rejects missing `slotId` (`SLOT_REQUIRED`), rejects student not in roster (`STUDENT_NOT_IN_SLOT_ROSTER`), rejects unknown slot (`SLOT_NOT_FOUND`), accepts valid mark and recomputes enrollment summary.
- Integration test for `clearAttendance`: row deleted; subsequent report shows derived absent if session is past.
- Integration test for `enrollment.getCourseEnrollments` with `search`: matches by `firstName`, `lastName`, `email`, case-insensitive; respects pagination after filter.

**Client:**

- Hook tests via React Query test utilities — mock the action, assert pending/success/error transitions and toast calls (`use-session-roster`, `use-mark-attendance`, `use-bulk-mark-attendance`, `use-clear-attendance`, `use-attendance-report`).
- Component test for `SlotSessionPanel`: derived-absent pill renders for past slot with no row; clicking "Clear" on a recorded row removes it from view; "Mark all present" populates all empty rows; save fires `bulkMarkAttendance` with only diffed records.
- Component test for `AttendanceReport`: tooltip on absent badge; rate color thresholds.

No E2E in this spec.

## 8. Rollout

Because the user reseeds in development, this is a single-cutover release with no production migration.

1. Land server changes: schema, derivation service, `AttendanceService` updates, errors, search fix, seed updates.
2. Reseed the database.
3. Land client changes: marking redesign, report rewrite, enrollment table split, ORGAN-PATTERN fix for add-enrollment-dialog.
4. Smoke test: pick a course with two slots in the same week, mark one student in slot A, verify (a) the report shows that student as 1 present + 1 derived absent for slot B, (b) the offline-schedule-slot student picker filters correctly when searching.

## 9. Risks and open follow-ups

- **Soft-delete-only timeSlots** is a new invariant that must be enforced in the course editor. If a future PR adds a hard-delete path, historical attendance silently orphans.
- **Empty-roster slots produce no attendance** — orgs that haven't filled in per-slot rosters will see zero data until they do. Marking UI must make this discoverable.
- **No cancellation / reschedule mechanism** — if a class is cancelled, students show as derived absent. The "Excused" status is the workaround until a future spec.
- **No background recomputation** — `attendanceSummary` updates only on mark/clear and on report read. If a slot's window closes with no marks, the affected enrollments' summaries stay stale until either event fires. Acceptable today; revisit if a UI surface needs fresh summaries without triggering a mark or report.
