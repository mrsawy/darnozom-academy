# Certificates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a group completes, the system works out which students are eligible under the level's configured rules (attendance, homework, exam PASS, group payment). Arabic and English names are reviewed and confirmed. Eligible students are issued certificates with unique atomic serial numbers (`{ORG_SHORT}-{YYYY}-{000001}`) and QR codes linking to a public verification page.

**Architecture:** A new NestJS module `certificate` in `apps/server/src/certificate/` managing `Certificate` and `Counter` collections. Pure calculation rules (`certificate-eligibility.ts`) compute attendance %, homework averages, and rule matching without database dependencies. Atomic serial generation uses a Mongoose counter collection with `findOneAndUpdate` + `$inc`. Level entity includes `certificateRules`, GroupStudent includes `finalResult` (`PASS`/`FAIL`), and Organization includes `shortCode`. NATS message patterns under `certificates.*` and `academics.groups.setFinalResult` expose functionality to client React Query hooks, Next.js Server Actions, printable certificate view (`/certificates/:id`), and public verification view (`/verify/:token`).

**Tech Stack:** NestJS 11, Mongoose 8, Luxon 3.7.2, Jest 29 (server), Next.js 16, next-intl, @tanstack/react-query, Vitest 2 + Testing Library (client and shared-types), qrcode, pnpm + Nx monorepo.

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp8-certificates-design.md`

**Depends on:** Sub-project 1 (Level, Group, GroupStudent), Sub-project 2 (Sessions, Attendance, Homework reports, Group `COMPLETED`), Sub-project 6 (Payments & Ledger for `fullyPaid` rule).

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection. Role changes go through `pnpm --filter server seed:prod`, which is upsert-only.
- **`eslint --fix` only on specific new or modified files, never on a directory.**
- Server controllers are NATS message handlers (`createAuthorizedNatsRequest`). Public verification is handled through public NATS request or server action.
- Every server-side error is a key from `CertificateErrors`; the client translates it with `translateApiMessage`.
- Every user-facing string is a next-intl key present in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- **Permission Subject:** `Subjects.CERTIFICATE = 'CERTIFICATE'`. Role seeds grant `MANAGE` to `ACCOUNTANT`, `MANAGER`, `OWNER`, `READ` to `INSTRUCTOR`, and `READ`/`UPDATE` to `STUDENT` and `PARENT` for their own certificates.

## Plan Decisions (clarifications from the spec)

- **D1 — Serial Number Formatting & Organization Short Code:**
  The serial number format is `{ORG_SHORT}-{YYYY}-{000001}`. Organization entity has an optional `shortCode` field (3–6 uppercase alphanumeric characters). If not set, fallback uses uppercase alphanumeric prefix of org name or `"ACAD"`. The counter tracks sequence per `{ organizationId, year }`.
- **D2 — Verification Token:**
  128-bit cryptographically secure random token in URL-safe base64 format (using `crypto.randomBytes(16).toString('base64url')`), ensuring collision-free and unguessable public verification URLs.
- **D3 — Public Verification Endpoint & Data Sanitization:**
  `certificates.verifyPublic` / `/verify/[token]` exposes strictly:
  `{ studentNameAr, studentNameEn, courseName, levelName, organizationName, serial, issuedAt }`. No database ObjectIds, no phone numbers, no emails, no billing details.
- **D4 — Name Review Pre-filling & Auto-Transition:**
  When a certificate is created in `ELIGIBLE` status, it immediately transitions to `NAME_REVIEW`. Names are pre-filled from the student's User document (`firstName` + `lastName`). Either the student, parent, or a manager can edit and confirm the names.
- **D5 — Automatic & Manual Evaluation:**
  When a group transitions to `COMPLETED` state in `group-state.service.ts`, `evaluateGroup(groupId)` is automatically triggered. It can also be re-triggered on demand by `MANAGE GROUP` roles (e.g. after a late payment or grade entry) without affecting already `ISSUED` certificates.

---

## File Structure

**Shared types**
- `lib/shared-types/src/lib/types/certificate/certificate.types.ts` — `CertificateStatus`, `FinalResult`, `ICertificateRules`, `ICertificateEligibility`, DTOs.
- `lib/shared-types/src/lib/messages/certificate-errors.enum.ts` — `CertificateErrors`.
- `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts` — `Subjects.CERTIFICATE`.

**Server** — `apps/server/src/certificate/`:
- `entities/certificate.entity.ts` — Certificate Mongoose schema.
- `entities/counter.entity.ts` — Counter Mongoose schema for atomic serial sequences.
- `domain/certificate-eligibility.ts` — Pure calculation and rule evaluation.
- `domain/certificate-serial.ts` — Pure serial number formatting.
- `dto/certificate.dto.ts`
- `services/certificate.service.ts`
- `services/certificate-counter.service.ts`
- `certificate.controller.message.ts`
- `certificate.module.ts`
- Updates to `apps/server/src/academics/level/entities/level.entity.ts` (`certificateRules`)
- Updates to `apps/server/src/academics/group/entities/group-student.entity.ts` (`finalResult`, `finalResultBy`, `finalResultAt`)
- Updates to `apps/server/src/organization/entities/organization.entity.ts` (`shortCode`)
- Updates to `apps/server/src/academics/group/group.service.ts` and `apps/server/src/academics/group/group-state.service.ts`

**Client**
- `apps/client/src/lib/types/certificate/certificate.ts`
- `apps/client/src/lib/actions/certificate/certificate.action.ts`
- `apps/client/src/lib/hooks/certificate/use-certificate.hook.ts`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/certificates/page.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/groups/[id]/certificates-tab.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-certificates/page.tsx`
- `apps/client/src/app/[locale]/certificates/[id]/page.tsx` — Printable HTML certificate view.
- `apps/client/src/app/[locale]/verify/[token]/page.tsx` — Public verification page.
- Updates to message catalogs: `apps/client/messages/en.json` and `apps/client/messages/ar.json`

---

## Task Breakdown

### Task 1: Shared types for certificates
- Define `CertificateStatus`: `ELIGIBLE`, `NAME_REVIEW`, `ISSUED`.
- Define `FinalResult`: `PASS`, `FAIL`.
- Define `ICertificateRules`: `minAttendancePercent?: number`, `minHomeworkAverage?: number`, `requireExamPass?: boolean`, `requireFullyPaid?: boolean`.
- Define `ICertificateEligibility`: `attendancePercent: number`, `homeworkAverage: number`, `examPassed?: boolean`, `fullyPaid?: boolean`, `rulesSnapshot: ICertificateRules`.
- Define `CertificateErrors`.
- Define `Subjects.CERTIFICATE`.
- Unit tests verifying criteria, error keys, and immutability. Build shared-types.

### Task 2: Pure Eligibility & Calculation Engine
- `certificate-eligibility.ts`:
  - `calculateAttendancePercent(sessions, studentAttendanceRecords)`: counts `PRESENT`, `LATE`, `EXCUSED` out of `COMPLETED` sessions (excludes `CANCELLED`).
  - `calculateHomeworkAverage(reports)`: mean of numeric homework scores (1-5).
  - `evaluateEligibility(rules, studentData)`: pure evaluator returning `{ isEligible, eligibilitySnapshot, failedRules }`.
- `certificate-serial.ts`:
  - `formatCertificateSerial(shortCode, year, sequenceNumber)`: formats `{SHORT}-{YYYY}-{000001}`.
- Comprehensive unit tests covering all rule combinations, missing rules, empty sessions, boundary conditions.

### Task 3: Schemas and Entities
- `Certificate` Mongoose schema with compound unique index on `{ groupId, studentId }` and index on `{ verificationToken }` and `{ serial }`.
- `Counter` Mongoose schema with unique `{ organizationId, key }`.
- Add `certificateRules` to `LevelSchema`.
- Add `finalResult`, `finalResultBy`, `finalResultAt` to `GroupStudentSchema`.
- Add `shortCode` to `OrganizationSchema`.
- Entity unit tests.

### Task 4: Teacher Final Result Grading
- Service method in `GroupService` or `GroupGradingService`: `setStudentFinalResult(groupId, studentId, finalResult, actor)`.
- Validates teacher is assigned to group or actor has `MANAGE` on `ACADEMICS_GROUPS`, and group is `RUNNING` or `COMPLETED`.
- NATS message pattern: `academics.groups.setFinalResult`.
- Unit tests for authorization and result assignment.

### Task 5: Certificate Counter & Issuance Services
- `CertificateCounterService`:
  - `getNextSequence(organizationId, year)`: atomic `findOneAndUpdate` with `$inc` and `upsert: true`.
- `CertificateService`:
  - `evaluateGroup(groupId, actor)`: evaluates all active group students, creates/updates `Certificate` records in `NAME_REVIEW`, pre-fills names.
  - `updateName(certificateId, actor, { nameAr, nameEn })`: updates Arabic/English names.
  - `confirmName(certificateId, actor)`: sets `nameConfirmedBy` and `nameConfirmedAt`.
  - `issueCertificate(certificateId, actor)`: blocks if name not confirmed; atomically assigns serial, generates 128-bit verification token, transitions to `ISSUED`.
  - `getPublicVerification(token)`: returns public sanitized payload or throws not found.
  - `generateQrCode(token)`: generates QR code data URL.
  - List & query methods with authorization filtering.
- Unit tests for evaluation, name confirmation, atomic sequential serials, immutability, and verification.

### Task 6: NATS Controller & Permission Seeding
- `CertificateControllerMessage`:
  - Expose message patterns: `certificates.evaluate`, `certificates.list`, `certificates.getById`, `certificates.updateName`, `certificates.confirmName`, `certificates.issue`, `certificates.verifyPublic`.
- Wire `evaluateGroup` trigger in `GroupStateService` on group completion.
- Role permission seeds:
  - `MANAGER`, `OWNER`, `ACCOUNTANT`: `MANAGE`
  - `INSTRUCTOR`: `READ`
  - `STUDENT`, `PARENT`: `READ` & `UPDATE` (own certificates)
- Register `CertificateModule` in `app.module.ts`.
- Controller unit tests and role permission tests.

### Task 7: Client Data Layer
- Client types, server actions, and React Query hooks:
  - `useCertificates`, `useCertificate`, `useVerifyCertificate`, `useSetFinalResult`, `useUpdateCertificateName`, `useConfirmCertificateName`, `useIssueCertificate`.
- Unit tests for actions and hooks.

### Task 8: Client UI Implementation
- **Level Form:** Certificate rules configuration inputs (`minAttendancePercent`, `minHomeworkAverage`, `requireExamPass`, `requireFullyPaid`).
- **Teacher View:** Final result (`PASS`/`FAIL`) input on group students/grading table.
- **Group Certificates Tab:** Students list with status badges (`ELIGIBLE`, `NAME_REVIEW`, `ISSUED`), eligibility metrics, name confirmation status, and "Issue" button.
- **Parent & Student Views:**
  - Name review dialog for editing and confirming `nameAr` / `nameEn`.
  - "My Certificates" dashboard page.
- **Printable Certificate View (`/[locale]/certificates/[id]`):**
  - High-aesthetic printable certificate with border, Arabic & English names, course name, level, issue date, unique serial, and server-generated QR code.
  - Print styles (`@media print`) for clean browser PDF export.
- **Public Verification View (`/[locale]/verify/[token]`):**
  - Publicly accessible page verifying certificate authenticity with clear green verification badge, student name, organization, course, level, serial, and issue date.
- Bilingual messages in `messages/en.json` and `messages/ar.json`.
- `pnpm --filter client i18n:check-keys` validation.

### Task 9: Whole Sub-Project Verification
- Run full unit tests (`jest --runInBand`, `vitest --no-file-parallelism`).
- Run typechecks on server and client (`tsc --noEmit`).
- Verify i18n key consistency.
- Verify role seeds.
