---
name: admin-service-colocation
description: >-
  Colocate NestJS platform-admin domain logic in sibling admin service files.
  USE WHEN adding or moving platform-admin / main-admin overrides on a feature
  service (assign plan, suspend subscription, admin-only mutations), creating
  `*.admin.service.ts`, or reviewing server service layout under
  `apps/server/src/**/services/`.
---

# Admin service colocation (server)

## Rule

Any admin related service should be at `<name of the service>.admin.ts`

For Nest Injectable services in this repo, that means a sibling file:

| Domain service | Admin service |
|----------------|---------------|
| `subscription.service.ts` | `subscription.admin.service.ts` |
| `user.service.ts` | `user.admin.service.ts` |

Class name: `SubscriptionAdminService` (PascalCase + `Admin` + `Service`).

## What belongs in the admin service

- Platform-admin / main-admin **overrides** (DB-only plan assign, admin suspend/cancel, admin period edits)
- Read helpers used only by admin-review / platform-admin APIs
- Logic that must **not** mix into payment webhooks or org self-serve flows

## What stays in the domain service

- Org/user-facing CRUD, webhooks, usage increments, limit asserts
- Shared primitives the admin service may call (e.g. `cancel`, `update`, `findActiveByOrganization`)

## Wiring

1. Create `services/<feature>.admin.service.ts` with `@Injectable()`
2. Register + export it from `<feature>.module.ts` next to `<Feature>Service`
3. Inject `SubscriptionAdminService` (etc.) into `AdminReviewService` or other platform-admin entry points — do **not** put admin overrides back on the domain service

## Do not

- Add `adminAssign*` / platform-admin-only methods onto `<feature>.service.ts`
- Call payment providers from `*.admin.service.ts` unless the product explicitly requires it
- Create a circular DI graph (`FeatureService` must not inject `FeatureAdminService` if the admin service already injects the domain service)

## Example

```
apps/server/src/subscription/services/
  subscription.service.ts          # create, webhooks, usage, limits
  subscription.admin.service.ts    # assignPlan, updatePeriod, admin suspend/cancel helpers
```
