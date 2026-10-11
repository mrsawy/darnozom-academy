# MVP Sub-project 10: Parent & Teacher Portals and Admin Dashboard — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-projects 1–9
**Scope authority:** `docs/MVP.md` §3 row 10. The concept's MVP list says "the parent and teacher portals, and the admin dashboard". The concept also says: "Teachers and parents should never see the raw [admin] UI."

## 1. Goal

Parents and teachers each get a simple home page that puts together what they need from sub-projects 1–9. Admins get one dashboard of counts, each linking to the list behind it. Sub-projects 1–9 already ship their own pages; this sub-project adds the **home pages and navigation**, with no new business rules.

## 2. Out of scope

- KPIs, quality and finance dashboards, and charts over time (later, per the concept).
- A student portal beyond what sub-projects 1–8 already add to `student-dashboard`.

## 3. Parent portal (`parent-dashboard`)

- **Home:** one card per child, showing:
  - the child's groups, each with its next session time, shown in the parent's browser timezone
  - the child's latest session report evaluation (their own scores only)
  - an "action needed" list: a payment due, a certificate name to review, a receipt rejected
- **Navigation:** Children, Sessions & reports, Payments (sub-project 6), Certificates (sub-project 8).
- The parent can see only their own children. Every view calls the existing `validateParentChildLink`.

## 4. Teacher portal (instructor view of `organization-dashboard`)

- **Home:** today's sessions and those of the next 7 days, with status and an action button that changes with the session's state:
  - "Take attendance" (sub-project 2)
  - "Submit report", for `REPORT_PENDING`
  - "Enter final results" (sub-project 8), when the group is in its last session or completed
- **Navigation:** My groups, My sessions, My availability (sub-project 1), My evaluations (sub-project 5), My pay statements (sub-project 7).
- **Hidden admin navigation:** when a user's **only** role is `INSTRUCTOR`, the organization dashboard layout shows the teacher navigation only. Admin entries (courses admin, users, settings, wallet, …) are hidden. Users with staff roles see both.

## 5. Admin dashboard (`organization-dashboard` home, for OWNER, MANAGER and ADMIN)

| Card | Source | Links to |
|---|---|---|
| Groups by status | sub-projects 1/2 | groups list filtered by status |
| At-risk groups | sub-project 3 | groups list, at-risk filter |
| Today's sessions: scheduled / report pending / completed | sub-project 2 | sessions list for today |
| Open and overdue tasks | sub-project 3 | tasks list |
| Content awaiting Sharia review | sub-project 4 | review queue |
| Receipts awaiting review | sub-project 6 | receipts queue |
| Outstanding balance, per currency | sub-project 6 | families with balance |
| Pay statements awaiting approval | sub-project 7 | payroll page |
| Certificates awaiting name review / issue | sub-project 8 | certificates list |

- **One request:** `GET /dashboard/admin` returns all the counts, each computed with an indexed count or aggregate query scoped by `organizationId`.
- **Hidden cards:** a card is hidden when the user lacks `READ` on its subject. For example, a supervisor sees no money cards, because content staff and supervisors don't see financial data.

## 6. API

- `GET /dashboard/admin`
- `GET /dashboard/parent`: each child's next sessions, latest evaluation and action items
- `GET /dashboard/teacher`: sessions for the next 7 days and pending actions

These endpoints only read and combine data the earlier sub-projects already expose. They introduce no new writes.

## 7. Testing

- **Admin dashboard:** each count is correct for fixture data; a card is hidden without permission; another organization's data is never counted.
- **Parent dashboard:** never includes another child's data.
- **Teacher navigation:** hides admin entries for an instructor-only user.

## 8. Assumption to confirm

- **A1:** Instructor-only users see only the teacher navigation in `organization-dashboard`. There is no separate teacher app.
