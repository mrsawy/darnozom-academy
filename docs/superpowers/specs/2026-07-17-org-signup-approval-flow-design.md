# Organization Signup → Account Approval Flow

**Date:** 2026-07-17
**Status:** Approved design, pending spec review
**Scope:** `apps/server`, `apps/client`, `lib/shared-types` (web + backend only — mobile out of scope)

## 1. Problem & Goals

Today an organization signs up and its account is **immediately active**. Email
verification and identity submission are *optional, post-signup* steps. Content
(courses) is auto-approved only once the org is "fully verified"
(`isOrgFullyVerified` = email verified **and** identity `VERIFIED`); otherwise
each item goes through per-post admin review.

We want to invert this into an **account-level approval gate**:

1. At signup the org agrees to the platform rules & privacy policy via a
   **required checkbox** — signup is impossible without it.
2. Immediately after signup the org is walked through a **guided wizard**:
   confirm email (OTP) → submit identity documents.
3. The account is **`PENDING`** until a platform admin approves it. While
   pending, the org can see its dashboard but **cannot create/publish any
   content**.
4. A **single admin action** approves (or rejects) the whole account, reviewing
   the identity documents as part of that decision.
5. Once approved, the org is **"free to go"** — its content is created already
   `APPROVED`, with **no per-post review**.

### Non-goals
- The mobile app (`apps/lms-mobile`) — it is student-only signup; unchanged.
- Persisting the rules acceptance record (explicitly dropped per stakeholder:
  enforce the checkbox, don't store it).
- Removing the existing per-post content-review machinery (kept dormant for
  legacy/pending content; not deleted).

## 2. Current State (as-is)

- **Signup:** `AuthService.register` (local) and `AuthService.completeOnboarding`
  (Google OAuth) create the `User` (as `SUPER_ADMIN`) + `Organization`
  (`status: EntityStatus.ACTIVE`) + free `Subscription`, then immediately issue
  tokens. Org role signup collects name + slug only.
- **Verification (post-signup):** `/organization-dashboard/verification/email`
  (OTP via `verification.sendEmailOtp` / `verifyEmailOtp`) and
  `/verification/identity` (`verification.submitIdentity`). Identity is reviewed
  by a platform admin (`adminReview.approveIdentityVerification` /
  `rejectIdentityVerification`).
- **Content gate:** `course.service` sets
  `approvalStatus = isOrgFullyVerified(org) ? APPROVED : PENDING` on create, and
  passes `isOrgFullyVerified(org)` as the `skipApproval` flag to
  `applyUpdateWithApproval` on update.
- **Legal pages:** `/terms` and `/privacy` already exist under `(home-page)`,
  driven by i18n namespace `HomeLegal.*`. The signup form already links to them
  in a footer but has **no enforced checkbox**.
- **Org entity:** `verification.email`, `verification.identity`,
  `status: EntityStatus`. No approval concept.

## 3. Design

### 3.1 Data model — `Organization` entity

Add:

```ts
@Prop({ type: String, enum: ApprovalStatus, default: ApprovalStatus.PENDING, index: true })
approvalStatus: ApprovalStatus;          // PENDING | APPROVED | REJECTED

@Prop({ type: String, default: null })
approvalComment: string | null;           // rejection reason

@Prop({ type: mongoose.Types.ObjectId, ref: 'User', default: null })
approvalReviewedBy: mongoose.Types.ObjectId | null;

@Prop({ type: Date, default: null })
approvalReviewedAt: Date | null;
```

- New orgs default to `PENDING`.
- `status: EntityStatus` stays orthogonal (suspend/deactivate/delete lifecycle).
- **No `termsAcceptance` field** — the checkbox is enforced at input validation
  only, not persisted.

Add a small helper `isOrgApproved(org)` in `src/utils/verification.utils.ts`:
`org?.approvalStatus === ApprovalStatus.APPROVED`.

### 3.2 Rules/Privacy checkbox — enforced, not stored

- **Client** (`signup-form.schema.ts`): add
  `acceptedTerms: Yup.boolean().oneOf([true], <message>).required()`, rendered as
  a checkbox that links to `/terms` and `/privacy`. Submit button stays enabled;
  validation blocks submit. Applies to **org role**; also added to the Google
  onboarding form (`onboarding-form`) for the org path.
- **Server** (`RegisterDto` and `CompleteOnboardingDto`): add
  `acceptedTerms: boolean` validated with `@IsBoolean()` +
  `@Equals(true)` (only required for the org/super-admin path — mirror the
  existing `@ValidateIf` role guard used for `organizationDto`). Per repo rule,
  this validation lives in the DTO, not the service. The value is read and
  discarded (not written to any document).

### 3.3 Signup creates a PENDING account

- `AuthService.register`: when creating the org (non-student/parent path), set
  `approvalStatus = PENDING`. User + subscription creation unchanged. Tokens are
  still issued so the org can log in and complete the wizard.
- `AuthService.completeOnboarding` (Google): same — org created `PENDING`. Since
  Google emails are pre-verified, set `verification.email.verified = true` +
  `verifiedAt` at creation so the wizard skips the OTP step.

### 3.4 Guided post-signup wizard (reuses existing endpoints)

No new verification endpoints. The client orchestrates the existing ones:

1. **Confirm email** — `verification.sendEmailOtp` → `verifyEmailOtp`
   (skipped if already verified, e.g. Google).
2. **Submit identity** — `verification.submitIdentity`.

Reuse the existing `/verification/email` and `/verification/identity` pages,
chained into a guided flow, plus a persistent **account-status banner** on the
org dashboard with three states derived from server data:

- **Action needed** — email not verified and/or identity not submitted → link
  into the wizard.
- **Under review** — email verified + identity `PENDING` and org
  `approvalStatus === PENDING`.
- **Rejected** — `approvalStatus === REJECTED` → show `approvalComment`, allow
  re-submitting identity (which sets identity back to `PENDING`).

`verification.getStatus` response is extended to also return
`approvalStatus` and `approvalComment` so the banner has one source of truth.

### 3.5 Pending gate — dashboard visible, creation blocked

- **Server (authoritative):** a reusable guard/check
  `OrgApprovedGuard` (or an `assertOrgApproved(orgId)` helper) throws a typed
  error `OrganizationErrors.ACCOUNT_PENDING_APPROVAL` when
  `approvalStatus !== APPROVED`. Applied to the org content **create/update/
  publish** message handlers:
  - Courses (`course.*` create/update/publish)
  - Course modules
  - Course content
  - Org pages (`my-pages`)
  - Private sessions
  Read/list/dashboard/verification/billing endpoints are **not** gated.
- **Client (UX only):** "Create" / "Publish" buttons on those surfaces are
  disabled with a tooltip/notice pointing to the account-status banner when the
  org is not approved. Server remains the source of truth.

> Open item for spec review: confirm the gated endpoint set above is the
> complete definition of "posting." Flag any other org-creatable surface
> (announcements, categories, etc.) to add.

### 3.6 Single admin account approval (folds in identity review)

Rework the existing identity-review admin surface into an **account** review:

- **Queue:** `adminReview.getPendingIdentityVerifications` →
  `getPendingOrganizations`, filtered by `approvalStatus: PENDING` (with a
  submitted identity). Detail endpoint (`getVerificationDetail`) keeps returning
  identity file URLs + super-admin info.
- **Approve** (`approveOrganization`, was `approveIdentityVerification`):
  requires email verified + identity submitted; sets
  `approvalStatus = APPROVED`, `verification.identity.status = VERIFIED`,
  `approvalReviewedBy/At`, clears `approvalComment`.
- **Reject** (`rejectOrganization`, was `rejectIdentityVerification`): sets
  `approvalStatus = REJECTED`, `verification.identity.status = REJECTED`,
  stores `approvalComment` / `rejectionMessage`. Org can resubmit identity.
- **Dashboard counters:** `pendingVerifications` count on the admin overview
  becomes `pendingOrganizations` (`approvalStatus: PENDING`).
- Client: rename the "Identity verifications" admin section to "Pending
  organizations"; approve/reject actions call the reworked endpoints.

### 3.7 Content auto-approval repoint

- In `course.service`, replace the `isOrgFullyVerified(org)` inputs with
  `isOrgApproved(org)`:
  - create: `approvalStatus = isOrgApproved(org) ? APPROVED : PENDING`
  - update: `applyUpdateWithApproval(course, changes, isOrgApproved(org))`
- Net effect: approved orgs post content that is immediately `APPROVED` (no
  per-post review). Pending orgs can't create content at all (§3.5), so no new
  `PENDING` content is produced. The content-review queue/UI stays in place for
  any pre-existing/legacy `PENDING` items.

### 3.8 Legal / Acceptable-Use content

- Extend the `/terms` page with a substantive **Acceptable Use** section
  (add `HomeLegal.terms.blocks.acceptableUse` or a dedicated block): no illegal/
  harmful/abusive content; no IP theft, plagiarism, or reselling others' work;
  no fraud or misrepresentation of identity/credentials; platform's right to
  suspend/remove violating accounts and content. Drafted in **English + Arabic**
  in `en.json` / `ar.json`.
- Light reference addition to `/privacy` tying acceptance to signup.
- The signup checkbox copy: e.g. *"I have read and agree to the Rules & Privacy
  Policy"* with inline links, in both locales.
- **Disclaimer:** drafted copy is not legal advice; recommend legal review.

### 3.9 Seeding & migration

- **Seeder** (`OrganizationSeeder.seed`): default seeded orgs to
  `approvalStatus = ApprovalStatus.APPROVED` with `approvalReviewedAt` set
  (allow override for seeding a few `PENDING`/`REJECTED` samples if useful for
  admin-queue testing). All seeded orgs are approved by default.
- **Migration** for existing production orgs: set `approvalStatus = APPROVED`
  for every existing org so current customers are grandfathered and not locked
  out. Only new signups start `PENDING`.

## 4. Shared types / errors

- Reuse `ApprovalStatus` (already in `lib/shared-types`).
- Add error/message codes to the shared error enums (e.g.
  `OrganizationErrors.ACCOUNT_PENDING_APPROVAL`,
  `AuthErrors.TERMS_NOT_ACCEPTED`) and success/status strings, following the
  existing typed-error convention (no raw string matching).

## 5. Testing

- **Unit (server):** DTO validation rejects missing/false `acceptedTerms` for
  org path; `register`/`completeOnboarding` create orgs as `PENDING`;
  `OrgApprovedGuard`/`assertOrgApproved` blocks create when pending and allows
  when approved; `approveOrganization`/`rejectOrganization` transitions;
  `isOrgApproved` gating in course create/update.
- **Integration:** pending org create-course request → typed pending error;
  after approval → course created `APPROVED`.
- **Client:** signup schema blocks submit without checkbox; banner state machine
  renders correct state from `getStatus`; gated create buttons disabled when
  pending.
- **Seed run:** confirm all seeded orgs are `APPROVED`.

## 6. Risks / edge cases

- Google-onboarding orgs must still land `PENDING` despite verified email.
- Rejected orgs must be able to resubmit identity (identity → `PENDING`) and
  re-enter the admin queue.
- Ensure every content-creation path is gated; a missed endpoint would let a
  pending org post. Enumerate exhaustively during planning.
- Existing orgs with in-flight `PENDING` content: migration approves the org;
  their pending content remains reviewable via the existing queue.
