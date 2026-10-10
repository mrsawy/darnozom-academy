# Shared Types — Usage Guide

All constants, enums, and types that are used by **more than one application** (client, server, or other libs) **must** live in `lib/shared-types/src/lib/` and be exported from the package root (`@lms-organization/shared-types`).

## Rule

> **Never define an enum or constant in one app if it is also needed in another.**
> Always add it to `shared-types` first, then import it from `@lms-organization/shared-types`.

## What belongs in shared-types

| Category | Example |
|----------|---------|
| Enums shared between client & server | `PlanTier`, `BillingCycle`, `Currency`, `Roles`, `Actions`, `Subjects` |
| Status enums | `ApprovalStatus`, `PublishStatus`, `EntityStatus` |
| Shared validation types | `Country`, user DTOs |
| Platform-level constants (arrays derived from enums) | Derive with `Object.values(MyEnum)` at call-site |

## Directory structure

```
lib/shared-types/src/lib/
  types/
    plan/
      plan-tier.enum.ts      ← PlanTier
      billing-cycle.enum.ts  ← BillingCycle
      index.ts
    currency/
      currency.enum.ts       ← Currency
    role/…
    …
  messages/…
  configurations/…
```

## How to add a new enum

1. Create the file under the matching sub-folder in `lib/shared-types/src/lib/types/<domain>/`.
2. Export it from the domain's `index.ts`.
3. Ensure the domain `index.ts` is re-exported from `lib/shared-types/src/lib/types/index.ts`.
4. If the server already defines the same enum locally, replace the local definition with a re-export:
   ```ts
   // apps/server/src/plan/enum/planTier.enum.ts
   export { PlanTier } from '@lms-organization/shared-types';
   ```
5. Import in client/server via:
   ```ts
   import { PlanTier, BillingCycle, Currency } from '@lms-organization/shared-types';
   ```

## Deriving constants from enums

Never hard-code string arrays. Derive them at the call-site:

```ts
// ✅ Correct
import { PlanTier, CURRENCIES } from '@lms-organization/shared-types';
const PLAN_TIERS = Object.values(PlanTier);
// CURRENCIES is exported directly from @lms-organization/shared-types

// ❌ Wrong
const PLAN_TIERS = ['FREE', 'Basic', 'Pro', 'Enterprise'];
const CURRENCIES  = ['USD', 'SAR', 'EGP'];
```
