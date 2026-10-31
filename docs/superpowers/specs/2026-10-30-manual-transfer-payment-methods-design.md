# Manual transfer payment methods (InstaPay, Wallet Transfer, custom)

## Intent and why

Today a family can pay tuition via `RECEIPT_UPLOAD` (generic bank-transfer
receipt) or `ONLINE_GATEWAY` (hosted checkout). The org has no way to tell a
parent *where* to send a manual transfer — no account number, no QR code, no
instructions — and the parent currently sees "No payment methods available"
even with receipt upload enabled, because the admin-facing settings form that
is supposed to configure `enabledFamilyPaymentMethods` has never actually been
wired to save anything (`BillingSettingsForm`'s `onSave` prop is passed
nowhere; no server action or message handler exists for it either).

The user wants two static manual-transfer methods, **InstaPay** and **Wallet
Transfer** ("vodafone cash"), that ship with a default field set (transfer
number, account name, QR code image, instructions/notes), plus the ability
for an admin to define **any number of additional custom methods** with
**arbitrary admin-defined fields** — and to edit the field set on any method,
including the two built-in ones. The parent picks one of the enabled
methods, sees whatever fields the admin filled in, and submits only a
transfer screenshot (no parent-side form fields). That submission moves the
payment to a visible "under review" state; staff review it from two entry
points (group page and the existing org-wide Receipts queue), approve or
reject with a required reason on reject, the parent is notified and sees the
reason, and a rejected payment can be retried by re-uploading against the
same payment record. Approval settles exactly like today's receipt-upload
approval (post to ledger, auto-allocate, flip to PAID once covered) — no new
settlement logic.

This is additive to the existing strategy-pattern payment-method
architecture (`FamilyPaymentMethod` interface + `FamilyPaymentMethodRegistry`,
`PAYMENT_METHOD_RECEIPT_UPLOAD` / `PAYMENT_METHOD_ONLINE_GATEWAY` as string
keys, explicitly documented in `billing.types.ts` as "adding a method is
implementing an interface and registering a provider, never editing a shared
enum"). It fits the user's standing payment-design preference (strategy
pattern, interchangeable methods) and the concept doc's MVP scope (payments),
so it is in-scope, not invented. Source of grounding for this design: the
conversation's own Q&A (quoted inline below), not assumption.

## Goals

- Org admin can configure **InstaPay** and **Wallet Transfer** as enabled
  payment methods, each with a default field set: transfer number, account
  holder name, QR code image, instructions/notes.
- Admin can **add, edit, remove, and reorder fields** on any manual-transfer
  method — including the two built-in ones — choosing a field type (text,
  image, link) and a label, per: *"he can add extra fields for whatever he
  want"*.
- Admin can **create new custom manual-transfer methods** from scratch, each
  with its own label and its own admin-defined field set, per: *"give the
  ability to add another as well"*.
- A parent, on the Payments page, sees every enabled method as an option;
  selecting a manual-transfer method displays the admin's configured field
  values (read-only) and a single image upload control. Per: *"image only"*.
- Submitting the image creates/updates a `FamilyPayment` whose state the
  parent sees as **"Under review"** (mapping to the existing
  `FamilyPaymentState.PENDING_REVIEW`, not a new enum value).
- Staff can review pending manual-transfer payments from **two places**:
  the existing org-wide Billing → Receipts queue, and a **group-scoped**
  modal reachable from the group detail page, both backed by the same
  underlying list/approve/reject endpoints. Per: *"both"*.
- Both review surfaces, plus the group roster's per-student payment column
  and the Subscriptions table, show a status that can be **PAID / UNPAID /
  UNDER REVIEW**, each filterable by status. Per: *"yes, with the ability to
  review, approve or reject, with ability to filter by status."*
- Reject requires a note; on reject the parent is both notified (existing
  in-app notification mechanism) and sees the reason on their payments page.
  Per: *"yes, notification and reason."*
- A rejected manual-transfer payment can be retried: the parent re-uploads a
  new image against the same payment record rather than starting a fresh
  payment. Per: *"yes can."*
- Approval settles through the existing `FamilyPaymentService.approve()` path
  unchanged — ledger posting + allocation + PAID flip once covered. Per:
  *"yes same."*

## Non-goals

- No parent-side form fields beyond the image upload (no transaction
  reference entry, no amount confirmation).
- No change to `ONLINE_GATEWAY`'s behavior or to the online-gateway webhook
  flow.
- No change to charge generation / subscription types (MONTHLY, FAMILY,
  SCHOLARSHIP, etc.) — this only touches how a charge gets *paid*, not how it
  gets created.
- No multi-currency or per-method currency restriction beyond what already
  exists.
- No audit/version history of field-set edits (editing a method's fields
  going forward does not need to preserve what a field set looked like for a
  payment submitted under the old field set, beyond what's naturally kept by
  not mutating already-submitted payment records).

## Anti-goals (would make this a failure even if it technically "works")

- A parent seeing a method with no configured transfer number/QR because the
  admin saved an empty field — the UI must make missing required display
  fields obvious to the admin before they enable the method for parents.
- Silent data loss when an admin edits a method's field set after payments
  already reference the old fields — a submitted payment's displayed method
  snapshot must not retroactively change just because the admin edited the
  method later.
- Reusing `GroupPaymentStatus`/`FamilyPaymentStatus` (today strictly
  PAID/UNPAID, computed from ledger coverage) in a way that conflates "no
  money received yet" with "money submitted, awaiting staff action" — these
  are different facts and the roster/status filters must be able to tell
  them apart without breaking the existing `isStudentPaid()` ledger-coverage
  logic that downstream readiness (`PAYMENTS_MADE`) depends on.
- Making the fix to `BillingSettingsForm`'s dead `onSave` a silent side
  detail — it is the reason the bug report in this conversation happened at
  all (admin enabled receipt upload, parent still saw nothing) and must be
  fixed as part of this work, not left for later.

## Constraints

- Must build on the existing `FamilyPaymentMethod` interface / registry
  pattern (`payment-method.interface.ts`, `payment-method.registry.ts`) —
  do not special-case manual-transfer methods outside that abstraction.
- Must not change `FamilyPaymentState`'s meaning — "under review" is a label
  over the existing `PENDING_REVIEW` value, not a new enum member, so
  `FamilyPaymentService.reviewQueue/approve/reject` keep working unchanged.
- Must not change `isStudentPaid()` / `FamilyPaymentStatusService.forGroup()`
  ledger-coverage semantics — PAID still means "charges covered by allocated
  payments." Any "under review" display state layered on top of PAID/UNPAID
  must be computed alongside, not instead of, that logic.
- Billing's architectural boundary holds: billing never imports academics;
  academics injects billing's read-only services (as today, via
  `FamilyPaymentStatusService`). A new "pending count for this group" read
  path follows the same direction.
- MongoDB/Mongoose, NestJS message-pattern controllers (`*.controller.message.ts`),
  NATS-backed server actions on the client (`createAuthorizedNatsRequest`) —
  match existing billing module conventions exactly (see
  `billing.controller.message.ts`, `billing.action.ts`).
- Existing worktrees (`mvp-sp3`, `mvp-sp4`, `mvp-sp6`) and an already-dirty
  working tree with unrelated in-progress changes exist in this repo; this
  work must not touch or depend on those files, and should be implementable
  as an isolated diff.

## Data model (the how, as decided)

**New collection: `PaymentMethodConfig`** (org-scoped), replacing the need to
hardcode InstaPay/Wallet Transfer as code-only strategies with no admin data:

```
{
  _id
  organizationId
  key: string            // stable identifier, e.g. "INSTAPAY", "WALLET_TRANSFER", or a generated slug for custom methods
  kind: 'BUILT_IN' | 'CUSTOM'
  labelKey | label        // built-ins use translation keys; custom methods store an admin-entered label (and maybe translations later — out of scope now, store a plain string)
  enabled: boolean
  fields: [
    { key, label, type: 'TEXT' | 'IMAGE' | 'LINK', value, order }
  ]
  createdAt / updatedAt / createdBy
}
```

- InstaPay and Wallet Transfer are **seeded** per-organization (or
  lazily created on first access) with their default field set
  (`transferNumber`, `accountName`, `qrCodeImage`, `instructions`), `kind:
  'BUILT_IN'`, so they always exist and can't be deleted — only disabled and
  field-edited.
- A custom method is `kind: 'CUSTOM'`, admin names it, admin builds its
  `fields` array from scratch (at least one field recommended, not enforced
  — not an anti-goal to block saving an empty custom method, just not
  useful).

### Registry integration (resolved after builder-check)

A builder-check pass flagged that `FamilyPaymentMethodRegistry` is a
`Map<string, FamilyPaymentMethod>` built once at DI construction time from a
static provider array, and `FamilyPaymentMethod.isEnabled(org)` is
synchronous and takes only a thin org slice — neither can do a per-org Mongo
lookup or register a dynamic key per admin-created custom method. Resolved
as follows, settled now rather than left ambiguous because it reshapes the
diff:

- **One registry entry, not one per config row.** A single
  `ManualTransferMethod` is registered under one sentinel key, e.g.
  `MANUAL_TRANSFER` (new constant alongside
  `PAYMENT_METHOD_RECEIPT_UPLOAD`/`PAYMENT_METHOD_ONLINE_GATEWAY`). It does
  **not** represent "manual transfer" as a single user-facing choice — see
  next point for how the parent still picks InstaPay vs. Wallet Transfer vs.
  a custom method individually.
- **`isEnabled()` stays cheap and org-slice-only**, per the existing
  interface contract: it returns true whenever manual transfer is listed in
  `enabledFamilyPaymentMethods` at all (same shape as today's check), with no
  DB read. The real per-config enable/disable and field data live in
  `PaymentMethodConfig` rows and are read by a **separate, new read path** —
  `listPaymentMethodConfigs(organizationId)` — that the client calls to
  render the actual method picker (InstaPay card, Wallet Transfer card, each
  custom method card), independent of the registry's `listMethods()`. This
  keeps `FamilyPaymentMethodRegistry`/`FamilyPaymentMethod` doing what they
  already do (gross on/off per payment *kind*) and puts the per-row admin
  config behind its own service, avoiding a breaking change to the shared
  interface or its call sites in `FamilyPaymentService`.
- **`InitiateInput` gains `paymentMethodConfigId?: string`.** When the client
  initiates a payment with `method: 'MANUAL_TRANSFER'`, it also passes the
  specific config id the parent picked. `ManualTransferMethod.initiate()`
  loads that `PaymentMethodConfig` row, validates it belongs to the org and
  is enabled, snapshots its fields onto the new `FamilyPayment`, and returns
  the same `{ kind: 'AWAIT_RECEIPT', paymentId }` shape `ReceiptUploadMethod`
  returns today.
- **Submission is two calls, matching the existing receipt-upload flow
  exactly**: `initiate()` (status `AWAITING_RECEIPT`, snapshot captured) then
  `attachReceipt()` (uploads the image, flips to `PENDING_REVIEW`) — no new
  single-call initiate-with-file-key shape. An initiated-but-never-attached
  manual-transfer payment is left orphaned in `AWAITING_RECEIPT` exactly as a
  receipt-upload payment would be today; no new handling needed for that
  case, it already exists as accepted behavior in the current code.
- `FamilyPayment` entity gains `paymentMethodConfigId` (nullable, only set
  for manual-transfer payments) and a **snapshot** of the fields shown to the
  parent at submission time (`methodSnapshot: { label, fields: [...] }`), so
  a later admin edit to the config never changes what a past payment record
  displays (anti-goal above).

## Status display (the how, as decided)

- Server: `FamilyPaymentStatusService.forGroup()` keeps computing
  PAID/UNPAID from ledger coverage exactly as today. Add a second,
  parallel lookup — pending `FamilyPayment` rows (`status: PENDING_REVIEW`)
  per student/group — and merge: a student is displayed as **UNDER_REVIEW**
  if not yet PAID by ledger coverage **and** has a pending `FamilyPayment`;
  otherwise PAID/UNPAID as today. This is a display-layer merge, not a
  change to `isStudentPaid()`.
- `GroupPaymentStatus` (shared-types) gets a third member,
  `UNDER_REVIEW`, used only for this merged display value — the readiness
  check (`computeReadiness`'s `PAYMENTS_MADE`) keeps comparing against
  `PAID` specifically, so a student mid-review still correctly blocks group
  readiness (no behavior change there, just a label the admin can see).
- Students card (`students-card.tsx`), Subscriptions table, and the Receipts
  queue all render this three-way status with a status filter
  (PAID / UNPAID / UNDER_REVIEW) using the same shared badge component.

## Review surfaces (the how, as decided)

- One underlying list endpoint, filterable by `status` and optionally
  `groupId`: extends `FamilyPaymentService.reviewQueue()` to accept
  these filters (today it's an unfiltered PENDING_REVIEW-only query).
- **Billing → Receipts** page: existing `ReceiptQueue` component, add a
  status filter control and (optionally) a group filter.
- **Group detail page**: new "Review payments" entry point (button/badge
  showing pending count) opening a modal scoped to
  `reviewQueue({ groupId, status })`. Reuses the same approve/reject
  components as the Receipts queue (same image viewer, same reject-reason
  input) rather than building a second UI — the modal is a filtered view
  over the same list, consistent with "both" meaning one mechanism, two
  entry points.
- Approve / reject call the existing `FamilyPaymentService.approve()` /
  `.reject()` unchanged.

## Retry on reject (the how, as decided)

- `FamilyPaymentService.attachReceipt()` already accepts re-attaching a
  receipt while status is `AWAITING_RECEIPT` or `PENDING_REVIEW`. Extend the
  allowed-state check to also accept `REJECTED`, resetting status back to
  `PENDING_REVIEW` on a new upload (clearing the previous `rejectReason`
  display once a new image is attached, but the old reason stays visible
  until then). Same payment record, no new payment created.

## Settings UI fix (bundled, required — see anti-goals)

- Give `BillingSettingsForm` real persistence: new server action(s) +
  message-pattern handler(s) to read/update
  `enabledFamilyPaymentMethods` / `academyFeeGatewayProvider` on the
  Organization entity, and wire `onSave` in
  `settings/payments/page.tsx` to them. Without this, none of the above is
  reachable by an admin.
- Extend the same settings page with the new **Payment methods** manager:
  a list of configured methods (InstaPay, Wallet Transfer, + custom), each
  with an enable toggle and an "Edit fields" action opening a field-builder
  (add/remove/reorder fields, set type + label + value), and an "Add
  method" action for custom methods.

## What's left to the builder

- Exact Mongoose schema field names/validation for `PaymentMethodConfig`
  and the `FamilyPayment` snapshot shape — follow existing entity file
  conventions (`entities/payment.entity.ts`, etc.).
- Exact NATS message-pattern names for the new endpoints — follow the
  `billing.*` naming convention already used (e.g.
  `billing.paymentMethods.list`, `billing.paymentMethods.create`, etc.).
- Field type set is TEXT / IMAGE / LINK per the four named defaults
  (number, name, QR image, instructions are two TEXT + one IMAGE + one TEXT)
  — builder may add a NOTES/TEXTAREA distinction if useful, but keep the
  type enum small.
- Image upload reuses the existing `uploadFileToS3` + file-key pattern
  already used for receipt uploads — no new upload mechanism needed.
- Notification copy/keys for the new reject-with-reason-on-manual-transfer
  case can reuse the existing `billingPaymentRejectedTitle/Body` keys
  already sent in `FamilyPaymentService.reject()` — no new notification
  type is required unless the builder finds the existing copy doesn't fit
  manual-transfer context, in which case default to reusing it and flag the
  wording as a minor call.
- Where exactly the "Review payments" entry point sits on the group detail
  page (header action vs. a card) — any sensible existing dashboard
  pattern applies; not a decision that changes what gets built.
- **Find every site that converts `FamilyPaymentStatusService.forGroup()`'s
  PAID/UNPAID output into `student.paymentStatus` on the group view and into
  the Subscriptions table's displayed status.** A builder-check pass did not
  find a single shared conversion function — `students-card.tsx` appears to
  render status directly from data already attached to the group payload.
  Before adding the UNDER_REVIEW merge described above, locate every such
  site (search for `GroupPaymentStatus`, `paymentStatus`, and the service's
  call sites) and either consolidate them into one conversion point or apply
  the merge identically at each one — the anti-goals section above requires
  the three surfaces (roster, subscriptions table, receipts queue) to never
  disagree.
- **No shared payment-status badge component exists today** (`students-card.tsx`
  inlines a raw ternary string; `ReceiptQueue` has no status badge at all).
  Build one small shared component (e.g.
  `components/organs/billing/payment-status-badge.tsx`) rendering
  PAID/UNPAID/UNDER_REVIEW consistently, and use it at all three surfaces
  instead of ad hoc per-page rendering — this was implicitly assumed by this
  doc's "same shared badge component" language and needs to actually be
  created, not just reused.
