# Student Calendar — Review & Improvements Design

**Date:** 2026-07-26
**Scope:** Server (`apps/server/src/user/services/student.service.ts` and controllers), Web client (`apps/client`), Mobile (`apps/lms-mobile`), Shared types (`lib/shared-types`)
**Cycle covered:** correctness bug fixes, cross-platform type/logic consistency, dead-code cleanup, and test coverage for the existing student calendar feature.

**Explicitly out of scope for this cycle** (deferred, not part of this design): a new organization/instructor calendar, UX parity between the web month-grid and mobile agenda-list views, and a full IANA-timezone-authoring migration for offline attendance slots (mirroring the private-session `session-time.util.ts` model). These are noted under Non-Goals with reasoning.

---

## 1. Purpose

The student calendar aggregates four kinds of events (assignments/quizzes/projects, live sessions, offline-attendance slots, private-session bookings) into one feed consumed by both the web (`FullCalendar` month grid) and mobile (`react-native-calendars` agenda list) clients. The feature works end-to-end, but this review found several correctness bugs (content the student can't otherwise access leaking onto the calendar, removed attendance slots still appearing, date-range/timezone mismatches) plus consistency debt (duplicated types, dead code, no tests) that make the date-arithmetic-heavy server logic risky to change safely.

---

## 2. Current State (as-is)

### Server — `apps/server/src/user/services/student.service.ts`
- Single endpoint, two transports: `GET /student/calendar` (`student.controller.http.ts`) and NATS `students.calendar` (`student.controller.message.ts`), both delegating to `StudentService.getCalendar(studentId, organizationId, fromDate?, toDate?)`.
- One aggregation joins `enrollments → courses → course_contents`, then in memory builds three groups of `CalendarAppointment` rows and merges + sorts them:
  1. `buildContentAppointments` — ASSIGNMENT/QUIZ/PROJECT/LIVE_SESSION content within enrolled courses.
  2. `getScheduleAppointments` — expands each course's weekly `attendanceSettings.offlineSchedule` slots into concrete dates.
  3. `getPrivateSessionAppointments` — confirmed/completed `SessionBooking`s for the student.
- `resolveTimeFrame(fromDate, toDate)` defaults to "this month" when no range is passed, otherwise parses the client-supplied ISO strings.

### Web — `apps/client`
- `main-calender.tsx` renders `@fullcalendar/react` (`dayGridPlugin`, month view only) fed by `useStudentCalendar` (`apps/client/src/lib/hooks/calender/useStudentCalendar.hook.ts`), which calls the NATS action `getStudentCalendar` (`apps/client/src/lib/actions/calender/getStudentCalendar.action.ts`).
- Clicking an event opens a read-only `AppointmentModal` (no join action).
- `apps/client/src/components/organs/full-calendar.tsx` is a `react-big-calendar` wrapper that is **not referenced anywhere** in the app.

### Mobile — `apps/lms-mobile`
- `StudentCalendar.tsx` renders `react-native-calendars`' `ExpandableCalendar` + `AgendaList`, fed by `useStudentCalendar` (`apps/lms-mobile/lib/hooks/calendar.hook.ts`) calling the HTTP action `fetchStudentCalendar` (`apps/lms-mobile/lib/action/calendar.action.ts`).
- Rendered from two places: the "Agenda" profile tab and the "Calendar" sub-tab of "My Learning" enrollments screen.
- `CalendarEventCard.tsx` (used elsewhere, not by `StudentCalendar` itself) has working join-window logic (`isWithinSessionWindow`) for private/live sessions.
- `CalendarSubheader.tsx` and `CalendarEmptyState.tsx` are exported from `components/organs/calendar/index.ts` but **not rendered anywhere**.

### Shared types — `lib/shared-types`
- Only `CalendarAppointmentType` enum is shared (`lib/shared-types/src/lib/types/user/calender/calender.type.ts`). The `ICalendarAppointment` / `ICalendarAppointmentMeta` interfaces are hand-duplicated separately in `apps/client` and `apps/lms-mobile`, and diverge (mobile's `meta` is a typed `ICalendarAppointmentMeta`; web's is a loose `Record<string, unknown>`).

---

## 3. Confirmed Issues

### Correctness bugs (server)

1. **Soft-deleted attendance slots leak onto the calendar.** `getScheduleAppointments` iterates `course.attendanceSettings.offlineSchedule ?? []` directly and never checks `slot.deletedAt`. Every other reader of the same field does: `attendance.service.ts` (`schedule.find((s) => ... && !s.deletedAt)`), `attendance-derivation.service.ts` (`slots.filter((s) => !s.deletedAt ...)`). A removed offline session still shows up as a future calendar event for students.

2. **Unpublished/unapproved/inactive content leaks onto the calendar.** `buildContentAppointments` only filters by `RELEVANT_CONTENT_TYPES` and due date — it never applies `isContentServableToStudent` (`apps/server/src/course/utils/content-access.util.ts`), the exact gate the content controllers use to decide what a student may see. A student can see a due date for an assignment/quiz that is still pending approval or inactive, and get a 404 if they tap through to it.

3. **Date-range boundary bug mixing server-local time with client-local time.** Clients compute `fromDate`/`toDate` as `new Date(year, month, day).toISOString()` — a UTC instant derived from the *client's* local midnight, which shifts to an adjacent calendar day depending on the client's UTC offset. The server's `resolveTimeFrame` then does `new Date(new Date(toDate).setHours(23, 59, 59, 999))` — `setHours` mutates using the **server process's** local timezone, not the instant's original meaning. Net effect: for any student not colocated with the server's timezone, appointments near month boundaries can be silently dropped (end of month cut off early) or events from the adjacent month can be off by a day.

4. **Mobile "today"/day-bucketing uses the UTC calendar day, not the device's local calendar day.** In `StudentCalendar.tsx`, `today = new Date().toISOString().split('T')[0]` is always the UTC date. `groupAppointmentsByDate` (`student-calendar.helpers.ts`) buckets appointments the same way via `appt.date.split('T')[0]`. For users not at UTC+0, both the "today" highlight (on the mini calendar and the "jump to today" button visibility) and which day an appointment's agenda section appears under can be off by one, especially for evening/late-night local times. Web does not have this problem the same way because `FullCalendar` converts instants to the browser's local zone before placing them on the grid.

5. **Attendance-slot time expansion uses naive server-local time, diverging from the pattern the codebase just established for private sessions.** `parseTimeOnDate`/`expandWeeklySlot` in `student.service.ts` parse `"HH:MM am/pm"` wall-clock strings and apply them via `Date`/`setHours`, implicitly in the server machine's local timezone (there is no timezone field on `TimeSlot`). `apps/server/src/private-session/utils/session-time.util.ts` solves the equivalent problem correctly with `luxon` (`wallTimeToUtc`, explicit IANA zone). This design does **not** propose adopting the full IANA-authoring model here (see Non-Goals) — it proposes only removing the server-local-time dependency (see §4.3) so behavior stops depending on which machine/timezone the Node process happens to run in.

### Consistency / quality issues

6. **Type duplication and drift.** `ICalendarAppointment`, `ICalendarAppointmentMeta`, `IStudentCalendarParams`, `IStudentCalendarResponse`, `studentCalendarKeys`, and `useStudentCalendar` are hand-duplicated between `apps/client/src/lib/{hooks,types}/calender*` and `apps/lms-mobile/lib/{hooks,types}/calendar*`, with web's `meta` typed more loosely than mobile's. The server's own `CalendarAppointment.type` field is a raw union of `CourseContentType` members plus ad hoc string literals (`'ATTENDANCE' | 'PRIVATE_SESSION'`) rather than the shared `CalendarAppointmentType` enum, forcing an unsafe cast: `CalendarAppointmentType.PRIVATE_SESSION as unknown as 'PRIVATE_SESSION'`.

7. **Dead code.**
   - `apps/client/src/components/organs/full-calendar.tsx` (a `react-big-calendar` wrapper) is not imported anywhere; superseded by `main-calender.tsx`'s FullCalendar implementation.
   - `apps/lms-mobile/components/organs/calendar/CalendarSubheader.tsx` and `CalendarEmptyState.tsx` are exported but never rendered. `CalendarSubheader` additionally hardcodes `en-US` and "current real month" regardless of the calendar's selected month/locale, so it would need fixing before ever being wired up.

8. **No test coverage** for `StudentService.getCalendar` and its helpers, despite this being some of the most date-arithmetic-heavy logic in the codebase, and despite sibling changes in this same working tree adding `.spec.ts` coverage for comparably-scoped utils (`content-access.util.spec.ts`, `content-sanitizer.util.spec.ts`).

### Minor (noted, not required for this cycle)
- Web's `dateOnly`/`allDay` branch in `appointmentsToEvents` (`main-calender.tsx`) is effectively dead: the server always returns full `Date` objects that serialize with a time component, so `!a.date.includes('T')` never triggers.
- `FullCalendar`'s month grid shows a few leading/trailing days from adjacent months, but the client only fetches the visible month's own range, so events dated on those visible-but-adjacent cells never load until the user actually navigates there.

---

## 4. Target Changes

### 4.1 Shared types (`lib/shared-types`)
Add `lib/shared-types/src/lib/types/user/calender/` interfaces: `ICalendarAppointment`, `ICalendarAppointmentMeta`, `IStudentCalendarParams`, `IStudentCalendarResponse`, alongside the existing `CalendarAppointmentType` enum. Both `apps/client` and `apps/lms-mobile` import from there instead of maintaining local copies. `meta` uses the stricter (mobile) shape on both platforms.

### 4.2 Server appointment typing
Change `CalendarAppointment.type` in `student.service.ts` to be typed as `CalendarAppointmentType` (imported from shared-types) instead of a raw union, removing the `as unknown as` cast for private sessions and making the assignment/quiz/project/live-session branches assign the enum member directly instead of the raw `CourseContentType`.

### 4.3 Correctness fixes (server)
- `getScheduleAppointments`: skip slots where `slot.deletedAt` is set, matching `attendance.service.ts` / `attendance-derivation.service.ts`.
- `buildContentAppointments`: apply `isContentServableToStudent` (from `content-access.util.ts`) per content doc before generating an appointment for it.
- `resolveTimeFrame`: replace the server-local `setHours` boundary mutation with a UTC-safe end-of-day computation (`setUTCHours`, or construct the boundary directly from date components) so the computed range no longer depends on the server process's local timezone.
- `expandWeeklySlot`/`parseTimeOnDate`: switch from local-time `Date`/`setHours` to UTC-based construction, removing the implicit dependency on the server machine's timezone (without introducing a new per-slot IANA timezone field — that is deferred, see Non-Goals).

### 4.4 Correctness fix (mobile)
- Replace `today = new Date().toISOString().split('T')[0]` and the `.split('T')[0]` bucketing in `groupAppointmentsByDate` with device-local calendar-day derivation (e.g. a small `toLocalDateKey(date: Date | string): string` helper using `getFullYear`/`getMonth`/`getDate`), so "today" and per-day agenda grouping match the device's actual local day.

### 4.5 Cleanup
- Delete `apps/client/src/components/organs/full-calendar.tsx` and, if nothing else depends on it, the `react-big-calendar` dependency.
- Delete `CalendarSubheader.tsx` and `CalendarEmptyState.tsx` on mobile (unused), or wire one of them in if a maintainer confirms intended use — default recommendation is deletion since neither appears in any screen today.

### 4.6 Tests
- `student.service.spec.ts` (or split per private method group): soft-deleted slot exclusion, unpublished/inactive content exclusion, month-boundary date range correctness across a UTC offset, weekly slot expansion across a DST-adjacent boundary is **not** required (no IANA model introduced), private-session appointment mapping.
- Mobile: unit test for the new local-date-key helper and `groupAppointmentsByDate` across UTC offsets (can mock `Date`/timezone or use `Intl`-based fixed-offset test dates).

---

## 5. Non-Goals (this cycle)

- **No new organization/instructor calendar.** Only the existing student-facing calendar is touched.
- **No UX parity work** between the web month-grid and mobile agenda-list (e.g., adding a join action to the web modal, or a month-grid view on mobile). Both surfaces keep their current interaction model.
- **No IANA-timezone-authoring migration for offline attendance slots.** The private-session module's `startsAt/endsAt/timezone` + luxon model is not extended to `TimeSlot`/`offlineSchedule` in this cycle; §4.3's fix only removes the *server-machine-local-time* dependency, it does not add per-slot authored timezones. A follow-up cycle can revisit this if attendance scheduling needs to support instructors/students across multiple timezones precisely.

---

## 6. Risks & Mitigations

- **Filtering out unpublished/unapproved content changes what students see today** — some currently-visible (but not-yet-servable) appointments will disappear from the calendar. This is the intended, correct behavior (matches what happens when they open the content directly), but should be called out in the PR description since it's a visible behavior change.
- **Switching mobile's date-bucketing to local-day keys changes which agenda section an appointment appears under** for events close to midnight in the user's timezone — verify against the existing screenshots/QA before merging.
- **Shared-types migration touches both client and mobile import paths** — do it as a mechanical, isolated step (types only, no logic change) before the logic fixes, to keep diffs reviewable.

---

## 7. Testing Strategy

- Server: unit tests per §4.6, run via `pnpm nx test server` (or the affected project via `nx affected`).
- Mobile: unit test for the local-date-key helper; existing calendar components are otherwise presentational and covered indirectly.
- Manual QA: verify calendar contents for a student with (a) a soft-deleted attendance slot, (b) a pending-approval assignment, (c) appointments near a month boundary, on both web and mobile, in a non-UTC device timezone.
