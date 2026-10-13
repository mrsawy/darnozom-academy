# Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An accountant subscribes a student in a group to one of the five subscription types and enters the amount; charges post to the family's ledger; parents pay by uploading a receipt or through a gateway; a student's payment status in the group is derived from the ledger and feeds the readiness checklist; parents get reminders automatically.

**Architecture:** A new `billing` module owns four collections — `Subscription`, `LedgerEntry`, `Payment` and `Allocation` — with the ledger strictly append-only, so a correction is an `ADJUSTMENT` row rather than an edit. Payment methods are strategies behind a DI-token registry, so a new method is a new provider and billing logic never names a concrete one. The money arithmetic — which charges a subscription type posts, how a payment is allocated FIFO, whether a student counts as paid — lives in pure modules tested without a database. Billing never imports academics: it announces a ledger change on the event bus and an academics listener re-evaluates readiness, which keeps the two modules acyclic.

**Tech Stack:** NestJS 11, Mongoose, BullMQ (`@nestjs/bullmq`), `@nestjs/event-emitter`, luxon, the existing `PaymentOrchestratorService` and `FileService`, Jest (server), Next.js 15 + React Query + next-intl (client), Vitest (client).

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp6-payments-design.md`

**Depends on:** sub-project 1 (groups, group students, readiness) and sub-project 2 (sessions, completion). Sub-project 3 is **not** required, but if it is merged, Task 11's readiness trigger also closes the `PAYMENTS_MADE` pre-start task, and Task 11 says how.

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`. Never start a test run in the background.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection. Role changes go through `pnpm --filter server seed:prod`, which is upsert-only.
- **`eslint --fix` only on specific new or modified files, never on a directory.**
- Server controllers are NATS message handlers. The spec's `POST /billing/subscriptions` maps to `billing.subscriptions.create`. The gateway **webhook** is the one exception: it stays on the existing HTTP provider webhook routes.
- Every user-facing string is a next-intl key present in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- **The ledger is append-only.** A `LedgerEntry` is never updated and never deleted, by any code path, for any reason. A correction is a new `ADJUSTMENT` row with a required reason.
- **Money is an integer number of minor units** (piastres for EGP, cents for USD) — see plan decision D1. No floating-point arithmetic touches a balance.
- **Allocation never crosses currencies.** A payment in one currency can only be allocated to charges in that same currency.
- **Amounts come from the accountant.** There are no price lists, discount rules, refunds or invoice documents in this sub-project.
- **`PER_SESSION` bills every session that reaches `COMPLETED`, whatever the student's attendance was** (spec decision D1, decided 2026-10-13). A `CANCELLED` session is never billed.
- **Payment status is derived, with no manual override** (decided 2026-10-13). The sub-project 1 `PATCH …/payment-status` endpoint and the `GROUP_PAYMENT_STATUS` subject are removed in Task 11.
- **Content staff see no financial data.** The `CONTENT_OFFICER` and `SHARIA_REVIEWER` roles get no billing permission, ever.

## Plan Decisions (deviations from the spec, decided while writing this plan)

- **D1 — amounts are integer minor units.** The spec says `amount: number`. Storing currency as a float makes FIFO allocation drift: three allocations of `3.33` against a charge of `10.00` leave `0.01` that no comparison can settle. Every `amount` in this sub-project is an integer count of the currency's smallest unit, named `amountMinor` so no caller can mistake it for a decimal. The client formats; the server never does arithmetic on a decimal.
- **D2 — a receipt is referenced by its S3 key, not a file id.** The spec says `receiptFileId`. The existing `FileService` works in `fileKey` strings — `generatePresignedUrl`, `getFileUrl`, `deleteFile` all take a key — and there is no file-id indirection to reuse. The field is `receiptFileKey: string`.
- **D3 — billing talks to academics through the event bus.** Readiness lives in academics and the ledger lives in billing. A direct call in both directions would be a module cycle needing `forwardRef`. Instead billing emits `BILLING_LEDGER_CHANGED_EVENT` and an academics listener re-evaluates the affected groups. Academics still injects billing's read-only `FamilyPaymentStatusService` directly, which is one-directional and fine.
- **D4 — `students[].paymentStatus` stays in the group schema but is no longer written by hand.** `computeReadiness` reads that field, and rewriting it to query the ledger would make a pure function impure. Instead `GroupStateService` overlays the derived value onto the group before computing readiness, in one helper both `toView` and `syncReadiness` call. The stored value becomes a cache that nothing trusts.
- **D5 — a `FAMILY` subscription's charge is attributed to the earliest-starting group.** The spec says one charge covers two or more children, and that each item counts as covered once that single charge is covered. A ledger row needs a `groupId` for the payroll revenue-share trace in sub-project 7, so the charge carries the earliest-starting group's id, and the per-item coverage test reads the subscription rather than the row's `groupId`.
- **D6 — a withdrawn student's charges stop.** The spec does not say what happens to a `MONTHLY` or `PER_SESSION` subscription when a student withdraws. Continuing to bill a student who left is indefensible, so the monthly and per-session posters skip a student whose `GroupStudent.status` is `WITHDRAWN`. Charges already posted stand — the family still owes for lessons already taken.

## Review Focus

Failure modes the spec implies but does not pin with a test. Each has a test in the task that owns the code.

1. **A family with charges in two currencies.** A payment in EGP must never settle a USD charge, and the ledger balance must be reported per currency, not summed. — Task 7.
2. **A withdrawn student with unpaid charges** must not hold the group below readiness, because readiness counts only `ACTIVE` students. — Task 11.
3. **A gateway webhook delivered twice** — the same `gatewayPaymentId` arriving again — must produce exactly one `PAYMENT` ledger entry and one set of allocations. — Task 10.
4. **A partial payment** that covers one charge and part of the next: the uncovered remainder stays owed, and an over-payment leaves an unallocated credit rather than vanishing. — Task 7.
5. **A zero-amount scholarship**: the student counts as paid, nothing divides by zero, and the balance never reads negative. — Tasks 4 and 11.

---

## File Structure

**Shared types**
- `lib/shared-types/src/lib/types/billing/billing.types.ts` (new) — `SubscriptionType`, `SubscriptionStatus` (billing's own, see Task 1), `LedgerEntryType`, `FamilyPaymentStatus`, `PAYMENT_METHOD_RECEIPT_UPLOAD`, `PAYMENT_METHOD_ONLINE_GATEWAY`, `BILLING_REMINDER_INTERVAL_DAYS`.
- `lib/shared-types/src/lib/messages/billing-errors.enum.ts` (new) — `BillingErrors`.
- `lib/shared-types/src/lib/types/payment/payment-purpose.enum.ts` — `ACADEMY_FEE`.
- `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts` — `BILLING`, `FAMILY_PAYMENT`; `GROUP_PAYMENT_STATUS` is removed in Task 11.

**Server** — new module `apps/server/src/billing/`:
- `entities/` — `subscription.entity.ts`, `ledger-entry.entity.ts`, `payment.entity.ts`, `allocation.entity.ts`
- `domain/` — `charge-schedule.ts`, `allocation.ts`, `payment-status.ts`, `money.ts` (all pure, no database)
- `family/family.service.ts` — resolves a student to their family
- `ledger/ledger.service.ts` — append-only writes, balances, adjustments
- `subscription/subscription.service.ts`
- `payment/payment-method.registry.ts`, `payment/methods/receipt-upload.method.ts`, `payment/methods/online-gateway.method.ts`, `payment/family-payment.service.ts`
- `status/family-payment-status.service.ts` — the derived status academics reads
- `jobs/billing.queue.ts`, `jobs/billing.processor.ts`, `jobs/billing.scheduler.ts`, `jobs/monthly-charges.service.ts`, `jobs/reminders.service.ts`
- `events/billing.events.ts` — the event name and payload
- `billing.controller.message.ts`, `billing.module.ts`

Also modified: `academics/academics.module.ts`, `academics/group/group-state.service.ts`, `academics/group/group.controller.message.ts`, `academics/group/group.service.ts`, `academics/events/billing-ledger.listener.ts` (new), `academics/session/session-completion.service.ts`, `organization/entities/organization.entity.ts`, `payment/services/payment-orchestrator.service.ts`, `app.module.ts`, and the accountant, manager and parent role seeds.

**Client** — `lib/types/billing/billing.ts` (new), `lib/actions/billing/billing.action.ts` (new), `lib/hooks/billing/use-billing.hook.ts` (new), a subscriptions tab on the group formation screen, `organization-dashboard/billing/families/[familyId]/`, `organization-dashboard/billing/receipts/`, `parent-dashboard/payments/`, the organization settings page, and both message catalogues.

---

### Task 1: Shared types for billing

**Files:**
- Create: `lib/shared-types/src/lib/types/billing/billing.types.ts`
- Create: `lib/shared-types/src/lib/messages/billing-errors.enum.ts`
- Modify: `lib/shared-types/src/lib/types/payment/payment-purpose.enum.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Modify: the barrels that re-export `types/` and `messages/`
- Test: `lib/shared-types/src/lib/types/billing/billing.types.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SubscriptionType`, `BillingSubscriptionStatus`, `LedgerEntryType`, `FamilyPaymentStatus`, `FamilyPaymentState`, `PAYMENT_METHOD_RECEIPT_UPLOAD = 'RECEIPT_UPLOAD'`, `PAYMENT_METHOD_ONLINE_GATEWAY = 'ONLINE_GATEWAY'`, `BILLING_REMINDER_INTERVAL_DAYS = 3`; `BillingErrors`; `PaymentPurpose.ACADEMY_FEE`; `Subjects.BILLING`, `Subjects.FAMILY_PAYMENT`.

The billing subscription status must **not** reuse the existing `SubscriptionStatus` enum. That one belongs to the organization's own SaaS plan (`apps/server/src/subscription/entities/subscription.entity.ts`, which references `Plan` and tracks `featureUsage`) and has nothing to do with a student's tuition. Name billing's `BillingSubscriptionStatus`.

- [ ] **Step 1: Write the failing test**

Create `lib/shared-types/src/lib/types/billing/billing.types.spec.ts`:

```ts
import {
  BILLING_REMINDER_INTERVAL_DAYS,
  BillingSubscriptionStatus,
  FamilyPaymentStatus,
  LedgerEntryType,
  PAYMENT_METHOD_ONLINE_GATEWAY,
  PAYMENT_METHOD_RECEIPT_UPLOAD,
  SubscriptionType,
} from './billing.types';

describe('billing shared types', () => {
  it('has exactly the concept’s five subscription types', () => {
    expect(Object.values(SubscriptionType)).toEqual(['FULL_COURSE', 'MONTHLY', 'PER_SESSION', 'FAMILY', 'SCHOLARSHIP']);
  });

  it('has the three ledger entry kinds', () => {
    expect(Object.values(LedgerEntryType)).toEqual(['CHARGE', 'PAYMENT', 'ADJUSTMENT']);
  });

  it('keeps a billing subscription either active or ended', () => {
    expect(Object.values(BillingSubscriptionStatus)).toEqual(['ACTIVE', 'ENDED']);
  });

  it('reports a student as paid or unpaid, the same two values the group already shows', () => {
    expect(Object.values(FamilyPaymentStatus)).toEqual(['PAID', 'UNPAID']);
  });

  it('names the two methods shipped in the MVP as plain strings, so a new one needs no enum change', () => {
    expect(PAYMENT_METHOD_RECEIPT_UPLOAD).toBe('RECEIPT_UPLOAD');
    expect(PAYMENT_METHOD_ONLINE_GATEWAY).toBe('ONLINE_GATEWAY');
  });

  it('reminds every three days', () => {
    expect(BILLING_REMINDER_INTERVAL_DAYS).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest billing.types --runInBand`
Expected: FAIL — `Cannot find module './billing.types'`.

- [ ] **Step 3: Write the types**

Create `lib/shared-types/src/lib/types/billing/billing.types.ts`:

```ts
/** The concept's five subscription types. */
export enum SubscriptionType {
  FULL_COURSE = 'FULL_COURSE',
  MONTHLY = 'MONTHLY',
  PER_SESSION = 'PER_SESSION',
  FAMILY = 'FAMILY',
  SCHOLARSHIP = 'SCHOLARSHIP',
}

/**
 * A student's tuition subscription. Deliberately distinct from `SubscriptionStatus`, which is the
 * organization's own SaaS plan status and has nothing to do with a family's tuition.
 */
export enum BillingSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export enum LedgerEntryType {
  /** Adds to what the family owes. */
  CHARGE = 'CHARGE',
  /** Reduces what the family owes. */
  PAYMENT = 'PAYMENT',
  /** A correction, carrying a sign and a required reason. */
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum FamilyPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

/** A payment as it moves from the parent's intent to confirmed money. */
export enum FamilyPaymentState {
  AWAITING_RECEIPT = 'AWAITING_RECEIPT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

/**
 * Method keys are strings, not an enum, so adding a method is implementing an interface and
 * registering a provider — never editing a shared enum that every caller then has to re-switch on.
 */
export const PAYMENT_METHOD_RECEIPT_UPLOAD = 'RECEIPT_UPLOAD';
export const PAYMENT_METHOD_ONLINE_GATEWAY = 'ONLINE_GATEWAY';

/** A reminder goes out on the due date, then once every this many days until the charge is covered. */
export const BILLING_REMINDER_INTERVAL_DAYS = 3;
```

Create `lib/shared-types/src/lib/messages/billing-errors.enum.ts`:

```ts
/** Billing message keys, translated by the client under its `errors` namespace. */
export enum BillingErrors {
  SUBSCRIPTION_NOT_FOUND = 'billingSubscriptionNotFound',
  SUBSCRIPTION_ALREADY_ACTIVE = 'billingSubscriptionAlreadyActive',
  SUBSCRIPTION_ITEMS_INVALID = 'billingSubscriptionItemsInvalid',
  FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS = 'billingFamilySubscriptionNeedsSiblings',
  AMOUNT_INVALID = 'billingAmountInvalid',
  AMOUNT_LOCKED = 'billingAmountLocked',
  PAYMENT_NOT_FOUND = 'billingPaymentNotFound',
  PAYMENT_NOT_REVIEWABLE = 'billingPaymentNotReviewable',
  PAYMENT_METHOD_UNKNOWN = 'billingPaymentMethodUnknown',
  PAYMENT_METHOD_DISABLED = 'billingPaymentMethodDisabled',
  RECEIPT_REQUIRED = 'billingReceiptRequired',
  REJECT_REASON_REQUIRED = 'billingRejectReasonRequired',
  ADJUSTMENT_REASON_REQUIRED = 'billingAdjustmentReasonRequired',
  NOT_YOUR_FAMILY = 'billingNotYourFamily',
  CURRENCY_MISMATCH = 'billingCurrencyMismatch',
  GATEWAY_NOT_CONFIGURED = 'billingGatewayNotConfigured',
}
```

Add `ACADEMY_FEE = 'ACADEMY_FEE',` to `PaymentPurpose`.

Add `BILLING = 'BILLING',` and `FAMILY_PAYMENT = 'FAMILY_PAYMENT',` to `Subjects`, directly before `ALL = '*'`. Leave `GROUP_PAYMENT_STATUS` in place for now; Task 11 removes it.

Export both new modules from the barrels, following how `types/academics` and `messages/academics-errors.enum` are exported. Confirm `import { SubscriptionType, BillingErrors } from '@darnozom/shared-types';` resolves before moving on.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest billing.types --runInBand`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/shared-types/src
git commit -m "feat(sp6): add billing shared types, error keys and subjects"
```

---

### Task 2: Money arithmetic (pure)

**Files:**
- Create: `apps/server/src/billing/domain/money.ts`
- Test: `apps/server/src/billing/domain/money.spec.ts`

**Interfaces:**
- Consumes: `Currency`.
- Produces: `MINOR_UNITS_PER_MAJOR`, `toMinor(major: number, currency: Currency): number`, `toMajor(minor: number, currency: Currency): number`, `isValidAmountMinor(value: unknown): boolean`, `sumMinor(values: number[]): number`.

Every amount in this sub-project is an integer count of minor units (plan decision D1). This module is the only place that converts, and nothing else in `billing` does decimal arithmetic.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/billing/domain/money.spec.ts`:

```ts
import { Currency } from '@darnozom/shared-types';
import { isValidAmountMinor, sumMinor, toMajor, toMinor } from './money';

describe('toMinor', () => {
  it('converts a whole amount', () => {
    expect(toMinor(100, Currency.EGP)).toBe(10_000);
    expect(toMinor(100, Currency.USD)).toBe(10_000);
  });

  it('converts a two-decimal amount without floating-point drift', () => {
    expect(toMinor(10.1, Currency.EGP)).toBe(1010);
    expect(toMinor(0.07, Currency.EGP)).toBe(7);
    expect(toMinor(1234.56, Currency.USD)).toBe(123_456);
  });

  it('rounds a third decimal to the nearest minor unit rather than truncating money away', () => {
    expect(toMinor(1.005, Currency.EGP)).toBe(101);
    expect(toMinor(1.004, Currency.EGP)).toBe(100);
  });

  it('converts zero, which a full scholarship needs', () => {
    expect(toMinor(0, Currency.EGP)).toBe(0);
  });
});

describe('toMajor', () => {
  it('is the inverse of toMinor for any two-decimal amount', () => {
    for (const amount of [0, 0.07, 10.1, 100, 1234.56]) {
      expect(toMajor(toMinor(amount, Currency.EGP), Currency.EGP)).toBeCloseTo(amount, 2);
    }
  });
});

describe('isValidAmountMinor', () => {
  it('accepts zero and any positive integer', () => {
    expect(isValidAmountMinor(0)).toBe(true);
    expect(isValidAmountMinor(1)).toBe(true);
    expect(isValidAmountMinor(10_000)).toBe(true);
  });

  it('refuses a negative amount: direction is the entry type’s job, not the amount’s', () => {
    expect(isValidAmountMinor(-1)).toBe(false);
  });

  it('refuses a fraction of a minor unit', () => {
    expect(isValidAmountMinor(10.5)).toBe(false);
  });

  it('refuses anything that is not a finite number', () => {
    for (const value of ['100', null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isValidAmountMinor(value)).toBe(false);
    }
  });
});

describe('sumMinor', () => {
  it('sums to an exact integer, which a float sum would not', () => {
    expect(sumMinor([333, 333, 334])).toBe(1000);
  });

  it('sums an empty list to zero', () => {
    expect(sumMinor([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest billing/domain/money --runInBand`
Expected: FAIL — `Cannot find module './money'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/billing/domain/money.ts`:

```ts
import { Currency } from '@darnozom/shared-types';

/**
 * Minor units per major unit. Every currency the platform supports is two-decimal, so this is 100
 * throughout; the map exists so a zero-decimal currency can be added without hunting for literals.
 */
const MINOR_UNITS: Partial<Record<Currency, number>> = {};
export const MINOR_UNITS_PER_MAJOR = 100;

export const minorUnitsFor = (currency: Currency): number => MINOR_UNITS[currency] ?? MINOR_UNITS_PER_MAJOR;

/**
 * A major amount as an integer count of minor units.
 *
 * `Math.round` on the scaled value is deliberate: `10.1 * 100` is `1010.0000000000001` in IEEE 754,
 * and truncating would silently lose a piastre on amounts an accountant typed by hand.
 */
export function toMinor(major: number, currency: Currency): number {
  return Math.round(major * minorUnitsFor(currency));
}

export function toMajor(minor: number, currency: Currency): number {
  return minor / minorUnitsFor(currency);
}

/**
 * A stored amount is always a non-negative integer. Whether it adds to or reduces what a family
 * owes is the `LedgerEntryType`'s job, not a sign hidden in the number — except on an `ADJUSTMENT`,
 * which carries its own explicit `direction`.
 */
export function isValidAmountMinor(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest billing/domain/money --runInBand`
Expected: PASS, 11 tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/domain/money.ts src/billing/domain/money.spec.ts
git add apps/server/src/billing
git commit -m "feat(sp6): add integer minor-unit money arithmetic"
```

---

### Task 3: The four collections

**Files:**
- Create: `apps/server/src/billing/entities/subscription.entity.ts`
- Create: `apps/server/src/billing/entities/ledger-entry.entity.ts`
- Create: `apps/server/src/billing/entities/payment.entity.ts`
- Create: `apps/server/src/billing/entities/allocation.entity.ts`
- Create: `apps/server/src/billing/billing.types.ts`
- Create: `apps/server/src/billing/billing.module.ts`
- Modify: `apps/server/src/app.module.ts`
- Test: `apps/server/src/billing/entities/entities.spec.ts`

**Interfaces:**
- Consumes: Task 1's enums, Task 2's `isValidAmountMinor`.
- Produces: the four schemas, plus `BillingSubscriptionLean`, `LedgerEntryLean`, `FamilyPaymentLean`, `AllocationLean`, `LedgerBalance`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/billing/entities/entities.spec.ts`:

```ts
import { BillingSubscriptionStatus, LedgerEntryType, SubscriptionType } from '@darnozom/shared-types';
import { AllocationSchema } from './allocation.entity';
import { LedgerEntrySchema } from './ledger-entry.entity';
import { FamilyPaymentSchema } from './payment.entity';
import { BillingSubscriptionSchema } from './subscription.entity';

const names = (schema: { indexes: () => [unknown, { name?: string }][] }) => schema.indexes().map(([, options]) => options?.name);

describe('BillingSubscriptionSchema', () => {
  it('allows only one active subscription per student and group', () => {
    const entry = BillingSubscriptionSchema.indexes().find(([, options]) => options?.name === 'one_active_subscription_per_student_group');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ 'items.studentId': 1, 'items.groupId': 1 });
    expect(options?.unique).toBe(true);
    expect(options?.partialFilterExpression).toEqual({ status: BillingSubscriptionStatus.ACTIVE });
  });

  it('accepts all five types and starts active', () => {
    const type = BillingSubscriptionSchema.path('type') as { options: { enum: string[] } };
    expect(type.options.enum).toEqual(Object.values(SubscriptionType));
    expect((BillingSubscriptionSchema.path('status') as { options: { default: unknown } }).options.default).toBe(
      BillingSubscriptionStatus.ACTIVE
    );
  });

  it('stores the amount in minor units, never below zero, so a full scholarship is 0', () => {
    const amount = BillingSubscriptionSchema.path('amountMinor') as { options: { min: number; required: boolean } };
    expect(amount.options.min).toBe(0);
    expect(amount.options.required).toBe(true);
  });
});

describe('LedgerEntrySchema', () => {
  it('accepts the three entry types', () => {
    const type = LedgerEntrySchema.path('type') as { options: { enum: string[] } };
    expect(type.options.enum).toEqual(Object.values(LedgerEntryType));
  });

  it('has no soft-delete fields, because an entry is never deleted', () => {
    expect(LedgerEntrySchema.path('deletedAt')).toBeUndefined();
    expect(LedgerEntrySchema.path('deletedById')).toBeUndefined();
  });

  it('indexes the family statement and the open-charge scan', () => {
    expect(names(LedgerEntrySchema)).toEqual(expect.arrayContaining(['ledger_by_family', 'ledger_open_charges']));
  });

  it('carries a direction only an adjustment uses', () => {
    const direction = LedgerEntrySchema.path('direction') as { options: { enum: number[]; default: number } };
    expect(direction.options.enum).toEqual([1, -1]);
    expect(direction.options.default).toBe(1);
  });

  it('idempotency key is unique when present, which is what stops a double post', () => {
    const entry = LedgerEntrySchema.indexes().find(([, options]) => options?.name === 'ledger_idempotency');
    expect(entry).toBeDefined();
    expect(entry![1]?.unique).toBe(true);
    expect(entry![1]?.partialFilterExpression).toEqual({ idempotencyKey: { $type: 'string' } });
  });
});

describe('FamilyPaymentSchema', () => {
  it('refers to its receipt by S3 key, matching FileService', () => {
    expect(FamilyPaymentSchema.path('receiptFileKey')).toBeDefined();
    expect(FamilyPaymentSchema.path('receiptFileId')).toBeUndefined();
  });

  it('keeps the method as a free string, so a new strategy needs no schema change', () => {
    const method = FamilyPaymentSchema.path('method') as { instance: string };
    expect(method.instance).toBe('String');
  });

  it('allows only one payment per gateway payment id, which makes a repeat webhook a no-op', () => {
    const entry = FamilyPaymentSchema.indexes().find(([, options]) => options?.name === 'payment_gateway_unique');
    expect(entry).toBeDefined();
    expect(entry![1]?.unique).toBe(true);
  });
});

describe('AllocationSchema', () => {
  it('allows a payment to be allocated to a charge only once', () => {
    const entry = AllocationSchema.indexes().find(([, options]) => options?.name === 'allocation_unique');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ paymentLedgerEntryId: 1, chargeLedgerEntryId: 1 });
    expect(options?.unique).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest billing/entities --runInBand`
Expected: FAIL — the four modules do not exist.

- [ ] **Step 3: Create the subscription entity**

Create `apps/server/src/billing/entities/subscription.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BillingSubscriptionStatus, Currency, SubscriptionType } from '@darnozom/shared-types';

@Schema({ _id: false })
export class SubscriptionItem {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;
}
export const SubscriptionItemSchema = SchemaFactory.createForClass(SubscriptionItem);

/** A family's tuition arrangement for one or more children in one or more groups. */
@Schema({ timestamps: true, collection: 'billingsubscriptions' })
export class BillingSubscription extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  /** The parent user, or the student themselves when no parent is linked. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  familyId: Types.ObjectId;

  /** Exactly one item, except FAMILY, which has two or more siblings. */
  @Prop({ type: [SubscriptionItemSchema], required: true })
  items: SubscriptionItem[];

  @Prop({ type: String, enum: Object.values(SubscriptionType), required: true })
  type: SubscriptionType;

  /** Integer minor units (plan decision D1). 0 is a full scholarship. */
  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  @Prop({ type: String, enum: Object.values(BillingSubscriptionStatus), default: BillingSubscriptionStatus.ACTIVE })
  status: BillingSubscriptionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  note?: string;

  @Prop({ type: Date, required: false, default: null })
  endedAt: Date | null;
}

export const BillingSubscriptionSchema = SchemaFactory.createForClass(BillingSubscription);
// A student in a group may have only one live arrangement. The index, not a read-then-write check,
// is what makes that true when two accountants save at once.
BillingSubscriptionSchema.index(
  { 'items.studentId': 1, 'items.groupId': 1 },
  {
    unique: true,
    partialFilterExpression: { status: BillingSubscriptionStatus.ACTIVE },
    name: 'one_active_subscription_per_student_group',
  }
);
BillingSubscriptionSchema.index({ organizationId: 1, familyId: 1, status: 1 }, { name: 'subscriptions_by_family' });
BillingSubscriptionSchema.index({ organizationId: 1, type: 1, status: 1 }, { name: 'subscriptions_by_type' });
```

The collection name is set explicitly because the organization's SaaS `Subscription` already owns `subscriptions`.

- [ ] **Step 4: Create the ledger entry**

Create `apps/server/src/billing/entities/ledger-entry.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency, LedgerEntryType } from '@darnozom/shared-types';

/**
 * One line of a family's statement. **Append-only**: never updated, never deleted, by any code path.
 * A correction is a new ADJUSTMENT row carrying a reason. That is what makes the ledger a record
 * rather than a running total someone can quietly fix.
 */
@Schema({ timestamps: true })
export class LedgerEntry extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  studentId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: false, default: null })
  groupId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'BillingSubscription', required: false, default: null })
  subscriptionId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: false, default: null })
  sessionId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'FamilyPayment', required: false, default: null })
  paymentId: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(LedgerEntryType), required: true })
  type: LedgerEntryType;

  /** Integer minor units, always non-negative. */
  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  /** Only an ADJUSTMENT uses -1; a CHARGE and a PAYMENT get their direction from `type`. */
  @Prop({ type: Number, enum: [1, -1], default: 1 })
  direction: 1 | -1;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  /** When a charge falls due. Null on a payment or an adjustment. */
  @Prop({ type: Date, required: false, default: null })
  dueAt: Date | null;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  createdBy: Types.ObjectId | null;

  /**
   * Set on charges a job posts, so re-running the job writes nothing new. Unset on a charge an
   * accountant creates by hand, which may legitimately repeat.
   */
  @Prop({ type: String, required: false, default: null })
  idempotencyKey: string | null;
}

export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);
LedgerEntrySchema.index({ organizationId: 1, familyId: 1, createdAt: -1 }, { name: 'ledger_by_family' });
LedgerEntrySchema.index({ familyId: 1, type: 1, currency: 1, dueAt: 1 }, { name: 'ledger_open_charges' });
LedgerEntrySchema.index({ studentId: 1, groupId: 1, type: 1 }, { name: 'ledger_by_student_group' });
// The partial filter keeps the index out of the way of the many rows with no key at all.
LedgerEntrySchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } }, name: 'ledger_idempotency' }
);
```

- [ ] **Step 5: Create the payment and the allocation**

Create `apps/server/src/billing/entities/payment.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';

/** A parent's attempt to pay, from intent to confirmed money. */
@Schema({ timestamps: true })
export class FamilyPayment extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  familyId: Types.ObjectId;

  /** A registry key, not an enum: a new method is a new provider (plan decision in §4 of the spec). */
  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  @Prop({ type: String, enum: Object.values(FamilyPaymentState), required: true })
  status: FamilyPaymentState;

  /** The S3 key of the uploaded receipt (plan decision D2). */
  @Prop({ type: String, required: false, default: null })
  receiptFileKey: string | null;

  @Prop({ type: String, required: false, default: null })
  gatewayPaymentId: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  payerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  reviewedAt: Date | null;

  @Prop({ type: String, required: false, default: null })
  rejectReason: string | null;
}

export const FamilyPaymentSchema = SchemaFactory.createForClass(FamilyPayment);
FamilyPaymentSchema.index({ organizationId: 1, status: 1, createdAt: 1 }, { name: 'payments_review_queue' });
FamilyPaymentSchema.index({ familyId: 1, createdAt: -1 }, { name: 'payments_by_family' });
// One payment per gateway reference, so a webhook delivered twice cannot become two payments.
FamilyPaymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } }, name: 'payment_gateway_unique' }
);
```

Create `apps/server/src/billing/entities/allocation.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * How much of one payment settled one charge. Sub-project 7's revenue share traces a payment back
 * to a group through these rows, which is why allocation is recorded rather than recomputed.
 */
@Schema({ timestamps: true })
export class Allocation extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LedgerEntry', required: true })
  paymentLedgerEntryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LedgerEntry', required: true })
  chargeLedgerEntryId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  amountMinor: number;
}

export const AllocationSchema = SchemaFactory.createForClass(Allocation);
AllocationSchema.index(
  { paymentLedgerEntryId: 1, chargeLedgerEntryId: 1 },
  { unique: true, name: 'allocation_unique' }
);
AllocationSchema.index({ chargeLedgerEntryId: 1 }, { name: 'allocations_by_charge' });
```

- [ ] **Step 6: Create the lean types and the module**

Create `apps/server/src/billing/billing.types.ts` with `BillingSubscriptionLean`, `LedgerEntryLean`, `FamilyPaymentLean` and `AllocationLean` mirroring the four entities field for field, plus:

```ts
/** One currency's position for a family. Balances are never summed across currencies. */
export interface LedgerBalance {
  currency: Currency;
  chargedMinor: number;
  paidMinor: number;
  balanceMinor: number;
}
```

Create `apps/server/src/billing/billing.module.ts` registering the four schemas with `MongooseModule.forFeature`. Leave `providers` and `controllers` empty for now; later tasks fill them. Add `BillingModule` to the `imports` of `apps/server/src/app.module.ts`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest billing/entities --runInBand`
Expected: PASS, 12 tests.

- [ ] **Step 8: Type-check, lint, commit**

```bash
pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json
pnpm --filter server exec eslint src/billing/entities/subscription.entity.ts src/billing/entities/ledger-entry.entity.ts src/billing/entities/payment.entity.ts src/billing/entities/allocation.entity.ts src/billing/entities/entities.spec.ts src/billing/billing.types.ts src/billing/billing.module.ts src/app.module.ts
git add apps/server/src
git commit -m "feat(sp6): add the billing subscription, ledger, payment and allocation collections"
```

---

### Task 4: The charge schedule (pure)

**Files:**
- Create: `apps/server/src/billing/domain/charge-schedule.ts`
- Test: `apps/server/src/billing/domain/charge-schedule.spec.ts`

**Interfaces:**
- Consumes: `SubscriptionType`, luxon, Task 2's money helpers.
- Produces:

```ts
export interface PlannedCharge { amountMinor: number; dueAt: Date; studentId: string | null; groupId: string | null; idempotencyKey: string | null; descriptionKey: string; }
export function initialCharges(input: { subscriptionId; type; amountMinor; items: { studentId; groupId; startDate: Date }[] }): PlannedCharge[];
export function monthlyChargeDueDates(startDate: Date, timezone: string, now: Date): Date[];
export function monthlyIdempotencyKey(subscriptionId: string, dueAt: Date): string;
export function perSessionIdempotencyKey(subscriptionId: string, sessionId: string, studentId: string): string;
```

This task carries **Review Focus 5** (a zero-amount scholarship).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/billing/domain/charge-schedule.spec.ts`:

```ts
import { SubscriptionType } from '@darnozom/shared-types';
import {
  initialCharges,
  monthlyChargeDueDates,
  monthlyIdempotencyKey,
  perSessionIdempotencyKey,
} from './charge-schedule';

const SUB = 'sub1';
const MARCH = new Date('2026-03-15T00:00:00.000Z');
const APRIL = new Date('2026-04-01T00:00:00.000Z');

const item = (studentId: string, groupId: string, startDate = MARCH) => ({ studentId, groupId, startDate });

describe('initialCharges — FULL_COURSE', () => {
  it('posts one charge due at the cohort start', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.FULL_COURSE,
      amountMinor: 50_000,
      items: [item('s1', 'g1')],
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ amountMinor: 50_000, dueAt: MARCH, studentId: 's1', groupId: 'g1' });
  });
});

describe('initialCharges — MONTHLY', () => {
  it('posts the first month’s charge, due at the start', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.MONTHLY,
      amountMinor: 10_000,
      items: [item('s1', 'g1')],
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ amountMinor: 10_000, dueAt: MARCH });
  });

  it('gives the first month an idempotency key, so a job cannot post it twice', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.MONTHLY,
      amountMinor: 10_000,
      items: [item('s1', 'g1')],
    });
    expect(charges[0].idempotencyKey).toBe(monthlyIdempotencyKey(SUB, MARCH));
  });
});

describe('initialCharges — PER_SESSION', () => {
  it('posts nothing up front: charges arrive as sessions complete', () => {
    expect(
      initialCharges({ subscriptionId: SUB, type: SubscriptionType.PER_SESSION, amountMinor: 2_000, items: [item('s1', 'g1')] })
    ).toEqual([]);
  });
});

describe('initialCharges — FAMILY', () => {
  it('posts one charge for all the children, not one each', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.FAMILY,
      amountMinor: 80_000,
      items: [item('s1', 'g1'), item('s2', 'g2', APRIL)],
    });
    expect(charges).toHaveLength(1);
    expect(charges[0].amountMinor).toBe(80_000);
  });

  it('dues it at the earliest of the children’s start dates', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.FAMILY,
      amountMinor: 80_000,
      items: [item('s2', 'g2', APRIL), item('s1', 'g1', MARCH)],
    });
    expect(charges[0].dueAt).toEqual(MARCH);
  });

  it('attributes the row to the earliest-starting group, for the payroll trace', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.FAMILY,
      amountMinor: 80_000,
      items: [item('s2', 'g2', APRIL), item('s1', 'g1', MARCH)],
    });
    expect(charges[0].groupId).toBe('g1');
    // No single student owns a family charge.
    expect(charges[0].studentId).toBeNull();
  });
});

describe('initialCharges — SCHOLARSHIP', () => {
  it('behaves like FULL_COURSE for a part scholarship', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.SCHOLARSHIP,
      amountMinor: 15_000,
      items: [item('s1', 'g1')],
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ amountMinor: 15_000, dueAt: MARCH });
  });

  it('posts no charge at all for a full scholarship, rather than a zero row nobody can pay', () => {
    expect(
      initialCharges({ subscriptionId: SUB, type: SubscriptionType.SCHOLARSHIP, amountMinor: 0, items: [item('s1', 'g1')] })
    ).toEqual([]);
  });
});

describe('initialCharges — a zero amount on any type', () => {
  it('posts nothing, so nothing can divide by zero downstream', () => {
    for (const type of Object.values(SubscriptionType)) {
      expect(initialCharges({ subscriptionId: SUB, type, amountMinor: 0, items: [item('s1', 'g1'), item('s2', 'g2')] })).toEqual([]);
    }
  });
});

describe('monthlyChargeDueDates', () => {
  it('is empty before the second month', () => {
    expect(monthlyChargeDueDates(MARCH, 'Africa/Cairo', new Date('2026-03-20T00:00:00.000Z'))).toEqual([]);
  });

  it('gives the 1st of each month after the start month, up to now', () => {
    const dues = monthlyChargeDueDates(MARCH, 'Africa/Cairo', new Date('2026-05-05T00:00:00.000Z'));
    expect(dues).toHaveLength(2);
    expect(dues[0].toISOString()).toBe('2026-03-31T22:00:00.000Z');
    expect(dues[1].toISOString()).toBe('2026-04-30T22:00:00.000Z');
  });

  it('does not include a month whose 1st has not arrived yet', () => {
    const dues = monthlyChargeDueDates(MARCH, 'Africa/Cairo', new Date('2026-04-30T00:00:00.000Z'));
    expect(dues).toHaveLength(1);
  });

  it('is empty for a timezone it cannot read, so one bad group cannot stop the job', () => {
    expect(monthlyChargeDueDates(MARCH, 'Mars/Olympus', new Date('2026-05-05T00:00:00.000Z'))).toEqual([]);
  });
});

describe('idempotency keys', () => {
  it('gives a month exactly one key', () => {
    expect(monthlyIdempotencyKey(SUB, APRIL)).toBe(monthlyIdempotencyKey(SUB, APRIL));
    expect(monthlyIdempotencyKey(SUB, APRIL)).not.toBe(monthlyIdempotencyKey(SUB, MARCH));
  });

  it('gives a student’s session exactly one key', () => {
    expect(perSessionIdempotencyKey(SUB, 'ses1', 's1')).toBe(perSessionIdempotencyKey(SUB, 'ses1', 's1'));
    expect(perSessionIdempotencyKey(SUB, 'ses1', 's1')).not.toBe(perSessionIdempotencyKey(SUB, 'ses1', 's2'));
    expect(perSessionIdempotencyKey(SUB, 'ses1', 's1')).not.toBe(perSessionIdempotencyKey(SUB, 'ses2', 's1'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest charge-schedule --runInBand`
Expected: FAIL — `Cannot find module './charge-schedule'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/billing/domain/charge-schedule.ts`:

```ts
import { DateTime } from 'luxon';
import { SubscriptionType } from '@darnozom/shared-types';

export interface PlannedCharge {
  amountMinor: number;
  dueAt: Date;
  /** Null on a FAMILY charge: no single child owns it. */
  studentId: string | null;
  groupId: string | null;
  idempotencyKey: string | null;
  /** A translation key the client renders; the server never stores final English. */
  descriptionKey: string;
}

export interface ScheduleItem {
  studentId: string;
  groupId: string;
  /** The cohort's start date for that item's group. */
  startDate: Date;
}

export interface ScheduleInput {
  subscriptionId: string;
  type: SubscriptionType;
  amountMinor: number;
  items: ScheduleItem[];
}

export const monthlyIdempotencyKey = (subscriptionId: string, dueAt: Date): string =>
  `monthly:${subscriptionId}:${dueAt.toISOString()}`;

export const perSessionIdempotencyKey = (subscriptionId: string, sessionId: string, studentId: string): string =>
  `session:${subscriptionId}:${sessionId}:${studentId}`;

const earliest = (items: ScheduleItem[]): ScheduleItem =>
  items.reduce((best, item) => (item.startDate.getTime() < best.startDate.getTime() ? item : best), items[0]);

/**
 * The charges a subscription posts the moment it is created.
 *
 * A zero amount posts nothing at all. A full scholarship owes nothing, and a zero-amount row would
 * be a charge nobody can pay that every coverage test then has to special-case.
 */
export function initialCharges(input: ScheduleInput): PlannedCharge[] {
  if (input.amountMinor <= 0 || input.items.length === 0) return [];

  switch (input.type) {
    case SubscriptionType.PER_SESSION:
      // Nothing up front; a charge arrives each time a session completes.
      return [];

    case SubscriptionType.FAMILY: {
      const first = earliest(input.items);
      return [
        {
          amountMinor: input.amountMinor,
          dueAt: first.startDate,
          studentId: null,
          // The earliest-starting group, so sub-project 7 can trace the money (plan decision D5).
          groupId: first.groupId,
          idempotencyKey: `family:${input.subscriptionId}`,
          descriptionKey: 'billing.charge.family',
        },
      ];
    }

    case SubscriptionType.MONTHLY: {
      const item = input.items[0];
      return [
        {
          amountMinor: input.amountMinor,
          dueAt: item.startDate,
          studentId: item.studentId,
          groupId: item.groupId,
          idempotencyKey: monthlyIdempotencyKey(input.subscriptionId, item.startDate),
          descriptionKey: 'billing.charge.monthly',
        },
      ];
    }

    case SubscriptionType.FULL_COURSE:
    case SubscriptionType.SCHOLARSHIP:
    default: {
      const item = input.items[0];
      return [
        {
          amountMinor: input.amountMinor,
          dueAt: item.startDate,
          studentId: item.studentId,
          groupId: item.groupId,
          idempotencyKey: `initial:${input.subscriptionId}`,
          descriptionKey:
            input.type === SubscriptionType.SCHOLARSHIP ? 'billing.charge.scholarship' : 'billing.charge.fullCourse',
        },
      ];
    }
  }
}

/**
 * The 1st of every month after the start month, in the group's timezone, whose moment has arrived.
 * The first month's charge is posted at creation, so it is not repeated here.
 */
export function monthlyChargeDueDates(startDate: Date, timezone: string, now: Date): Date[] {
  const start = DateTime.fromObject(
    { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() },
    { zone: timezone }
  );
  if (!start.isValid) return [];

  const dues: Date[] = [];
  let cursor = start.startOf('month').plus({ months: 1 });
  // A long-running group is bounded by `now`, so this terminates in at most a few dozen steps.
  while (cursor.toMillis() <= now.getTime()) {
    dues.push(cursor.toUTC().toJSDate());
    cursor = cursor.plus({ months: 1 });
  }
  return dues;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest charge-schedule --runInBand`
Expected: PASS, 17 tests. If the two exact ISO strings in `monthlyChargeDueDates` do not match, check whether Cairo observed DST on those dates and correct the **test's** expectations to the real instants, recording a `Ruling:` line — do not weaken the assertion to `expect.any(Date)`.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/domain/charge-schedule.ts src/billing/domain/charge-schedule.spec.ts
git add apps/server/src/billing
git commit -m "feat(sp6): add the charge schedule for the five subscription types"
```

---

### Task 5: Family resolution

**Files:**
- Create: `apps/server/src/billing/family/family.service.ts`
- Create: `apps/server/src/billing/domain/family.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Test: `apps/server/src/billing/domain/family.spec.ts`
- Test: `apps/server/src/billing/family/family.service.spec.ts`

**Interfaces:**
- Consumes: the `User` model, `user.parentUserId`.
- Produces: `familyIdOf(user: { _id; parentUserId? }): string` (pure); `FamilyService.resolve(studentIds: string[]): Promise<Map<string, string>>`, `FamilyService.canActorReadFamily(actor, familyId): Promise<boolean>`, `FamilyService.studentIdsOf(familyId): Promise<string[]>`.

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/billing/domain/family.spec.ts`:

```ts
import { Types } from 'mongoose';
import { familyIdOf } from './family';

describe('familyIdOf', () => {
  it('is the parent when the student has one', () => {
    const parent = new Types.ObjectId();
    const student = { _id: new Types.ObjectId(), parentUserId: parent };
    expect(familyIdOf(student)).toBe(String(parent));
  });

  it('is the student themselves when no parent is linked', () => {
    const student = { _id: new Types.ObjectId() };
    expect(familyIdOf(student)).toBe(String(student._id));
  });

  it('treats an explicitly null parent the same as a missing one', () => {
    const student = { _id: new Types.ObjectId(), parentUserId: null };
    expect(familyIdOf(student)).toBe(String(student._id));
  });
});
```

Create `apps/server/src/billing/family/family.service.spec.ts`:

```ts
import { Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { FamilyService } from './family.service';

const PARENT = new Types.ObjectId();
const CHILD_A = new Types.ObjectId();
const CHILD_B = new Types.ObjectId();
const LONE = new Types.ObjectId();

const makeService = (users: Record<string, unknown>[]) => {
  const userModel = {
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => users }) }) })),
  };
  return { service: new FamilyService(userModel as never), userModel };
};

const actor = (id: string, roleName: Roles) => ({ _id: id, organizationId: 'o1', roleName, additionalRoles: [] as Roles[] });

describe('FamilyService.resolve', () => {
  it('maps each child to its parent, and a parentless student to itself', async () => {
    const { service } = makeService([
      { _id: CHILD_A, parentUserId: PARENT },
      { _id: CHILD_B, parentUserId: PARENT },
      { _id: LONE, parentUserId: null },
    ]);
    const map = await service.resolve([String(CHILD_A), String(CHILD_B), String(LONE)]);
    expect(map.get(String(CHILD_A))).toBe(String(PARENT));
    expect(map.get(String(CHILD_B))).toBe(String(PARENT));
    expect(map.get(String(LONE))).toBe(String(LONE));
  });

  it('returns an empty map for an empty request, without querying', async () => {
    const { service, userModel } = makeService([]);
    await expect(service.resolve([])).resolves.toEqual(new Map());
    expect(userModel.find).not.toHaveBeenCalled();
  });
});

describe('FamilyService.canActorReadFamily', () => {
  it('lets a parent read their own family', async () => {
    const { service } = makeService([]);
    await expect(service.canActorReadFamily(actor(String(PARENT), Roles.PARENT), String(PARENT))).resolves.toBe(true);
  });

  it('refuses a parent reading another family', async () => {
    const { service } = makeService([]);
    await expect(service.canActorReadFamily(actor(String(PARENT), Roles.PARENT), String(new Types.ObjectId()))).resolves.toBe(false);
  });

  it('lets a student with no parent read their own family', async () => {
    const { service } = makeService([]);
    await expect(service.canActorReadFamily(actor(String(LONE), Roles.STUDENT), String(LONE))).resolves.toBe(true);
  });

  it('refuses a student whose family is their parent’s, because the parent owns the ledger', async () => {
    const { service } = makeService([{ _id: CHILD_A, parentUserId: PARENT }]);
    await expect(service.canActorReadFamily(actor(String(CHILD_A), Roles.STUDENT), String(PARENT))).resolves.toBe(false);
  });

  it('lets an accountant, a manager and an owner read any family', async () => {
    const { service } = makeService([]);
    for (const role of [Roles.ACCOUNTANT, Roles.MANAGER, Roles.OWNER]) {
      await expect(service.canActorReadFamily(actor(String(new Types.ObjectId()), role), String(PARENT))).resolves.toBe(true);
    }
  });

  it('refuses a teacher, a content officer and a Sharia reviewer', async () => {
    const { service } = makeService([]);
    for (const role of [Roles.INSTRUCTOR, Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER]) {
      await expect(service.canActorReadFamily(actor(String(new Types.ObjectId()), role), String(PARENT))).resolves.toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest billing/domain/family billing/family --runInBand`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write the pure helper**

Create `apps/server/src/billing/domain/family.ts`:

```ts
import { Types } from 'mongoose';

/**
 * A family is identified by its parent user; a student with no linked parent is their own family.
 * No collection is needed — `user.parentUserId` already carries the link, and it exists only on a
 * student, which the user schema enforces.
 */
export function familyIdOf(user: { _id: Types.ObjectId | string; parentUserId?: Types.ObjectId | string | null }): string {
  return String(user.parentUserId ?? user._id);
}
```

- [ ] **Step 4: Write the service**

Create `apps/server/src/billing/family/family.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { hasAnyRole, Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { familyIdOf } from '../domain/family';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

/** Staff who may read any family's finances. Content staff are deliberately absent. */
const FINANCE_READER_ROLES = [Roles.ACCOUNTANT, Roles.MANAGER, Roles.OWNER, Roles.ADMIN] as const;

interface FamilyActor {
  _id: string;
  roleName: Roles;
  additionalRoles?: readonly Roles[];
}

@Injectable()
export class FamilyService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  /** studentId → familyId, in one query. */
  async resolve(studentIds: string[]): Promise<Map<string, string>> {
    if (studentIds.length === 0) return new Map();
    const users = await this.userModel
      .find({ _id: { $in: studentIds.map(oid) } })
      .select('_id parentUserId')
      .lean<{ _id: Types.ObjectId; parentUserId?: Types.ObjectId | null }[]>()
      .exec();
    return new Map(users.map((user) => [String(user._id), familyIdOf(user)]));
  }

  /** Every student belonging to a family, including the family holder when they are a student. */
  async studentIdsOf(familyId: string): Promise<string[]> {
    const children = await this.userModel
      .find({ parentUserId: oid(familyId) })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    const ids = children.map((child) => String(child._id));
    return ids.length > 0 ? ids : [familyId];
  }

  /**
   * Finance staff read any family. A family holder reads their own. A child does **not** read the
   * family ledger: the parent owns it, and a child's own charges appear on it beside a sibling's.
   */
  async canActorReadFamily(actor: FamilyActor, familyId: string): Promise<boolean> {
    if (hasAnyRole(actor, FINANCE_READER_ROLES)) return true;
    return actor._id === familyId;
  }
}
```

Note the student case needs no query: a student whose family is their parent's simply is not the `familyId`, so the identity check already refuses them.

- [ ] **Step 5: Register the provider**

Add `FamilyService` to the `providers` and `exports` of `billing.module.ts`, and register the `User` schema in its `MongooseModule.forFeature` list. It is exported because academics reads payment status through billing in Task 11.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest billing/domain/family billing/family --runInBand`
Expected: PASS — 3 pure tests and 8 service tests.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/domain/family.ts src/billing/domain/family.spec.ts src/billing/family/family.service.ts src/billing/family/family.service.spec.ts src/billing/billing.module.ts
git add apps/server/src/billing
git commit -m "feat(sp6): resolve a student to their family and gate who may read it"
```

---
### Task 6: FIFO allocation (pure)

**Files:**
- Create: `apps/server/src/billing/domain/allocation.ts`
- Test: `apps/server/src/billing/domain/allocation.spec.ts`

**Interfaces:**
- Consumes: Task 2's `sumMinor`.
- Produces:

```ts
export interface OpenCharge { chargeLedgerEntryId: string; currency: Currency; dueAt: Date | null; createdAt: Date; amountMinor: number; alreadyAllocatedMinor: number; }
export interface PlannedAllocation { chargeLedgerEntryId: string; amountMinor: number; }
export interface AllocationResult { allocations: PlannedAllocation[]; unallocatedMinor: number; }
export function allocateFifo(paymentAmountMinor: number, paymentCurrency: Currency, charges: OpenCharge[]): AllocationResult;
export function outstandingOf(charge: OpenCharge): number;
```

This task carries **Review Focus 1** (two currencies) and **Review Focus 4** (a partial payment and an over-payment).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/billing/domain/allocation.spec.ts`:

```ts
import { Currency } from '@darnozom/shared-types';
import { allocateFifo, OpenCharge, outstandingOf } from './allocation';

const charge = (id: string, amountMinor: number, overrides: Partial<OpenCharge> = {}): OpenCharge => ({
  chargeLedgerEntryId: id,
  currency: Currency.EGP,
  dueAt: new Date('2026-03-01T00:00:00.000Z'),
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  amountMinor,
  alreadyAllocatedMinor: 0,
  ...overrides,
});

describe('outstandingOf', () => {
  it('is the charge less what is already allocated', () => {
    expect(outstandingOf(charge('c1', 10_000, { alreadyAllocatedMinor: 4_000 }))).toBe(6_000);
  });

  it('never goes below zero, even if over-allocated by a correction', () => {
    expect(outstandingOf(charge('c1', 10_000, { alreadyAllocatedMinor: 12_000 }))).toBe(0);
  });
});

describe('allocateFifo', () => {
  it('settles the oldest-due charge first', () => {
    const result = allocateFifo(10_000, Currency.EGP, [
      charge('later', 10_000, { dueAt: new Date('2026-04-01T00:00:00.000Z') }),
      charge('earlier', 10_000, { dueAt: new Date('2026-03-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'earlier', amountMinor: 10_000 }]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('falls back to creation order when two charges share a due date', () => {
    const due = new Date('2026-03-01T00:00:00.000Z');
    const result = allocateFifo(5_000, Currency.EGP, [
      charge('second', 10_000, { dueAt: due, createdAt: new Date('2026-02-10T00:00:00.000Z') }),
      charge('first', 10_000, { dueAt: due, createdAt: new Date('2026-02-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations[0].chargeLedgerEntryId).toBe('first');
  });

  it('treats a charge with no due date as the last to settle', () => {
    const result = allocateFifo(5_000, Currency.EGP, [
      charge('undated', 10_000, { dueAt: null }),
      charge('dated', 10_000, { dueAt: new Date('2026-05-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations[0].chargeLedgerEntryId).toBe('dated');
  });

  it('spreads one payment across several charges', () => {
    const result = allocateFifo(15_000, Currency.EGP, [
      charge('a', 10_000, { dueAt: new Date('2026-03-01T00:00:00.000Z') }),
      charge('b', 10_000, { dueAt: new Date('2026-04-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([
      { chargeLedgerEntryId: 'a', amountMinor: 10_000 },
      { chargeLedgerEntryId: 'b', amountMinor: 5_000 },
    ]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('leaves the rest of a partly covered charge owed', () => {
    const result = allocateFifo(4_000, Currency.EGP, [charge('a', 10_000)]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'a', amountMinor: 4_000 }]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('keeps an over-payment as an unallocated credit rather than losing it', () => {
    const result = allocateFifo(25_000, Currency.EGP, [charge('a', 10_000)]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'a', amountMinor: 10_000 }]);
    expect(result.unallocatedMinor).toBe(15_000);
  });

  it('allocates nothing when there is no open charge, and keeps the whole credit', () => {
    const result = allocateFifo(10_000, Currency.EGP, []);
    expect(result.allocations).toEqual([]);
    expect(result.unallocatedMinor).toBe(10_000);
  });

  it('skips a charge that is already fully covered', () => {
    const result = allocateFifo(5_000, Currency.EGP, [
      charge('covered', 10_000, { alreadyAllocatedMinor: 10_000, dueAt: new Date('2026-03-01T00:00:00.000Z') }),
      charge('open', 10_000, { dueAt: new Date('2026-04-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'open', amountMinor: 5_000 }]);
  });

  it('never settles a charge in another currency', () => {
    const result = allocateFifo(10_000, Currency.EGP, [
      charge('usd', 10_000, { currency: Currency.USD, dueAt: new Date('2026-03-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([]);
    expect(result.unallocatedMinor).toBe(10_000);
  });

  it('settles only the matching currency when a family owes in two', () => {
    const result = allocateFifo(12_000, Currency.EGP, [
      charge('usd', 10_000, { currency: Currency.USD, dueAt: new Date('2026-02-01T00:00:00.000Z') }),
      charge('egp', 10_000, { currency: Currency.EGP, dueAt: new Date('2026-03-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'egp', amountMinor: 10_000 }]);
    expect(result.unallocatedMinor).toBe(2_000);
  });

  it('allocates nothing for a zero payment', () => {
    const result = allocateFifo(0, Currency.EGP, [charge('a', 10_000)]);
    expect(result.allocations).toEqual([]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('produces only positive allocation amounts, so no zero row is ever written', () => {
    const result = allocateFifo(10_000, Currency.EGP, [charge('a', 10_000), charge('b', 10_000)]);
    expect(result.allocations.every((allocation) => allocation.amountMinor > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest billing/domain/allocation --runInBand`
Expected: FAIL — `Cannot find module './allocation'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/billing/domain/allocation.ts`:

```ts
import { Currency } from '@darnozom/shared-types';

export interface OpenCharge {
  chargeLedgerEntryId: string;
  currency: Currency;
  /** Null sorts last: a charge with no due date waits behind every dated one. */
  dueAt: Date | null;
  createdAt: Date;
  amountMinor: number;
  alreadyAllocatedMinor: number;
}

export interface PlannedAllocation {
  chargeLedgerEntryId: string;
  amountMinor: number;
}

export interface AllocationResult {
  allocations: PlannedAllocation[];
  /** Money the payment could not settle. It stays on the ledger as a credit, never discarded. */
  unallocatedMinor: number;
}

export function outstandingOf(charge: OpenCharge): number {
  return Math.max(0, charge.amountMinor - charge.alreadyAllocatedMinor);
}

const DISTANT_FUTURE = Number.MAX_SAFE_INTEGER;
const dueKey = (charge: OpenCharge): number => charge.dueAt?.getTime() ?? DISTANT_FUTURE;

/**
 * Settles a payment against the family's open charges, oldest due first, within one currency.
 *
 * A payment in one currency can never settle a charge in another: there is no exchange rate in the
 * MVP, and inventing one would silently misstate what a family owes. Whatever is left over comes
 * back as `unallocatedMinor` and remains a credit on the ledger.
 */
export function allocateFifo(
  paymentAmountMinor: number,
  paymentCurrency: Currency,
  charges: OpenCharge[]
): AllocationResult {
  if (paymentAmountMinor <= 0) return { allocations: [], unallocatedMinor: 0 };

  const eligible = charges
    .filter((charge) => charge.currency === paymentCurrency && outstandingOf(charge) > 0)
    .sort((a, b) => dueKey(a) - dueKey(b) || a.createdAt.getTime() - b.createdAt.getTime());

  const allocations: PlannedAllocation[] = [];
  let remaining = paymentAmountMinor;

  for (const charge of eligible) {
    if (remaining <= 0) break;
    const amountMinor = Math.min(remaining, outstandingOf(charge));
    // Integer minor units throughout, so this comparison never leaves a stray fraction behind.
    allocations.push({ chargeLedgerEntryId: charge.chargeLedgerEntryId, amountMinor });
    remaining -= amountMinor;
  }

  return { allocations, unallocatedMinor: remaining };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest billing/domain/allocation --runInBand`
Expected: PASS, 15 tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/domain/allocation.ts src/billing/domain/allocation.spec.ts
git add apps/server/src/billing
git commit -m "feat(sp6): allocate a payment to open charges oldest-due-first, within one currency"
```

---

### Task 7: The ledger

**Files:**
- Create: `apps/server/src/billing/ledger/ledger.service.ts`
- Create: `apps/server/src/billing/events/billing.events.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Test: `apps/server/src/billing/ledger/ledger.service.spec.ts`

**Interfaces:**
- Consumes: `LedgerEntry`, `Allocation` (Task 3), `allocateFifo` and `outstandingOf` (Task 6), `isValidAmountMinor` (Task 2), `EventEmitter2`.
- Produces:

```ts
postCharges(input: { organizationId; familyId; currency; createdBy? ; charges: PlannedCharge[] }): Promise<LedgerEntryLean[]>
postPaymentAndAllocate(input: { organizationId; familyId; paymentId; amountMinor; currency; createdBy }): Promise<{ entry: LedgerEntryLean; allocated: number; unallocatedMinor: number }>
postAdjustment(input: { organizationId; familyId; amountMinor; direction; currency; reason; createdBy }): Promise<LedgerEntryLean>
openCharges(familyId: string): Promise<OpenCharge[]>
balances(familyId: string): Promise<LedgerBalance[]>
statement(familyId: string): Promise<LedgerEntryLean[]>
```

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/billing/ledger/ledger.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { BillingErrors, Currency, LedgerEntryType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { BILLING_LEDGER_CHANGED_EVENT } from '../events/billing.events';
import { LedgerService } from './ledger.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const ACTOR = new Types.ObjectId();
const PAYMENT = new Types.ObjectId();

const charge = (overrides: Record<string, unknown> = {}) => ({
  amountMinor: 10_000,
  dueAt: new Date('2026-03-01T00:00:00.000Z'),
  studentId: null,
  groupId: String(GROUP),
  idempotencyKey: null,
  descriptionKey: 'billing.charge.fullCourse',
  ...overrides,
});

const makeService = (existingCharges: Record<string, unknown>[] = [], duplicateKeys: string[] = []) => {
  const written: Record<string, unknown>[] = [];
  const entryModel = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      if (typeof doc.idempotencyKey === 'string' && duplicateKeys.includes(doc.idempotencyKey)) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11000;
        throw error;
      }
      written.push({ ...doc, _id: new Types.ObjectId(), createdAt: new Date() });
      return written.at(-1);
    }),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => existingCharges }) }) })),
    aggregate: jest.fn(async () => []),
  };
  const allocationModel = {
    insertMany: jest.fn(async (docs: unknown[]) => docs),
    aggregate: jest.fn(async () => []),
  };
  const events = { emit: jest.fn() };
  const service = new LedgerService(entryModel as never, allocationModel as never, events as never);
  return { service, entryModel, allocationModel, events, written };
};

describe('LedgerService.postCharges', () => {
  it('writes one CHARGE row per planned charge', async () => {
    const { service, written } = makeService();
    await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      createdBy: String(ACTOR),
      charges: [charge(), charge({ amountMinor: 5_000 })],
    });
    expect(written).toHaveLength(2);
    expect(written.every((row) => row.type === LedgerEntryType.CHARGE)).toBe(true);
    expect(written.every((row) => row.direction === 1)).toBe(true);
  });

  it('writes nothing for an empty plan and emits no event', async () => {
    const { service, written, events } = makeService();
    await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      charges: [],
    });
    expect(written).toHaveLength(0);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('skips a charge whose idempotency key already exists, instead of failing the batch', async () => {
    const { service, written } = makeService([], ['monthly:sub1:x']);
    const result = await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      charges: [charge({ idempotencyKey: 'monthly:sub1:x' }), charge({ idempotencyKey: 'monthly:sub1:y' })],
    });
    expect(result).toHaveLength(1);
    expect(written).toHaveLength(1);
    expect(written[0].idempotencyKey).toBe('monthly:sub1:y');
  });

  it('announces the change with the groups it touched, so readiness can be re-evaluated', async () => {
    const { service, events } = makeService();
    await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      charges: [charge()],
    });
    expect(events.emit).toHaveBeenCalledWith(
      BILLING_LEDGER_CHANGED_EVENT,
      expect.objectContaining({ familyId: String(FAMILY), groupIds: [String(GROUP)] })
    );
  });

  it('refuses an amount that is not a non-negative integer', async () => {
    const { service } = makeService();
    await expect(
      service.postCharges({
        organizationId: String(ORG),
        familyId: String(FAMILY),
        currency: Currency.EGP,
        charges: [charge({ amountMinor: 10.5 })],
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.AMOUNT_INVALID));
  });
});

describe('LedgerService.postPaymentAndAllocate', () => {
  const openCharge = (id: Types.ObjectId, amountMinor: number, currency = Currency.EGP) => ({
    _id: id,
    currency,
    dueAt: new Date('2026-03-01T00:00:00.000Z'),
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    amountMinor,
    type: LedgerEntryType.CHARGE,
  });

  it('writes exactly one PAYMENT row and the allocations for it', async () => {
    const chargeId = new Types.ObjectId();
    const { service, written, allocationModel } = makeService([openCharge(chargeId, 10_000)]);
    const result = await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(written.filter((row) => row.type === LedgerEntryType.PAYMENT)).toHaveLength(1);
    expect(allocationModel.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ chargeLedgerEntryId: chargeId, amountMinor: 10_000 }),
    ]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('keeps an over-payment as an unallocated credit', async () => {
    const chargeId = new Types.ObjectId();
    const { service } = makeService([openCharge(chargeId, 4_000)]);
    const result = await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(result.unallocatedMinor).toBe(6_000);
  });

  it('writes the payment row even when nothing could be allocated', async () => {
    const { service, written, allocationModel } = makeService([]);
    await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(written).toHaveLength(1);
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
  });

  it('never allocates across currencies', async () => {
    const { service, allocationModel } = makeService([openCharge(new Types.ObjectId(), 10_000, Currency.USD)]);
    const result = await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
    expect(result.unallocatedMinor).toBe(10_000);
  });

  it('is keyed on the payment, so the same payment cannot post twice', async () => {
    const { service, written } = makeService([]);
    await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(written[0].idempotencyKey).toBe(`payment:${String(PAYMENT)}`);
  });
});

describe('LedgerService.postAdjustment', () => {
  it('requires a reason', async () => {
    const { service } = makeService();
    await expect(
      service.postAdjustment({
        organizationId: String(ORG),
        familyId: String(FAMILY),
        amountMinor: 1_000,
        direction: -1,
        currency: Currency.EGP,
        reason: '  ',
        createdBy: String(ACTOR),
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.ADJUSTMENT_REASON_REQUIRED));
  });

  it('writes the reason as the description and keeps the sign in direction', async () => {
    const { service, written } = makeService();
    await service.postAdjustment({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      amountMinor: 1_000,
      direction: -1,
      currency: Currency.EGP,
      reason: 'Agreed discount',
      createdBy: String(ACTOR),
    });
    expect(written[0]).toMatchObject({
      type: LedgerEntryType.ADJUSTMENT,
      amountMinor: 1_000,
      direction: -1,
      description: 'Agreed discount',
    });
  });

  it('only accepts 1 or -1 as a direction', async () => {
    const { service } = makeService();
    await expect(
      service.postAdjustment({
        organizationId: String(ORG),
        familyId: String(FAMILY),
        amountMinor: 1_000,
        direction: 0 as 1 | -1,
        currency: Currency.EGP,
        reason: 'x',
        createdBy: String(ACTOR),
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.AMOUNT_INVALID));
  });
});

describe('LedgerService — the append-only guarantee', () => {
  it('exposes no method that updates or deletes an entry', () => {
    const names = Object.getOwnPropertyNames(LedgerService.prototype);
    for (const forbidden of ['update', 'updateEntry', 'delete', 'deleteEntry', 'remove', 'edit']) {
      expect(names).not.toContain(forbidden);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest billing/ledger --runInBand`
Expected: FAIL — `Cannot find module './ledger.service'`.

- [ ] **Step 3: Write the event contract**

Create `apps/server/src/billing/events/billing.events.ts`:

```ts
/**
 * Billing announces a ledger change rather than calling academics directly. Readiness lives in
 * academics and the ledger lives here; a direct call each way would be a module cycle (plan
 * decision D3).
 */
export const BILLING_LEDGER_CHANGED_EVENT = 'billing.ledger.changed';

export interface BillingLedgerChangedPayload {
  organizationId: string;
  familyId: string;
  /** The groups whose readiness may have moved. Empty when the change touched no group. */
  groupIds: string[];
}
```

- [ ] **Step 4: Write the service**

Create `apps/server/src/billing/ledger/ledger.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingErrors, Currency, LedgerEntryType } from '@darnozom/shared-types';
import { Allocation } from '../entities/allocation.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { LedgerBalance, LedgerEntryLean } from '../billing.types';
import { allocateFifo, OpenCharge } from '../domain/allocation';
import { PlannedCharge } from '../domain/charge-schedule';
import { isValidAmountMinor } from '../domain/money';
import { BILLING_LEDGER_CHANGED_EVENT, BillingLedgerChangedPayload } from '../events/billing.events';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const DUPLICATE_KEY = 11000;

export interface PostChargesInput {
  organizationId: string;
  familyId: string;
  currency: Currency;
  createdBy?: string | null;
  subscriptionId?: string | null;
  sessionId?: string | null;
  charges: PlannedCharge[];
}

/**
 * The family statement. **This service never updates or deletes an entry.** A correction is a new
 * ADJUSTMENT row. Keep it that way: an editable ledger is not a record.
 */
@Injectable()
export class LedgerService {
  constructor(
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name) private readonly allocationModel: Model<Allocation>,
    private readonly events: EventEmitter2
  ) {}

  async postCharges(input: PostChargesInput): Promise<LedgerEntryLean[]> {
    if (input.charges.length === 0) return [];
    for (const charge of input.charges) {
      if (!isValidAmountMinor(charge.amountMinor)) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);
    }

    const written: LedgerEntryLean[] = [];
    for (const charge of input.charges) {
      try {
        const entry = await this.entryModel.create({
          organizationId: oid(input.organizationId),
          familyId: oid(input.familyId),
          studentId: charge.studentId ? oid(charge.studentId) : null,
          groupId: charge.groupId ? oid(charge.groupId) : null,
          subscriptionId: input.subscriptionId ? oid(input.subscriptionId) : null,
          sessionId: input.sessionId ? oid(input.sessionId) : null,
          paymentId: null,
          type: LedgerEntryType.CHARGE,
          amountMinor: charge.amountMinor,
          direction: 1,
          currency: input.currency,
          dueAt: charge.dueAt,
          description: charge.descriptionKey,
          createdBy: input.createdBy ? oid(input.createdBy) : null,
          idempotencyKey: charge.idempotencyKey,
        });
        written.push(entry as unknown as LedgerEntryLean);
      } catch (error) {
        // A key collision means a job already posted this charge. Skipping is the whole point of
        // the key, so one repeated charge must not abort the charges beside it.
        if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      }
    }

    this.announce(input.organizationId, input.familyId, written);
    return written;
  }

  async postPaymentAndAllocate(input: {
    organizationId: string;
    familyId: string;
    paymentId: string;
    amountMinor: number;
    currency: Currency;
    createdBy: string;
  }): Promise<{ entry: LedgerEntryLean; allocated: number; unallocatedMinor: number }> {
    if (!isValidAmountMinor(input.amountMinor)) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);

    // Keyed on the payment: a webhook delivered twice writes one row, not two.
    const entry = (await this.entryModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      studentId: null,
      groupId: null,
      subscriptionId: null,
      sessionId: null,
      paymentId: oid(input.paymentId),
      type: LedgerEntryType.PAYMENT,
      amountMinor: input.amountMinor,
      direction: 1,
      currency: input.currency,
      dueAt: null,
      description: 'billing.entry.payment',
      createdBy: oid(input.createdBy),
      idempotencyKey: `payment:${input.paymentId}`,
    })) as unknown as LedgerEntryLean;

    const open = await this.openCharges(input.familyId);
    const plan = allocateFifo(input.amountMinor, input.currency, open);

    if (plan.allocations.length > 0) {
      await this.allocationModel.insertMany(
        plan.allocations.map((allocation) => ({
          organizationId: oid(input.organizationId),
          paymentLedgerEntryId: entry._id,
          chargeLedgerEntryId: oid(allocation.chargeLedgerEntryId),
          amountMinor: allocation.amountMinor,
        }))
      );
    }

    const touched = await this.groupIdsOfCharges(plan.allocations.map((allocation) => allocation.chargeLedgerEntryId));
    this.events.emit(BILLING_LEDGER_CHANGED_EVENT, {
      organizationId: input.organizationId,
      familyId: input.familyId,
      groupIds: touched,
    } satisfies BillingLedgerChangedPayload);

    return { entry, allocated: plan.allocations.length, unallocatedMinor: plan.unallocatedMinor };
  }

  async postAdjustment(input: {
    organizationId: string;
    familyId: string;
    amountMinor: number;
    direction: 1 | -1;
    currency: Currency;
    reason: string;
    createdBy: string;
    studentId?: string | null;
    groupId?: string | null;
  }): Promise<LedgerEntryLean> {
    const reason = input.reason?.trim();
    if (!reason) throw new BadRequestException(BillingErrors.ADJUSTMENT_REASON_REQUIRED);
    if (!isValidAmountMinor(input.amountMinor)) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);
    if (input.direction !== 1 && input.direction !== -1) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);

    const entry = (await this.entryModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      studentId: input.studentId ? oid(input.studentId) : null,
      groupId: input.groupId ? oid(input.groupId) : null,
      subscriptionId: null,
      sessionId: null,
      paymentId: null,
      type: LedgerEntryType.ADJUSTMENT,
      amountMinor: input.amountMinor,
      direction: input.direction,
      currency: input.currency,
      dueAt: null,
      // The accountant's own words, not a key: a correction has to say why.
      description: reason,
      createdBy: oid(input.createdBy),
      idempotencyKey: null,
    })) as unknown as LedgerEntryLean;

    this.announce(input.organizationId, input.familyId, [entry]);
    return entry;
  }

  /** Every charge with something still outstanding, with what is already allocated to each. */
  async openCharges(familyId: string): Promise<OpenCharge[]> {
    const charges = await this.entryModel
      .find({ familyId: oid(familyId), type: LedgerEntryType.CHARGE })
      .sort({ dueAt: 1, createdAt: 1 })
      .lean<{ _id: Types.ObjectId; currency: Currency; dueAt: Date | null; createdAt: Date; amountMinor: number }[]>()
      .exec();
    if (charges.length === 0) return [];

    const allocated = await this.allocationModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { chargeLedgerEntryId: { $in: charges.map((charge) => charge._id) } } },
      { $group: { _id: '$chargeLedgerEntryId', total: { $sum: '$amountMinor' } } },
    ]);
    const byCharge = new Map(allocated.map((row) => [String(row._id), row.total]));

    return charges.map((charge) => ({
      chargeLedgerEntryId: String(charge._id),
      currency: charge.currency,
      dueAt: charge.dueAt,
      createdAt: charge.createdAt,
      amountMinor: charge.amountMinor,
      alreadyAllocatedMinor: byCharge.get(String(charge._id)) ?? 0,
    }));
  }

  /** One position per currency. Never summed across currencies — there is no exchange rate here. */
  async balances(familyId: string): Promise<LedgerBalance[]> {
    const rows = await this.entryModel.aggregate<{
      _id: { currency: Currency; type: LedgerEntryType };
      total: number;
    }>([
      { $match: { familyId: oid(familyId) } },
      {
        $group: {
          _id: { currency: '$currency', type: '$type' },
          total: { $sum: { $multiply: ['$amountMinor', '$direction'] } },
        },
      },
    ]);

    const byCurrency = new Map<Currency, LedgerBalance>();
    for (const row of rows) {
      const current =
        byCurrency.get(row._id.currency) ??
        ({ currency: row._id.currency, chargedMinor: 0, paidMinor: 0, balanceMinor: 0 } satisfies LedgerBalance);
      if (row._id.type === LedgerEntryType.CHARGE) current.chargedMinor += row.total;
      else if (row._id.type === LedgerEntryType.PAYMENT) current.paidMinor += row.total;
      // An ADJUSTMENT moves the balance without pretending to be a charge or a payment.
      else current.chargedMinor += row.total;
      byCurrency.set(row._id.currency, current);
    }

    return [...byCurrency.values()].map((balance) => ({
      ...balance,
      balanceMinor: balance.chargedMinor - balance.paidMinor,
    }));
  }

  async statement(familyId: string): Promise<LedgerEntryLean[]> {
    return this.entryModel.find({ familyId: oid(familyId) }).sort({ createdAt: -1 }).lean<LedgerEntryLean[]>().exec();
  }

  private async groupIdsOfCharges(chargeIds: string[]): Promise<string[]> {
    if (chargeIds.length === 0) return [];
    const rows = await this.entryModel
      .find({ _id: { $in: chargeIds.map(oid) } })
      .select('groupId')
      .lean<{ groupId: Types.ObjectId | null }[]>()
      .exec();
    return [...new Set(rows.map((row) => row.groupId).filter((id): id is Types.ObjectId => id != null).map(String))];
  }

  private announce(organizationId: string, familyId: string, entries: LedgerEntryLean[]): void {
    if (entries.length === 0) return;
    const groupIds = [...new Set(entries.map((entry) => entry.groupId).filter((id) => id != null).map(String))];
    this.events.emit(BILLING_LEDGER_CHANGED_EVENT, {
      organizationId,
      familyId,
      groupIds,
    } satisfies BillingLedgerChangedPayload);
  }
}
```

The `openCharges` test doubles return raw charge documents keyed `_id`; `postPaymentAndAllocate` calls `openCharges`, which maps them. If the test's double shape does not line up, adjust the **double**, not the mapping.

- [ ] **Step 5: Register the provider**

Add `LedgerService` to the `providers` and `exports` of `billing.module.ts`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter server exec jest billing/ledger --runInBand`
Expected: PASS, 14 tests.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/ledger/ledger.service.ts src/billing/ledger/ledger.service.spec.ts src/billing/events/billing.events.ts src/billing/billing.module.ts
git add apps/server/src/billing
git commit -m "feat(sp6): add the append-only family ledger with FIFO allocation"
```

---

### Task 8: Subscriptions

**Files:**
- Create: `apps/server/src/billing/subscription/subscription.service.ts`
- Create: `apps/server/src/billing/dto/billing.dto.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Test: `apps/server/src/billing/subscription/subscription.service.spec.ts`

**Interfaces:**
- Consumes: `BillingSubscription` (Task 3), `initialCharges` (Task 4), `FamilyService` (Task 5), `LedgerService` (Task 7).
- Produces: `SubscriptionService.create(actor, dto)`, `.findForGroup(actor, groupId)`, `.findForFamily(actor, familyId)`, `.end(actor, id)`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/billing/subscription/subscription.service.spec.ts`:

```ts
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BillingErrors, BillingSubscriptionStatus, Currency, Roles, SubscriptionType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SubscriptionService } from './subscription.service';

const ORG = new Types.ObjectId();
const PARENT = new Types.ObjectId();
const CHILD_A = new Types.ObjectId();
const CHILD_B = new Types.ObjectId();
const GROUP_A = new Types.ObjectId();
const GROUP_B = new Types.ObjectId();
const ACTOR = new Types.ObjectId();
const MARCH = new Date('2026-03-15T00:00:00.000Z');
const APRIL = new Date('2026-04-01T00:00:00.000Z');

const actor = () => ({ _id: String(ACTOR), organizationId: String(ORG), roleName: Roles.ACCOUNTANT, additionalRoles: [] as Roles[] });

const makeService = (duplicate = false) => {
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      if (duplicate) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11000;
        throw error;
      }
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => created }) }) })),
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => created[0] ?? null }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({
      lean: () => ({
        exec: async () => [
          { _id: GROUP_A, organizationId: ORG, cohortId: 'c1', students: [{ studentId: CHILD_A }] },
          { _id: GROUP_B, organizationId: ORG, cohortId: 'c2', students: [{ studentId: CHILD_B }] },
        ],
      }),
    })),
  };
  const cohortModel = {
    find: jest.fn(() => ({ lean: () => ({ exec: async () => [{ _id: 'c1', startDate: MARCH }, { _id: 'c2', startDate: APRIL }] }) })),
  };
  const families = { resolve: jest.fn(async () => new Map([[String(CHILD_A), String(PARENT)], [String(CHILD_B), String(PARENT)]])) };
  const ledger = { postCharges: jest.fn(async () => []) };
  const service = new SubscriptionService(model as never, groupModel as never, cohortModel as never, families as never, ledger as never);
  return { service, model, ledger, created };
};

const fullCourse = {
  type: SubscriptionType.FULL_COURSE,
  amountMinor: 50_000,
  currency: Currency.EGP,
  items: [{ studentId: String(CHILD_A), groupId: String(GROUP_A) }],
};

describe('SubscriptionService.create', () => {
  it('records the subscription against the family the student belongs to', async () => {
    const { service, created } = makeService();
    await service.create(actor(), fullCourse);
    expect(created[0]).toMatchObject({ familyId: PARENT, organizationId: ORG, type: SubscriptionType.FULL_COURSE, amountMinor: 50_000 });
  });

  it('posts the initial charges through the ledger', async () => {
    const { service, ledger } = makeService();
    await service.create(actor(), fullCourse);
    expect(ledger.postCharges).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: String(PARENT), currency: Currency.EGP, charges: [expect.objectContaining({ amountMinor: 50_000, dueAt: MARCH })] })
    );
  });

  it('posts nothing for a full scholarship', async () => {
    const { service, ledger } = makeService();
    await service.create(actor(), { ...fullCourse, type: SubscriptionType.SCHOLARSHIP, amountMinor: 0 });
    expect(ledger.postCharges).toHaveBeenCalledWith(expect.objectContaining({ charges: [] }));
  });

  it('accepts a FAMILY subscription with two siblings', async () => {
    const { service, created } = makeService();
    await service.create(actor(), {
      type: SubscriptionType.FAMILY,
      amountMinor: 80_000,
      currency: Currency.EGP,
      items: [
        { studentId: String(CHILD_A), groupId: String(GROUP_A) },
        { studentId: String(CHILD_B), groupId: String(GROUP_B) },
      ],
    });
    expect((created[0].items as unknown[]).length).toBe(2);
  });

  it('refuses a FAMILY subscription with only one child', async () => {
    const { service } = makeService();
    await expect(service.create(actor(), { ...fullCourse, type: SubscriptionType.FAMILY, amountMinor: 80_000 })).rejects.toThrow(
      new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS)
    );
  });

  it('refuses any non-FAMILY type with more than one item', async () => {
    const { service } = makeService();
    await expect(
      service.create(actor(), {
        ...fullCourse,
        items: [
          { studentId: String(CHILD_A), groupId: String(GROUP_A) },
          { studentId: String(CHILD_B), groupId: String(GROUP_B) },
        ],
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID));
  });

  it('refuses a FAMILY subscription spanning two different families', async () => {
    const { service } = makeService();
    const families = new Map([[String(CHILD_A), String(PARENT)], [String(CHILD_B), String(new Types.ObjectId())]]);
    // Replace the resolver with one that reports two families.
    (service as unknown as { families: { resolve: unknown } }).families = { resolve: async () => families };
    await expect(
      service.create(actor(), {
        type: SubscriptionType.FAMILY,
        amountMinor: 80_000,
        currency: Currency.EGP,
        items: [
          { studentId: String(CHILD_A), groupId: String(GROUP_A) },
          { studentId: String(CHILD_B), groupId: String(GROUP_B) },
        ],
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS));
  });

  it('refuses a negative or fractional amount', async () => {
    const { service } = makeService();
    for (const amountMinor of [-1, 10.5]) {
      await expect(service.create(actor(), { ...fullCourse, amountMinor })).rejects.toThrow(
        new BadRequestException(BillingErrors.AMOUNT_INVALID)
      );
    }
  });

  it('refuses a second active subscription for the same student and group', async () => {
    const { service } = makeService(true);
    await expect(service.create(actor(), fullCourse)).rejects.toThrow(
      new ConflictException(BillingErrors.SUBSCRIPTION_ALREADY_ACTIVE)
    );
  });

  it('refuses a student who is not in the group they are being subscribed to', async () => {
    const { service } = makeService();
    await expect(
      service.create(actor(), { ...fullCourse, items: [{ studentId: String(CHILD_B), groupId: String(GROUP_A) }] })
    ).rejects.toThrow(new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID));
  });

  it('404s on a group in another organization', async () => {
    const { service } = makeService();
    await expect(
      service.create(actor(), { ...fullCourse, items: [{ studentId: String(CHILD_A), groupId: String(new Types.ObjectId()) }] })
    ).rejects.toThrow(new NotFoundException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID));
  });
});

describe('SubscriptionService.end', () => {
  it('marks the subscription ended and stamps when', async () => {
    const { service, model } = makeService();
    await service.create(actor(), fullCourse);
    await service.end(actor(), String((model.create.mock.results[0].value as Promise<{ _id: Types.ObjectId }>) && 'x'));
    expect(model.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: BillingSubscriptionStatus.ACTIVE }),
      { $set: expect.objectContaining({ status: BillingSubscriptionStatus.ENDED, endedAt: expect.any(Date) }) }
    );
  });

  it('never changes the amount, so posted charges stay explicable', async () => {
    const { service, model } = makeService();
    await service.create(actor(), fullCourse);
    await service.end(actor(), 'x');
    const [, update] = model.updateOne.mock.calls[0];
    expect(update.$set).not.toHaveProperty('amountMinor');
  });
});
```

Two tests here reach into the service (`(service as unknown as …).families` and the `end` id) because the doubles are minimal. Replace both with the pattern the rest of the file uses — pass a purpose-built double into `makeService` for the two-families case, and capture the created `_id` from `created[0]._id` for `end` — before running. Record a `Ruling:` line noting the test-shape change.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest billing/subscription --runInBand`
Expected: FAIL — `Cannot find module './subscription.service'`.

- [ ] **Step 3: Write the DTOs**

Add to `apps/server/src/billing/dto/billing.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { ArrayMinSize, IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Currency, SubscriptionType } from '@darnozom/shared-types';

export class SubscriptionItemDto {
  @IsMongoId() studentId: string;
  @IsMongoId() groupId: string;
}

export class CreateSubscriptionPayload {
  @IsEnum(SubscriptionType) type: SubscriptionType;

  /** Integer minor units. 0 means a full scholarship. */
  @IsInt() @Min(0) amountMinor: number;

  @IsEnum(Currency) currency: Currency;

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => SubscriptionItemDto)
  items: SubscriptionItemDto[];

  @IsOptional() @IsString() note?: string;
}

export class CreateAdjustmentPayload {
  @IsMongoId() familyId: string;
  @IsInt() @Min(0) amountMinor: number;
  @IsIn([1, -1]) direction: 1 | -1;
  @IsEnum(Currency) currency: Currency;
  @IsString() @MinLength(1) reason: string;
  @IsOptional() @IsMongoId() studentId?: string;
  @IsOptional() @IsMongoId() groupId?: string;
}

export class FamilyIdPayload {
  @IsMongoId() familyId: string;
}

export class GroupIdPayload {
  @IsMongoId() groupId: string;
}
```

- [ ] **Step 4: Write the service**

Create `apps/server/src/billing/subscription/subscription.service.ts`. It:

1. loads the items' groups in the actor's organization (`NotFoundException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID)` if any is missing);
2. refuses an item whose student is not in that group's `students` array (`BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID)`);
3. refuses `amountMinor` that fails `isValidAmountMinor`;
4. requires `items.length >= 2` for `FAMILY` and exactly 1 otherwise;
5. resolves every item's family through `FamilyService.resolve` and refuses a `FAMILY` subscription whose items resolve to more than one family;
6. creates the document, mapping a duplicate-key error to `ConflictException(BillingErrors.SUBSCRIPTION_ALREADY_ACTIVE)`;
7. loads each item's cohort `startDate` through the group's `cohortId`, calls `initialCharges`, and passes the result to `LedgerService.postCharges` with `subscriptionId` set.

```ts
@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly families: FamilyService,
    private readonly ledger: LedgerService
  ) {}

  async create(actor: BillingActor, dto: CreateSubscriptionPayload): Promise<BillingSubscriptionLean> {
    if (!isValidAmountMinor(dto.amountMinor)) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);

    const expectedItems = dto.type === SubscriptionType.FAMILY ? 'many' : 'one';
    if (expectedItems === 'one' && dto.items.length !== 1) throw new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID);
    if (expectedItems === 'many' && dto.items.length < 2) {
      throw new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS);
    }

    const groups = await this.groupModel
      .find({ _id: { $in: dto.items.map((item) => oid(item.groupId)) }, organizationId: oid(actor.organizationId) })
      .lean<GroupForBilling[]>()
      .exec();
    const byId = new Map(groups.map((group) => [String(group._id), group]));
    if (byId.size !== new Set(dto.items.map((item) => item.groupId)).size) {
      throw new NotFoundException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID);
    }
    for (const item of dto.items) {
      const group = byId.get(item.groupId)!;
      // An accountant cannot subscribe a student who is not in the group — the charge would have
      // no lesson behind it.
      if (!group.students.some((student) => String(student.studentId) === item.studentId)) {
        throw new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID);
      }
    }

    const familyByStudent = await this.families.resolve(dto.items.map((item) => item.studentId));
    const familyIds = new Set(dto.items.map((item) => familyByStudent.get(item.studentId) ?? item.studentId));
    // One family per subscription: a shared charge across two families could never be settled.
    if (familyIds.size !== 1) throw new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS);
    const familyId = [...familyIds][0];

    let subscription: BillingSubscriptionLean;
    try {
      subscription = (await this.subscriptionModel.create({
        organizationId: oid(actor.organizationId),
        familyId: oid(familyId),
        items: dto.items.map((item) => ({ studentId: oid(item.studentId), groupId: oid(item.groupId) })),
        type: dto.type,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
        status: BillingSubscriptionStatus.ACTIVE,
        createdBy: oid(actor._id),
        note: dto.note,
      })) as unknown as BillingSubscriptionLean;
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictException(BillingErrors.SUBSCRIPTION_ALREADY_ACTIVE);
      }
      throw error;
    }

    const startDates = await this.startDatesFor(groups);
    await this.ledger.postCharges({
      organizationId: actor.organizationId,
      familyId,
      currency: dto.currency,
      createdBy: actor._id,
      subscriptionId: String(subscription._id),
      charges: initialCharges({
        subscriptionId: String(subscription._id),
        type: dto.type,
        amountMinor: dto.amountMinor,
        items: dto.items.map((item) => ({
          studentId: item.studentId,
          groupId: item.groupId,
          startDate: startDates.get(item.groupId) ?? new Date(),
        })),
      }),
    });

    return subscription;
  }
```

Write `startDatesFor`, `findForGroup`, `findForFamily` and `end` in the same file. `end` sets `status: ENDED` and `endedAt`, guarded on `status: ACTIVE`, and **never** touches `amountMinor` — the spec says the amount cannot change once charges are posted. Define `BillingActor` as `{ _id: string; organizationId: string; roleName: Roles; additionalRoles: Roles[] }` in `billing.types.ts` and reuse it across the module.

- [ ] **Step 5: Register the provider**

Add `SubscriptionService` to `providers`, and register the `Group`, `Cohort` and `User` schemas in `billing.module.ts`'s `MongooseModule.forFeature` list. Registering a schema is not importing the academics module, so no cycle is created.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter server exec jest billing/subscription --runInBand`
Expected: PASS, 13 tests.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/subscription/subscription.service.ts src/billing/subscription/subscription.service.spec.ts src/billing/dto/billing.dto.ts src/billing/billing.module.ts
git add apps/server/src/billing
git commit -m "feat(sp6): create tuition subscriptions and post their initial charges"
```

---

### Task 9: The payment method registry and receipt upload

**Files:**
- Create: `apps/server/src/billing/payment/payment-method.interface.ts`
- Create: `apps/server/src/billing/payment/payment-method.registry.ts`
- Create: `apps/server/src/billing/payment/methods/receipt-upload.method.ts`
- Modify: `apps/server/src/organization/entities/organization.entity.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Test: `apps/server/src/billing/payment/payment-method.registry.spec.ts`
- Test: `apps/server/src/billing/payment/methods/receipt-upload.method.spec.ts`

**Interfaces:**
- Consumes: `FamilyPayment` (Task 3), `PAYMENT_METHOD_RECEIPT_UPLOAD`.
- Produces:

```ts
export const FAMILY_PAYMENT_METHODS = Symbol('FAMILY_PAYMENT_METHODS');
export interface FamilyPaymentMethod {
  readonly key: string;
  isEnabled(org: OrganizationForBilling): boolean;
  initiate(input: InitiateInput): Promise<InitiateResult>;
}
export type InitiateResult = { kind: 'REDIRECT'; url: string; paymentId: string } | { kind: 'AWAIT_RECEIPT'; paymentId: string };
```
plus `FamilyPaymentMethodRegistry.get(key)` and `.listEnabled(org)`.

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/billing/payment/payment-method.registry.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { BillingErrors, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { FamilyPaymentMethod } from './payment-method.interface';
import { FamilyPaymentMethodRegistry } from './payment-method.registry';

const method = (key: string, enabled = true): FamilyPaymentMethod => ({
  key,
  isEnabled: () => enabled,
  initiate: async () => ({ kind: 'AWAIT_RECEIPT', paymentId: 'p1' }),
});

const org = { _id: 'o1', enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD] } as never;

describe('FamilyPaymentMethodRegistry', () => {
  it('returns a registered method by its key', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A'), method('B')]);
    expect(registry.get('B').key).toBe('B');
  });

  it('refuses an unknown key rather than returning undefined', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A')]);
    expect(() => registry.get('NOPE')).toThrow(new BadRequestException(BillingErrors.PAYMENT_METHOD_UNKNOWN));
  });

  it('lists only the methods the organization has switched on', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A', true), method('B', false)]);
    expect(registry.listEnabled(org).map((m) => m.key)).toEqual(['A']);
  });

  it('lists nothing when no method is enabled, rather than silently defaulting', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A', false)]);
    expect(registry.listEnabled(org)).toEqual([]);
  });

  it('accepts a method registered by a test, which is what proves the extension point works', () => {
    const fake = method('FAKE_BANK_TRANSFER');
    const registry = new FamilyPaymentMethodRegistry([method('A'), fake]);
    expect(registry.get('FAKE_BANK_TRANSFER')).toBe(fake);
    expect(registry.listEnabled(org).map((m) => m.key)).toContain('FAKE_BANK_TRANSFER');
  });

  it('survives an empty provider list', () => {
    const registry = new FamilyPaymentMethodRegistry([]);
    expect(registry.listEnabled(org)).toEqual([]);
  });
});
```

Create `apps/server/src/billing/payment/methods/receipt-upload.method.spec.ts`:

```ts
import { Currency, FamilyPaymentState, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ReceiptUploadMethod } from './receipt-upload.method';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYER = new Types.ObjectId();

const makeMethod = () => {
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
  };
  return { method: new ReceiptUploadMethod(model as never), created };
};

const input = {
  organizationId: String(ORG),
  familyId: String(FAMILY),
  amountMinor: 10_000,
  currency: Currency.EGP,
  payerId: String(PAYER),
};

describe('ReceiptUploadMethod', () => {
  it('is registered under the shared key', () => {
    const { method } = makeMethod();
    expect(method.key).toBe(PAYMENT_METHOD_RECEIPT_UPLOAD);
  });

  it('is enabled when the organization lists it', () => {
    const { method } = makeMethod();
    expect(method.isEnabled({ enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD] } as never)).toBe(true);
  });

  it('is disabled when the organization does not list it', () => {
    const { method } = makeMethod();
    expect(method.isEnabled({ enabledFamilyPaymentMethods: ['ONLINE_GATEWAY'] } as never)).toBe(false);
  });

  it('is enabled by default when the organization has no list at all', () => {
    const { method } = makeMethod();
    // Receipt upload is the fallback every academy can always use.
    expect(method.isEnabled({} as never)).toBe(true);
  });

  it('creates a payment awaiting its receipt and returns that intent', async () => {
    const { method, created } = makeMethod();
    const result = await method.initiate(input);
    expect(created[0]).toMatchObject({
      method: PAYMENT_METHOD_RECEIPT_UPLOAD,
      status: FamilyPaymentState.AWAITING_RECEIPT,
      amountMinor: 10_000,
      receiptFileKey: null,
    });
    expect(result).toEqual({ kind: 'AWAIT_RECEIPT', paymentId: String(created[0]._id) });
  });

  it('never writes a ledger entry: nothing is money until an accountant approves it', async () => {
    const { method, created } = makeMethod();
    await method.initiate(input);
    expect(created[0]).not.toHaveProperty('ledgerEntryId');
    expect(created[0].status).not.toBe(FamilyPaymentState.CONFIRMED);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest payment-method.registry receipt-upload --runInBand`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write the interface and the registry**

Create `apps/server/src/billing/payment/payment-method.interface.ts`:

```ts
import { Currency } from '@darnozom/shared-types';

/** DI token collecting every registered method. A new method is a new provider under this token. */
export const FAMILY_PAYMENT_METHODS = Symbol('FAMILY_PAYMENT_METHODS');

/** The slice of an organization a method needs. Keeps methods off the full document. */
export interface OrganizationForBilling {
  _id?: unknown;
  enabledFamilyPaymentMethods?: string[];
  academyFeeGatewayProvider?: string | null;
}

export interface InitiateInput {
  organizationId: string;
  familyId: string;
  amountMinor: number;
  currency: Currency;
  payerId: string;
  /** The payer's user document, when the method needs billing details (the gateway does). */
  payer?: unknown;
  meta?: Record<string, unknown>;
}

export type InitiateResult =
  | { kind: 'REDIRECT'; url: string; paymentId: string }
  | { kind: 'AWAIT_RECEIPT'; paymentId: string };

/**
 * A way for a family to pay. Billing code never names a concrete method: it asks the registry for
 * what the organization has enabled and calls `initiate`. Adding bank transfer, cash at the desk,
 * or a second gateway means writing one class and registering it — no change to billing logic.
 */
export interface FamilyPaymentMethod {
  readonly key: string;
  isEnabled(org: OrganizationForBilling): boolean;
  initiate(input: InitiateInput): Promise<InitiateResult>;
}
```

Create `apps/server/src/billing/payment/payment-method.registry.ts`:

```ts
import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { BillingErrors } from '@darnozom/shared-types';
import { FAMILY_PAYMENT_METHODS, FamilyPaymentMethod, OrganizationForBilling } from './payment-method.interface';

@Injectable()
export class FamilyPaymentMethodRegistry {
  private readonly byKey: Map<string, FamilyPaymentMethod>;

  constructor(@Optional() @Inject(FAMILY_PAYMENT_METHODS) methods: FamilyPaymentMethod[] = []) {
    this.byKey = new Map(methods.map((method) => [method.key, method]));
  }

  get(key: string): FamilyPaymentMethod {
    const method = this.byKey.get(key);
    if (!method) throw new BadRequestException(BillingErrors.PAYMENT_METHOD_UNKNOWN);
    return method;
  }

  /** What this organization offers a parent right now. */
  listEnabled(org: OrganizationForBilling): FamilyPaymentMethod[] {
    return [...this.byKey.values()].filter((method) => method.isEnabled(org));
  }
}
```

- [ ] **Step 4: Write the receipt method**

Create `apps/server/src/billing/payment/methods/receipt-upload.method.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FamilyPaymentState, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { FamilyPayment } from '../../entities/payment.entity';
import { FamilyPaymentMethod, InitiateInput, InitiateResult, OrganizationForBilling } from '../payment-method.interface';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class ReceiptUploadMethod implements FamilyPaymentMethod {
  readonly key = PAYMENT_METHOD_RECEIPT_UPLOAD;

  constructor(@InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>) {}

  /**
   * Enabled unless the organization has explicitly configured a list without it. Receipt upload is
   * the fallback every academy can use without integrating anything, so an unconfigured
   * organization must not be left with no way for a parent to pay.
   */
  isEnabled(org: OrganizationForBilling): boolean {
    const enabled = org.enabledFamilyPaymentMethods;
    return !Array.isArray(enabled) || enabled.length === 0 || enabled.includes(this.key);
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const payment = await this.paymentModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      method: this.key,
      amountMinor: input.amountMinor,
      currency: input.currency,
      // Nothing is money yet: no ledger entry exists until an accountant approves the receipt.
      status: FamilyPaymentState.AWAITING_RECEIPT,
      receiptFileKey: null,
      gatewayPaymentId: null,
      payerId: oid(input.payerId),
    });
    return { kind: 'AWAIT_RECEIPT', paymentId: String(payment._id) };
  }
}
```

- [ ] **Step 5: Add the organization settings**

In `apps/server/src/organization/entities/organization.entity.ts`, add:

```ts
  /** Which family payment methods this academy offers. Empty or unset means receipt upload only. */
  @Prop({ type: [String], default: [PAYMENT_METHOD_RECEIPT_UPLOAD] })
  enabledFamilyPaymentMethods: string[];

  /** Which configured provider the online gateway method uses for academy fees. */
  @Prop({ type: String, enum: Object.values(PaymentProvider), required: false, default: null })
  academyFeeGatewayProvider: PaymentProvider | null;
```

- [ ] **Step 6: Register the providers**

In `billing.module.ts`, register the `Organization` schema, add `ReceiptUploadMethod` and `FamilyPaymentMethodRegistry` to `providers`, and bind the token:

```ts
    {
      provide: FAMILY_PAYMENT_METHODS,
      // Every method registered here; the registry never names one itself.
      useFactory: (receipt: ReceiptUploadMethod, gateway: OnlineGatewayMethod) => [receipt, gateway],
      inject: [ReceiptUploadMethod, OnlineGatewayMethod],
    },
```

`OnlineGatewayMethod` arrives in Task 10. Until then bind only `ReceiptUploadMethod` and extend the factory in that task.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest payment-method.registry receipt-upload --runInBand`
Expected: PASS — 6 registry tests and 6 receipt tests.

- [ ] **Step 8: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/payment/payment-method.interface.ts src/billing/payment/payment-method.registry.ts src/billing/payment/methods/receipt-upload.method.ts src/billing/payment/payment-method.registry.spec.ts src/billing/payment/methods/receipt-upload.method.spec.ts src/organization/entities/organization.entity.ts src/billing/billing.module.ts
git add apps/server/src
git commit -m "feat(sp6): add the payment method registry and the receipt upload method"
```

---

### Task 10: The online gateway method and its webhook

**Files:**
- Create: `apps/server/src/billing/payment/methods/online-gateway.method.ts`
- Create: `apps/server/src/billing/payment/academy-fee-webhook.service.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Modify: `apps/server/src/payment/services/payment-orchestrator.service.ts`
- Test: `apps/server/src/billing/payment/methods/online-gateway.method.spec.ts`
- Test: `apps/server/src/billing/payment/academy-fee-webhook.service.spec.ts`

**Interfaces:**
- Consumes: the existing `PaymentOrchestratorService.createPaymentUrl`, `PaymentPurpose.ACADEMY_FEE` (Task 1), `LedgerService` (Task 7).
- Produces: `OnlineGatewayMethod` implementing `FamilyPaymentMethod`; `AcademyFeeWebhookService.onConfirmed(gatewayPaymentId: string, meta): Promise<boolean>`.

This task carries **Review Focus 3** (a webhook delivered twice).

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/billing/payment/academy-fee-webhook.service.spec.ts`:

```ts
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { AcademyFeeWebhookService } from './academy-fee-webhook.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYMENT = new Types.ObjectId();
const PAYER = new Types.ObjectId();

const payment = (status = FamilyPaymentState.AWAITING_RECEIPT) => ({
  _id: PAYMENT,
  organizationId: ORG,
  familyId: FAMILY,
  method: 'ONLINE_GATEWAY',
  amountMinor: 10_000,
  currency: Currency.EGP,
  status,
  gatewayPaymentId: 'gw-123',
  payerId: PAYER,
});

const makeService = (found: Record<string, unknown> | null, claimWins = true) => {
  const paymentModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => found }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: claimWins ? 1 : 0 }) })),
  };
  const ledger = { postPaymentAndAllocate: jest.fn(async () => ({ entry: { _id: new Types.ObjectId() }, allocated: 1, unallocatedMinor: 0 })) };
  const notifications = { create: jest.fn(async () => undefined) };
  return {
    service: new AcademyFeeWebhookService(paymentModel as never, ledger as never, notifications as never),
    paymentModel,
    ledger,
  };
};

describe('AcademyFeeWebhookService.onConfirmed', () => {
  it('confirms the payment and writes exactly one ledger entry', async () => {
    const { service, ledger } = makeService(payment());
    await expect(service.onConfirmed('gw-123')).resolves.toBe(true);
    expect(ledger.postPaymentAndAllocate).toHaveBeenCalledTimes(1);
    expect(ledger.postPaymentAndAllocate).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: String(PAYMENT), amountMinor: 10_000, currency: Currency.EGP })
    );
  });

  it('claims the payment with a status guard before posting any money', async () => {
    const { service, paymentModel } = makeService(payment());
    await service.onConfirmed('gw-123');
    const [filter, update] = paymentModel.updateOne.mock.calls[0];
    expect(filter).toMatchObject({ _id: PAYMENT, status: { $ne: FamilyPaymentState.CONFIRMED } });
    expect(update.$set.status).toBe(FamilyPaymentState.CONFIRMED);
  });

  it('does nothing on a second delivery of the same webhook', async () => {
    const { service, ledger } = makeService(payment(), false);
    await expect(service.onConfirmed('gw-123')).resolves.toBe(false);
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('does nothing for a payment already confirmed', async () => {
    const { service, ledger } = makeService(payment(FamilyPaymentState.CONFIRMED));
    await expect(service.onConfirmed('gw-123')).resolves.toBe(false);
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('does nothing for a gateway reference it does not know', async () => {
    const { service, ledger } = makeService(null);
    await expect(service.onConfirmed('gw-unknown')).resolves.toBe(false);
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });
});
```

Create `apps/server/src/billing/payment/methods/online-gateway.method.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { BillingErrors, Currency, FamilyPaymentState, PaymentProvider, PaymentPurpose, PAYMENT_METHOD_ONLINE_GATEWAY } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { OnlineGatewayMethod } from './online-gateway.method';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYER = new Types.ObjectId();

const makeMethod = (url = 'https://pay.example/checkout/abc', gatewayPaymentId = 'gw-123') => {
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const orgModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => ({ _id: ORG, academyFeeGatewayProvider: PaymentProvider.PAYMOB }) }) })),
  };
  const userModel = { findOne: jest.fn(() => ({ exec: async () => ({ _id: PAYER, email: 'p@example.com' }) })) };
  const orchestrator = { createPaymentUrl: jest.fn(async () => ({ paymentUrl: url, paymentId: gatewayPaymentId })) };
  return { method: new OnlineGatewayMethod(model as never, orgModel as never, userModel as never, orchestrator as never), created, orchestrator, model };
};

const input = {
  organizationId: String(ORG),
  familyId: String(FAMILY),
  amountMinor: 10_000,
  currency: Currency.EGP,
  payerId: String(PAYER),
};

describe('OnlineGatewayMethod', () => {
  it('is registered under the shared key', () => {
    expect(makeMethod().method.key).toBe(PAYMENT_METHOD_ONLINE_GATEWAY);
  });

  it('is enabled only when the organization lists it and names a provider', () => {
    const { method } = makeMethod();
    expect(method.isEnabled({ enabledFamilyPaymentMethods: [PAYMENT_METHOD_ONLINE_GATEWAY], academyFeeGatewayProvider: PaymentProvider.PAYMOB } as never)).toBe(true);
    expect(method.isEnabled({ enabledFamilyPaymentMethods: [PAYMENT_METHOD_ONLINE_GATEWAY] } as never)).toBe(false);
    expect(method.isEnabled({ academyFeeGatewayProvider: PaymentProvider.PAYMOB } as never)).toBe(false);
  });

  it('asks the existing orchestrator for a URL, under the academy-fee purpose', async () => {
    const { method, orchestrator } = makeMethod();
    await method.initiate(input);
    expect(orchestrator.createPaymentUrl).toHaveBeenCalledWith(
      expect.objectContaining({ provider: PaymentProvider.PAYMOB, purpose: PaymentPurpose.ACADEMY_FEE })
    );
  });

  it('converts minor units to the major amount the gateway expects', async () => {
    const { method, orchestrator } = makeMethod();
    await method.initiate(input);
    expect(orchestrator.createPaymentUrl.mock.calls[0][0].amount).toBe(100);
  });

  it('records the gateway reference on the payment, which is what the webhook matches', async () => {
    const { method, model } = makeMethod();
    await method.initiate(input);
    expect(model.updateOne).toHaveBeenCalledWith(expect.anything(), { $set: { gatewayPaymentId: 'gw-123' } });
  });

  it('returns a redirect the parent’s browser can follow', async () => {
    const { method, created } = makeMethod();
    await expect(method.initiate(input)).resolves.toEqual({
      kind: 'REDIRECT',
      url: 'https://pay.example/checkout/abc',
      paymentId: String(created[0]._id),
    });
  });

  it('starts the payment awaiting the gateway, never confirmed', async () => {
    const { method, created } = makeMethod();
    await method.initiate(input);
    expect(created[0].status).toBe(FamilyPaymentState.AWAITING_RECEIPT);
  });

  it('refuses to start when the organization has configured no provider', async () => {
    const { method } = makeMethod();
    (method as unknown as { orgModel: unknown }).orgModel = {
      findOne: () => ({ lean: () => ({ exec: async () => ({ _id: ORG, academyFeeGatewayProvider: null }) }) }),
    };
    await expect(method.initiate(input)).rejects.toThrow(new BadRequestException(BillingErrors.GATEWAY_NOT_CONFIGURED));
  });
});
```

The last test reassigns a private field; replace it with a second `makeMethod` parameter that controls the provider before running, and record a `Ruling:` line.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest online-gateway academy-fee-webhook --runInBand`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write the gateway method**

Create `apps/server/src/billing/payment/methods/online-gateway.method.ts`. It wraps the **existing** orchestrator rather than talking to any provider directly:

```ts
@Injectable()
export class OnlineGatewayMethod implements FamilyPaymentMethod {
  readonly key = PAYMENT_METHOD_ONLINE_GATEWAY;

  constructor(
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>,
    @InjectModel(Organization.name) private readonly orgModel: Model<Organization>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly orchestrator: PaymentOrchestratorService
  ) {}

  /** Both conditions matter: switched on, and a provider actually configured behind it. */
  isEnabled(org: OrganizationForBilling): boolean {
    return Boolean(org.enabledFamilyPaymentMethods?.includes(this.key)) && Boolean(org.academyFeeGatewayProvider);
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const org = await this.orgModel.findOne({ _id: oid(input.organizationId) }).lean<{ academyFeeGatewayProvider: PaymentProvider | null } | null>().exec();
    const provider = org?.academyFeeGatewayProvider;
    if (!provider) throw new BadRequestException(BillingErrors.GATEWAY_NOT_CONFIGURED);

    const payer = await this.userModel.findOne({ _id: oid(input.payerId) }).exec();
    if (!payer) throw new BadRequestException(BillingErrors.NOT_YOUR_FAMILY);

    const payment = await this.paymentModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      method: this.key,
      amountMinor: input.amountMinor,
      currency: input.currency,
      // Not confirmed until the webhook says the money arrived.
      status: FamilyPaymentState.AWAITING_RECEIPT,
      receiptFileKey: null,
      gatewayPaymentId: null,
      payerId: oid(input.payerId),
    });

    const response = await this.orchestrator.createPaymentUrl({
      provider,
      // The orchestrator and every provider work in major units; minor units stop at this boundary.
      amount: toMajor(input.amountMinor, input.currency),
      currency: input.currency,
      user: payer,
      purpose: PaymentPurpose.ACADEMY_FEE,
      metadata: { familyPaymentId: String(payment._id), familyId: input.familyId },
    } as never);

    const gatewayPaymentId = (response as { paymentId?: string }).paymentId ?? null;
    if (gatewayPaymentId) {
      await this.paymentModel.updateOne({ _id: payment._id }, { $set: { gatewayPaymentId } }).exec();
    }

    return { kind: 'REDIRECT', url: (response as { paymentUrl: string }).paymentUrl, paymentId: String(payment._id) };
  }
}
```

Open `apps/server/src/payment/services/payment-orchestrator.service.ts` and `CreatePaymentUrlDto` first and match the real argument names and the real response field names (`paymentUrl` / `redirectUrl`, `paymentId` / `id`). Adjust both the code and the test's double to the real shape, and record a `Ruling:` line naming what they are.

- [ ] **Step 4: Write the webhook handler**

Create `apps/server/src/billing/payment/academy-fee-webhook.service.ts`:

```ts
@Injectable()
export class AcademyFeeWebhookService {
  constructor(
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationService
  ) {}

  /**
   * Confirms a gateway payment. Returns false when there was nothing to do.
   *
   * Providers retry webhooks, so this must be safe to call any number of times. The status guard on
   * the claim is the gate: whoever flips the row from not-confirmed to confirmed is the one caller
   * that goes on to post money, and every later delivery sees `modifiedCount: 0` and stops.
   */
  async onConfirmed(gatewayPaymentId: string): Promise<boolean> {
    const payment = await this.paymentModel
      .findOne({ gatewayPaymentId })
      .lean<FamilyPaymentLean | null>()
      .exec();
    if (!payment) return false;
    if (payment.status === FamilyPaymentState.CONFIRMED) return false;

    const claim = await this.paymentModel
      .updateOne(
        { _id: payment._id, status: { $ne: FamilyPaymentState.CONFIRMED } },
        { $set: { status: FamilyPaymentState.CONFIRMED, reviewedAt: new Date() } }
      )
      .exec();
    if (claim.modifiedCount === 0) return false;

    await this.ledger.postPaymentAndAllocate({
      organizationId: String(payment.organizationId),
      familyId: String(payment.familyId),
      paymentId: String(payment._id),
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      createdBy: String(payment.payerId),
    });

    await this.notifications.create({
      userId: String(payment.familyId),
      titleKey: 'billingPaymentConfirmedTitle',
      bodyKey: 'billingPaymentConfirmedBody',
      data: { paymentId: String(payment._id) },
    });
    return true;
  }
}
```

The ledger's own `payment:<id>` idempotency key is the second line of defence: even if two callers passed the claim, only one ledger row could exist.

- [ ] **Step 5: Hook it into the existing webhook flow**

In `apps/server/src/payment/services/payment-orchestrator.service.ts`, find `processWebhook` and route a confirmed `ACADEMY_FEE` result to `AcademyFeeWebhookService.onConfirmed`. Read how `processWalletCreditWebhook` decides a webhook succeeded and follow the same test for success; do not invent a new one. If injecting the billing service into the payment module creates a cycle, inject it with `forwardRef` or route through the event bus the way `BILLING_LEDGER_CHANGED_EVENT` does, and record which you chose.

- [ ] **Step 6: Register the providers**

Add `OnlineGatewayMethod` and `AcademyFeeWebhookService` to `billing.module.ts`'s `providers`, extend the `FAMILY_PAYMENT_METHODS` factory from Task 9 to include the gateway, import the module that exports `PaymentOrchestratorService`, and export `AcademyFeeWebhookService`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest online-gateway academy-fee-webhook --runInBand`
Expected: PASS — 8 gateway tests and 5 webhook tests.

- [ ] **Step 8: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/payment/methods/online-gateway.method.ts src/billing/payment/academy-fee-webhook.service.ts src/billing/payment/methods/online-gateway.method.spec.ts src/billing/payment/academy-fee-webhook.service.spec.ts src/payment/services/payment-orchestrator.service.ts src/billing/billing.module.ts
git add apps/server/src
git commit -m "feat(sp6): pay academy fees through the existing gateway, idempotent on the webhook"
```

---

### Task 11: Receipts — upload, approve, reject

**Files:**
- Create: `apps/server/src/billing/payment/family-payment.service.ts`
- Modify: `apps/server/src/billing/dto/billing.dto.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Test: `apps/server/src/billing/payment/family-payment.service.spec.ts`

**Interfaces:**
- Consumes: `FamilyPaymentMethodRegistry` (Task 9), `LedgerService` (Task 7), `FamilyService` (Task 5), `FileService`, `NotificationService`.
- Produces: `FamilyPaymentService.listMethods(actor)`, `.initiate(actor, dto)`, `.attachReceipt(actor, paymentId, fileKey)`, `.reviewQueue(actor)`, `.approve(actor, paymentId)`, `.reject(actor, paymentId, reason)`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/billing/payment/family-payment.service.spec.ts`:

```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingErrors, Currency, FamilyPaymentState, Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { FamilyPaymentService } from './family-payment.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYMENT = new Types.ObjectId();
const ACCOUNTANT = new Types.ObjectId();

const actor = (id: Types.ObjectId, roleName: Roles) => ({
  _id: String(id),
  organizationId: String(ORG),
  roleName,
  additionalRoles: [] as Roles[],
});

const payment = (overrides: Record<string, unknown> = {}) => ({
  _id: PAYMENT,
  organizationId: ORG,
  familyId: FAMILY,
  method: 'RECEIPT_UPLOAD',
  amountMinor: 10_000,
  currency: Currency.EGP,
  status: FamilyPaymentState.PENDING_REVIEW,
  receiptFileKey: 'receipts/a.jpg',
  gatewayPaymentId: null,
  payerId: FAMILY,
  ...overrides,
});

const makeService = (found: Record<string, unknown> | null = payment(), claimWins = true) => {
  const paymentModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => found }) })),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => (found ? [found] : []) }) }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: claimWins ? 1 : 0 }) })),
  };
  const ledger = { postPaymentAndAllocate: jest.fn(async () => ({ entry: { _id: new Types.ObjectId() }, allocated: 1, unallocatedMinor: 0 })) };
  const registry = {
    get: jest.fn(() => ({ key: 'RECEIPT_UPLOAD', isEnabled: () => true, initiate: async () => ({ kind: 'AWAIT_RECEIPT', paymentId: String(PAYMENT) }) })),
    listEnabled: jest.fn(() => [{ key: 'RECEIPT_UPLOAD' }]),
  };
  const families = { canActorReadFamily: jest.fn(async () => true), resolve: jest.fn(async () => new Map()) };
  const orgModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => ({ _id: ORG, enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'] }) }) })) };
  const files = { fileExists: jest.fn(async () => true) };
  const notifications = { create: jest.fn(async () => undefined) };
  const service = new FamilyPaymentService(
    paymentModel as never,
    orgModel as never,
    registry as never,
    ledger as never,
    families as never,
    files as never,
    notifications as never
  );
  return { service, paymentModel, ledger, registry, families, notifications };
};

describe('FamilyPaymentService.listMethods', () => {
  it('lists what the organization has enabled', async () => {
    const { service, registry } = makeService();
    await expect(service.listMethods(actor(FAMILY, Roles.PARENT))).resolves.toEqual([{ key: 'RECEIPT_UPLOAD' }]);
    expect(registry.listEnabled).toHaveBeenCalled();
  });
});

describe('FamilyPaymentService.initiate', () => {
  it('refuses a method the organization has not enabled', async () => {
    const { service, registry } = makeService();
    registry.listEnabled.mockReturnValueOnce([]);
    await expect(
      service.initiate(actor(FAMILY, Roles.PARENT), { method: 'RECEIPT_UPLOAD', amountMinor: 10_000, currency: Currency.EGP })
    ).rejects.toThrow(new BadRequestException(BillingErrors.PAYMENT_METHOD_DISABLED));
  });

  it('refuses a zero or fractional amount', async () => {
    const { service } = makeService();
    for (const amountMinor of [0, 10.5, -1]) {
      await expect(
        service.initiate(actor(FAMILY, Roles.PARENT), { method: 'RECEIPT_UPLOAD', amountMinor, currency: Currency.EGP })
      ).rejects.toThrow(new BadRequestException(BillingErrors.AMOUNT_INVALID));
    }
  });

  it('pays into the caller’s own family, not one they name', async () => {
    const { service, registry } = makeService();
    const initiate = jest.fn(async () => ({ kind: 'AWAIT_RECEIPT' as const, paymentId: String(PAYMENT) }));
    registry.get.mockReturnValueOnce({ key: 'RECEIPT_UPLOAD', isEnabled: () => true, initiate } as never);
    await service.initiate(actor(FAMILY, Roles.PARENT), { method: 'RECEIPT_UPLOAD', amountMinor: 10_000, currency: Currency.EGP });
    expect(initiate).toHaveBeenCalledWith(expect.objectContaining({ familyId: String(FAMILY), payerId: String(FAMILY) }));
  });
});

describe('FamilyPaymentService.attachReceipt', () => {
  it('moves the payment to pending review', async () => {
    const { service, paymentModel } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT }));
    await service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), 'receipts/b.jpg');
    expect(paymentModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: PAYMENT }),
      { $set: { receiptFileKey: 'receipts/b.jpg', status: FamilyPaymentState.PENDING_REVIEW } }
    );
  });

  it('requires a file key', async () => {
    const { service } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT }));
    await expect(service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), '  ')).rejects.toThrow(
      new BadRequestException(BillingErrors.RECEIPT_REQUIRED)
    );
  });

  it('refuses a parent attaching to another family’s payment', async () => {
    const { service } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT, familyId: new Types.ObjectId() }));
    await expect(service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), 'receipts/b.jpg')).rejects.toThrow(
      new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY)
    );
  });

  it('refuses attaching to a confirmed payment', async () => {
    const { service } = makeService(payment({ status: FamilyPaymentState.CONFIRMED }));
    await expect(service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), 'receipts/b.jpg')).rejects.toThrow(
      new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE)
    );
  });
});

describe('FamilyPaymentService.approve', () => {
  it('writes exactly one ledger entry and notifies the family', async () => {
    const { service, ledger, notifications } = makeService();
    await service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT));
    expect(ledger.postPaymentAndAllocate).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ userId: String(FAMILY) }));
  });

  it('claims the payment before posting, so two accountants cannot both approve it', async () => {
    const { service, paymentModel } = makeService();
    await service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT));
    const [filter] = paymentModel.updateOne.mock.calls[0];
    expect(filter).toMatchObject({ _id: PAYMENT, status: FamilyPaymentState.PENDING_REVIEW });
  });

  it('posts nothing when it lost the race', async () => {
    const { service, ledger } = makeService(payment(), false);
    await expect(service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT))).rejects.toThrow(
      new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE)
    );
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('refuses a payment that is not awaiting review', async () => {
    const { service, ledger } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT }));
    await expect(service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT))).rejects.toThrow(
      new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE)
    );
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('404s on a payment in another organization', async () => {
    const { service } = makeService(null);
    await expect(service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT))).rejects.toThrow(
      new NotFoundException(BillingErrors.PAYMENT_NOT_FOUND)
    );
  });
});

describe('FamilyPaymentService.reject', () => {
  it('requires a reason', async () => {
    const { service } = makeService();
    await expect(service.reject(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT), ' ')).rejects.toThrow(
      new BadRequestException(BillingErrors.REJECT_REASON_REQUIRED)
    );
  });

  it('writes no ledger entry and notifies the family with the reason', async () => {
    const { service, ledger, notifications } = makeService();
    await service.reject(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT), 'Receipt is unreadable.');
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: String(FAMILY), params: expect.objectContaining({ reason: 'Receipt is unreadable.' }) })
    );
  });

  it('records who rejected it and when', async () => {
    const { service, paymentModel } = makeService();
    await service.reject(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT), 'No.');
    const [, update] = paymentModel.updateOne.mock.calls[0];
    expect(update.$set).toMatchObject({
      status: FamilyPaymentState.REJECTED,
      rejectReason: 'No.',
      reviewedBy: expect.anything(),
      reviewedAt: expect.any(Date),
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest family-payment.service --runInBand`
Expected: FAIL — `Cannot find module './family-payment.service'`.

- [ ] **Step 3: Write the DTOs**

Add to `apps/server/src/billing/dto/billing.dto.ts`:

```ts
export class InitiatePaymentPayload {
  @IsString() @MinLength(1) method: string;
  @IsInt() @Min(1) amountMinor: number;
  @IsEnum(Currency) currency: Currency;
}

export class AttachReceiptPayload {
  @IsMongoId() paymentId: string;
  @IsString() @MinLength(1) fileKey: string;
}

export class ReviewPaymentPayload {
  @IsMongoId() paymentId: string;
}

export class RejectPaymentPayload extends ReviewPaymentPayload {
  @IsString() @MinLength(1) reason: string;
}
```

- [ ] **Step 4: Write the service**

Create `apps/server/src/billing/payment/family-payment.service.ts` implementing the six methods. The shape of each:

- `listMethods(actor)` loads the organization and returns `registry.listEnabled(org).map(({ key }) => ({ key }))`.
- `initiate(actor, dto)` validates `isValidAmountMinor(dto.amountMinor) && dto.amountMinor > 0`, checks the method is in `listEnabled`, then calls `registry.get(dto.method).initiate({ … familyId: actor._id, payerId: actor._id … })`. **The family is always the caller's own**, never a value from the payload.
- `attachReceipt(actor, paymentId, fileKey)` loads the payment in the organization, refuses unless `families.canActorReadFamily(actor, familyId)` **and** the status is `AWAITING_RECEIPT` or `PENDING_REVIEW`, then sets `receiptFileKey` and `PENDING_REVIEW`.
- `reviewQueue(actor)` returns `PENDING_REVIEW` payments in the organization, oldest first.
- `approve(actor, paymentId)` loads, requires `PENDING_REVIEW`, claims with `updateOne({ _id, status: PENDING_REVIEW }, { $set: { status: CONFIRMED, reviewedBy, reviewedAt } })`, throws `ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE)` on `modifiedCount === 0`, then posts through the ledger and notifies the family.
- `reject(actor, paymentId, reason)` requires a trimmed reason, claims the same way with `REJECTED` and `rejectReason`, writes **no** ledger entry, and notifies the family with the reason as a param.

```ts
  /**
   * The claim-then-post order is the whole safety property: the status guard decides which caller
   * owns this payment, and only that caller writes money. Posting first and claiming after would
   * let two accountants both credit the family.
   */
  async approve(actor: BillingActor, paymentId: string): Promise<void> {
    const payment = await this.load(actor, paymentId);
    if (payment.status !== FamilyPaymentState.PENDING_REVIEW) {
      throw new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE);
    }

    const claim = await this.paymentModel
      .updateOne(
        { _id: payment._id, status: FamilyPaymentState.PENDING_REVIEW },
        { $set: { status: FamilyPaymentState.CONFIRMED, reviewedBy: oid(actor._id), reviewedAt: new Date() } }
      )
      .exec();
    if (claim.modifiedCount === 0) throw new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE);

    await this.ledger.postPaymentAndAllocate({
      organizationId: String(payment.organizationId),
      familyId: String(payment.familyId),
      paymentId: String(payment._id),
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      createdBy: actor._id,
    });

    await this.notifications.create({
      userId: String(payment.familyId),
      titleKey: 'billingPaymentApprovedTitle',
      bodyKey: 'billingPaymentApprovedBody',
      data: { paymentId: String(payment._id) },
    });
  }
```

- [ ] **Step 5: Register the provider**

Add `FamilyPaymentService` to the `providers` of `billing.module.ts`, and make sure `FileService` and `NotificationService` are reachable — import `FileModule` and `NotificationModule`, adding `NotificationService` to the latter's `exports` if it is not exported.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter server exec jest family-payment.service --runInBand`
Expected: PASS, 15 tests.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/billing/payment/family-payment.service.ts src/billing/payment/family-payment.service.spec.ts src/billing/dto/billing.dto.ts src/billing/billing.module.ts
git add apps/server/src/billing
git commit -m "feat(sp6): upload, approve and reject payment receipts"
```

---
### Task 12: Derived payment status, replacing the manual toggle

**Files:**
- Create: `apps/server/src/billing/domain/payment-status.ts`
- Create: `apps/server/src/billing/status/family-payment-status.service.ts`
- Create: `apps/server/src/academics/events/billing-ledger.listener.ts`
- Modify: `apps/server/src/academics/group/group-state.service.ts`
- Modify: `apps/server/src/academics/group/group.controller.message.ts`
- Modify: `apps/server/src/academics/group/group-students.service.ts`
- Modify: `apps/server/src/academics/group/dto/group.dto.ts`
- Modify: `apps/server/src/academics/academics.module.ts`
- Modify: `apps/server/src/role/seeds/role.manager.config.ts`, `role.accountant.config.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Test: `apps/server/src/billing/domain/payment-status.spec.ts`
- Test: `apps/server/src/billing/status/family-payment-status.service.spec.ts`
- Test: `apps/server/src/academics/group/group-derived-payment.spec.ts`

**Interfaces:**
- Consumes: `LedgerService.openCharges` (Task 7), `BillingSubscription` (Task 3), `FamilyService` (Task 5).
- Produces: `isStudentPaid(input): boolean` (pure); `FamilyPaymentStatusService.forGroup(groupId, studentIds, now?): Promise<Map<string, FamilyPaymentStatus>>`; `GroupStateService.withDerivedPaymentStatus(group): Promise<GroupLean>`.

This task carries **Review Focus 2** (a withdrawn student) and **Review Focus 5** (a zero-amount scholarship).

**This task removes the sub-project 1 manual toggle.** After it, `PATCH …/payment-status` does not exist, `Subjects.GROUP_PAYMENT_STATUS` is gone, and the value shown on the group comes from the ledger only.

- [ ] **Step 1: Write the failing pure test**

Create `apps/server/src/billing/domain/payment-status.spec.ts`:

```ts
import { Currency, FamilyPaymentStatus, SubscriptionType } from '@darnozom/shared-types';
import { isStudentPaid, PaidInput } from './payment-status';

const NOW = new Date('2026-03-20T00:00:00.000Z');
const DUE_PAST = new Date('2026-03-01T00:00:00.000Z');
const DUE_FUTURE = new Date('2026-06-01T00:00:00.000Z');
const COHORT_START = new Date('2026-04-01T00:00:00.000Z');

const input = (overrides: Partial<PaidInput> = {}): PaidInput => ({
  hasActiveSubscription: true,
  subscriptionAmountMinor: 50_000,
  cohortStartDate: COHORT_START,
  charges: [{ amountMinor: 10_000, allocatedMinor: 10_000, dueAt: DUE_PAST, currency: Currency.EGP }],
  now: NOW,
  ...overrides,
});

describe('isStudentPaid', () => {
  it('is unpaid without an active subscription, whatever the ledger says', () => {
    expect(isStudentPaid(input({ hasActiveSubscription: false, charges: [] }))).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('is paid when every due charge is fully covered', () => {
    expect(isStudentPaid(input())).toBe(FamilyPaymentStatus.PAID);
  });

  it('is unpaid when a due charge is only partly covered', () => {
    expect(
      isStudentPaid(input({ charges: [{ amountMinor: 10_000, allocatedMinor: 4_000, dueAt: DUE_PAST, currency: Currency.EGP }] }))
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('is unpaid when a due charge is not covered at all', () => {
    expect(
      isStudentPaid(input({ charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: DUE_PAST, currency: Currency.EGP }] }))
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('ignores a charge that is not due yet and does not fall at the cohort start', () => {
    expect(
      isStudentPaid(input({ charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: DUE_FUTURE, currency: Currency.EGP }] }))
    ).toBe(FamilyPaymentStatus.PAID);
  });

  it('counts a charge due at the cohort start even though the start is still ahead', () => {
    // "already due, or due at the cohort start" — the group cannot begin with this unpaid.
    expect(
      isStudentPaid(input({ charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: COHORT_START, currency: Currency.EGP }] }))
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('is paid for a full scholarship, which has no charges at all', () => {
    expect(isStudentPaid(input({ subscriptionAmountMinor: 0, charges: [] }))).toBe(FamilyPaymentStatus.PAID);
  });

  it('is paid when the charges total zero, without dividing by anything', () => {
    expect(
      isStudentPaid(input({ subscriptionAmountMinor: 0, charges: [{ amountMinor: 0, allocatedMinor: 0, dueAt: DUE_PAST, currency: Currency.EGP }] }))
    ).toBe(FamilyPaymentStatus.PAID);
  });

  it('is paid with an active subscription and no charges posted yet', () => {
    expect(isStudentPaid(input({ charges: [] }))).toBe(FamilyPaymentStatus.PAID);
  });

  it('is unpaid when any one of several due charges is short', () => {
    expect(
      isStudentPaid(
        input({
          charges: [
            { amountMinor: 10_000, allocatedMinor: 10_000, dueAt: DUE_PAST, currency: Currency.EGP },
            { amountMinor: 10_000, allocatedMinor: 9_999, dueAt: DUE_PAST, currency: Currency.EGP },
          ],
        })
      )
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('treats a charge with no due date as due, so it cannot hide behind a null', () => {
    expect(
      isStudentPaid(input({ charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: null, currency: Currency.EGP }] }))
    ).toBe(FamilyPaymentStatus.UNPAID);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest billing/domain/payment-status --runInBand`
Expected: FAIL — `Cannot find module './payment-status'`.

- [ ] **Step 3: Write the pure rule**

Create `apps/server/src/billing/domain/payment-status.ts`:

```ts
import { Currency, FamilyPaymentStatus } from '@darnozom/shared-types';

export interface ChargeForStatus {
  amountMinor: number;
  allocatedMinor: number;
  dueAt: Date | null;
  currency: Currency;
}

export interface PaidInput {
  hasActiveSubscription: boolean;
  subscriptionAmountMinor: number;
  /** The start date of the cohort behind the group, so a charge due then already counts. */
  cohortStartDate: Date | null;
  charges: ChargeForStatus[];
  now: Date;
}

/**
 * A student counts as paid when they have an active subscription in the group and every charge of
 * theirs that is already due — or due at the cohort start — is fully covered.
 *
 * A charge due later than the cohort start is not yet the group's problem: a monthly subscription
 * would otherwise be permanently unpaid, and the group could never reach readiness.
 */
export function isStudentPaid(input: PaidInput): FamilyPaymentStatus {
  if (!input.hasActiveSubscription) return FamilyPaymentStatus.UNPAID;

  const relevant = input.charges.filter((charge) => {
    // A charge with no due date is treated as due now; a null must never be a way to defer money.
    if (charge.dueAt === null) return true;
    if (charge.dueAt.getTime() <= input.now.getTime()) return true;
    return input.cohortStartDate !== null && charge.dueAt.getTime() <= input.cohortStartDate.getTime();
  });

  const covered = relevant.every((charge) => charge.allocatedMinor >= charge.amountMinor);
  return covered ? FamilyPaymentStatus.PAID : FamilyPaymentStatus.UNPAID;
}
```

A full scholarship needs no special case: it posts no charge, so `relevant` is empty and `every` is vacuously true.

- [ ] **Step 4: Write the status service**

Create `apps/server/src/billing/status/family-payment-status.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingSubscriptionStatus, FamilyPaymentStatus, LedgerEntryType } from '@darnozom/shared-types';
import { Allocation } from '../entities/allocation.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { BillingSubscription } from '../entities/subscription.entity';
import { ChargeForStatus, isStudentPaid } from '../domain/payment-status';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

/**
 * The read-only face billing presents to academics. Academics injects this directly; billing never
 * imports academics, which is what keeps the two acyclic (plan decision D3).
 */
@Injectable()
export class FamilyPaymentStatusService {
  constructor(
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name) private readonly allocationModel: Model<Allocation>
  ) {}

  /** studentId → PAID/UNPAID for one group, in a fixed number of queries whatever the roster size. */
  async forGroup(
    groupId: string | Types.ObjectId,
    studentIds: string[],
    cohortStartDate: Date | null,
    now: Date = new Date()
  ): Promise<Map<string, FamilyPaymentStatus>> {
    const result = new Map<string, FamilyPaymentStatus>();
    if (studentIds.length === 0) return result;

    const subscriptions = await this.subscriptionModel
      .find({
        status: BillingSubscriptionStatus.ACTIVE,
        'items.groupId': oid(groupId),
        'items.studentId': { $in: studentIds.map(oid) },
      })
      .lean<{ _id: Types.ObjectId; amountMinor: number; items: { studentId: Types.ObjectId; groupId: Types.ObjectId }[] }[]>()
      .exec();

    const subscriptionByStudent = new Map<string, { amountMinor: number }>();
    for (const subscription of subscriptions) {
      for (const item of subscription.items) {
        if (String(item.groupId) !== String(groupId)) continue;
        subscriptionByStudent.set(String(item.studentId), { amountMinor: subscription.amountMinor });
      }
    }

    const charges = await this.entryModel
      .find({ groupId: oid(groupId), type: LedgerEntryType.CHARGE, studentId: { $in: studentIds.map(oid) } })
      .lean<{ _id: Types.ObjectId; studentId: Types.ObjectId; amountMinor: number; dueAt: Date | null; currency: never }[]>()
      .exec();

    const allocated = await this.allocationModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { chargeLedgerEntryId: { $in: charges.map((charge) => charge._id) } } },
      { $group: { _id: '$chargeLedgerEntryId', total: { $sum: '$amountMinor' } } },
    ]);
    const allocatedByCharge = new Map(allocated.map((row) => [String(row._id), row.total]));

    const chargesByStudent = new Map<string, ChargeForStatus[]>();
    for (const charge of charges) {
      const key = String(charge.studentId);
      const list = chargesByStudent.get(key) ?? [];
      list.push({
        amountMinor: charge.amountMinor,
        allocatedMinor: allocatedByCharge.get(String(charge._id)) ?? 0,
        dueAt: charge.dueAt,
        currency: charge.currency,
      });
      chargesByStudent.set(key, list);
    }

    for (const studentId of studentIds) {
      const subscription = subscriptionByStudent.get(studentId);
      result.set(
        studentId,
        isStudentPaid({
          hasActiveSubscription: subscription !== undefined,
          subscriptionAmountMinor: subscription?.amountMinor ?? 0,
          cohortStartDate,
          charges: chargesByStudent.get(studentId) ?? [],
          now,
        })
      );
    }
    return result;
  }
}
```

A `FAMILY` charge has `studentId: null`, so it does not appear in the per-student query above. Write a test in `family-payment-status.service.spec.ts` asserting the behaviour you implement for it, and add the family case: look up the student's subscription type, and when it is `FAMILY`, read the subscription's single charge by `subscriptionId` instead of by `studentId`. Record how you did it as a `Ruling:` line — the spec says each item counts as covered once the single family charge is covered, which is exactly this.

- [ ] **Step 5: Write the status service test**

Create `apps/server/src/billing/status/family-payment-status.service.spec.ts` with at least these cases, built the way the other billing service specs build their doubles:

- a student with an active subscription and a fully covered due charge is `PAID`;
- the same student with a partly covered charge is `UNPAID`;
- a student with no subscription at all is `UNPAID`;
- a student on a zero-amount scholarship with no charges is `PAID`;
- a `FAMILY` subscription's two children are both `PAID` once the one family charge is covered, and both `UNPAID` while it is short;
- a student listed in `studentIds` who has no rows anywhere still gets an entry in the returned map rather than being absent.

- [ ] **Step 6: Overlay the derived value in academics**

In `apps/server/src/academics/group/group-state.service.ts`, inject `FamilyPaymentStatusService` and `@InjectModel(Cohort.name)`, then add:

```ts
  /**
   * Replaces the group's stored `students[].paymentStatus` with the value derived from the ledger,
   * so `computeReadiness` stays a pure function reading a field while the field itself is now a
   * fact about money rather than something a person toggled (plan decision D4).
   */
  async withDerivedPaymentStatus(group: GroupLean): Promise<GroupLean> {
    if (group.students.length === 0) return group;
    const cohort = await this.cohortModel.findOne({ _id: group.cohortId }).lean<{ startDate: Date } | null>().exec();
    const statuses = await this.paymentStatus.forGroup(
      group._id,
      group.students.map((student) => String(student.studentId)),
      cohort?.startDate ?? null
    );
    return {
      ...group,
      students: group.students.map((student) => ({
        ...student,
        paymentStatus: statuses.get(String(student.studentId)) ?? student.paymentStatus,
      })),
    };
  }
```

Then make `toView` and `syncReadiness` both go through it. `toView` is currently synchronous; make it `async` and fix every caller the compiler flags. In `syncReadiness`, derive before computing:

```ts
    const derived = await this.withDerivedPaymentStatus(group);
    const readiness = computeReadiness(derived);
```

- [ ] **Step 7: Listen for ledger changes**

Create `apps/server/src/academics/events/billing-ledger.listener.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BILLING_LEDGER_CHANGED_EVENT, BillingLedgerChangedPayload } from 'src/billing/events/billing.events';
import { GroupStateService } from '../group/group-state.service';

@Injectable()
export class BillingLedgerListener {
  private readonly logger = new Logger(BillingLedgerListener.name);

  constructor(private readonly groupState: GroupStateService) {}

  /**
   * Money moved, so a group's PAYMENTS_MADE item may have changed. Re-evaluating readiness here is
   * what also closes the sub-project 3 pre-start task, since `syncReadiness` is the single hook
   * both features hang off.
   */
  @OnEvent(BILLING_LEDGER_CHANGED_EVENT)
  async onLedgerChanged(payload: BillingLedgerChangedPayload): Promise<void> {
    for (const groupId of payload.groupIds) {
      try {
        await this.groupState.syncReadiness(groupId);
      } catch (error) {
        // A readiness refresh that fails must never fail the payment that triggered it.
        this.logger.error(`Readiness refresh failed for group ${groupId}: ${(error as Error).message}`);
      }
    }
  }
}
```

Register `BillingLedgerListener` in `academics.module.ts`'s `providers`, and import `BillingModule` there so `FamilyPaymentStatusService` resolves. Export `FamilyPaymentStatusService` from `billing.module.ts`. Billing must **not** import academics — if you find yourself adding that import, the direction is wrong.

- [ ] **Step 8: Remove the manual toggle**

- In `group.controller.message.ts`, delete the `academics.groups.setPaymentStatus` handler.
- In `group-students.service.ts`, delete the method behind it.
- In `dto/group.dto.ts`, delete `PaymentStatusPayload`.
- Delete `GROUP_PAYMENT_STATUS` from `Subjects`.
- Remove `{ action: Actions.MANAGE, subject: Subjects.GROUP_PAYMENT_STATUS }` from `MANAGER_PERMISSIONS` and `ACCOUNTANT_PERMISSIONS`, and add `{ action: Actions.READ, subject: Subjects.BILLING }` to the manager and `{ action: Actions.MANAGE, subject: Subjects.BILLING }` plus `{ action: Actions.MANAGE, subject: Subjects.FAMILY_PAYMENT }` to the accountant.
- Delete the client hook and the UI control that called it; Task 17 replaces that cell with the derived value.
- Delete any existing test that asserts the toggle works, and add to `roles.config.spec.ts`:

```ts
  it('no longer grants the removed manual payment-status subject', () => {
    for (const seed of ROLE_SEED_DEFINITIONS) {
      expect(seed.permissions.some((rule) => String(rule.subject) === 'GROUP_PAYMENT_STATUS')).toBe(false);
    }
  });
```

Then grep to be sure nothing still references it, and record the output:

```bash
cd C:/COURSES/work/darnozom/academy && grep -rn "GROUP_PAYMENT_STATUS\|setPaymentStatus\|payment-status" apps lib --include=*.ts --include=*.tsx | grep -v node_modules
```

- [ ] **Step 9: Write the academics overlay test**

Create `apps/server/src/academics/group/group-derived-payment.spec.ts`:

```ts
import { FamilyPaymentStatus, GroupPaymentStatus, GroupStudentStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { computeReadiness } from '../domain/readiness';

const ACTIVE = new Types.ObjectId();
const WITHDRAWN = new Types.ObjectId();

describe('readiness over the derived payment status', () => {
  it('is ready when every active student is paid', () => {
    const group = {
      teacherId: new Types.ObjectId(),
      minStudents: 1,
      students: [{ studentId: ACTIVE, paymentStatus: FamilyPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
      contentSent: { done: true },
      meetingLink: 'https://meet.example/a',
    };
    expect(computeReadiness(group).ready).toBe(true);
  });

  it('is not ready while an active student is unpaid', () => {
    const group = {
      teacherId: new Types.ObjectId(),
      minStudents: 1,
      students: [{ studentId: ACTIVE, paymentStatus: FamilyPaymentStatus.UNPAID, status: GroupStudentStatus.ACTIVE }],
      contentSent: { done: true },
      meetingLink: 'https://meet.example/a',
    };
    expect(computeReadiness(group).ready).toBe(false);
  });

  it('ignores a withdrawn student who never paid, so one leaver cannot freeze a group', () => {
    const group = {
      teacherId: new Types.ObjectId(),
      minStudents: 1,
      students: [
        { studentId: ACTIVE, paymentStatus: FamilyPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE },
        { studentId: WITHDRAWN, paymentStatus: FamilyPaymentStatus.UNPAID, status: GroupStudentStatus.WITHDRAWN },
      ],
      contentSent: { done: true },
      meetingLink: 'https://meet.example/a',
    };
    expect(computeReadiness(group).ready).toBe(true);
  });

  it('reads the same two values the group schema already used, so the enum change is a rename only', () => {
    expect(FamilyPaymentStatus.PAID).toBe(GroupPaymentStatus.PAID);
    expect(FamilyPaymentStatus.UNPAID).toBe(GroupPaymentStatus.UNPAID);
  });
});
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest billing src/academics roles.config --runInBand`
Expected: PASS. `toView` becoming async will break several existing group and session specs at the call site; `await` them and leave their assertions alone. Read each failure before changing anything.

- [ ] **Step 11: Apply the role changes**

Run: `pnpm --filter server seed:prod`
Expected: completes without error. **Never run `pnpm seed`.**

- [ ] **Step 12: Lint and commit**

Lint each touched file by name, then:

```bash
git add apps lib
git commit -m "feat(sp6): derive a student's payment status from the ledger and remove the manual toggle"
```

---

### Task 13: Recurring and per-session charges

**Files:**
- Create: `apps/server/src/billing/jobs/monthly-charges.service.ts`
- Create: `apps/server/src/billing/jobs/session-charges.service.ts`
- Modify: `apps/server/src/academics/session/session-completion.service.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Test: `apps/server/src/billing/jobs/monthly-charges.service.spec.ts`
- Test: `apps/server/src/billing/jobs/session-charges.service.spec.ts`

**Interfaces:**
- Consumes: `monthlyChargeDueDates`, `monthlyIdempotencyKey`, `perSessionIdempotencyKey` (Task 4), `LedgerService.postCharges` (Task 7).
- Produces: `MonthlyChargesService.run(now): Promise<number>`; `SessionChargesService.onSessionCompleted(sessionId): Promise<number>`.

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/billing/jobs/session-charges.service.spec.ts`:

```ts
import { AttendanceStatus, BillingSubscriptionStatus, Currency, GroupStudentStatus, SessionStatus, SubscriptionType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { perSessionIdempotencyKey } from '../domain/charge-schedule';
import { SessionChargesService } from './session-charges.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const SUB = new Types.ObjectId();
const PRESENT = new Types.ObjectId();
const ABSENT = new Types.ObjectId();
const LEAVER = new Types.ObjectId();
const FAMILY = new Types.ObjectId();

const session = (status = SessionStatus.COMPLETED) => ({
  _id: SESSION,
  organizationId: ORG,
  groupId: GROUP,
  status,
  attendance: [
    { studentId: PRESENT, status: AttendanceStatus.PRESENT },
    { studentId: ABSENT, status: AttendanceStatus.ABSENT },
  ],
});

const makeService = (sessionDoc: Record<string, unknown> | null = session(), subscriptions = [
  { _id: SUB, familyId: FAMILY, amountMinor: 2_000, currency: Currency.EGP, type: SubscriptionType.PER_SESSION, status: BillingSubscriptionStatus.ACTIVE, items: [{ studentId: PRESENT, groupId: GROUP }] },
  { _id: new Types.ObjectId(), familyId: FAMILY, amountMinor: 2_000, currency: Currency.EGP, type: SubscriptionType.PER_SESSION, status: BillingSubscriptionStatus.ACTIVE, items: [{ studentId: ABSENT, groupId: GROUP }] },
]) => {
  const sessionModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => sessionDoc }) })) };
  const groupModel = {
    findOne: jest.fn(() => ({
      lean: () => ({
        exec: async () => ({
          _id: GROUP,
          organizationId: ORG,
          students: [
            { studentId: PRESENT, status: GroupStudentStatus.ACTIVE },
            { studentId: ABSENT, status: GroupStudentStatus.ACTIVE },
            { studentId: LEAVER, status: GroupStudentStatus.WITHDRAWN },
          ],
        }),
      }),
    })),
  };
  const subscriptionModel = { find: jest.fn(() => ({ lean: () => ({ exec: async () => subscriptions }) })) };
  const ledger = { postCharges: jest.fn(async (input: { charges: unknown[] }) => input.charges) };
  const service = new SessionChargesService(sessionModel as never, groupModel as never, subscriptionModel as never, ledger as never);
  return { service, ledger };
};

describe('SessionChargesService.onSessionCompleted', () => {
  it('charges a student who attended', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { studentId: string }[] }).charges);
    expect(charged.map((charge) => charge.studentId)).toContain(String(PRESENT));
  });

  it('charges a student who was absent, because a reserved seat is billable', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { studentId: string }[] }).charges);
    expect(charged.map((charge) => charge.studentId)).toContain(String(ABSENT));
  });

  it('does not charge a withdrawn student', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { studentId: string }[] }).charges);
    expect(charged.map((charge) => charge.studentId)).not.toContain(String(LEAVER));
  });

  it('charges nothing for a cancelled session', async () => {
    const { service, ledger } = makeService(session(SessionStatus.CANCELLED));
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('charges nothing for a session that has not completed', async () => {
    const { service, ledger } = makeService(session(SessionStatus.REPORT_PENDING));
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('charges only PER_SESSION subscriptions', async () => {
    const { service, ledger } = makeService(session(), [
      { _id: SUB, familyId: FAMILY, amountMinor: 50_000, currency: Currency.EGP, type: SubscriptionType.FULL_COURSE, status: BillingSubscriptionStatus.ACTIVE, items: [{ studentId: PRESENT, groupId: GROUP }] },
    ]);
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('keys each charge on the subscription, session and student, so a replay posts nothing', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { idempotencyKey: string }[] }).charges);
    expect(charged.map((charge) => charge.idempotencyKey)).toContain(
      perSessionIdempotencyKey(String(SUB), String(SESSION), String(PRESENT))
    );
  });

  it('dues a per-session charge immediately', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { dueAt: Date }[] }).charges);
    expect(charged[0].dueAt).toBeInstanceOf(Date);
  });

  it('returns 0 for a session it cannot find', async () => {
    const { service, ledger } = makeService(null);
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });
});
```

Create `apps/server/src/billing/jobs/monthly-charges.service.spec.ts` covering:

- an `ACTIVE` `MONTHLY` subscription whose group is `RUNNING` and whose cohort started two months ago posts two charges, one per month, each with its own `monthlyIdempotencyKey`;
- a second run posts nothing new (the ledger's key skip is relied on; assert `postCharges` is called with the same keys and that the service does not filter them itself);
- a subscription whose group is not `RUNNING` posts nothing;
- an `ENDED` subscription posts nothing;
- a `FULL_COURSE` subscription posts nothing;
- a withdrawn student posts nothing (plan decision D6);
- a group with an unreadable timezone is skipped and the rest still post.

Build the doubles the way the other job specs do.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest billing/jobs --runInBand`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write `SessionChargesService`**

```ts
@Injectable()
export class SessionChargesService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Posts one charge per per-session subscription in the group.
   *
   * Every student on the roster is billed, present or absent: the seat was reserved and the teacher
   * is paid for a session that was held (spec decision D1). A withdrawn student is not on the
   * roster any more, so they are not billed (plan decision D6).
   */
  async onSessionCompleted(sessionId: string): Promise<number> {
    const session = await this.sessionModel.findOne({ _id: oid(sessionId) }).lean<SessionForBilling | null>().exec();
    if (!session || session.status !== SessionStatus.COMPLETED) return 0;

    const group = await this.groupModel.findOne({ _id: session.groupId }).lean<GroupForBilling | null>().exec();
    if (!group) return 0;

    const activeStudentIds = new Set(
      group.students.filter((student) => student.status !== GroupStudentStatus.WITHDRAWN).map((student) => String(student.studentId))
    );

    const subscriptions = await this.subscriptionModel
      .find({
        status: BillingSubscriptionStatus.ACTIVE,
        type: SubscriptionType.PER_SESSION,
        'items.groupId': session.groupId,
      })
      .lean<BillingSubscriptionLean[]>()
      .exec();

    let posted = 0;
    const now = new Date();
    for (const subscription of subscriptions) {
      if (subscription.amountMinor <= 0) continue;
      for (const item of subscription.items) {
        if (String(item.groupId) !== String(session.groupId)) continue;
        if (!activeStudentIds.has(String(item.studentId))) continue;

        const written = await this.ledger.postCharges({
          organizationId: String(session.organizationId),
          familyId: String(subscription.familyId),
          currency: subscription.currency,
          subscriptionId: String(subscription._id),
          sessionId: String(session._id),
          charges: [
            {
              amountMinor: subscription.amountMinor,
              dueAt: now,
              studentId: String(item.studentId),
              groupId: String(item.groupId),
              // Keyed per student per session, so a retried completion posts nothing twice.
              idempotencyKey: perSessionIdempotencyKey(String(subscription._id), String(session._id), String(item.studentId)),
              descriptionKey: 'billing.charge.perSession',
            },
          ],
        });
        posted += written.length;
      }
    }
    return posted;
  }
}
```

- [ ] **Step 4: Write `MonthlyChargesService`**

Mirror the structure: find `ACTIVE` `MONTHLY` subscriptions, load their groups and cohorts, skip a group that is not `RUNNING` and a student who is `WITHDRAWN`, call `monthlyChargeDueDates(cohort.startDate, group.timezone, now)`, and post one charge per due date with `monthlyIdempotencyKey`. Wrap each subscription in its own `try/catch` and log a failure, so one bad row cannot abort the run.

- [ ] **Step 5: Hook into session completion**

In `apps/server/src/academics/session/session-completion.service.ts`, `onClosed` already runs when a session closes. Billing must not be called from academics — that is the wrong direction — so emit instead. Add a `SESSION_COMPLETED_EVENT` to `academics/events/`, emit it from `onClosed` when `closedAs === SessionStatus.COMPLETED`, and add a listener inside **billing** that calls `SessionChargesService.onSessionCompleted`. Inject `EventEmitter2` into `SessionCompletionService` and update that service's existing spec's constructor calls with an `{ emit: jest.fn() }` double.

- [ ] **Step 6: Register the providers**

Add both services and the new billing listener to `billing.module.ts`'s `providers`, and register the `Session` schema there.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest billing/jobs src/academics/session --runInBand`
Expected: PASS — 9 session-charge tests, your monthly tests, and every existing session suite still green.

- [ ] **Step 8: Lint and commit**

Lint each new file by name, then:

```bash
git add apps/server/src
git commit -m "feat(sp6): post monthly and per-session charges"
```

---

### Task 14: The daily job and the reminders

**Files:**
- Create: `apps/server/src/billing/jobs/reminders.service.ts`
- Create: `apps/server/src/billing/jobs/billing.queue.ts`
- Create: `apps/server/src/billing/jobs/billing.processor.ts`
- Create: `apps/server/src/billing/jobs/billing.scheduler.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Test: `apps/server/src/billing/jobs/reminders.service.spec.ts`
- Test: `apps/server/src/billing/jobs/billing.processor.spec.ts`

**Interfaces:**
- Consumes: `LedgerService.openCharges` (Task 7), `NotificationService`, `BILLING_REMINDER_INTERVAL_DAYS` (Task 1).
- Produces: `RemindersService.run(now): Promise<number>`; `BILLING_QUEUE = 'billing-daily'`, `BILLING_DAILY_JOB`, `BILLING_DAILY_EVERY_MS = 24 * 60 * 60 * 1000`.

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/billing/jobs/reminders.service.spec.ts`:

```ts
import { BILLING_REMINDER_INTERVAL_DAYS, Currency, LedgerEntryType, NotificationType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { RemindersService } from './reminders.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const NOW = new Date('2026-03-20T09:00:00.000Z');

const overdueCharge = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  organizationId: ORG,
  familyId: FAMILY,
  type: LedgerEntryType.CHARGE,
  amountMinor: 10_000,
  currency: Currency.EGP,
  dueAt: new Date('2026-03-10T00:00:00.000Z'),
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
});

const makeService = (charges: Record<string, unknown>[], lastReminderAt: Date | null = null, allocatedTotals: Record<string, number> = {}) => {
  const entryModel = { find: jest.fn(() => ({ lean: () => ({ exec: async () => charges }) })) };
  const allocationModel = {
    aggregate: jest.fn(async () =>
      Object.entries(allocatedTotals).map(([id, total]) => ({ _id: new Types.ObjectId(id), total }))
    ),
  };
  const notifications = {
    create: jest.fn(async () => undefined),
    findLast: jest.fn(async () => (lastReminderAt ? { createdAt: lastReminderAt } : null)),
  };
  return { service: new RemindersService(entryModel as never, allocationModel as never, notifications as never), notifications };
};

describe('RemindersService.run', () => {
  it('reminds a family with an overdue, uncovered charge', async () => {
    const { service, notifications } = makeService([overdueCharge()]);
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: String(FAMILY), type: NotificationType.INFO })
    );
  });

  it('sends one reminder per family per run, not one per charge', async () => {
    const { service, notifications } = makeService([overdueCharge(), overdueCharge(), overdueCharge()]);
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('does not remind about a charge that is not due yet', async () => {
    const { service, notifications } = makeService([overdueCharge({ dueAt: new Date('2026-04-10T00:00:00.000Z') })]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('does not remind when the overdue charge is fully covered', async () => {
    const charge = overdueCharge();
    const { service, notifications } = makeService([charge], null, { [String(charge._id)]: 10_000 });
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('still reminds when the charge is only partly covered', async () => {
    const charge = overdueCharge();
    const { service, notifications } = makeService([charge], null, { [String(charge._id)]: 4_000 });
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalled();
  });

  it('waits the interval before reminding the same family again', async () => {
    const yesterday = new Date(NOW.getTime() - 24 * 3600 * 1000);
    const { service, notifications } = makeService([overdueCharge()], yesterday);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('reminds again once the interval has passed', async () => {
    const old = new Date(NOW.getTime() - (BILLING_REMINDER_INTERVAL_DAYS + 1) * 24 * 3600 * 1000);
    const { service, notifications } = makeService([overdueCharge()], old);
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalled();
  });

  it('reminds nobody when nothing is overdue', async () => {
    const { service, notifications } = makeService([]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
```

Create `apps/server/src/billing/jobs/billing.processor.spec.ts` asserting that the processor runs `MonthlyChargesService` before `RemindersService` (a charge posted today should be able to be reminded about), returns `{ charged, reminded }`, ignores a job name it does not own, and that `BILLING_DAILY_EVERY_MS` is 24 hours. Model it on `task.processor.spec.ts` from the sub-project 3 plan.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server exec jest billing/jobs/reminders billing/jobs/billing.processor --runInBand`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write the reminders service**

```ts
@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name) private readonly allocationModel: Model<Allocation>,
    private readonly notifications: NotificationService
  ) {}

  /**
   * One in-app reminder per family per run, on the due date and then every
   * BILLING_REMINDER_INTERVAL_DAYS days until the charges are covered.
   *
   * Per family, not per charge: a family three months behind would otherwise get three
   * notifications a day, which is how people learn to ignore notifications.
   */
  async run(now: Date): Promise<number> {
    const overdue = await this.entryModel
      .find({ type: LedgerEntryType.CHARGE, dueAt: { $ne: null, $lte: now } })
      .lean<OverdueCharge[]>()
      .exec();
    if (overdue.length === 0) return 0;

    const allocated = await this.allocationModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { chargeLedgerEntryId: { $in: overdue.map((charge) => charge._id) } } },
      { $group: { _id: '$chargeLedgerEntryId', total: { $sum: '$amountMinor' } } },
    ]);
    const byCharge = new Map(allocated.map((row) => [String(row._id), row.total]));

    const families = new Map<string, { organizationId: string; outstandingMinor: number; currency: Currency }>();
    for (const charge of overdue) {
      const outstanding = charge.amountMinor - (byCharge.get(String(charge._id)) ?? 0);
      if (outstanding <= 0) continue;
      const key = String(charge.familyId);
      const current = families.get(key) ?? {
        organizationId: String(charge.organizationId),
        outstandingMinor: 0,
        currency: charge.currency,
      };
      current.outstandingMinor += outstanding;
      families.set(key, current);
    }

    let sent = 0;
    for (const [familyId, summary] of families) {
      if (!(await this.isDue(familyId, now))) continue;
      await this.notifications.create({
        userId: familyId,
        titleKey: 'billingReminderTitle',
        bodyKey: 'billingReminderBody',
        params: { amount: String(summary.outstandingMinor), currency: summary.currency },
        type: NotificationType.INFO,
      });
      sent += 1;
    }
    return sent;
  }

  private async isDue(familyId: string, now: Date): Promise<boolean> {
    const last = await this.notifications.findLast(familyId, 'billingReminderTitle');
    if (!last?.createdAt) return true;
    return now.getTime() - last.createdAt.getTime() >= BILLING_REMINDER_INTERVAL_DAYS * 24 * 3600 * 1000;
  }
}
```

`NotificationService` has no `findLast` today. Add one to `apps/server/src/notification/notification.service.ts`:

```ts
  /** The most recent notification of a given title key for a user, or null. */
  async findLast(userId: string, titleKey: string): Promise<{ createdAt: Date } | null> {
    return this.notificationModel
      .findOne({ userId: new mongoose.Types.ObjectId(userId), titleKey })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean<{ createdAt: Date } | null>()
      .exec();
  }
```

Confirm the `Notification` entity has `timestamps: true` so `createdAt` exists; if it does not, add the field explicitly and record a `Ruling:` line.

- [ ] **Step 4: Write the queue triple**

Create `billing.queue.ts`:

```ts
export const BILLING_QUEUE = 'billing-daily';
export const BILLING_DAILY_JOB = 'billing-daily-run';
/** Spec §6.1 and §6.4: a daily job posts monthly charges and sends reminders. */
export const BILLING_DAILY_EVERY_MS = 24 * 60 * 60 * 1000;
```

Create `billing.processor.ts` and `billing.scheduler.ts` following `apps/server/src/academics/session/session-status.processor.ts` and `session-status.scheduler.ts` exactly — same `WorkerHost` shape, same `upsertJobScheduler` call, same try/catch that logs rather than preventing start-up. The processor runs charges first, then reminders, and returns `{ charged, reminded }`.

- [ ] **Step 5: Register everything**

In `billing.module.ts`, add `BullModule.registerQueue({ name: BILLING_QUEUE })` and the three providers.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest billing/jobs --runInBand`
Expected: PASS — 8 reminder tests, your processor tests, and the Task 13 suites still green.

- [ ] **Step 7: Lint and commit**

Lint each new file by name, then:

```bash
git add apps/server/src
git commit -m "feat(sp6): run the daily billing job and send overdue reminders"
```

---

### Task 15: The API and the permissions

**Files:**
- Create: `apps/server/src/billing/billing.controller.message.ts`
- Modify: `apps/server/src/billing/billing.module.ts`
- Modify: `apps/server/src/role/seeds/role.accountant.config.ts`, `role.manager.config.ts`, `role.parent.config.ts`
- Test: `apps/server/src/role/seeds/roles.config.spec.ts` (extend)

**Interfaces:**
- Consumes: `SubscriptionService` (Task 8), `LedgerService` (Task 7), `FamilyPaymentService` (Task 11), `FamilyService` (Task 5).
- Produces: the message patterns `billing.subscriptions.create|listForGroup|listForFamily|end`, `billing.ledger.statement`, `billing.ledger.adjust`, `billing.payments.methods|initiate|attachReceipt|queue|approve|reject`.

- [ ] **Step 1: Write the failing test**

Extend `apps/server/src/role/seeds/roles.config.spec.ts`:

```ts
  it('lets the accountant and the owner manage billing and family payments', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.ACCOUNTANT)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.BILLING });
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.FAMILY_PAYMENT });
  });

  it('lets the manager read billing without being able to change money', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.MANAGER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.BILLING });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.BILLING });
  });

  it('lets a parent read billing and create a payment, but not manage billing', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.PARENT)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.BILLING });
    expect(permissions).toContainEqual({ action: Actions.CREATE, subject: Subjects.FAMILY_PAYMENT });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.BILLING });
  });

  it('keeps every financial subject away from content staff and teachers', () => {
    for (const role of [Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER, Roles.INSTRUCTOR, Roles.SUPERVISOR]) {
      const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === role)?.permissions ?? [];
      for (const subject of [Subjects.BILLING, Subjects.FAMILY_PAYMENT]) {
        expect(permissions.some((rule) => rule.subject === subject)).toBe(false);
      }
    }
  });

  it('keeps billing away from the student role: the parent owns the ledger', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.STUDENT)?.permissions ?? [];
    expect(permissions.some((rule) => rule.subject === Subjects.BILLING)).toBe(false);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest roles.config --runInBand`
Expected: FAIL — the parent seed grants nothing billing-related yet.

- [ ] **Step 3: Grant the permissions**

Accountant already gained `MANAGE BILLING` and `MANAGE FAMILY_PAYMENT` in Task 12; confirm both are there. Manager already gained `READ BILLING`; add `{ action: Actions.READ, subject: Subjects.FAMILY_PAYMENT }`. Add to `PARENT_PERMISSIONS`:

```ts
  { action: Actions.READ, subject: Subjects.BILLING },
  { action: Actions.CREATE, subject: Subjects.FAMILY_PAYMENT },
  { action: Actions.READ, subject: Subjects.FAMILY_PAYMENT },
```

`OWNER_SEED` reuses `ADMIN_PERMISSIONS`; add `MANAGE` on both subjects there unless that array already grants `MANAGE` on `Subjects.ALL`.

- [ ] **Step 4: Write the controller**

Create `apps/server/src/billing/billing.controller.message.ts` following `academics/group/group.controller.message.ts` in shape. The guards:

| Pattern | Guard |
|---|---|
| `billing.subscriptions.create`, `.end`, `billing.ledger.adjust` | `MANAGE BILLING` |
| `billing.subscriptions.listForGroup`, `.listForFamily`, `billing.ledger.statement` | `READ BILLING` |
| `billing.payments.queue`, `.approve`, `.reject` | `MANAGE FAMILY_PAYMENT` |
| `billing.payments.methods`, `.initiate`, `.attachReceipt` | `CREATE FAMILY_PAYMENT` |

`billing.ledger.statement` and `billing.subscriptions.listForFamily` take a `familyId` and must call `FamilyService.canActorReadFamily` first, throwing `ForbiddenException(BillingErrors.NOT_YOUR_FAMILY)` when it is false. The guard says the caller may read *a* ledger; only that check says *which*. Put the check in the service method rather than the controller so it cannot be forgotten by a second caller:

```ts
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.BILLING })
  @MessagePattern('billing.ledger.statement')
  statement(@Payload(new RpcValidationPipe()) payload: FamilyIdPayload, @Ctx() context: IUserContext) {
    // The service re-checks the family; a parent holding READ BILLING must not read another family.
    return this.billing.statementFor(actorFromContext(context), payload.familyId);
  }
```

Add `statementFor(actor, familyId)` and `subscriptionsFor(actor, familyId)` wrappers that perform the family check and then delegate to `LedgerService.statement` / `SubscriptionService.findForFamily`. Put them in a small `billing-read.service.ts` rather than in the controller.

Register the controller in `billing.module.ts`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest roles.config --runInBand`
Expected: PASS, including the five new cases.

- [ ] **Step 6: Apply the role changes**

Run: `pnpm --filter server seed:prod`
Expected: completes without error.

- [ ] **Step 7: Lint and commit**

Lint each touched file by name, then:

```bash
git add apps/server/src
git commit -m "feat(sp6): expose the billing API and grant the financial permissions"
```

---

### Task 16: Client data layer

**Files:**
- Create: `apps/client/src/lib/types/billing/billing.ts`
- Create: `apps/client/src/lib/actions/billing/billing.action.ts`
- Create: `apps/client/src/lib/hooks/billing/use-billing.hook.ts`
- Create: `apps/client/src/lib/utils/billing/format-money.ts`
- Test: `apps/client/src/lib/utils/billing/format-money.test.ts`
- Test: `apps/client/src/lib/hooks/billing/use-billing.hook.test.ts`

**Interfaces:**
- Consumes: the Task 15 message patterns.
- Produces: `IBillingSubscription`, `ILedgerEntry`, `ILedgerBalance`, `IFamilyPayment`, `IPaymentMethodOption`; the matching actions and hooks; `billingKeys`; `formatMoney(amountMinor, currency, locale)` and `parseMoney(input)`.

- [ ] **Step 1: Write the failing tests**

Create `apps/client/src/lib/utils/billing/format-money.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Currency } from '@darnozom/shared-types';
import { formatMoney, parseMoney } from './format-money';

describe('formatMoney', () => {
  it('shows minor units as a two-decimal amount', () => {
    expect(formatMoney(10_000, Currency.EGP, 'en')).toContain('100');
    expect(formatMoney(1_010, Currency.EGP, 'en')).toContain('10.10');
  });

  it('shows zero rather than an empty string, so a scholarship reads as free', () => {
    expect(formatMoney(0, Currency.EGP, 'en')).toContain('0');
  });

  it('never renders a negative balance as a bare minus with no number', () => {
    expect(formatMoney(-500, Currency.EGP, 'en')).toMatch(/5/);
  });
});

describe('parseMoney', () => {
  it('turns a typed amount into integer minor units', () => {
    expect(parseMoney('100')).toBe(10_000);
    expect(parseMoney('10.1')).toBe(1_010);
    expect(parseMoney('0.07')).toBe(7);
  });

  it('accepts zero, which an accountant types for a full scholarship', () => {
    expect(parseMoney('0')).toBe(0);
  });

  it('returns null for anything it cannot read, rather than guessing at money', () => {
    for (const input of ['', 'abc', '-5', '1.2.3']) {
      expect(parseMoney(input)).toBeNull();
    }
  });

  it('ignores thousands separators and surrounding spaces', () => {
    expect(parseMoney(' 1,234.56 ')).toBe(123_456);
  });
});
```

Create `apps/client/src/lib/hooks/billing/use-billing.hook.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { billingKeys } from './use-billing.hook';

describe('billingKeys', () => {
  it('namespaces every key under billing, so one payment refreshes the ledger and the queue', () => {
    expect(billingKeys.statement('f1')[0]).toBe('billing');
    expect(billingKeys.receiptQueue[0]).toBe('billing');
    expect(billingKeys.groupSubscriptions('g1')[0]).toBe('billing');
  });

  it('keys the statement by family and the subscriptions by group', () => {
    expect(billingKeys.statement('f1')).not.toEqual(billingKeys.statement('f2'));
    expect(billingKeys.groupSubscriptions('g1')).not.toEqual(billingKeys.groupSubscriptions('g2'));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter client exec vitest run format-money use-billing --no-file-parallelism`
Expected: FAIL — both imports unresolved.

- [ ] **Step 3: Write the money helpers**

```ts
import { Currency } from '@darnozom/shared-types';

const MINOR_UNITS_PER_MAJOR = 100;

/** The server works in integer minor units; the client is the only place money is formatted. */
export function formatMoney(amountMinor: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinor / MINOR_UNITS_PER_MAJOR);
}

/**
 * A typed amount as integer minor units, or null when it is not a readable non-negative amount.
 * Null rather than 0, so a form can tell "nothing typed" from "zero typed" — the difference
 * between an incomplete form and a full scholarship.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replaceAll(',', '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * MINOR_UNITS_PER_MAJOR);
}
```

- [ ] **Step 4: Write the types, actions and hooks**

Create `apps/client/src/lib/types/billing/billing.ts` mirroring the server's lean types, with every `amountMinor` as `number` and every date as an ISO `string`. Create `billing.action.ts` with one `'use server'` function per message pattern, and `use-billing.hook.ts` with `billingKeys`:

```ts
const ROOT = 'billing';

export const billingKeys = {
  groupSubscriptions: (groupId: string) => [ROOT, 'group-subscriptions', groupId] as const,
  familySubscriptions: (familyId: string) => [ROOT, 'family-subscriptions', familyId] as const,
  statement: (familyId: string) => [ROOT, 'statement', familyId] as const,
  receiptQueue: [ROOT, 'receipt-queue'] as const,
  methods: [ROOT, 'methods'] as const,
};
```

and the queries and mutations, reusing the shape of `useAcademicsMutation` with its own `ROOT` so one write invalidates every billing query.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter client exec vitest run format-money use-billing --no-file-parallelism`
Expected: PASS — 7 money tests and 2 key tests.

- [ ] **Step 6: Lint, type-check, commit**

```bash
pnpm --filter client exec eslint src/lib/types/billing/billing.ts src/lib/actions/billing/billing.action.ts src/lib/hooks/billing/use-billing.hook.ts src/lib/utils/billing/format-money.ts src/lib/utils/billing/format-money.test.ts src/lib/hooks/billing/use-billing.hook.test.ts
pnpm --filter client tsc --noEmit
git add apps/client/src/lib
git commit -m "feat(sp6): add the client data layer and money formatting for billing"
```

`pnpm --filter client tsc --noEmit` has a known baseline of 5 pre-existing errors. Only new ones matter.

---

### Task 17: The accountant's screens

**Files:**
- Create: `apps/client/src/components/organs/billing/subscription-form.tsx`
- Create: `apps/client/src/components/organs/billing/ledger-table.tsx`
- Create: `apps/client/src/components/organs/billing/receipt-queue.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/billing/families/[familyId]/page.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/billing/receipts/page.tsx`
- Modify: the group formation screen, to add a subscriptions tab
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts`, `routes.constants.ts`, both message catalogues
- Test: `subscription-form.test.tsx`, `ledger-table.test.tsx`, `receipt-queue.test.tsx`

**Interfaces:**
- Consumes: Task 16's hooks and `formatMoney`/`parseMoney`.
- Produces: `SubscriptionForm({ students, onSubmit, isSubmitting })`, `LedgerTable({ entries, balances, isLoading })`, `ReceiptQueue({ payments, isLoading, onApprove, onReject })`.

- [ ] **Step 1: Write the failing tests**

`subscription-form.test.tsx` must cover: every one of the five types is offerable; choosing `FAMILY` lets more than one student be selected and any other type exactly one; a typed amount is submitted as minor units (`"100"` → `10_000`); an unreadable amount blocks submission with `billing.amountInvalid`; `0` is accepted for `SCHOLARSHIP`; the submit button is disabled while in flight.

`ledger-table.test.tsx` must cover: an empty state; one row per entry with its description and formatted amount; a charge and a payment are visually distinguished; the balance is shown **per currency** with two currencies producing two balance lines; a zero balance reads as settled rather than blank.

`receipt-queue.test.tsx` must cover: an empty state; a loading state; the receipt is reachable as a link or image; approve passes the payment id; reject without a reason does not fire and shows `billing.reasonRequired`; reject with a reason passes both.

Write them in the style of the component tests in the sub-project 3 and 5 plans — `vi.mock('next-intl')` returning the key, props in and callbacks out, no query client.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter client exec vitest run subscription-form ledger-table receipt-queue --no-file-parallelism`
Expected: FAIL — three unresolved imports.

- [ ] **Step 3: Write the three components**

Build each as a presentational component taking data as props and emitting callbacks, the way `follow-ups-card.tsx` and `attendance-table.tsx` already do in this repo — read both first and match their table and card markup. The pieces that matter:

- `SubscriptionForm` holds the typed amount as a string and converts with `parseMoney` only on submit, showing `t('billing.amountInvalid')` when it returns null. `FAMILY` switches the student control to multi-select; every other type is single. It never formats the amount back into the input while the user is typing.
- `LedgerTable` renders `balances.map(…)` as one line per currency — **never a single summed total**, because there is no exchange rate — and `entries.map(…)` with `formatMoney(entry.amountMinor, entry.currency, locale)`, a sign derived from `entry.type` and `entry.direction`, and `t(entry.description)` for a key-shaped description falling back to the raw string for an accountant's own adjustment reason.
- `ReceiptQueue` mirrors the Sharia queue from sub-project 4: a per-row reason box, an approve button, and a reject button that refuses to fire on an empty reason.

- [ ] **Step 4: Write the pages and the group tab**

The family ledger page reads `useStatement(familyId)`; the receipts page reads `useReceiptQueue()` with `useApprovePayment()` and `useRejectPayment()`. On the group formation screen, add a subscriptions tab reading `useGroupSubscriptions(groupId)` that lists each student with their type, amount and **derived** payment status — the status is read-only now, so render it as a badge, not a control. If the screen has no tab component yet, add a plain section beside the students card rather than introducing a tab library.

- [ ] **Step 5: Add the route constants, nav entries and translations**

Add `ROUTE_ORG_BILLING_RECEIPTS` and `ROUTE_ORG_BILLING_FAMILIES`, nav entries gated to the accountant, manager and owner, and a `Billing` namespace in **both** catalogues covering: `title`, `subscriptions`, `ledger`, `receipts`, `balance`, `settled`, `amount`, `amountInvalid`, `reasonRequired`, `approve`, `reject`, `pay`, `empty`, `loading`, `saved`, `type.*` for the five subscription types, `entry.*` for the three ledger types, `status.*` for `PAID`/`UNPAID`, `charge.*` for the five description keys the server writes (`fullCourse`, `monthly`, `perSession`, `family`, `scholarship`), and `entry.payment`. Add the Arabic for each. Add the `BillingErrors` keys to the `errors` namespace in both files, and the four notification keys (`billingPaymentApprovedTitle/Body`, `billingReminderTitle/Body`, `billingPaymentConfirmedTitle/Body`, plus the rejection pair) to the `Notifications` namespace in both.

- [ ] **Step 6: Run the tests and the i18n check**

Run: `pnpm --filter client exec vitest run subscription-form ledger-table receipt-queue --no-file-parallelism`
Expected: PASS.

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 7: Lint and commit**

Lint each touched file by name, then:

```bash
git add apps/client
git commit -m "feat(sp6): add the accountant subscription, ledger and receipt screens"
```

---

### Task 18: The parent's payments page and the organization settings

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/payments/page.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/payments/__components/pay-dialog.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/__components/` — the parent sidebar
- Modify: the organization settings page, to add the payment-method switches
- Test: `pay-dialog.test.tsx`

**Interfaces:**
- Consumes: `useMethods`, `useInitiatePayment`, `useAttachReceipt`, `useStatement` (Task 16), `LedgerTable` (Task 17).
- Produces: `PayDialog({ methods, onPay, isSubmitting })`.

- [ ] **Step 1: Write the failing test**

`pay-dialog.test.tsx` must cover:

- the enabled methods are offered, and a method the organization has not enabled is absent;
- an empty method list shows `billing.noMethods` rather than a broken form;
- choosing receipt upload shows an upload control;
- choosing the gateway shows no upload control;
- an unreadable amount blocks `onPay` and shows `billing.amountInvalid`;
- a valid amount calls `onPay` with `{ method, amountMinor, currency }`, the amount in **minor units**;
- the button is disabled while in flight.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter client exec vitest run pay-dialog --no-file-parallelism`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the dialog**

`PayDialog` reads the method list, keeps the typed amount as a string, converts with `parseMoney` on submit, and emits `{ method, amountMinor, currency }`. For `RECEIPT_UPLOAD` it shows the repo's existing upload control — find it with:

```bash
cd C:/COURSES/work/darnozom/academy && grep -rln "generatePresignedUrl\|usePresignedUpload\|uploadFile" apps/client/src/lib apps/client/src/components | head
```

and reuse whatever the content editor already uses, rather than writing a new uploader. On a `REDIRECT` result, navigate the browser to `result.url`; on an `AWAIT_RECEIPT` result, keep the dialog open for the upload and then call `useAttachReceipt`.

- [ ] **Step 4: Write the page and the nav entry**

The page shows `LedgerTable` from `useStatement(myFamilyId)` — the parent's family is their own user id, so read it from the session the way other parent pages read the current user — plus a **Pay** button opening `PayDialog`. Add the nav entry to the parent sidebar.

- [ ] **Step 5: Add the organization settings**

On the organization settings page, add a control for `enabledFamilyPaymentMethods` (a checkbox per registered method, from `useMethods`) and a select for `academyFeeGatewayProvider` from `PaymentProvider`. Wire both to the existing organization-update mutation that page already uses; do not add a new endpoint if one exists. Note in the UI that the gateway option requires a provider, matching `OnlineGatewayMethod.isEnabled`.

- [ ] **Step 6: Run the tests and the i18n check**

Run: `pnpm --filter client exec vitest run pay-dialog --no-file-parallelism`
Expected: PASS.

Run: `pnpm --filter client i18n:check-keys`
Expected: ok. Add `billing.noMethods`, `billing.method.RECEIPT_UPLOAD`, `billing.method.ONLINE_GATEWAY`, `billing.uploadReceipt` and `billing.gatewayProvider` to both catalogues.

- [ ] **Step 7: Lint and commit**

Lint each touched file by name, then:

```bash
git add apps/client
git commit -m "feat(sp6): add the parent payments page and the payment-method settings"
```

---

### Task 19: Whole sub-project verification

**Files:** none created. This task proves the branch.

- [ ] **Step 1: Run the full server suite**

Run: `pnpm --filter server exec jest --runInBand`
Expected: every new suite passes. Compare the failure set against the baseline sub-project 2 recorded and name any **new** failure. Task 12 made `toView` async, so pay particular attention to group and session suites.

- [ ] **Step 2: Run the full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: all green.

- [ ] **Step 3: Type-check both apps**

Run: `pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json`
Expected: 0 errors.

Run: `pnpm --filter client tsc --noEmit`
Expected: the 5 baseline errors only.

- [ ] **Step 4: Check the translations**

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 5: Prove the ledger is append-only**

Grep for any write to the ledger that is not an insert, and record the output:

```bash
cd C:/COURSES/work/darnozom/academy && grep -rnE "LedgerEntry|entryModel" apps/server/src --include=*.ts | grep -E "updateOne|updateMany|findOneAndUpdate|deleteOne|deleteMany|findByIdAndUpdate"
```

Expected: no match. This is the sub-project's central guarantee, and it holds only by nothing being written that way.

- [ ] **Step 6: Prove the manual toggle is gone**

```bash
cd C:/COURSES/work/darnozom/academy && grep -rn "GROUP_PAYMENT_STATUS\|setPaymentStatus" apps lib --include=*.ts --include=*.tsx | grep -v node_modules
```

Expected: no match.

- [ ] **Step 7: Prove content staff have no financial access**

```bash
cd C:/COURSES/work/darnozom/academy && grep -rn "BILLING\|FAMILY_PAYMENT" apps/server/src/role/seeds/role.content-officer.config.ts apps/server/src/role/seeds/role.sharia-reviewer.config.ts apps/server/src/role/seeds/role.instructor.config.ts
```

Expected: no match.

- [ ] **Step 8: Confirm the unique indexes exist**

With the server running against the development database, confirm: `billingsubscriptions` carries `one_active_subscription_per_student_group`; `ledgerentries` carries `ledger_idempotency`; `familypayments` carries `payment_gateway_unique`; `allocations` carries `allocation_unique`. Mongoose builds each on first use of its model, so exercise each collection once first. Record what you saw.

- [ ] **Step 9: Walk the golden path in the browser**

With `pnpm dev` running:

1. As an accountant, subscribe a student in a group to `FULL_COURSE` for 500. Confirm the group shows them `UNPAID` and the readiness item `PAYMENTS_MADE` is not done.
2. As that student's parent, open **Payments**, confirm the balance is 500, and pay by uploading a receipt.
3. As the accountant, approve the receipt. Confirm the ledger shows a charge and a payment, the balance reads settled, the student now shows `PAID`, and `PAYMENTS_MADE` is done.
4. Reject a second receipt and confirm no ledger entry was written and the parent sees the reason.
5. Subscribe a second student on a `SCHOLARSHIP` for 0 and confirm they read `PAID` immediately with no charge on the ledger.
6. Complete a session in a group holding a `PER_SESSION` subscription and confirm one charge appears per rostered student, including one who was marked absent.

If no dev server is available in your context, say so explicitly rather than claiming the walk passed.

- [ ] **Step 10: Ledger the result**

No commit is needed if the tree is clean. If a step surfaced a fix, make it with a test that fails first, then commit.
