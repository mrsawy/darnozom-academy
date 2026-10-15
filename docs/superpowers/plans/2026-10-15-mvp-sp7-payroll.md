# Teacher Payroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each month, the system calculates a pay statement for every teacher from their countable sessions and their pay model (Fixed, Per-session, Per-hour, Per-student, Revenue share), plus any bonuses. The statement is approved by Manager/Owner, then marked paid by Accountant. Teachers can view their own approved pay statements.

**Architecture:** A new NestJS module `payroll` in `apps/server/src/payroll/` managing `TeacherPayProfile` and `PayStatement` collections. Pure calculation rules (`payroll-calculator.ts`) compute countable sessions, basis, base amounts, and totals without database dependencies. Sessions are augmented with dispute tracking fields (`disputed`, `disputeReason`, etc.). NATS message patterns under `payroll.*` and `academics.sessions.dispute*` expose functionality to client React Query hooks and Server Actions.

**Tech Stack:** NestJS 11, Mongoose 8, Luxon 3.7.2, Jest 29 (server), Next.js 16, next-intl, @tanstack/react-query, Vitest 2 + Testing Library (client and shared-types), pnpm + Nx monorepo.

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp7-payroll-design.md`

**Depends on:** Sub-project 2 (sessions and reports); Sub-project 6 (payments, ledger and allocations, for revenue share).

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection. Role changes go through `pnpm --filter server seed:prod`, which is upsert-only.
- **`eslint --fix` only on specific new or modified files, never on a directory.**
- Server controllers are NATS message handlers (`createAuthorizedNatsRequest`). Do not add HTTP controllers.
- Every server-side error is a key from `PayrollErrors`; the client translates it with `translateApiMessage`.
- Every user-facing string is a next-intl key present in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- **Strict Money Arithmetic:** Store amounts in minor units or rounded to 2 decimal places in major currency. Consistent with SP6 minor unit helpers.
- **Permission Subject:** `Subjects.PAYROLL = 'PAYROLL'`. Role seeds grant `MANAGE` to `ACCOUNTANT`, `MANAGER`, `OWNER`, and `READ` to `INSTRUCTOR`.

## Plan Decisions (clarifications from the spec)

- **D1 — Organization Timezone:** In accordance with Spec Assumption A2, `Organization.timezone` is added as an optional IANA timezone string defaulting to `'UTC'`. Luxon uses this timezone to compute the exact start and end instants of a payroll month `"YYYY-MM"`.
- **D2 — Profile Versioning:** `TeacherPayProfile` stores `{ organizationId, teacherId, model, rate, currency, effectiveFrom }`. When a profile changes, a new profile document is created with `effectiveFrom`. The query for calculating month `"YYYY-MM"` finds the profile with `effectiveFrom <= monthStart` (sorted by `effectiveFrom DESC`), or falls back to the earliest profile if all are after `monthStart`.
- **D3 — Draft Recalculation:** When `POST /payroll/statements/generate` is triggered for month `YYYY-MM`:
  - Existing statements in `APPROVED` or `PAID` state are untouched.
  - Existing statements in `DRAFT` state are recalculated (updating basis, countable sessions, and baseAmount), while preserving any manually added `bonuses`.
  - Teachers with no statement for that month get a new `DRAFT` statement.
- **D4 — Dispute Locks:** A session cannot be disputed or have its dispute resolved if an `APPROVED` or `PAID` statement exists for that teacher in that session's month.

---

## File Structure

**Shared types**
- `lib/shared-types/src/lib/types/payroll/payroll.types.ts` — `TeacherPayModel`, `PayStatementStatus`, DTOs.
- `lib/shared-types/src/lib/messages/payroll-errors.enum.ts` — `PayrollErrors`.
- `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts` — `Subjects.PAYROLL`.

**Server** — `apps/server/src/payroll/`:
- `entities/teacher-pay-profile.entity.ts`
- `entities/pay-statement.entity.ts`
- `domain/payroll-calculator.ts` — Pure calculation rules.
- `dto/payroll.dto.ts`
- `services/teacher-pay-profile.service.ts`
- `services/payroll.service.ts`
- `payroll.controller.message.ts`
- `payroll.module.ts`
- Updates to `apps/server/src/academics/session/entities/session.entity.ts` (dispute fields)
- Updates to `apps/server/src/organization/entities/organization.entity.ts` (`timezone`)

**Client**
- `apps/client/src/lib/types/payroll/payroll.ts`
- `apps/client/src/lib/actions/payroll/payroll.action.ts`
- `apps/client/src/lib/hooks/payroll/use-payroll.hook.ts`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/payroll/page.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-pay-statements/page.tsx`
- Updates to message catalogs: `apps/client/messages/en.json` and `apps/client/messages/ar.json`

---

## Task Breakdown

### Task 1: Shared types for payroll
- Define `TeacherPayModel`: `FIXED`, `PER_SESSION`, `PER_HOUR`, `PER_STUDENT`, `REVENUE_SHARE`.
- Define `PayStatementStatus`: `DRAFT`, `APPROVED`, `PAID`.
- Define `PayrollErrors`.
- Define `Subjects.PAYROLL`.
- Shared-types test verifying criteria and immutability.

### Task 2: Pure Calculation Engine
- `payroll-calculator.ts`:
  - `isSessionCountable(session, teacherId, monthInterval)`
  - `getMonthInterval(month, timezone)`
  - `calculateBaseAmount(model, rate, basis)`
  - `calculateTotal(baseAmount, bonuses)`
- Comprehensive unit tests for all 5 models and edge cases (timezones, leap years, boundary sessions, rounding).

### Task 3: Schemas and Entities
- `TeacherPayProfile` schema with indexes.
- `PayStatement` schema with indexes.
- Add dispute fields to `SessionSchema`.
- Add `timezone` to `OrganizationSchema`.
- Entity unit tests.

### Task 4: Session Dispute Feature
- Pure dispute rules: `canDisputeSession(session, hasApprovedStatement)`.
- Service method & NATS pattern: `academics.sessions.dispute` and `academics.sessions.resolveDispute`.
- Unit tests for dispute transitions and authorization.

### Task 5: Teacher Pay Profile Service
- `upsertProfile`, `getProfiles`, `getProfileForTeacher`, `findEffectiveProfile`.
- Profile history handling with `effectiveFrom`.
- Unit tests.

### Task 6: Payroll Statement Service
- `generateStatements(organizationId, month)`
- `addBonus(statementId, actor, { amount, reason })`
- `approveStatement(statementId, actor)`
- `markPaid(statementId, actor, { paymentReference })`
- Unit tests for statement generation, bonus persistence, and role rules.

### Task 7: NATS Controller & Role Permissions
- Expose `payroll.*` message endpoints.
- Update role seeds: `ACCOUNTANT` (MANAGE), `MANAGER` (MANAGE), `OWNER` (MANAGE), `INSTRUCTOR` (READ), `SUPERVISOR` (dispute permissions).
- Test NATS controller and role configs.

### Task 8: Client Data Layer
- Client types, API actions, and React Query hooks (`usePayrollProfiles`, `usePayStatements`, `useGenerateStatements`, `useApproveStatement`, `useMarkPaid`, etc.).
- Unit tests for hooks.

### Task 9: Accountant Payroll Dashboard UI
- Monthly payroll overview: month selector, status filters, generation action.
- Statements list with status badges and totals.
- Statement detail modal with counted sessions, basis inspection, and bonus dialog.
- Teacher Pay Profiles setup tab.

### Task 10: Teacher Portal & Session Dispute UI
- Teacher "My Pay Statements" page in instructor view.
- Dispute & Resolve Dispute buttons in session management.

### Task 11: Whole Sub-Project Verification
- All test suites passing (`jest --runInBand`, `vitest --no-file-parallelism`).
- Zero new TypeScript errors.
- `i18n:check-keys` clean.
- Role seeds verified.
