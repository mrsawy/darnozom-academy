# MVP Sub-project 7: Teacher Payroll — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-project 2 (sessions and reports); Sub-project 6 (payments, ledger and allocations, for revenue share)
**Scope authority:** `docs/MVP.md` §3 row 7. The concept says: "Pay models include fixed, per session, per hour, per student and revenue share, plus bonuses. A session counts toward pay only if it was held, reported and not disputed."

## 1. Goal

Each month, the system calculates a pay statement for every teacher from their countable sessions and their pay model, plus any bonuses. The statement is approved, then marked paid.

## 2. Out of scope

- Deductions or penalties. These are not in the concept's payroll line, and supervision can't impose them (sub-project 5).
- Tax, bank exports, and the teacher financial profile beyond the pay model.

## 3. Decisions (from your answers)

- **Per student:** `rate × the number of distinct ACTIVE students in the teacher's groups during the month`.
- **Revenue share:** `rate% × payments received in the month that are allocated to charges of the teacher's groups`. This uses the sub-project 6 allocations.

## 4. Data model (new module `payroll`)

### 4.1 TeacherPayProfile

`{ organizationId, teacherId (unique), model: FIXED | PER_SESSION | PER_HOUR | PER_STUDENT | REVENUE_SHARE, rate: number, currency, effectiveFrom: Date }`

- One model per teacher (assumption A1). For `REVENUE_SHARE`, `rate` is a percentage (0–100); for every other model it is an amount.
- Changing the profile creates a new profile document with a new `effectiveFrom`. The old one is kept for history, and a month is calculated with the profile that was effective on its first day.

### 4.2 Session (sub-project 2): new fields

`disputed: boolean` (default `false`), `disputeReason?`, `disputedBy?`, `disputedAt?`, `disputeResolvedBy?`, `disputeResolvedAt?`.

### 4.3 PayStatement

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `teacherId` | ObjectId | |
| `month` | `"YYYY-MM"` | unique per teacher |
| `profileSnapshot` | `{ model, rate, currency }` | copied from the profile at calculation time |
| `countedSessionIds` | ObjectId[] | |
| `basis` | `{ sessions, minutes, students, revenue }` | the inputs to the calculation |
| `baseAmount` | number | |
| `bonuses` | `[{ amount > 0, reason, addedBy, addedAt }]` | |
| `total` | number | `baseAmount + Σ bonuses` |
| `status` | `DRAFT \| APPROVED \| PAID` | |
| `approvedBy?`, `approvedAt?`, `paidBy?`, `paidAt?`, `paymentReference?` | | |

## 5. Rules

### 5.1 Countable session

A session counts when all of these hold:
- `status === COMPLETED` ("held and reported")
- `disputed === false` ("not disputed")
- `teacherId` is the teacher
- `startsAt` falls in the month, in the organization's timezone (assumption A2)

### 5.2 Base amount

| Model | baseAmount |
|---|---|
| FIXED | `rate` (a monthly amount), paid whether or not sessions were held (assumption A3) |
| PER_SESSION | `rate × countable sessions` |
| PER_HOUR | `rate × (Σ minutes of countable sessions) / 60`, where a session's minutes are its slot duration |
| PER_STUDENT | `rate × distinct students who were ACTIVE in any of the teacher's groups with a countable session in the month` |
| REVENUE_SHARE | `rate / 100 × Σ allocation amounts in the month (by payment confirmation date) whose charge's groupId is one of the teacher's groups` |

All money is rounded to 2 decimal places at the end. A statement uses one currency. For revenue share, only allocations in the profile's currency count.

### 5.3 Flow

- **Generate:** `POST /payroll/statements/generate {month}` (ACCOUNTANT) creates or recalculates a `DRAFT` statement for every teacher who has a pay profile. Statements that are already `APPROVED` or `PAID` are left untouched.
- **Bonuses:** added to a `DRAFT` by ACCOUNTANT, MANAGER or OWNER.
- **Disputes:** a session can be marked disputed, or the dispute resolved, by MANAGER, OWNER, ACCOUNTANT or SUPERVISOR, with a reason (assumption A4). This is allowed only while the session's month has no `APPROVED` statement for that teacher. Recalculating the draft picks the change up.
- **Approve:** `DRAFT → APPROVED`, by MANAGER or OWNER. The statement is frozen from then on.
- **Paid:** `APPROVED → PAID`, by ACCOUNTANT, with an optional payment reference.

### 5.4 Permissions

- New subject: `PAYROLL`.
- **ACCOUNTANT:** `MANAGE`.
- **OWNER, MANAGER:** `MANAGE`.
- **INSTRUCTOR:** `READ` own statements, from `APPROVED` onward.
- **SUPERVISOR:** can set disputes only, with no other payroll access. Content staff, parents and students have no access.

## 6. API

- `PUT /payroll/profiles/:teacherId`
- `GET /payroll/profiles`
- `POST /payroll/statements/generate`
- `GET /payroll/statements?month=&teacherId=`
- `POST /payroll/statements/:id/bonuses`
- `POST /payroll/statements/:id/approve`
- `POST /payroll/statements/:id/paid`
- `POST /sessions/:id/dispute`
- `POST /sessions/:id/resolve-dispute`

## 7. Screens (en + ar)

- **Accountant:** a pay profile per teacher, and a monthly payroll page: generate, then a list of statements with the total and status. A statement detail page shows the counted sessions, the basis and the bonuses, with approve and mark-paid actions.
- **Session page:** a dispute or resolve action.
- **Teacher:** a "My pay statements" page, read-only.

## 8. Testing

- **Pay models:** each of the 5 models with fixture sessions and allocations.
- **Excluded sessions:** disputed and non-completed sessions are excluded.
- **Profile changes:** a profile change in the middle of history uses the right profile.
- **Recalculation:** keeps bonuses; an approved statement is frozen; a dispute is blocked after approval.
- **Revenue share:** only counts allocations to the teacher's groups.

## 9. Assumptions to confirm

- **A1:** One pay model per teacher, not per group.
- **A2:** The payroll month follows the organization's timezone. This needs `Organization.timezone`, added as an optional IANA field that defaults to `UTC`.
- **A3:** FIXED is a monthly amount paid regardless of the number of sessions.
- **A4:** A dispute can be raised or resolved by Manager, Owner, Accountant or Supervisor.
