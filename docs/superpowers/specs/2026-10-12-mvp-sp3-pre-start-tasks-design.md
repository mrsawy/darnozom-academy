# MVP Sub-project 3: Pre-start Tasks — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-project 1 (groups, readiness)
**Scope authority:** `docs/MVP.md` §3 row 3. The concept says: "Tasks are generated automatically relative to the start date … 7, 3 and 1 day before start … Overdue tasks escalate up a chain, from coordinator to supervisor to manager, until the group is flagged as at risk." The MVP list includes "pre-start tasks" only.

## 1. Goal

Before a group starts, the system creates tasks for anything still missing from its readiness checklist. Overdue tasks escalate from coordinator to supervisor to manager, and the group is then flagged as at risk.

## 2. Out of scope (later phases, per the concept)

- Tasks for the first session, mid-course, monthly billing, the second-to-last session and after the final session.
- The multi-channel notification engine.

## 3. Decisions (from your answers)

- **What the tasks are:** on each of the 7-, 3- and 1-day milestones, one task is created for each readiness item that is still missing, assigned to the group's coordinator.
- **Escalation:** overdue after 24 h → supervisor; after another 24 h → manager; then the group is flagged at risk.

## 4. Data model changes

### 4.1 Group (from sub-project 1)

- `coordinatorId?: ObjectId` (must hold `COORDINATOR`) and `supervisorId?: ObjectId` (must hold `SUPERVISOR`), set from the group page with `MANAGE GROUP`. Escalation needs to know who these people are. Sub-project 5 reuses `supervisorId`.
- `atRisk: boolean` (default `false`), plus `atRiskSince?`.

### 4.2 Task (new, `academics/task`)

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `groupId` | ObjectId | |
| `kind` | `'PRE_START_READINESS'` | the only kind in the MVP |
| `readinessKey` | readiness item key from sub-project 1 | |
| `milestoneDays` | `7 \| 3 \| 1` | |
| `assigneeId` | ObjectId | the group's coordinator |
| `escalationLevel` | `0 \| 1 \| 2` | 0 = coordinator, 1 = supervisor, 2 = manager |
| `dueAt` | Date | `createdAt` + 24 h; reset to now + 24 h on each escalation |
| `status` | `OPEN \| DONE \| CANCELLED` | |
| `closedAt?`, `closedReason?` | | `ITEM_DONE`, `GROUP_STARTED`, `GROUP_CANCELLED` |

**Indexes:**
- `{ status, dueAt }`
- `{ groupId, readinessKey, status }`
- `{ assigneeId, status }`

Only one `OPEN` task may exist per `{groupId, readinessKey}`. This is enforced by a partial unique index.

## 5. Rules

### 5.1 Generation

A BullMQ repeatable job runs every 15 minutes. It looks at every group in `FORMING` or `READY_TO_START` (not deleted, not cancelled) and does the following for each milestone `d ∈ {7, 3, 1}`:

1. **Skip unless the milestone has been reached.** Milestone `d` is reached once the current time is at or past local midnight `d` days before the cohort's `startDate`, in the group's timezone.
2. **Skip if this milestone was already processed.** The job records that on the group as `processedMilestones: number[]`.
3. **Process the milestone.** For each readiness item that `computeReadiness` reports as missing, create a task if no `OPEN` task exists for that item.
4. **Record the milestone.** Add `d` to `processedMilestones`.

If the group has no coordinator, no tasks are created and the group is flagged `atRisk` with the reason `NO_COORDINATOR`.

A group created less than 7 days before its start only gets the milestones that are still ahead of it.

### 5.2 Closing

- **On a readiness change:** any write that makes a readiness item done closes its open task (`ITEM_DONE`). This hooks into the same point where sub-project 1 re-evaluates readiness.
- **On a status change:** when the group starts, all open tasks close as `GROUP_STARTED`; when it is cancelled, as `GROUP_CANCELLED`.
- **Manually:** the assignee can mark a task done only if its readiness item is actually done. Otherwise the server returns `409 READINESS_ITEM_STILL_MISSING`. A task can't be closed while the problem it reports still exists.

### 5.3 Escalation and at-risk

The same job also handles overdue tasks. For an `OPEN` task whose `dueAt` has passed:

| Level | What happens |
|---|---|
| 0 | The task escalates to level 1 and is assigned to `supervisorId`. If the group has no supervisor, it goes straight to level 2. |
| 1 | The task escalates to level 2 and is assigned to every user in the org who holds `MANAGER`. The group is set `atRisk = true` ("then the group is flagged at risk"). |
| 2 | No further escalation. |

- **Clearing at-risk:** the flag is cleared when the group has no open tasks left and has a coordinator.
- **Who manages level-2 tasks:** a level-2 task is tied to the manager role rather than one person. It stays in the manager queue until closed, and any `MANAGER` can see and act on it.

### 5.4 Notifications

Every task creation and escalation creates an in-app notification for the new assignee, using the existing `notification` module (entity + queue). There is no email or WhatsApp sending.

### 5.5 Permissions

- New subject: `TASK` already exists in `Subjects`, so it is reused.
- **COORDINATOR, SUPERVISOR, MANAGER, OWNER:** `READ` and `UPDATE` on `TASK`, but only for tasks assigned to them, or for manager-level tasks if they hold `MANAGER`.
- **OWNER, MANAGER:** can read all tasks.

## 6. API

- `GET /tasks?mine=true&status=&groupId=`
- `POST /tasks/:id/done`
- `PATCH /groups/:id` gains `coordinatorId` and `supervisorId`.
- Group responses include `atRisk` and the count of open tasks.

## 7. Screens (en + ar)

- **"My tasks" page:** for coordinators, supervisors and managers, with group name, missing item, due time and escalation level. Each row links to the group formation screen.
- **Group formation screen:** coordinator and supervisor pickers, an "At risk" badge, and an open-tasks list.
- **Groups list:** an at-risk filter.

## 8. Testing

- **Milestone calculation:** across timezones, and a group created 2 days before its start.
- **Generation:** generating twice creates no duplicates; a task is created only for missing items.
- **Escalation:** 0 → 1 → 2 driven by fake time; no supervisor ⇒ straight to level 2; at-risk set at level 2 and cleared when tasks close.
- **Closing:** marking done while the item is still missing ⇒ `409`; a readiness change closes the task.

## 9. Assumptions to confirm

- **A1:** A milestone is reached at local midnight, `d` days before the start date.
- **A2:** "Manager" means every user who holds `MANAGER` in the organization.
- **A3:** A group with no coordinator gets no tasks and is flagged at risk immediately (`NO_COORDINATOR`), because nobody is there to receive the tasks.
