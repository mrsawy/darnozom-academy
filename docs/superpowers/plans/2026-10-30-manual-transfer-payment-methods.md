# Manual Transfer Payment Methods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a parent pay tuition via admin-configured manual-transfer methods (InstaPay and Wallet Transfer built in, unlimited custom methods addable), submit a proof-of-transfer image, see the payment move to "Under review," and let staff approve/reject it from the existing Receipts queue or a new group-scoped view — while fixing the dead `BillingSettingsForm` save path that caused the original bug report.

**Architecture:** Extend the existing strategy-pattern payment-method registry with one new `ManualTransferMethod` provider (selecting a specific admin-configured method via `InitiateInput.meta.paymentMethodConfigId`), backed by a new `PaymentMethodConfig` collection the admin manages from Settings → Payments. "Under review" is a display label computed from the existing `FamilyPaymentState.PENDING_REVIEW`, merged into `GroupPaymentStatus` (new `UNDER_REVIEW` member) at the single existing conversion point, `GroupStateService.withDerivedPaymentStatus()`. Review stays on the existing `FamilyPaymentService.reviewQueue/approve/reject`, extended with `status`/`groupId` filters and surfaced from two UI entry points sharing one component.

**Tech Stack:** NestJS (message-pattern controllers, Mongoose), Next.js/React client with TanStack Query, `@darnozom/shared-types` for enums shared across server/client, Jest for tests.

**Spec:** `docs/superpowers/specs/2026-10-30-manual-transfer-payment-methods-design.md`

## Global Constraints

- "Under review" is a label over `FamilyPaymentState.PENDING_REVIEW`, never a new `FamilyPaymentState` member.
- `isStudentPaid()` / `FamilyPaymentStatusService.forGroup()` ledger-coverage semantics (PAID means charges covered by allocated payments) are never changed by this work.
- `FamilyPaymentMethod` interface (`payment-method.interface.ts`) is not widened beyond using its existing `meta?: Record<string, unknown>` field; no breaking change to `isEnabled(org)`'s signature or existing callers.
- Parent submission is image-only: no new parent-facing form fields beyond the existing receipt-upload file input.
- Approval of a manual-transfer payment reuses `FamilyPaymentService.approve()` unchanged (same ledger post + allocate + PAID-flip behavior as receipt upload).
- A method's field-set edit never changes how a past payment displays — every `FamilyPayment` created against a `PaymentMethodConfig` stores a `methodSnapshot` at submission time.
- InstaPay and Wallet Transfer are seeded per-organization, `kind: 'BUILT_IN'`, and cannot be deleted (only disabled or field-edited).
- Billing's module boundary holds: billing never imports academics; academics injects billing's read-only services, matching the existing `FamilyPaymentStatusService` injection in `GroupStateService`.

## Review Focus

- **Admin enables Wallet Transfer/InstaPay but leaves a required display field (QR image, number) blank** — the save path must not silently accept an enabled method with zero fields, or a parent reaching checkout sees a method with nothing to act on.
- **Two payments are submitted for the same charge around the same time** (one rejected, one re-uploaded) — approving one must not let the student appear PAID while a second pending manual-transfer payment for the same charge is still sitting in review, inconsistent with what `isStudentPaid()` actually computes from the ledger.
- **A rejected payment is re-uploaded** — `attachReceipt()` must accept a new image while status is `REJECTED` and clear the path back to `PENDING_REVIEW`, without resurrecting the old `rejectReason` as if it still applied.
- **An admin deletes/disables a `PaymentMethodConfig` that a `PENDING_REVIEW` payment already references** — the payment's stored `methodSnapshot` must still render correctly in the review queue even though the live config is gone or disabled.
- **A custom method is created with zero fields** — `initiate()`/the config-list read path must not throw; it's allowed, just not useful (explicit non-goal in the spec), so this must degrade gracefully rather than error.

---

## File Structure

**Server (new):**
- `apps/server/src/billing/entities/payment-method-config.entity.ts` — new `PaymentMethodConfig` Mongoose schema.
- `apps/server/src/billing/payment-method-config/payment-method-config.service.ts` — CRUD + per-org seeding of built-ins, enable/disable, field editing.
- `apps/server/src/billing/payment-method-config/payment-method-config.service.spec.ts`
- `apps/server/src/billing/payment/methods/manual-transfer.method.ts` — the new `FamilyPaymentMethod` strategy.
- `apps/server/src/billing/payment/methods/manual-transfer.method.spec.ts`
- `apps/server/src/billing/settings/billing-settings.service.ts` — read/update `enabledFamilyPaymentMethods` / `academyFeeGatewayProvider` on `Organization`.
- `apps/server/src/billing/settings/billing-settings.service.spec.ts`

**Server (modified):**
- `lib/shared-types/src/lib/messages/billing-errors.enum.ts` — new error codes.
- `lib/shared-types/src/lib/types/billing/billing.types.ts` — `PAYMENT_METHOD_MANUAL_TRANSFER`, `PaymentMethodFieldType` enum.
- `lib/shared-types/src/lib/types/academics/academics.types.ts` — `GroupPaymentStatus.UNDER_REVIEW`.
- `apps/server/src/billing/entities/payment.entity.ts` — add `paymentMethodConfigId`, `methodSnapshot`.
- `apps/server/src/billing/dto/billing.dto.ts` — `InitiatePaymentPayload.meta`, new config/settings DTOs, `ReviewQueueFilterPayload`.
- `apps/server/src/billing/payment/family-payment.service.ts` — forward `meta`; extend `attachReceipt()`/`reviewQueue()`.
- `apps/server/src/billing/billing.controller.message.ts` — new message patterns.
- `apps/server/src/billing/billing.module.ts` — register new providers/services, add `ManualTransferMethod` to `FAMILY_PAYMENT_METHODS`.
- `apps/server/src/academics/domain/readiness.ts` — no change (still compares against `PAID` only; confirmed by design).
- `apps/server/src/academics/group/group-state.service.ts` — `withDerivedPaymentStatus()` merges `PENDING_REVIEW` into `UNDER_REVIEW`.
- `apps/server/src/academics/group/group-state.service.spec.ts` — new case.

**Client (new):**
- `apps/client/src/components/organs/billing/payment-status-badge.tsx` — shared 3-way badge.
- `apps/client/src/components/organs/billing/payment-status-badge.test.tsx`
- `apps/client/src/components/organs/billing/payment-method-config-manager.tsx` — admin field-builder UI.
- `apps/client/src/components/organs/billing/payment-method-config-manager.test.tsx`
- `apps/client/src/components/organs/billing/manual-transfer-pay-panel.tsx` — parent's method detail + upload view.
- `apps/client/src/components/organs/billing/manual-transfer-pay-panel.test.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.test.tsx`
- `apps/client/src/lib/types/billing/payment-method-config.ts` — client types for the config shape.

**Client (modified):**
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/__components/billing-settings-form.tsx` — wire `onSave`, add method manager.
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/page.tsx` — pass real save handler.
- `apps/client/src/lib/actions/billing/billing.action.ts` — new server actions.
- `apps/client/src/lib/hooks/billing/use-billing.hook.ts` — new hooks, extend `useReceiptQueue`.
- `apps/client/src/lib/types/billing/billing.ts` — `InitiatePaymentFormValues.meta`, `IFamilyPayment.methodSnapshot`.
- `apps/client/src/components/organs/billing/receipt-queue.tsx` — status/group filter, use shared badge, render `methodSnapshot`.
- `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/payments/page.tsx` — render manual-transfer method cards via `manual-transfer-pay-panel.tsx`; reject-reason display; retry.
- `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/payments/__components/pay-dialog.tsx` — list manual-transfer methods alongside existing ones.
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/students-card.tsx` — use shared badge, render UNDER_REVIEW.
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/subscriptions-card.tsx` — use shared badge, add "Review payments" entry point.
- `apps/client/messages/en.json`, `apps/client/messages/ar.json` — new keys.

---

### Task 1: Shared-types additions

**Files:**
- Modify: `lib/shared-types/src/lib/types/billing/billing.types.ts`
- Modify: `lib/shared-types/src/lib/types/academics/academics.types.ts:9-12`
- Modify: `lib/shared-types/src/lib/messages/billing-errors.enum.ts`
- Test: `lib/shared-types/src/lib/types/billing/billing.types.spec.ts`

**Interfaces:**
- Produces: `PAYMENT_METHOD_MANUAL_TRANSFER = 'MANUAL_TRANSFER'` (string const, same pattern as `PAYMENT_METHOD_RECEIPT_UPLOAD`).
- Produces: `enum PaymentMethodFieldType { TEXT = 'TEXT', IMAGE = 'IMAGE', LINK = 'LINK' }`.
- Produces: `GroupPaymentStatus.UNDER_REVIEW = 'UNDER_REVIEW'` added as a third member.
- Produces: `BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND = 'billingPaymentMethodConfigNotFound'`, `BillingErrors.PAYMENT_METHOD_CONFIG_DISABLED = 'billingPaymentMethodConfigDisabled'`.

- [ ] **Step 1: Write the failing test** in `billing.types.spec.ts` (new file, following the sibling `payment-status.spec.ts`/`family.spec.ts` style already in `domain/`):

```ts
import { PAYMENT_METHOD_MANUAL_TRANSFER, PaymentMethodFieldType } from './billing.types';

describe('manual transfer method constants', () => {
  it('exposes a stable key', () => {
    expect(PAYMENT_METHOD_MANUAL_TRANSFER).toBe('MANUAL_TRANSFER');
  });

  it('defines the three field types', () => {
    expect(Object.values(PaymentMethodFieldType)).toEqual(['TEXT', 'IMAGE', 'LINK']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/shared-types/src/lib/types/billing/billing.types.spec.ts`
Expected: FAIL — `PAYMENT_METHOD_MANUAL_TRANSFER` is not exported.

- [ ] **Step 3: Add the constants** to `billing.types.ts` next to the existing `PAYMENT_METHOD_*` consts, add `UNDER_REVIEW` to `GroupPaymentStatus` in `academics.types.ts`, add the two new `BillingErrors` members next to `GATEWAY_NOT_CONFIGURED`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/shared-types/src/lib/types/billing/billing.types.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/shared-types/src/lib/types/billing/billing.types.ts lib/shared-types/src/lib/types/academics/academics.types.ts lib/shared-types/src/lib/messages/billing-errors.enum.ts lib/shared-types/src/lib/types/billing/billing.types.spec.ts
git commit -m "feat(shared-types): add manual transfer method key, field type enum, under-review status"
```

---

### Task 2: `PaymentMethodConfig` entity

**Files:**
- Create: `apps/server/src/billing/entities/payment-method-config.entity.ts`
- Test: `apps/server/src/billing/entities/payment-method-config.entity.spec.ts`

**Interfaces:**
- Consumes: `PaymentMethodFieldType` from Task 1.
- Produces: `PaymentMethodConfig` Mongoose class and `PaymentMethodConfigSchema`, shape:
  ```ts
  class PaymentMethodConfig extends Document<Types.ObjectId> {
    organizationId: Types.ObjectId;
    key: string; // 'INSTAPAY' | 'WALLET_TRANSFER' | generated slug for custom
    kind: 'BUILT_IN' | 'CUSTOM';
    label: string;
    enabled: boolean;
    fields: { key: string; label: string; type: PaymentMethodFieldType; value: string; order: number }[];
    createdBy: Types.ObjectId;
  }
  ```
- Produces: unique index `{ organizationId: 1, key: 1 }` named `payment_method_config_unique_key`, so a given org can't have two rows with the same key.

- [ ] **Step 1: Write the failing test** (follow `entities.spec.ts` style):

```ts
import { PaymentMethodFieldType } from '@darnozom/shared-types';
import { PaymentMethodConfigSchema } from './payment-method-config.entity';

describe('PaymentMethodConfigSchema', () => {
  it('is unique per organization and key', () => {
    const entry = PaymentMethodConfigSchema.indexes().find(([, o]) => o?.name === 'payment_method_config_unique_key');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ organizationId: 1, key: 1 });
    expect(options?.unique).toBe(true);
  });

  it('accepts the three field types', () => {
    const fields = PaymentMethodConfigSchema.path('fields') as unknown as { schema: { path: (p: string) => { options: { enum: string[] } } } };
    expect(fields.schema.path('type').options.enum).toEqual(Object.values(PaymentMethodFieldType));
  });

  it('defaults enabled to false until the admin turns it on', () => {
    expect((PaymentMethodConfigSchema.path('enabled') as unknown as { options: { default: boolean } }).options.default).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/server/src/billing/entities/payment-method-config.entity.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the schema** in `payment-method-config.entity.ts`, following `entities/payment.entity.ts`'s `@Schema({ timestamps: true })` / `@Prop` style, with `fields` as a subdocument array (`@Prop({ type: [FieldSchema], default: [] })`) where `FieldSchema` is a small inline `@Schema()` class in the same file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/server/src/billing/entities/payment-method-config.entity.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/billing/entities/payment-method-config.entity.ts apps/server/src/billing/entities/payment-method-config.entity.spec.ts
git commit -m "feat(billing): add PaymentMethodConfig entity"
```

---

### Task 3: `PaymentMethodConfigService` (CRUD + built-in seeding)

**Files:**
- Create: `apps/server/src/billing/payment-method-config/payment-method-config.service.ts`
- Test: `apps/server/src/billing/payment-method-config/payment-method-config.service.spec.ts`

**Interfaces:**
- Consumes: `PaymentMethodConfig` model (Task 2), `BillingActor` (existing, `billing.types.ts`).
- Produces:
  ```ts
  class PaymentMethodConfigService {
    listForOrg(actor: BillingActor): Promise<PaymentMethodConfigLean[]>; // seeds INSTAPAY + WALLET_TRANSFER on first call if absent
    upsertFields(actor: BillingActor, configId: string, fields: FieldInput[]): Promise<PaymentMethodConfigLean>;
    setEnabled(actor: BillingActor, configId: string, enabled: boolean): Promise<PaymentMethodConfigLean>;
    createCustom(actor: BillingActor, label: string, fields: FieldInput[]): Promise<PaymentMethodConfigLean>;
    get(actor: BillingActor, configId: string): Promise<PaymentMethodConfigLean>; // throws PAYMENT_METHOD_CONFIG_NOT_FOUND
  }
  ```
  where `FieldInput = { label: string; type: PaymentMethodFieldType; value: string }` and `order` is assigned by array position.
- Produces default field sets used by seeding:
  - INSTAPAY: `[{ key: 'transferNumber', label: 'InstaPay Number', type: TEXT, value: '' }, { key: 'accountName', label: 'Account Name', type: TEXT, value: '' }, { key: 'qrCodeImage', label: 'QR Code', type: IMAGE, value: '' }, { key: 'instructions', label: 'Instructions', type: TEXT, value: '' }]`
  - WALLET_TRANSFER: same four-field shape, `key: 'WALLET_TRANSFER'`.

- [ ] **Step 1: Write the failing test** for seeding (follow `subscription.service.spec.ts`'s mock-model style):

```ts
describe('PaymentMethodConfigService.listForOrg', () => {
  it('seeds InstaPay and Wallet Transfer on first call when the org has none', async () => {
    const { service, model } = makeService({ existing: [] });
    const result = await service.listForOrg(actor());
    expect(result.map((c) => c.key)).toEqual(expect.arrayContaining(['INSTAPAY', 'WALLET_TRANSFER']));
    expect(result.every((c) => c.kind === 'BUILT_IN')).toBe(true);
  });

  it('does not reseed when built-ins already exist', async () => {
    const { service, model } = makeService({ existing: [{ key: 'INSTAPAY' }, { key: 'WALLET_TRANSFER' }] });
    await service.listForOrg(actor());
    expect(model.create).not.toHaveBeenCalled();
  });
});

describe('PaymentMethodConfigService.createCustom', () => {
  it('generates a unique key from the label', async () => {
    const { service } = makeService({ existing: [] });
    const created = await service.createCustom(actor(), 'Western Union', []);
    expect(created.kind).toBe('CUSTOM');
    expect(created.key).toMatch(/^CUSTOM_/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/server/src/billing/payment-method-config/payment-method-config.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PaymentMethodConfigService`.** Seeding: on `listForOrg`, query existing rows for the org; for each built-in key missing, `create()` it with the default field set above. Custom key generation: slugify the label, uppercase, prefix `CUSTOM_`, append a short random suffix if a collision would violate the unique index (catch the duplicate-key error code `11000`, matching the pattern already used in `subscription.service.ts:94-98`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/server/src/billing/payment-method-config/payment-method-config.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/billing/payment-method-config/
git commit -m "feat(billing): add PaymentMethodConfigService with built-in seeding"
```

---

### Task 4: `ManualTransferMethod` strategy

**Files:**
- Create: `apps/server/src/billing/payment/methods/manual-transfer.method.ts`
- Test: `apps/server/src/billing/payment/methods/manual-transfer.method.spec.ts`
- Modify: `apps/server/src/billing/payment/payment-method.interface.ts` (no signature change — confirm `meta` already present; add a doc comment only if helpful)
- Modify: `apps/server/src/billing/entities/payment.entity.ts`
- Modify: `apps/server/src/billing/dto/billing.dto.ts`

**Interfaces:**
- Consumes: `PaymentMethodConfigService.get()` (Task 3), `FamilyPaymentMethod` interface (existing), `PAYMENT_METHOD_MANUAL_TRANSFER` (Task 1).
- Produces: `ManualTransferMethod implements FamilyPaymentMethod`, `key = PAYMENT_METHOD_MANUAL_TRANSFER`.
  - `isEnabled(org)`: same shape as `ReceiptUploadMethod` — true when `org.enabledFamilyPaymentMethods` includes the key (no DB read; per-config enablement is a separate read path, not this check).
  - `initiate(input)`: reads `input.meta?.paymentMethodConfigId` (string), throws `BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND)` if missing/not found for the org, throws `BillingErrors.PAYMENT_METHOD_CONFIG_DISABLED` if the config's `enabled` is false. On success, creates a `FamilyPayment` with `status: AWAITING_RECEIPT`, `method: PAYMENT_METHOD_MANUAL_TRANSFER`, `paymentMethodConfigId`, `methodSnapshot: { label: config.label, fields: config.fields }`. Returns `{ kind: 'AWAIT_RECEIPT', paymentId }`.
- Produces on `FamilyPayment` entity: `paymentMethodConfigId: Types.ObjectId | null` (default null), `methodSnapshot: { label: string; fields: { key: string; label: string; type: string; value: string }[] } | null` (default null).
- Produces on `InitiatePaymentPayload` DTO: `@IsOptional() @IsObject() meta?: Record<string, unknown>`.

- [ ] **Step 1: Write the failing test** (mirror `receipt-upload.method.spec.ts` exactly):

```ts
import { BadRequestException } from '@nestjs/common';
import { BillingErrors, Currency, FamilyPaymentState, PAYMENT_METHOD_MANUAL_TRANSFER } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ManualTransferMethod } from './manual-transfer.method';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYER = new Types.ObjectId();
const CONFIG = new Types.ObjectId();

const input = {
  organizationId: String(ORG),
  familyId: String(FAMILY),
  amountMinor: 10_000,
  currency: Currency.EGP,
  payerId: String(PAYER),
  meta: { paymentMethodConfigId: String(CONFIG) },
};

describe('ManualTransferMethod', () => {
  it('is registered under the shared key', () => {
    const { method } = makeMethod();
    expect(method.key).toBe(PAYMENT_METHOD_MANUAL_TRANSFER);
  });

  it('refuses initiate without a config id', async () => {
    const { method } = makeMethod();
    await expect(method.initiate({ ...input, meta: {} })).rejects.toThrow(
      new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND)
    );
  });

  it('refuses a disabled config', async () => {
    const { method } = makeMethod({ config: { _id: CONFIG, enabled: false, label: 'InstaPay', fields: [] } });
    await expect(method.initiate(input)).rejects.toThrow(new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_DISABLED));
  });

  it('creates a payment snapshotting the config fields', async () => {
    const { method, created } = makeMethod({
      config: { _id: CONFIG, enabled: true, label: 'InstaPay', fields: [{ key: 'transferNumber', label: 'Number', type: 'TEXT', value: '0100' }] },
    });
    const result = await method.initiate(input);
    expect(created[0]).toMatchObject({
      method: PAYMENT_METHOD_MANUAL_TRANSFER,
      status: FamilyPaymentState.AWAITING_RECEIPT,
      paymentMethodConfigId: CONFIG,
      methodSnapshot: { label: 'InstaPay', fields: [{ key: 'transferNumber', label: 'Number', type: 'TEXT', value: '0100' }] },
    });
    expect(result).toEqual({ kind: 'AWAIT_RECEIPT', paymentId: String(created[0]._id) });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/server/src/billing/payment/methods/manual-transfer.method.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add `paymentMethodConfigId`/`methodSnapshot` to `payment.entity.ts`**, add `meta` to `InitiatePaymentPayload` in `billing.dto.ts` (`@IsOptional() @IsObject() meta?: Record<string, unknown>;`), then implement `ManualTransferMethod` per the interfaces above, injecting `PaymentMethodConfigService`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/server/src/billing/payment/methods/manual-transfer.method.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/billing/payment/methods/manual-transfer.method.ts apps/server/src/billing/payment/methods/manual-transfer.method.spec.ts apps/server/src/billing/entities/payment.entity.ts apps/server/src/billing/dto/billing.dto.ts
git commit -m "feat(billing): add ManualTransferMethod payment strategy"
```

---

### Task 5: Forward `meta` through `FamilyPaymentService.initiate()`, extend retry and filtered review queue

**Files:**
- Modify: `apps/server/src/billing/payment/family-payment.service.ts:53-59` (initiate forwards `meta`)
- Modify: `apps/server/src/billing/payment/family-payment.service.ts:81-85` (`attachReceipt` accepts `REJECTED`)
- Modify: `apps/server/src/billing/payment/family-payment.service.ts:88-97` (`reviewQueue` accepts filters)
- Modify: `apps/server/src/billing/dto/billing.dto.ts` (`ReviewQueueFilterPayload`)
- Test: `apps/server/src/billing/payment/family-payment.service.spec.ts`

**Interfaces:**
- Consumes: nothing new beyond Task 4's entity fields.
- Produces: `FamilyPaymentService.initiate()` passes `meta: dto.meta` into `registry.get(dto.method).initiate({...})`.
- Produces: `FamilyPaymentService.attachReceipt()` accepts current status `AWAITING_RECEIPT | PENDING_REVIEW | REJECTED`; when previous status was `REJECTED`, also `$set: { rejectReason: null }` alongside the existing `receiptFileKey`/`status` update.
- Produces: `FamilyPaymentService.reviewQueue(actor: BillingActor, filter?: { status?: FamilyPaymentState; groupId?: string }): Promise<FamilyPayment[]>`. `groupId` filters by checking the ledger charge(s) tied to the payment's family belong to that group — simplest correct approach: join against `LedgerEntry` where `groupId` matches and `familyId` matches the payment's family (reuse existing `LedgerEntry` model, already injected in the billing module). Default (no filter) preserves today's behavior: `status: PENDING_REVIEW` only, sorted by `createdAt`.
- Produces: `ReviewQueueFilterPayload { @IsOptional() @IsEnum(FamilyPaymentState) status?: FamilyPaymentState; @IsOptional() @IsMongoId() groupId?: string }` in `billing.dto.ts`.

- [ ] **Step 1: Write the failing tests** (add to `family-payment.service.spec.ts`, near the existing `initiate`/`attachReceipt` describe blocks):

```ts
it('forwards meta to the method strategy', async () => {
  const { service, registry } = makeService();
  const initiate = jest.fn(async () => ({ kind: 'AWAIT_RECEIPT' as const, paymentId: String(PAYMENT) }));
  registry.get.mockReturnValueOnce({ key: 'MANUAL_TRANSFER', isEnabled: () => true, initiate } as never);
  await service.initiate(actor(FAMILY, Roles.PARENT), {
    method: 'MANUAL_TRANSFER',
    amountMinor: 10_000,
    currency: Currency.EGP,
    meta: { paymentMethodConfigId: 'abc' },
  });
  expect(initiate).toHaveBeenCalledWith(expect.objectContaining({ meta: { paymentMethodConfigId: 'abc' } }));
});

describe('FamilyPaymentService.attachReceipt retry', () => {
  it('accepts a new receipt on a rejected payment and clears the reason', async () => {
    const { service, paymentModel } = makeServiceWithPayment({ status: FamilyPaymentState.REJECTED, rejectReason: 'blurry image' });
    await service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), 'new-key.png');
    expect(paymentModel.updateOne).toHaveBeenCalledWith(
      { _id: PAYMENT },
      { $set: { receiptFileKey: 'new-key.png', status: FamilyPaymentState.PENDING_REVIEW, rejectReason: null } }
    );
  });
});

describe('FamilyPaymentService.reviewQueue filters', () => {
  it('defaults to PENDING_REVIEW only, as before', async () => {
    const { service, paymentModel } = makeService();
    await service.reviewQueue(actor(FAMILY, Roles.ACCOUNTANT));
    expect(paymentModel.find).toHaveBeenCalledWith(expect.objectContaining({ status: FamilyPaymentState.PENDING_REVIEW }));
  });

  it('applies an explicit status filter', async () => {
    const { service, paymentModel } = makeService();
    await service.reviewQueue(actor(FAMILY, Roles.ACCOUNTANT), { status: FamilyPaymentState.REJECTED });
    expect(paymentModel.find).toHaveBeenCalledWith(expect.objectContaining({ status: FamilyPaymentState.REJECTED }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest apps/server/src/billing/payment/family-payment.service.spec.ts`
Expected: FAIL on the three new cases.

- [ ] **Step 3: Implement the three changes** in `family-payment.service.ts` per the Interfaces block above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest apps/server/src/billing/payment/family-payment.service.spec.ts`
Expected: PASS (all cases, including pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/billing/payment/family-payment.service.ts apps/server/src/billing/dto/billing.dto.ts apps/server/src/billing/payment/family-payment.service.spec.ts
git commit -m "feat(billing): forward meta on initiate, allow retry after reject, filter review queue"
```

---

### Task 6: `BillingSettingsService` (fixes the dead `onSave` bug)

**Files:**
- Create: `apps/server/src/billing/settings/billing-settings.service.ts`
- Test: `apps/server/src/billing/settings/billing-settings.service.spec.ts`
- Modify: `apps/server/src/billing/dto/billing.dto.ts`

**Interfaces:**
- Consumes: `Organization` model (already injected in `billing.module.ts`), `BillingActor`.
- Produces:
  ```ts
  class BillingSettingsService {
    get(actor: BillingActor): Promise<{ enabledFamilyPaymentMethods: string[]; academyFeeGatewayProvider: PaymentProvider | null }>;
    update(actor: BillingActor, dto: UpdateBillingSettingsPayload): Promise<{ enabledFamilyPaymentMethods: string[]; academyFeeGatewayProvider: PaymentProvider | null }>;
  }
  ```
- Produces `UpdateBillingSettingsPayload { @IsArray() @IsString({ each: true }) enabledFamilyPaymentMethods: string[]; @IsOptional() @IsEnum(PaymentProvider) academyFeeGatewayProvider?: PaymentProvider | null }` in `billing.dto.ts`.

- [ ] **Step 1: Write the failing test**:

```ts
describe('BillingSettingsService.update', () => {
  it('persists enabled methods and gateway provider to the organization', async () => {
    const { service, orgModel } = makeService();
    await service.update(actor(), { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD', 'MANUAL_TRANSFER'], academyFeeGatewayProvider: null });
    expect(orgModel.updateOne).toHaveBeenCalledWith(
      { _id: oid(ORG) },
      { $set: { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD', 'MANUAL_TRANSFER'], academyFeeGatewayProvider: null } }
    );
  });
});

describe('BillingSettingsService.get', () => {
  it('reads the organization’s current settings', async () => {
    const { service } = makeService({ org: { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'], academyFeeGatewayProvider: null } });
    await expect(service.get(actor())).resolves.toEqual({ enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'], academyFeeGatewayProvider: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/server/src/billing/settings/billing-settings.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `BillingSettingsService`** using `@InjectModel(Organization.name)`, matching the `oid()` helper convention used throughout billing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/server/src/billing/settings/billing-settings.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/billing/settings/ apps/server/src/billing/dto/billing.dto.ts
git commit -m "feat(billing): add BillingSettingsService to persist payment method settings"
```

---

### Task 7: Wire new providers into `billing.module.ts` and expose message patterns

**Files:**
- Modify: `apps/server/src/billing/billing.module.ts`
- Modify: `apps/server/src/billing/billing.controller.message.ts`
- Test: `apps/server/src/billing/billing.controller.message.spec.ts`

**Interfaces:**
- Consumes: `PaymentMethodConfigService` (Task 3), `ManualTransferMethod` (Task 4), `BillingSettingsService` (Task 6).
- Produces message patterns (guard: `MANAGE`/`BILLING` for admin-only ones, `READ`/`BILLING` for reads, matching existing conventions in the file):
  - `billing.settings.get` → `BillingSettingsService.get`
  - `billing.settings.update` → `BillingSettingsService.update`
  - `billing.paymentMethodConfigs.list` → `PaymentMethodConfigService.listForOrg`
  - `billing.paymentMethodConfigs.upsertFields` (payload `{ configId, fields }`)
  - `billing.paymentMethodConfigs.setEnabled` (payload `{ configId, enabled }`)
  - `billing.paymentMethodConfigs.createCustom` (payload `{ label, fields }`)
  - `billing.payments.queue` extended to accept `ReviewQueueFilterPayload` (optional payload, same pattern name — confirm `@Payload` becomes optional via `@IsOptional()` on all filter fields).

- [ ] **Step 1: Write the failing test** in `billing.controller.message.spec.ts` (follow the file's existing per-pattern assertion style — check it calls the right service method with the actor and payload):

```ts
it('billing.settings.update delegates to BillingSettingsService.update', () => {
  const { controller, billingSettings } = makeController();
  controller.updateSettings({ enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'] } as never, context());
  expect(billingSettings.update).toHaveBeenCalledWith(expect.anything(), { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'] });
});

it('billing.paymentMethodConfigs.list delegates to PaymentMethodConfigService.listForOrg', () => {
  const { controller, configs } = makeController();
  controller.listPaymentMethodConfigs(context());
  expect(configs.listForOrg).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/server/src/billing/billing.controller.message.spec.ts`
Expected: FAIL — methods don't exist on controller.

- [ ] **Step 3: Register the three new services/providers in `billing.module.ts`** (add `PaymentMethodConfigService`, `ManualTransferMethod`, `BillingSettingsService` to `providers`, add `ManualTransferMethod` to the `FAMILY_PAYMENT_METHODS` factory array alongside `receipt`/`gateway`, export `PaymentMethodConfigService` and `BillingSettingsService`), then add the corresponding controller methods in `billing.controller.message.ts` per the Interfaces block, injecting the new services in the constructor.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/server/src/billing/billing.controller.message.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/billing/billing.module.ts apps/server/src/billing/billing.controller.message.ts apps/server/src/billing/billing.controller.message.spec.ts
git commit -m "feat(billing): wire manual transfer, config, and settings services into module and controller"
```

---

### Task 8: `GroupStateService` merges UNDER_REVIEW into derived payment status

**Files:**
- Modify: `apps/server/src/academics/group/group-state.service.ts:31-46`
- Test: `apps/server/src/academics/group/group-state.service.spec.ts`

**Interfaces:**
- Consumes: `FamilyPaymentStatusService` (existing injection) — add one new method on it, see below.
- Consumes (new, on `FamilyPaymentStatusService`): `hasPendingReview(groupId: string, studentIds: string[]): Promise<Set<string>>` — returns the subset of `studentIds` with a `FamilyPayment` in `PENDING_REVIEW` whose family has an active subscription covering this group. Implementation: factor `forGroup()`'s existing subscription lookup (lines computing `subscriptionByStudent`/`familySubToStudents` from active `BillingSubscription` docs where `items.groupId` matches) into a shared private helper both methods call; `hasPendingReview` then queries `FamilyPayment` for `status: PENDING_REVIEW` and `familyId: { $in: [...family ids from that lookup] }`, and returns the student ids whose family appears among the results (a FAMILY-type subscription's pending payment marks every sibling in `familySubToStudents`, same fan-out `forGroup()` already does for charges).
- Produces: `withDerivedPaymentStatus()` now does, for each student whose computed status is `UNPAID`: if `hasPendingReview` includes them, set `GroupPaymentStatus.UNDER_REVIEW`; else keep `UNPAID`. `PAID` students are never overridden (an approved payment already settles; a lingering pending row for a different charge on a PAID student still shows PAID — matches ledger truth).

- [ ] **Step 1: Write the failing test** in `group-state.service.spec.ts` (mirror the existing `withDerivedPaymentStatus`/`syncReadiness` test shape — check what mocks exist first and match them):

```ts
it('shows UNDER_REVIEW for an unpaid student with a pending manual-transfer payment', async () => {
  const { service, paymentStatus } = makeService();
  paymentStatus.forGroup.mockResolvedValueOnce(new Map([[String(studentId), FamilyPaymentStatus.UNPAID]]));
  paymentStatus.hasPendingReview.mockResolvedValueOnce(new Set([String(studentId)]));
  const result = await service.withDerivedPaymentStatus(groupWith([studentId]));
  expect(result.students[0].paymentStatus).toBe(GroupPaymentStatus.UNDER_REVIEW);
});

it('never overrides PAID with UNDER_REVIEW', async () => {
  const { service, paymentStatus } = makeService();
  paymentStatus.forGroup.mockResolvedValueOnce(new Map([[String(studentId), FamilyPaymentStatus.PAID]]));
  paymentStatus.hasPendingReview.mockResolvedValueOnce(new Set([String(studentId)]));
  const result = await service.withDerivedPaymentStatus(groupWith([studentId]));
  expect(result.students[0].paymentStatus).toBe(GroupPaymentStatus.PAID);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/server/src/academics/group/group-state.service.spec.ts`
Expected: FAIL — `paymentStatus.hasPendingReview` mock doesn't exist / behavior not implemented.

- [ ] **Step 3: Add `hasPendingReview()` to `FamilyPaymentStatusService`** (new file section, following `forGroup()`'s query style — query `FamilyPayment` for `status: PENDING_REVIEW` joined to the same subscription-derived family/student mapping already computed in `forGroup()`; simplest correct implementation: compute `forGroup()`'s existing `subscriptionByStudent`/`familySubToStudents` maps, then query pending `FamilyPayment` by `familyId` for those families and intersect back to student ids). Then update `withDerivedPaymentStatus()` in `group-state.service.ts` to call both and merge per the Interfaces block.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/server/src/academics/group/group-state.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full billing + academics suite to confirm no regressions**

Run: `npx jest apps/server/src/billing apps/server/src/academics`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/academics/group/group-state.service.ts apps/server/src/academics/group/group-state.service.spec.ts apps/server/src/billing/status/family-payment-status.service.ts apps/server/src/billing/status/family-payment-status.service.spec.ts
git commit -m "feat(academics): derive UNDER_REVIEW payment status from pending manual-transfer payments"
```

---

### Task 9: Client types, actions, hooks

**Files:**
- Modify: `apps/client/src/lib/types/billing/billing.ts`
- Create: `apps/client/src/lib/types/billing/payment-method-config.ts`
- Modify: `apps/client/src/lib/actions/billing/billing.action.ts`
- Modify: `apps/client/src/lib/hooks/billing/use-billing.hook.ts`
- Test: `apps/client/src/lib/hooks/billing/use-billing.hook.test.ts`

**Interfaces:**
- Produces (`payment-method-config.ts`):
  ```ts
  export type PaymentMethodFieldType = 'TEXT' | 'IMAGE' | 'LINK';
  export interface IPaymentMethodField { key: string; label: string; type: PaymentMethodFieldType; value: string; order: number }
  export interface IPaymentMethodConfig { _id: string; key: string; kind: 'BUILT_IN' | 'CUSTOM'; label: string; enabled: boolean; fields: IPaymentMethodField[] }
  ```
- Modifies `billing.ts`: `InitiatePaymentFormValues.meta?: Record<string, unknown>`; `IFamilyPayment.methodSnapshot?: { label: string; fields: IPaymentMethodField[] } | null`, `paymentMethodConfigId?: string | null`.
- Produces in `billing.action.ts` (follow existing `'use server'` + `createAuthorizedNatsRequest` pattern exactly):
  - `getBillingSettings()`, `updateBillingSettings(data)`
  - `listPaymentMethodConfigs()`, `upsertPaymentMethodConfigFields(configId, fields)`, `setPaymentMethodConfigEnabled(configId, enabled)`, `createCustomPaymentMethodConfig(label, fields)`
  - `getReceiptQueue(filter?: { status?: string; groupId?: string })` — extend existing function signature, forward filter as the NATS payload.
- Produces in `use-billing.hook.ts`:
  - `billingKeys.paymentMethodConfigs`, `billingKeys.settings`
  - `usePaymentMethodConfigs()`, `useUpdateBillingSettings()`, `useUpsertPaymentMethodConfigFields()`, `useSetPaymentMethodConfigEnabled()`, `useCreateCustomPaymentMethodConfig()`
  - `useReceiptQueue(filter?: { status?: string; groupId?: string }, enabled = true)` — extended signature, included in the query key.

- [ ] **Step 1: Write the failing test** in `use-billing.hook.test.ts` (match the file's existing test shape — check it first for the exact mocking pattern used for `useReceiptQueue`):

```ts
it('useReceiptQueue includes the filter in its query key', () => {
  // follow existing renderHook + queryClient pattern in this file
  // assert billingApi.getReceiptQueue was called with the filter object
});

it('usePaymentMethodConfigs fetches and unwraps the config list', () => {
  // mirror useMethods' existing test
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/client/src/lib/hooks/billing/use-billing.hook.test.ts`
Expected: FAIL — new exports don't exist.

- [ ] **Step 3: Implement the type/action/hook additions** per the Interfaces block, matching each file's existing conventions exactly (no new patterns).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/client/src/lib/hooks/billing/use-billing.hook.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/lib/types/billing/ apps/client/src/lib/actions/billing/billing.action.ts apps/client/src/lib/hooks/billing/use-billing.hook.ts apps/client/src/lib/hooks/billing/use-billing.hook.test.ts
git commit -m "feat(billing-client): add payment method config types, actions, and hooks"
```

---

### Task 10: Shared `PaymentStatusBadge` component

**Files:**
- Create: `apps/client/src/components/organs/billing/payment-status-badge.tsx`
- Test: `apps/client/src/components/organs/billing/payment-status-badge.test.tsx`
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json` (`Billing.status.UNDER_REVIEW`)

**Interfaces:**
- Consumes: `GroupPaymentStatus` or raw string status from either `GroupPaymentStatus` (PAID/UNPAID/UNDER_REVIEW) call sites.
- Produces: `PaymentStatusBadge({ status }: { status: 'PAID' | 'UNPAID' | 'UNDER_REVIEW' }): JSX.Element` — renders the existing PAID (emerald) / UNPAID (destructive) styles from `subscriptions-card.tsx:108-117`, plus a new amber/orange style for `UNDER_REVIEW`, each with translated text via `t('status.PAID' | 'status.UNPAID' | 'status.UNDER_REVIEW')` under the `Billing` namespace.

- [ ] **Step 1: Write the failing test**:

```tsx
it('renders the under-review label and styling for UNDER_REVIEW', () => {
  render(<PaymentStatusBadge status="UNDER_REVIEW" />);
  expect(screen.getByText(/under review/i)).toBeInTheDocument();
});

it('renders paid/unpaid as before', () => {
  render(<PaymentStatusBadge status="PAID" />);
  expect(screen.getByText(/paid/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/client/src/components/organs/billing/payment-status-badge.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PaymentStatusBadge`**, add `"UNDER_REVIEW": "Under Review"` / `"UNDER_REVIEW": "قيد المراجعة"` under `Billing.status` in both message files.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/client/src/components/organs/billing/payment-status-badge.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/components/organs/billing/payment-status-badge.tsx apps/client/src/components/organs/billing/payment-status-badge.test.tsx apps/client/messages/en.json apps/client/messages/ar.json
git commit -m "feat(billing-client): add shared PaymentStatusBadge with UNDER_REVIEW support"
```

---

### Task 11: Use `PaymentStatusBadge` in roster, subscriptions table, receipts queue

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/students-card.tsx:82-88`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/subscriptions-card.tsx:103-119`
- Modify: `apps/client/src/components/organs/billing/receipt-queue.tsx`
- Test: `apps/client/src/components/organs/billing/receipt-queue.test.tsx`

**Interfaces:**
- Consumes: `PaymentStatusBadge` from Task 10.
- Produces: `students-card.tsx`'s payment cell renders `<PaymentStatusBadge status={student.paymentStatus} />` instead of the inline ternary.
- Produces: `subscriptions-card.tsx`'s payment cell renders `<PaymentStatusBadge status={status ?? 'UNPAID'} />` instead of its inline ternary (the `status` variable's type now includes `UNDER_REVIEW`, already true since it comes from `GroupPaymentStatus`).
- Produces: `receipt-queue.tsx` gains a status filter control (`select` of ALL/PENDING_REVIEW/CONFIRMED/REJECTED) above the list, calling `onFilterChange`, and each `ReceiptRow` shows the payment's `method`/`methodSnapshot?.label` instead of the raw `payment.method` string when present.

- [ ] **Step 1: Write the failing test** in `receipt-queue.test.tsx` (extend existing file's render-based assertions):

```tsx
it('shows the manual transfer method label from the snapshot when present', () => {
  const payment = { ...basePayment, method: 'MANUAL_TRANSFER', methodSnapshot: { label: 'InstaPay', fields: [] } };
  render(<ReceiptQueue payments={[payment]} onApprove={jest.fn()} onReject={jest.fn()} />);
  expect(screen.getByText('InstaPay')).toBeInTheDocument();
});

it('calls onFilterChange when a status is selected', () => {
  const onFilterChange = jest.fn();
  render(<ReceiptQueue payments={[]} onApprove={jest.fn()} onReject={jest.fn()} onFilterChange={onFilterChange} />);
  fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'REJECTED' } });
  expect(onFilterChange).toHaveBeenCalledWith('REJECTED');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/client/src/components/organs/billing/receipt-queue.test.tsx`
Expected: FAIL — new props/behavior don't exist.

- [ ] **Step 3: Implement the three component changes** per the Interfaces block.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/client/src/components/organs/billing/receipt-queue.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/students-card.tsx apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/subscriptions-card.tsx apps/client/src/components/organs/billing/receipt-queue.tsx apps/client/src/components/organs/billing/receipt-queue.test.tsx
git commit -m "feat(billing-client): adopt shared status badge and add receipts filter/method label"
```

---

### Task 12: Admin field-builder — `PaymentMethodConfigManager`

**Files:**
- Create: `apps/client/src/components/organs/billing/payment-method-config-manager.tsx`
- Test: `apps/client/src/components/organs/billing/payment-method-config-manager.test.tsx`

**Interfaces:**
- Consumes: `usePaymentMethodConfigs`, `useUpsertPaymentMethodConfigFields`, `useSetPaymentMethodConfigEnabled`, `useCreateCustomPaymentMethodConfig` (Task 9), `uploadFileToS3` (existing, for IMAGE-type field values), `IPaymentMethodConfig`/`IPaymentMethodField` (Task 9).
- Produces: `PaymentMethodConfigManager(): JSX.Element` — lists every config (built-in + custom) with an enable toggle; each row expands to a field editor: existing fields shown as label+type+value rows with edit/remove, an "Add field" control (label input, type select, value input — text input or image upload depending on type), and an "Add method" button at the bottom opening a label input + empty field list to build a new custom method.

- [ ] **Step 1: Write the failing test**:

```tsx
it('toggles a built-in method enabled', () => {
  // render with a mocked INSTAPAY config, fire the toggle, assert useSetPaymentMethodConfigEnabled mutate called with (configId, true)
});

it('adds a field to a method and saves', () => {
  // open InstaPay's field editor, add a field, click save, assert useUpsertPaymentMethodConfigFields mutate called with the new fields array including the added one
});

it('creates a custom method with a label and no fields', () => {
  // click "Add method", type a label, submit, assert useCreateCustomPaymentMethodConfig mutate called with (label, [])
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/client/src/components/organs/billing/payment-method-config-manager.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PaymentMethodConfigManager`** following the form patterns already used in `subscription-form.tsx` (controlled inputs, local state per row, `onSubmit` mutate calls).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/client/src/components/organs/billing/payment-method-config-manager.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/components/organs/billing/payment-method-config-manager.tsx apps/client/src/components/organs/billing/payment-method-config-manager.test.tsx
git commit -m "feat(billing-client): add admin payment method field-builder UI"
```

---

### Task 13: Wire `BillingSettingsForm.onSave` and embed `PaymentMethodConfigManager`

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/__components/billing-settings-form.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/page.tsx`
- Test: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/__components/billing-settings-form.test.tsx` (new, since none currently exists)

**Interfaces:**
- Consumes: `useBillingSettings` (new query hook, add alongside Task 9's mutation hooks: `useBillingSettings()` fetching `getBillingSettings()`), `useUpdateBillingSettings`, `PaymentMethodConfigManager` (Task 12).
- Produces: `page.tsx` becomes an async server component that fetches initial settings server-side (matching `plan/page.tsx`'s pattern of server-fetching then passing props) and renders `<BillingSettingsForm initialEnabledMethods={...} initialGatewayProvider={...} />` with no `onSave` prop needed — the form itself calls `useUpdateBillingSettings().mutate()` directly on submit instead of relying on an external callback (removing the dead-callback design entirely rather than just filling it in).
- Produces: `BillingSettingsForm` renders `<PaymentMethodConfigManager />` below the existing method checkboxes/gateway select.

- [ ] **Step 1: Write the failing test**:

```tsx
it('calls the update mutation on save with the selected methods', () => {
  // render form, check MANUAL_TRANSFER, click save, assert useUpdateBillingSettings().mutate called with { enabledFamilyPaymentMethods: [...], academyFeeGatewayProvider: null }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/__components/billing-settings-form.test.tsx`
Expected: FAIL — save still does nothing (confirms the original bug before the fix).

- [ ] **Step 3: Implement the wiring** per the Interfaces block — this is the fix for the bug reported earlier in the conversation ("Bank Transfer / Receipt is selected and still in the parent account there's no payment options").

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/__components/billing-settings-form.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/app/[locale]/(dashboard)/organization-dashboard/settings/payments/
git commit -m "fix(billing-client): persist payment method settings on save, embed method manager"
```

---

### Task 14: Parent-side manual transfer pay panel

**Files:**
- Create: `apps/client/src/components/organs/billing/manual-transfer-pay-panel.tsx`
- Test: `apps/client/src/components/organs/billing/manual-transfer-pay-panel.test.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/payments/__components/pay-dialog.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/payments/page.tsx`

**Interfaces:**
- Consumes: `usePaymentMethodConfigs` (Task 9, filtered client-side to `enabled: true`), `useInitiatePayment`, `useAttachReceipt` (existing), `uploadFileToS3` (existing).
- Produces: `ManualTransferPayPanel({ config, amountMinor, currency, onSubmitted }: { config: IPaymentMethodConfig; amountMinor: number; currency: Currency; onSubmitted: () => void })` — renders each of `config.fields` read-only (TEXT as plain text, IMAGE as an `<img>`, LINK as an anchor), then a single file input + submit button. On submit: `initiate({ method: 'MANUAL_TRANSFER', amountMinor, currency, meta: { paymentMethodConfigId: config._id } })`, then `uploadFileToS3`, then `attachReceipt({ paymentId, fileKey })`, then `onSubmitted()`.
- Modifies `pay-dialog.tsx`: when the selected method key is a manual-transfer config's key (not `RECEIPT_UPLOAD`/`ONLINE_GATEWAY`), render `ManualTransferPayPanel` instead of the current generic method list item, listing each enabled `IPaymentMethodConfig` as its own selectable option (so InstaPay/Wallet Transfer/custom methods appear as distinct choices, not one grouped "manual transfer" entry).
- Modifies `payments/page.tsx`: the ledger/statement view shows `rejectReason` on a `REJECTED` payment row and a "Retry" action that reopens `ManualTransferPayPanel` for that same payment (passing the existing `paymentId` through to `attachReceipt` instead of calling `initiate` again).

- [ ] **Step 1: Write the failing test**:

```tsx
it('renders the configured fields read-only', () => {
  const config = { _id: '1', key: 'INSTAPAY', kind: 'BUILT_IN', label: 'InstaPay', enabled: true, fields: [{ key: 'transferNumber', label: 'Number', type: 'TEXT', value: '0100000000', order: 0 }] };
  render(<ManualTransferPayPanel config={config} amountMinor={10000} currency="EGP" onSubmitted={jest.fn()} />);
  expect(screen.getByText('0100000000')).toBeInTheDocument();
});

it('initiates then attaches the uploaded image on submit', async () => {
  // mock useInitiatePayment / useAttachReceipt / uploadFileToS3, select a file, submit, assert call order
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/client/src/components/organs/billing/manual-transfer-pay-panel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ManualTransferPayPanel`** and wire it into `pay-dialog.tsx` and `payments/page.tsx` per the Interfaces block.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/client/src/components/organs/billing/manual-transfer-pay-panel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/components/organs/billing/manual-transfer-pay-panel.tsx apps/client/src/components/organs/billing/manual-transfer-pay-panel.test.tsx apps/client/src/app/[locale]/(dashboard)/parent-dashboard/payments/
git commit -m "feat(billing-client): add parent manual transfer pay panel with retry support"
```

---

### Task 15: Group-scoped review modal

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.tsx`
- Test: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.test.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/subscriptions-card.tsx`

**Interfaces:**
- Consumes: `useReceiptQueue({ groupId }, ...)` (Task 9's extended signature), `useApprovePayment`, `useRejectPayment` (existing), `ReceiptQueue` component (Task 11 — reused, not duplicated, per the design doc's "both" decision).
- Produces: `ReviewPaymentsModal({ groupId, open, onOpenChange }: { groupId: string; open: boolean; onOpenChange: (open: boolean) => void })` — a `Dialog` wrapping `<ReceiptQueue payments={...} onApprove={...} onReject={...} />` scoped to `useReceiptQueue({ groupId })`.
- Produces: `subscriptions-card.tsx` gains a "Review payments" button (near the existing "New Subscription" button) showing a pending count badge (`useReceiptQueue({ groupId: group._id, status: 'PENDING_REVIEW' }).data?.length`), opening `ReviewPaymentsModal`.

- [ ] **Step 1: Write the failing test**:

```tsx
it('shows only this group’s pending payments', () => {
  // render with mocked useReceiptQueue returning a fixed list, assert it was called with { groupId }
});

it('approve/reject call the existing mutations', () => {
  // click approve on a row, assert useApprovePayment().mutate called with the paymentId
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ReviewPaymentsModal`** and the `subscriptions-card.tsx` entry point per the Interfaces block.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.tsx apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/review-payments-modal.test.tsx apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/subscriptions-card.tsx
git commit -m "feat(billing-client): add group-scoped payment review modal"
```

---

### Task 16: i18n completeness pass

**Files:**
- Modify: `apps/client/messages/en.json`
- Modify: `apps/client/messages/ar.json`

**Interfaces:**
- Produces every new translation key referenced by Tasks 10–15: `Billing.method.MANUAL_TRANSFER`, `Billing.method.INSTAPAY`, `Billing.method.WALLET_TRANSFER`, `Billing.addMethod`, `Billing.addField`, `Billing.fieldLabel`, `Billing.fieldType`, `Billing.fieldValue`, `Billing.reviewPayments`, `Billing.retry`, `Billing.rejectedReason`, `Billing.filterByStatus`, `Billing.statusAll`.

- [ ] **Step 1: Grep every `t('...')` / `useTranslations('Billing')` call added in Tasks 10–15**

Run: `git diff --stat HEAD~6..HEAD -- apps/client/src/components/organs/billing apps/client/src/app/'[locale]'` (adjust range to cover Tasks 10–15's commits) and manually list every new `t(...)` key used.

- [ ] **Step 2: Add each missing key** to both `en.json` and `ar.json` under the `Billing` namespace, matching the existing key style (short, camelCase, no nesting beyond one level unless following `type`/`method`/`status`/`charge`/`entry` sub-objects already present).

- [ ] **Step 3: Run the full client test suite to confirm no `next-intl` missing-key errors in tests that render these components**

Run: `npx jest apps/client/src/components/organs/billing apps/client/src/app/'[locale]'/'(dashboard)'/organization-dashboard/academics/groups apps/client/src/app/'[locale]'/'(dashboard)'/organization-dashboard/settings apps/client/src/app/'[locale]'/'(dashboard)'/parent-dashboard/payments`
Expected: PASS, no missing-translation warnings in output.

- [ ] **Step 4: Commit**

```bash
git add apps/client/messages/en.json apps/client/messages/ar.json
git commit -m "feat(billing-client): add remaining translation keys for manual transfer payments"
```

---

### Task 17: Full-suite regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full server test suite**

Run: `cd apps/server && npx jest`
Expected: PASS, including every pre-existing billing/academics spec (confirms `isStudentPaid()`, readiness, allocation logic untouched).

- [ ] **Step 2: Run the full client test suite**

Run: `cd apps/client && npx jest`
Expected: PASS.

- [ ] **Step 3: Run typecheck/lint on both apps**

Run: `npx nx run-many -t typecheck,lint -p server,client` (or the project's existing equivalent script — check `package.json` for the exact command before running).
Expected: PASS, no new errors.

- [ ] **Step 4: Manually verify the five Review Focus scenarios** from the plan header against the running app (dev server), per `superpowers:verification-before-completion` before claiming done:
  1. Enable Wallet Transfer with an empty required field — confirm the save UI flags it.
  2. Submit two manual-transfer payments for the same charge, approve one — confirm the other still shows correctly and the student is PAID.
  3. Reject a payment, re-upload — confirm it returns to PENDING_REVIEW / "Under review" and the old reason disappears from the active state.
  4. Disable a `PaymentMethodConfig` referenced by a pending payment — confirm the review queue still renders that payment's snapshot.
  5. Create a custom method with zero fields, select it as a parent — confirm no crash, just an empty fields panel plus the upload control.

- [ ] **Step 5: No commit** — this task is verification only; if any step fails, return to the owning task, fix, and re-run that task's own tests before re-running this task.
