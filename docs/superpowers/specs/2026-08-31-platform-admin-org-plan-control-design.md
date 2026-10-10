# Platform Admin Organization Plan Control Design

**Date:** 2026-08-31  
**Scope:** Main admin organizations list/detail (`apps/client` main-admin-dashboard), admin-review NATS APIs (`apps/server`), shared DTOs/types, reuse of `SubscriptionService` / Plan catalog.  
**Out of scope:** Dedicated cross-org subscriptions page, payment-provider sync (Paddle/Lemon Squeezy/etc.), Stripe, refunds, email notifications, audit-log UI, list filtering by plan, AI plans.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Control level | Full: change plan, set billing cycle / end date, suspend or cancel subscription |
| UI placement | Both: plan (+ status) on org list; full view/control on org detail |
| Payment | Pure admin DB override — no charge, no provider sync |
| Downgrade over limit | Allow; keep all existing resources; existing subscription guards block new over-limit creates/updates |
| Architecture | Extend admin-review (PlatformAdminGuard); do not reuse org-scoped `subscription.*` patterns for writes |

## Goals & behavior

Platform admins can see each organization’s plan at a glance and fully manage that org’s subscription from organization detail.

- **List:** Show plan name and subscription status (active / suspended / cancelled / expired).
- **Detail:** Plan & Subscription panel — plan name/tier, status, billing cycle, startsAt / endsAt / nextBillingAt, usage vs plan limits (informational).
- **Change plan:** Pick any active catalog plan + billing cycle; expire current subscription period and create a new one in DB; sync org `planName` and `subscriptionId`.
- **Edit period:** Update billing cycle and end date (validated).
- **Suspend / cancel subscription:** Independent of org Suspend/Unsuspend. Existing resources remain; guards continue to enforce limits on new actions.
- **No subscription yet:** Change plan creates a subscription and syncs org fields.
- **Suspended/cancelled → change plan:** Allowed; creates a new active period (admin override).

## Architecture & APIs

### Read (enrich existing)

- `adminReview.getOrganizations` — each row includes `planName` and subscription `status` (and tier when available).
- `adminReview.getOrganizationDetails` — attach:
  - `plan`: id, name, tier, features/limits
  - `subscription`: id, status, billingCycle, startsAt, endsAt, nextBillingAt, usage

### Write (new, PlatformAdminGuard)

| Pattern | Purpose |
|---------|---------|
| `adminReview.setOrganizationPlan` | Assign/change plan + billing cycle via `SubscriptionService` expire-and-create + `syncOrganizationSubscription` |
| `adminReview.updateOrganizationSubscription` | Edit cycle / end date (and related period fields as needed) |
| `adminReview.suspendOrganizationSubscription` | Set subscription status → suspended |
| `adminReview.cancelOrganizationSubscription` | Set subscription status → cancelled |

- DTOs and error message enums in `lib/shared-types`.
- Client: actions in `admin-review.action.ts`, React Query hooks matching existing admin-review style.
- No payment-provider calls on any of these paths.

### Data consistency

Reuse `SubscriptionService.expireCurrentAndCreateNewPeriod` / `syncOrganizationSubscription` so org `planName` + `subscriptionId` stay aligned with payment-driven upgrade paths. Do not delete or shrink existing org resources on downgrade.

## UI

### Organizations list (`/main-admin-dashboard/organizations`)

- Add **Plan** and **Subscription status** columns.
- Plan is read-only on the list; control remains on detail via “View details”.

### Organization detail (`/main-admin-dashboard/organizations/[orgId]`)

- Keep header context; add **Plan & Subscription** panel below header/stats.
- Actions (confirm dialogs; labels distinct from org Suspend):
  - **Change plan** — plan select (active catalog only) + billing cycle
  - **Edit period** — cycle + end date
  - **Suspend subscription** / **Cancel subscription**
- If current plan is inactive, show it read-only; picker for changes lists active plans only.
- i18n: `AdminDashboard` in `en.json` / `ar.json`.

## Edge cases & errors

- Invalid end date (before start) → DTO validation error.
- Missing org or plan → clear shared-types API messages + client translation.
- Concurrent mutations → pending/disabled button states.
- Org status Suspend vs subscription Suspend remain independent operations.

## Testing (focused)

- Server: set/change plan syncs `planName` + `subscriptionId`; suspend/cancel update status; downgrade with usage above new limits succeeds.
- Client: list columns render; detail panel mutations refresh organization details.

## Non-goals (explicit)

- Syncing or cancelling remote Paddle/Lemon Squeezy subscriptions
- Forcing orgs to delete users/courses to fit a lower plan
- New Main Admin nav item for all subscriptions
