# MVP Sub-project 6: Payments — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-project 1 (groups, students); Sub-project 2 (sessions, attendance, for per-session charges)
**Scope authority:** `docs/MVP.md` §3 row 6. The concept says the system "supports many subscription types (full course, monthly, per session, family, scholarship), a receipt-upload and approval flow, a student/family ledger, and automatic reminders."

## 1. Goal

The accountant subscribes a student in a group to one of the five subscription types and enters the amount. Charges are posted to the family's ledger. Parents pay by uploading a receipt or by paying online. Payments are recorded against the charges. A student's payment status in the group is then derived from the ledger, and it feeds the sub-project 1 readiness item "payments made". Parents get reminders automatically.

## 2. Out of scope

- Price lists, discount rules, refunds, invoices as documents, and multi-country accounting. Multi-country accounting is deferred to phase 2 by the concept.

## 3. Decisions (from your answers)

- **Amounts:** the accountant enters the amount on each subscription. There are no price lists.
- **Payment methods:** receipt upload **and** online gateway, built as **strategies** so that methods can be added or replaced without touching billing logic.

## 4. Payment method strategy (the extension point)

```ts
interface FamilyPaymentMethod {
  readonly key: string;                    // 'RECEIPT_UPLOAD' | 'ONLINE_GATEWAY' | future keys
  isEnabled(org: Organization): boolean;
  initiate(input: { family: FamilyRef; amount: number; currency: Currency; payer: UserDocument; meta?: object }):
    Promise<{ kind: 'REDIRECT'; url: string; paymentId: string } | { kind: 'AWAIT_RECEIPT'; paymentId: string }>;
}
```

- **Registry:** `FamilyPaymentMethodRegistry` collects every provider registered under the DI token `FAMILY_PAYMENT_METHODS`. `get(key)` returns a method, and `listEnabled(org)` returns the ones the organization has switched on.
- **Adding a method** means implementing the interface and registering the provider. Billing code never refers to concrete methods.
- **Methods shipped in the MVP:**
  - **`ReceiptUploadMethod`:** creates a `Payment` in `AWAITING_RECEIPT`. The parent uploads the receipt file through the existing `file` module (S3). The payment moves to `PENDING_REVIEW`, and the accountant approves or rejects it.
  - **`OnlineGatewayMethod`:** wraps the **existing** `PaymentOrchestratorService.createPaymentUrl`, using the new `PaymentPurpose.ACADEMY_FEE` and the provider the organization has configured (Paymob, PayPal, …). The webhook goes through the existing `processWebhook` flow. A new handler for `ACADEMY_FEE` marks the `Payment` as `CONFIRMED`.
- **Organization setting:** `enabledFamilyPaymentMethods: string[]`, defaulting to `['RECEIPT_UPLOAD']`, plus `academyFeeGatewayProvider?: PaymentProvider`.

## 5. Data model (new module `billing`)

### 5.1 Family

A family is identified by the **parent user** (`familyId = parentUserId`). A student without a linked parent is their own family (`familyId = studentId`). No new collection is needed.

### 5.2 Subscription

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `familyId` | ObjectId | |
| `items` | `[{ studentId, groupId }]` | exactly 1 item, except `FAMILY`, which has ≥ 2 items for children of the same family, possibly in different groups (assumption A1) |
| `type` | `FULL_COURSE \| MONTHLY \| PER_SESSION \| FAMILY \| SCHOLARSHIP` | |
| `amount` | number ≥ 0 | what it means depends on the type (§6.1) |
| `currency` | `Currency` | |
| `status` | `ACTIVE \| ENDED` | |
| `createdBy`, `note?` | | |

Each `{studentId, groupId}` can appear in only one `ACTIVE` subscription. A `FAMILY` charge is recorded against every one of its items for the payment-status calculation in §6.2. Each item counts as covered once the single family charge is fully covered.

### 5.3 LedgerEntry (append-only)

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `familyId` | ObjectId | |
| `studentId?`, `groupId?`, `subscriptionId?`, `sessionId?`, `paymentId?` | ObjectId | |
| `type` | `CHARGE \| PAYMENT \| ADJUSTMENT` | |
| `amount` | number | positive; `CHARGE` adds to what the family owes, `PAYMENT` reduces it; `ADJUSTMENT` carries a sign |
| `currency` | `Currency` | |
| `dueAt?` | Date | for charges |
| `description`, `createdBy`, `createdAt` | | |

Entries are never edited or deleted. A correction is made with an `ADJUSTMENT` (accountant only, reason required).

### 5.4 Payment

`{ organizationId, familyId, method: string, amount, currency, status: AWAITING_RECEIPT | PENDING_REVIEW | CONFIRMED | REJECTED | FAILED, receiptFileId?, gatewayPaymentId?, reviewedBy?, reviewedAt?, rejectReason?, payerId }`

When a payment reaches `CONFIRMED`, exactly one `PAYMENT` ledger entry is written for it.

### 5.5 Allocation

`{ paymentLedgerEntryId, chargeLedgerEntryId, amount }`. Payments are allocated to the family's open charges oldest-due-first (FIFO), in the same currency. Allocations are what let payroll's revenue share (sub-project 7) trace a payment back to a group.

## 6. Rules

### 6.1 Charges by subscription type

| Type | Charges posted |
|---|---|
| `FULL_COURSE` | one charge of `amount` when the subscription is created, due at the cohort's `startDate` |
| `MONTHLY` | one charge of `amount` when the subscription is created, due at `startDate`; then another on the 1st of each later month (group timezone) while the group is `RUNNING` |
| `PER_SESSION` | one charge of `amount` for every session that reaches `COMPLETED`, whatever the student's attendance was (decision D1), due when posted |
| `FAMILY` | one charge of `amount` for all the listed children when the subscription is created, due at the earliest `startDate` of their groups (assumption A1) |
| `SCHOLARSHIP` | the same as `FULL_COURSE`, but the amount may be 0, meaning a full scholarship |

A BullMQ daily job posts monthly charges. Per-session charges are posted when the session report completes the session (sub-project 2), and are idempotent per `{subscriptionId, sessionId}`.

### 6.2 Payment status in the group (replaces the sub-project 1 manual toggle)

A student's `paymentStatus` in a group is `PAID` when the student has an `ACTIVE` subscription in that group **and** every charge for that student in that group that is already due, or due at the cohort start, has been fully covered. A subscription whose charges total 0 counts as paid. Otherwise the status is `UNPAID`.

- **Where it's computed:** `paymentStatus` is calculated whenever the group is read. The sub-project 1 `PATCH …/payment-status` endpoint and the `GROUP_PAYMENT_STATUS` toggle are removed.
- **Effect on readiness:** the `PAYMENTS_MADE` readiness item reads the calculated value. Ledger writes trigger the readiness re-evaluation from sub-project 1 §5.2 and the task closing from sub-project 3.

### 6.3 Receipts

- **Parent:** uploads a receipt for an amount, which creates a `Payment` in `PENDING_REVIEW`.
- **Accountant:** approves it, which sets `CONFIRMED`, writes the ledger entry and allocates it. Or rejects it with a reason. The parent is notified in-app either way.

### 6.4 Reminders

A daily job sends one in-app notification per family per day, to the parent, when that family has charges that are past due and not fully covered. It sends on the due date and then every 3 days until paid (assumption A3). Reminders go through the existing `notification` module.

### 6.5 Permissions

- New subjects: `BILLING` (subscriptions, ledger, adjustments) and `FAMILY_PAYMENT`.
- **ACCOUNTANT, OWNER:** `MANAGE` both.
- **MANAGER:** `READ` both.
- **PARENT:** `READ` own family's ledger; `CREATE FAMILY_PAYMENT` for their own family.
- **Others:** no access. Content staff can't see financial data.

## 7. API

- `POST|GET|PATCH /billing/subscriptions` (`PATCH` only ends a subscription; the amount can't be changed after charges are posted).
- `GET /billing/families/:familyId/ledger`, which includes the balance per currency; `POST /billing/families/:familyId/adjustments`.
- `GET /billing/payment-methods`, which lists the organization's enabled methods; `POST /billing/payments`, with `{ method, amount, currency }`, which returns the result of `initiate`.
- `POST /billing/payments/:id/receipt`, with the file id; `POST /billing/payments/:id/approve`; `POST /billing/payments/:id/reject`.
- Webhook: the existing provider webhook routes, with the new `ACADEMY_FEE` handler.

## 8. Screens (en + ar)

- **Accountant:** a subscriptions tab on the group formation screen, showing each student's type, amount and calculated payment status. Also a family ledger page and a receipts review queue showing the uploaded image or PDF with approve and reject actions.
- **Parent:** a "Payments" page with the balance, the ledger and a "Pay" button. Pay shows the enabled methods; for a receipt it opens an upload form, and for online it redirects to the gateway.
- **Organization settings:** the enabled payment methods and the gateway provider.

## 9. Testing

- **Charges:** each subscription type posts the right charges; monthly posting is idempotent; a per-session charge is posted for a session the student was `ABSENT` from, and none for a `CANCELLED` session.
- **Allocation:** FIFO allocation, including a partial payment.
- **Payment status:** derivation, including a 0-amount scholarship.
- **Receipts:** approval writes exactly one ledger entry; rejection writes none.
- **Gateway:** the webhook confirms the payment, and a duplicate webhook has no further effect.
- **Strategy registry:** a fake method registered in a test is listed and can be initiated, which proves the extension point works.
- **Permissions:** a parent can't read another family's ledger.

## 10. Assumptions to confirm

- **A1:** `FAMILY` is one charge covering two or more children of the same parent.
- **D1 (decided 2026-10-13, supersedes the original assumption A2):** `PER_SESSION` bills every held session, including ones the student missed. A reserved seat is billable, and this keeps revenue aligned with payroll, which pays the teacher per held session. `CANCELLED` sessions are never billed.
- **A3:** Reminders are sent on the due date, then every 3 days, in-app only.
