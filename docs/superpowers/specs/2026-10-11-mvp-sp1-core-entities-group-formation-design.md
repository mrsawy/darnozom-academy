# MVP Sub-project 1: Core Entities & Group Formation — Design

**Date:** 2026-10-11
**Status:** Approved in brainstorming; awaiting written-spec review
**Scope authority:** `docs/MVP.md` §3 row 1, which comes from the *Nozom Academy ERP Concept Document*. Rule: nothing outside the concept document's MVP scope goes in.
**Architecture:** the existing NestJS + Next.js + MongoDB codebase only (no Odoo).

## 1. Goal

An academy can set up its Program → Course → Level → Cohort → Group structure and form a group:
- add students
- assign a teacher whose availability fits and who has no time conflict
- track each student's payment and WhatsApp status
- move the group to **ready to start** only when the mandatory readiness checklist is complete

## 2. Out of scope (owned by later sub-projects or not in the MVP)

- **Sessions, attendance and reports:** sub-project 2.
- **Pre-start tasks and escalation, including the "at risk" flag:** sub-project 3.
- **Content and Sharia review, and course lifecycle or approval states:** sub-project 4, if at all.
- **Invoices, subscription types and ledgers:** sub-project 6. Here, payment status is a manual toggle.
- **Payroll and teacher financial data:** sub-project 7.
- **Not in the MVP:**
  - teacher hiring journey
  - sales pipeline and smart placement
  - group states beyond the three below
  - teacher qualifications
  - level pricing or session counts

## 3. Roles

### 3.1 Enum

The effective enum is `lib/shared-types/src/lib/types/role/role/roles.enum.ts`, which 37 server files import.
- Un-comment `MANAGER`.
- Add `OWNER`, `COORDINATOR`, `SUPERVISOR`, `CONTENT_OFFICER`, `SHARIA_REVIEWER`, `HR`, `ACCOUNTANT`.

Together with `INSTRUCTOR` (teacher), `PARENT` and `STUDENT`, these are the concept's 11 roles. `ADMIN`, `PLATFORM_ADMIN`, `SUPER_ADMIN`, `SECRETARY` and `GUEST` are unchanged.

**Cleanup:** `apps/server/src/role/enum/Roles.enum.ts` is a stale duplicate that disagrees with shared-types: it still has `MANAGER`, `COUNSELOR` and `LIBRARIAN`, and lacks `GUEST`. Its only importer is `apps/server/src/user/services/instructor.service.ts`. Switch that import to `@darnozom/shared-types` and delete the stale file.

### 3.2 Multiple roles per user

- `User` gains `additionalRoles: Roles[]` (default `[]`).
- `roleName` stays the **primary** role. It still decides the landing dashboard (`getDashboardUrl`), and existing `roleName` checks are unchanged.
- **Validation** (server):
  - `additionalRoles` may contain only staff roles and `INSTRUCTOR`: `OWNER`, `MANAGER`, `COORDINATOR`, `SUPERVISOR`, `CONTENT_OFFICER`, `SHARIA_REVIEWER`, `HR`, `ACCOUNTANT`, `INSTRUCTOR`.
  - It must not contain `roleName`, and it must have no duplicates.
  - It must be empty when `roleName` is `STUDENT` or `PARENT`.
- **Permissions:** the auth guard loads the role documents for `roleName` plus `additionalRoles`. `CaslAbilityFactory.createForUser` builds its rules from the concatenation of all their permissions. CASL `can` rules add up, so the result is the union.
- **Helper:** `hasRole(user, role)` returns true when `role` is the primary role or one of the additional roles. New code uses it instead of comparing `roleName`.

### 3.3 New subjects and permissions

Add these to `Subjects`: `PROGRAM`, `LEVEL`, `COHORT`, `GROUP`, `TEACHER_AVAILABILITY`, `GROUP_PAYMENT_STATUS`.

Add one seed config file per new role in `apps/server/src/role/seeds/`. `MANAGER` also needs a new file (`role.manager.config.ts`), because it has no seed today. Extend the existing seeds for `INSTRUCTOR`, `PARENT` and `STUDENT`, and register every new seed in `roles.config.ts`. Every staff rule carries `OWN_ORG`.

`ADMIN` (the organization creator) is unchanged. Its existing `MANAGE ALL` rule expands to every subject, so it covers the new ones automatically.

| Role | Permissions |
|---|---|
| OWNER, MANAGER | `MANAGE` on PROGRAM, LEVEL, COHORT, GROUP, GROUP_PAYMENT_STATUS; `READ` on TEACHER_AVAILABILITY |
| COORDINATOR | `READ` on PROGRAM, LEVEL, COHORT, TEACHER_AVAILABILITY; `MANAGE` on GROUP |
| SUPERVISOR | `READ` on PROGRAM, LEVEL, COHORT, GROUP |
| ACCOUNTANT | `READ` on GROUP; `MANAGE` on GROUP_PAYMENT_STATUS |
| INSTRUCTOR | `READ` on GROUP (only groups where `teacherId` = self, enforced in the service query); `MANAGE` on TEACHER_AVAILABILITY with `SELF` |
| PARENT | `READ` on GROUP (only their children's groups, enforced in the service) |
| STUDENT | `READ` on GROUP (only their own groups, enforced in the service) |
| CONTENT_OFFICER, SHARIA_REVIEWER, HR | none in this sub-project |

Seeding is idempotent and follows the existing role seeder, so existing organizations pick up the new permissions on the next seed run.

## 4. Data model

New server module `apps/server/src/academics/` with sub-modules `program`, `level`, `cohort`, `group` and `teacher-availability`. Each has its own entity, DTOs, service, HTTP controller and module.

Every document has:
- `organizationId` (ref `Organization`, required, indexed)
- `deletedAt` and `deletedById` (soft delete, following the existing convention)
- timestamps

### 4.1 Program

| Field | Type | Notes |
|---|---|---|
| `name` | string, required, trimmed | unique per organization among non-deleted |
| `description` | string, optional | |

### 4.2 Course (existing entity)

- Add `programId?: ObjectId` (ref `Program`). It is optional, so existing courses are unaffected.
- The course create/update DTOs accept it, and the server validates that the program is in the same organization.

### 4.3 Level

| Field | Type | Notes |
|---|---|---|
| `courseId` | ObjectId → Course, required | same organization |
| `name` | string, required | |
| `order` | integer ≥ 1, required | unique per course among non-deleted |

### 4.4 Cohort

| Field | Type | Notes |
|---|---|---|
| `levelId` | ObjectId → Level, required | |
| `name` | string, required | e.g. "Level 1 — Oct 2026" |
| `startDate` | Date, required | |

### 4.5 Group

| Field | Type | Notes |
|---|---|---|
| `cohortId` | ObjectId → Cohort, required | |
| `levelId`, `courseId` | ObjectId, required | copied from the cohort on create (denormalized, for filtering) |
| `name` | string, required | |
| `teacherId` | ObjectId → User, optional | set only through the assign-teacher endpoint |
| `schedule` | `[{ dayOfWeek: 0–6, startTime: "HH:mm", durationMinutes: 15–480 }]` | at least 1 entry required; entries must not overlap each other |
| `timezone` | IANA string, required | validated with the existing `is-iana-timezone.validator.ts` |
| `minStudents` | integer ≥ 1, required | |
| `maxStudents` | integer ≥ `minStudents`, required | |
| `meetingLink` | URL string, optional | |
| `whatsappGroupLink` | URL string, optional | |
| `contentSent` | `{ done: boolean, by?: ObjectId, at?: Date }` | default `{ done: false }` |
| `students` | `[{ studentId, paymentStatus: 'PAID' \| 'UNPAID', whatsappAdded: boolean, addedAt, addedBy }]` | `paymentStatus` defaults to `UNPAID`; `whatsappAdded` defaults to `false` |
| `status` | `'FORMING' \| 'READY_TO_START' \| 'CANCELLED'` | default `FORMING` |
| `statusHistory` | `[{ from, to, by, at, reason? }]` | an entry is appended on every status change |

**Indexes:**
- `{ organizationId: 1, status: 1 }`
- `{ teacherId: 1, status: 1 }`
- `{ cohortId: 1 }`
- `{ 'students.studentId': 1 }`

The `GroupStatus` and `PaymentStatus` enums and the readiness item keys go in shared-types so the client can use them.

### 4.6 TeacherAvailability

| Field | Type | Notes |
|---|---|---|
| `teacherId` | ObjectId → User, required | unique; the user must hold `INSTRUCTOR` (`hasRole`) |
| `timezone` | IANA string, required | |
| `slots` | `[{ dayOfWeek: 0–6, startTime: "HH:mm", endTime: "HH:mm" }]` | `endTime` > `startTime`; slots on the same day must not overlap; no slot crosses midnight |

## 5. Rules

### 5.1 Readiness

These are the five concept items, all mandatory. They are **computed** by a pure function `computeReadiness(group)`, never stored as checkboxes:

| Key | Done when |
|---|---|
| `TEACHER_ASSIGNED` | `teacherId` is set |
| `MINIMUM_STUDENTS` | `students.length ≥ minStudents` |
| `PAYMENTS_MADE` | `students.length > 0` and every student has `paymentStatus === 'PAID'` |
| `CONTENT_SENT` | `contentSent.done === true` |
| `MEETING_LINK` | `meetingLink` is a non-empty string |

It returns `{ ready: boolean, items: { key, done }[] }`. Every group read endpoint includes this in its response.

### 5.2 Status transitions

| From → To | Who | Guard |
|---|---|---|
| FORMING → READY_TO_START | `MANAGE GROUP` | `computeReadiness().ready`; otherwise `409 GROUP_NOT_READY` listing the missing keys |
| READY_TO_START → FORMING | system only | automatic, after any write that makes `ready` false; history reason `READINESS_LOST` |
| FORMING / READY_TO_START → CANCELLED | `MANAGE GROUP` | non-empty `reason` required |
| CANCELLED → anything | — | rejected with `409 GROUP_CANCELLED` |

Every write to a cancelled group (students, teacher, links, payment status) is rejected with `409 GROUP_CANCELLED`.

### 5.3 Students

- **Add** (`MANAGE GROUP`), in this order:
  1. The user exists, has `roleName === STUDENT`, and is in the same organization (else `400`).
  2. The user is not already in the group (else `409 STUDENT_ALREADY_IN_GROUP`).
  3. `students.length < maxStudents` (else `409 GROUP_FULL`).
- **Search candidates** (`MANAGE GROUP`): `GET /groups/:id/student-candidates?q=` returns students in the organization who aren't already in the group, matching name, username or email. It returns at most 20 results. This endpoint exists so Coordinators can add students without needing a general `USER` read permission.
- **Remove** (`MANAGE GROUP`): removes the entry, then readiness is re-evaluated (§5.2).
- **Payment status** (`MANAGE GROUP_PAYMENT_STATUS`): sets `PAID`/`UNPAID` for one student.
- **WhatsApp added** (`MANAGE GROUP`): sets `true`/`false` for one student.

### 5.4 Teacher assignment

The pure function `checkTeacherFit({ groupSchedule, groupTimezone, referenceDate, availability, otherGroups })` returns `{ ok, reasons[] }`. Reasons:

- `NOT_INSTRUCTOR`: the user doesn't hold `INSTRUCTOR`.
- `NO_AVAILABILITY`: the teacher has no availability document.
- `OUTSIDE_AVAILABILITY`: a group slot is not fully inside some availability slot.
- `CONFLICT`: a group slot overlaps a slot of another non-cancelled, non-deleted group with the same teacher. The reason lists that group's id and name.

How the times are compared:
- Every slot is converted to a UTC interval at `referenceDate`, which is the group's cohort `startDate`.
- The conversion uses each side's own IANA timezone: the group's for the group, the availability's for the teacher. This keeps cross-timezone and daylight-saving offsets correct for the start of the cohort.
- Intervals are compared as minutes-of-week. A slot that wraps past the end of the week (Saturday into Sunday after conversion) is split in two.

Endpoints:
- `PUT /groups/:id/teacher` (`MANAGE GROUP`) assigns the teacher. On any reason it fails with `409 TEACHER_NOT_ASSIGNABLE` and the reasons.
- `DELETE /groups/:id/teacher` unassigns, then re-evaluates readiness.
- `GET /groups/:id/teacher-candidates` (`MANAGE GROUP`) returns every instructor in the organization with `{ teacherId, name, ok, reasons }`, for the picker.

Reassigning the teacher, changing the schedule or timezone, or changing the cohort's `startDate` while a teacher is assigned re-runs `checkTeacherFit`. If it fails, the change is rejected with `409 TEACHER_NOT_ASSIGNABLE`, and the user has to unassign the teacher first.

### 5.5 Teacher availability

- `GET/PUT /teacher-availability/me` (INSTRUCTOR, `SELF`).
- `GET /teacher-availability/:teacherId` (`READ TEACHER_AVAILABILITY`, same organization).
- Saving availability that would leave one of the teacher's assigned, non-cancelled groups outside the new availability is rejected with `409 AVAILABILITY_CONFLICTS_WITH_GROUPS`, listing those groups.

### 5.6 Read scoping

`GET /groups` and `GET /groups/:id` filter by the first matching rule below. Roles are checked with `hasRole`, so primary and additional roles both count:
- **Org-wide:** the user holds `ADMIN`, `OWNER`, `MANAGER`, `COORDINATOR`, `SUPERVISOR` or `ACCOUNTANT`.
- **INSTRUCTOR:** `teacherId = self`.
- **PARENT:** groups containing one of their children. `/groups?childId=` calls the existing `ParentService.validateParentChildLink`.
- **STUDENT:** groups containing self.

A group outside the caller's scope returns `404`, which doesn't reveal that the group exists.

### 5.7 Deletion

Program, Level and Cohort are soft-deleted only when nothing non-deleted references them (`409 HAS_DEPENDENTS` otherwise). Groups are soft-deleted only while `FORMING` or `CANCELLED`.

### 5.8 Errors

All error codes above go through the existing API error-message convention (`.agents/skills/api-error-messages`), with English and Arabic messages.

## 6. API surface

Base path `/academics`, using the existing HTTP controller, guard and permission-decorator patterns.

- **Programs, levels, cohorts:** `GET` (list, filterable by parent id) / `POST` / `PATCH` / `DELETE`, at `/programs`, `/levels?courseId=`, `/cohorts?levelId=`.
- **Groups:**
  - `GET /groups?cohortId=&status=&teacherId=&childId=`, `GET /groups/:id` (both include readiness), `POST /groups`, `PATCH /groups/:id` (name, schedule, timezone, min/max, links), `DELETE /groups/:id`.
  - `POST /groups/:id/ready`, `POST /groups/:id/cancel` `{ reason }`.
  - `PUT /groups/:id/content-sent` `{ done }`.
  - `GET /groups/:id/student-candidates?q=`, `POST /groups/:id/students` `{ studentId }`, `DELETE /groups/:id/students/:studentId`.
  - `PATCH /groups/:id/students/:studentId/payment-status` `{ paymentStatus }`, `PATCH /groups/:id/students/:studentId/whatsapp` `{ whatsappAdded }`.
  - `PUT|DELETE /groups/:id/teacher`, `GET /groups/:id/teacher-candidates`.
- **Teacher availability:** `/teacher-availability/me`, `/teacher-availability/:teacherId`.
- **Users:** the existing org user update endpoint accepts `additionalRoles`.

## 7. Client screens (en + ar, using the existing component library)

All under `apps/client/src/app/[locale]/(dashboard)/`. Navigation entries are shown according to permissions.

- **`organization-dashboard/academics/programs`:** list and forms for programs. Inside a program, its courses (linking `programId` on existing courses), levels per course, and cohorts per level.
- **`organization-dashboard/academics/groups`:** a groups list with filters (cohort, status, teacher) and a readiness badge.
- **`organization-dashboard/academics/groups/[id]`:** the **group formation screen**:
  - **Group data:** editable fields, the schedule editor and the timezone.
  - **Student table:** name, payment status toggle (enabled only with `GROUP_PAYMENT_STATUS`), WhatsApp-added toggle, remove. Plus "add student", which searches through `student-candidates`.
  - **Teacher:** a picker showing candidates from `teacher-candidates`. Ineligible ones are disabled with their reasons.
  - **Readiness panel:** the 5 items with done/missing state. The "content sent" toggle is in this panel.
  - **"Ready to start" button:** disabled while not ready, with the missing items listed. Also a cancel action with a reason.
- **`organization-dashboard/my-availability`** (instructors): weekly slot editor and timezone.
- **`organization-dashboard/my-groups`** (instructors): a read-only list of their groups.
- **`organization-dashboard/users/[id]`:** a multi-select for `additionalRoles`.
- **`parent-dashboard/children`:** each child's groups, read-only.
- **`student-dashboard`:** "My groups", read-only.

## 8. Testing

Unit tests (Jest, pure functions):
- **`computeReadiness`:** each item done and missing; empty student list ⇒ `PAYMENTS_MADE` false.
- **`checkTeacherFit`:**
  - fully inside availability
  - partially outside
  - no availability
  - overlap with another group, and the same teacher's cancelled group ignored
  - **cross-timezone** (group `Africa/Cairo`, teacher `Europe/London`)
  - **DST** (reference date on each side of a European DST change)
  - week wrap (Saturday 23:30 + 60 min after conversion)
- **Status transitions:** every row in §5.2.
- **`additionalRoles` validation and CASL union:** a COORDINATOR+INSTRUCTOR user gets both sets of rules.

Service tests (Jest, following the existing spec patterns with mocked models): every `409` path in §5 and the read-scoping in §5.6.

Client: the group formation screen renders the readiness panel and disables "Ready to start" when any item is missing.

## 9. Migration

- No data migration is needed: every new field is optional or defaults to empty.
- The role seeder adds the new role documents and their permissions.
- Deleting the stale server `Roles.enum.ts` is a code change only.
