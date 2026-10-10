# Platform Admin Organization Plan Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Platform admins can view each org’s plan/subscription on the organizations list and fully manage plan, cycle, dates, suspend, and cancel on org detail — DB-only overrides with no payment-provider sync.

**Architecture:** Extend `admin-review` (PlatformAdminGuard) for read enrichment and four write patterns. Add `SubscriptionService.adminAssignPlan` that expires the current period and creates a new one **carrying over all usage** (unlike payment renewals, which reset counters). Client: list columns + Plan & Subscription panel with dialogs.

**Tech Stack:** NestJS + NATS, Mongoose, Next.js, React Query, next-intl, shared-types DTOs.

**Spec:** `docs/superpowers/specs/2026-08-31-platform-admin-org-plan-control-design.md`

## Global Constraints

- Pure admin DB override — no Paddle/Lemon Squeezy/Stripe calls
- Downgrade always allowed; preserve existing resources; subscription guards enforce new limits on creates/updates
- Admin plan change must **preserve full usage** (not reset like `expireCurrentAndCreateNewPeriod`)
- Org Suspend ≠ subscription Suspend (separate actions/labels)
- Message patterns: `adminReview.<verb><Resource>` with `AuthGuard` + `PlatformAdminGuard`
- URL literals via `routes.constants.ts` only if new routes are added (none expected)
- i18n: `AdminDashboard` in `en.json` + `ar.json`

## File map

| File | Responsibility |
|------|----------------|
| `lib/shared-types/.../dto/admin-review/set-organization-plan.dto.ts` | DTO: orgId, planId, billingCycle, optional endsAt |
| `lib/shared-types/.../dto/admin-review/update-organization-subscription.dto.ts` | DTO: orgId, optional billingCycle, endsAt, nextBillingAt |
| `lib/shared-types/.../messages/admin-review-errors.enum.ts` | Error message keys |
| `apps/server/.../subscription.service.ts` | `adminAssignPlan`, `suspend` (or use update), export sync helper usage |
| `apps/server/.../admin-review.service.ts` | Enrich get orgs/details; set/update/suspend/cancel subscription |
| `apps/server/.../admin-review.controller.message.ts` | Four new message patterns |
| `apps/client/.../admin-review.interface.ts` | Subscription/plan summary types on org interfaces |
| `apps/client/.../admin-review.action.ts` | Client NATS actions |
| `apps/client/.../use-admin-review.hook.ts` | Queries unchanged (types widen); new mutations |
| `apps/client/.../organizations/page.tsx` | Plan + status columns |
| `apps/client/.../organizations/[orgId]/__components/org-plan-section.tsx` | Detail panel + dialogs |
| `apps/client/.../organizations/[orgId]/page.tsx` | Mount plan section |
| `apps/client/messages/en.json` + `ar.json` | Copy |

---

### Task 1: Shared DTOs + error enums

**Files:**
- Create: `lib/shared-types/src/lib/dto/admin-review/set-organization-plan.dto.ts`
- Create: `lib/shared-types/src/lib/dto/admin-review/update-organization-subscription.dto.ts`
- Create: `lib/shared-types/src/lib/messages/admin-review-errors.enum.ts` (or extend existing if present)
- Modify: shared-types barrel exports (`dto/index`, `messages/index`, package public API)

**Interfaces:**
- Produces: `SetOrganizationPlanDto { orgId: string; planId: string; billingCycle: BillingCycle; endsAt?: Date | string | null }`
- Produces: `UpdateOrganizationSubscriptionDto { orgId: string; billingCycle?: BillingCycle; endsAt?: Date | string | null; nextBillingAt?: Date | string | null }`
- Produces: `AdminReviewErrors` keys: `organizationNotFound`, `planNotFound`, `planNotActive`, `subscriptionNotFound`, `invalidSubscriptionPeriod`

- [ ] **Step 1:** Add DTOs with class-validator (`IsMongoId`, `IsEnum(BillingCycle)`, optional dates). Mirror existing shared-types DTO style (see `create-user.dto.ts`).

- [ ] **Step 2:** Add `AdminReviewErrors` enum string values matching camelCase message keys; export from shared-types.

- [ ] **Step 3:** Commit

```bash
git add lib/shared-types
git commit -m "feat(shared-types): add admin org plan DTOs and errors"
```

---

### Task 2: SubscriptionService.adminAssignPlan (+ suspend helper)

**Files:**
- Modify: `apps/server/src/subscription/services/subscription.service.ts`
- Test: `apps/server/src/subscription/services/subscription.admin-assign-plan.spec.ts` (create)

**Interfaces:**
- Consumes: plan by id, org subscriptions
- Produces: `adminAssignPlan(organizationId: string, planId: string, billingCycle: BillingCycle, endsAt?: Date | null, session?: ClientSession): Promise<SubscriptionDocument>`
- Produces: `suspend(id: string): Promise<SubscriptionDocument>` setting `status: SUSPENDED`, `suspendedAt: now`
- Behavior: If active (or latest via org) subscription exists, mark ACTIVE one(s) EXPIRED with `endsAt: now`, create new ACTIVE row with **all usage fields copied**, sync org `planName` + `subscriptionId`. If none exist, `create()` then ensure status ACTIVE. Validate plan exists and `isActive === true`.

- [ ] **Step 1:** Write failing unit tests for: assign with no prior sub; assign upgrading plan preserves usage; suspend sets status.

- [ ] **Step 2:** Implement `adminAssignPlan` and `suspend`. Reuse private `syncOrganizationSubscription` (keep private; call from new method).

- [ ] **Step 3:** Run tests via `pnpm nx test server --testPathPattern=subscription.admin-assign-plan` (or project’s equivalent). Fix until green.

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(server): adminAssignPlan preserves usage on plan override"
```

---

### Task 3: Admin-review service + controller (read + write)

**Files:**
- Modify: `apps/server/src/admin-review/services/admin-review.service.ts`
- Modify: `apps/server/src/admin-review/controllers/message/admin-review.controller.message.ts`
- Possibly inject Plan model if not already available via QueryService / SubscriptionService

**Interfaces:**
- `getOrganizations`: lean docs include `planName`; add `subscriptionStatus` by looking up each org’s `subscriptionId` or active subscription (prefer batch: collect subscriptionIds, `$in` query, map status). Avoid N+1 if possible.
- `getOrganizationDetails`: return `plan` summary + `subscription` summary (populate from `subscriptionId` or `findActiveByOrganization`; include features/limits + usage).
- `setOrganizationPlan(dto)` → `subscriptionService.adminAssignPlan`
- `updateOrganizationSubscription(dto)` → find current subscription for org; validate endsAt >= startsAt; update billingCycle/endsAt/nextBillingAt via model/update
- `suspendOrganizationSubscription(orgId)` → suspend current active (or current by subscriptionId)
- `cancelOrganizationSubscription(orgId)` → `subscriptionService.cancel(id)`

Controller: four `@UseGuards(AuthGuard, PlatformAdminGuard)` patterns matching spec names.

- [ ] **Step 1:** Implement service methods + controller handlers.

- [ ] **Step 2:** Smoke-check types compile (`pnpm nx run server:build` or tsc for project).

- [ ] **Step 3:** Commit

```bash
git commit -m "feat(server): admin-review org plan view and control APIs"
```

---

### Task 4: Client types, actions, hooks

**Files:**
- Modify: `apps/client/src/lib/types/admin-review/admin-review.interface.ts`
- Modify: `apps/client/src/lib/actions/admin-review/admin-review.action.ts`
- Modify: `apps/client/src/lib/hooks/admin-review/use-admin-review.hook.ts`
- Modify: `apps/client/src/lib/utils/errors/translateApiMessage.ts` if new error keys need mapping

**Interfaces:**
```ts
export interface IAdminPlanSummary {
  _id: string;
  name: string;
  tier?: string;
  features?: Record<string, unknown>;
  isActive?: boolean;
}

export interface IAdminSubscriptionSummary {
  _id: string;
  status: string;
  billingCycle: string;
  startsAt: string;
  endsAt?: string | null;
  nextBillingAt?: string | null;
  usage?: {
    usersUsed: number;
    coursesUsed: number;
    pagesUsed: number;
    parentUsersUsed: number;
    storageUsedGB: number;
    liveSessionsUsed: number;
    assignmentsUsed: number;
  };
}

// IAdminOrganization: + subscriptionStatus?: string
// IAdminOrganizationDetails: + plan?: IAdminPlanSummary | null; subscription?: IAdminSubscriptionSummary | null
```

Actions: `setOrganizationPlan`, `updateOrganizationSubscription`, `suspendOrganizationSubscription`, `cancelOrganizationSubscription`.

Hooks: mutations invalidate `adminReviewKeys.organizationDetail(orgId)` and organizations list.

- [ ] **Step 1:** Types + actions + hooks.

- [ ] **Step 2:** Commit

```bash
git commit -m "feat(client): admin-review org plan actions and hooks"
```

---

### Task 5: Organizations list columns

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/organizations/page.tsx`
- Modify: `apps/client/messages/en.json`, `ar.json` (`AdminDashboard.table.subscriptionStatus`)

- [ ] **Step 1:** Add Plan + Subscription status columns; show `—` when missing; status badge or plain text using i18n map if available.

- [ ] **Step 2:** Commit

```bash
git commit -m "feat(client): show plan and subscription status on admin org list"
```

---

### Task 6: Org detail Plan & Subscription panel

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/organizations/[orgId]/__components/org-plan-section.tsx`
- Create dialogs colocated in same folder if large: `change-plan-dialog.tsx`, `edit-subscription-period-dialog.tsx` (follow organ/form patterns if forms grow — keep Yup in `.schema.ts` if using forms)
- Modify: `apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/organizations/[orgId]/page.tsx`
- Modify: i18n en/ar under `AdminDashboard.orgPlan` (title, labels, actions, confirm copy, usage labels, billing cycles)
- Reuse: `useAdminPlans` / `getPlans` for active plan picker

**UI:**
- Panel below `OrgStats`: plan name/tier, status, cycle, dates, usage vs limits (from `plan.features` numeric fields when present)
- Buttons: Change plan, Edit period, Suspend subscription, Cancel subscription (confirm dialogs; distinct from org Suspend)
- Change plan dialog: Select plan (filter `isActive`), Select billing cycle, optional end date
- Edit period: billing cycle + endsAt (+ nextBillingAt optional)

- [ ] **Step 1:** Build panel + dialogs; wire mutations; mount on detail page.

- [ ] **Step 2:** Manual sanity: types/lint on touched files.

- [ ] **Step 3:** Commit

```bash
git commit -m "feat(client): platform admin org plan control panel"
```

---

### Task 7: Spec/plan linkage + verify

- [ ] **Step 1:** Confirm all spec behaviors covered (list view, detail view, set plan, update period, suspend, cancel, no payment sync, usage preserved).

- [ ] **Step 2:** Run focused server tests for adminAssignPlan; fix any failures.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| List plan + status | 5 |
| Detail plan/subscription + usage | 3, 4, 6 |
| Change plan DB override | 2, 3, 6 |
| Edit cycle/end date | 3, 6 |
| Suspend/cancel subscription | 2, 3, 6 |
| Downgrade keeps resources; guards enforce | 2 (usage carry) |
| No payment sync | Global + 2 |
| PlatformAdminGuard admin-review | 3 |
