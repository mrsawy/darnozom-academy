# MVP Sub-project 5: Supervision — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-project 2 (sessions); Sub-project 3 (`supervisorId` on the group)
**Scope authority:** `docs/MVP.md` §3 row 5. The concept says: "Supervisors evaluate sessions on commitment, teaching, pedagogy, content adherence and technical quality … Supervisors can't impose financial penalties without authorization." The MVP list says "supervision".

## 1. Goal

A supervisor can evaluate any held session of the groups they supervise on the concept's five criteria.

## 2. Out of scope (later, per the concept)

- The improvement-case workflow (notify, respond, plan, training, follow-up, close or escalate).
- Quality dashboards.

## 3. Decision (from your answers)

Each of the 5 criteria is scored **1–5**, with an optional note.

## 4. Data model

**SessionEvaluation** (new, `academics/supervision`):

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `sessionId`, `groupId`, `teacherId`, `supervisorId` | ObjectId | |
| `commitment`, `teaching`, `pedagogy`, `contentAdherence`, `technicalQuality` | integer 1–5 | all required |
| `notes` | `{ commitment?, teaching?, pedagogy?, contentAdherence?, technicalQuality?, general? }` | strings, optional |
| `createdAt`, `updatedAt` | | |

There is a unique index on `{ sessionId, supervisorId }`, so a supervisor evaluates a session once.

The entity deliberately has **no monetary fields**. That's how "supervisors can't impose financial penalties" holds in the MVP: nothing in an evaluation can change pay. Payroll (sub-project 7) never reads evaluations.

## 5. Rules

- **Create:** `POST /sessions/:id/evaluation` requires `MANAGE SESSION_EVALUATION`.
  - The caller must be the group's `supervisorId`, or hold `MANAGER`/`OWNER`.
  - The session must be in `REPORT_PENDING` or `COMPLETED`, meaning it has been held.
  - All 5 scores must be integers from 1 to 5.
- **Edit:** `PATCH` is allowed for the author only, within 7 days (assumption A2).
- **Visibility:**
  - Supervisors, managers and owners see every evaluation in their organization.
  - The teacher sees their own evaluations (assumption A1).
  - Accountants, parents and students never see evaluations (concept: "Accountants can't see confidential pedagogical notes").

## 6. Roles & permissions

- New subject: `SESSION_EVALUATION`.
- **SUPERVISOR:** `MANAGE`, restricted in the service to groups where they are the supervisor. Supervisors can already read sessions, attendance and reports across the whole organization, through the sub-project 1 §5.6 group scoping.
- **MANAGER, OWNER:** `MANAGE`.
- **INSTRUCTOR:** `READ`, restricted to their own evaluations.

## 7. API

- `POST /sessions/:id/evaluation`
- `PATCH /evaluations/:id`
- `GET /evaluations?groupId=&teacherId=&from=&to=`

## 8. Screens (en + ar)

- **Supervisor "My groups" page:** a sessions list with an "Evaluate" action, and an evaluation form with five 1–5 selectors and note fields. The session's report and attendance are shown read-only beside the form.
- **Teacher:** a "My evaluations" list, read-only.

## 9. Testing

- **Who can evaluate:** a non-supervisor of the group is rejected; a session that hasn't been held is rejected.
- **Duplicates:** a second evaluation by the same supervisor is rejected.
- **Visibility:** an accountant, a parent, or another teacher gets a 404 on someone else's evaluation.

## 10. Assumptions to confirm

- **A1:** Teachers can see their own evaluations.
- **A2:** The author can edit an evaluation for 7 days.
