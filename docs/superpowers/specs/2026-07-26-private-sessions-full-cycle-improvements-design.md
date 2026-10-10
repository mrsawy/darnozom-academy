# Private Sessions — Full-Cycle Improvements Design

**Date:** 2026-07-26
**Scope:** Server (`apps/server`), Web client (`apps/client`), Mobile (`apps/lms-mobile`), Shared types (`lib/shared-types`)
**Cycle covered:** creating → booking → attending, plus cancellation/refund, reschedule, reminders, and lifecycle.

---

## 1. Purpose

The private-session feature works end-to-end but carries correctness risks (money, capacity, timezones), missing trust features (refunds, reminders, auto-lifecycle), and uneven UI across the three apps. This design defines a phased set of improvements that makes the full cycle reliable and consistent, with a timezone model that "never causes mistakes" and a refund flow gated by instructor approval.

Deliverable of this document: an agreed spec that feeds a detailed implementation plan (writing-plans). No code is written from this document directly.

---

## 2. Current State (as-is)

### Server — `apps/server/src/private-session/`
- **`PrivateSession`** (instructor-owned, org-scoped): `title`, `description`, `duration`, `pricing {price, currency, priceUSD}`, `availableSlots[]`, `location`, `sessionType` (ONLINE/OFFLINE), `isActive`, `status` (EntityStatus), `thumbnailKey`.
- **`IAvailableSlot`**: `{ date: Date, startTime: string ("HH:MM am/pm"), endTime: string, provider (EXTERNAL_URL|AGORA), meetingUrl?, maxBookings }`.
- **`SessionBooking`**: `sessionId`, `studentId`, `parentId?`, `instructorId`, `organizationId`, `scheduledDate`, `startTime`, `endTime`, `status` (PENDING_PAYMENT|CONFIRMED|COMPLETED|CANCELLED|NO_SHOW), `paymentMethod`, `paymentDetails`, `provider`, `meetingLink`, `agoraChannelName?`, `notes`, cancellation fields, embedded `rescheduleRequest`.
- **Booking paths**: wallet → confirm immediately inside a Mongo transaction; Paymob → create payment URL, booking created only on webhook (`createConfirmedBookingFromPaymobPayment`). Org super-admin wallet is credited net of plan tax.
- **Attending**: `AgoraService.issuePrivateSessionToken` — validates CONFIRMED + AGORA provider + participant + a 15-minute early-join window; times parsed with `parseBookingDateTime` using **server-local** `setHours`.
- **Reschedule**: `requestReschedule` / `respondToReschedule` (request/approve/reject embedded on booking).
- **Notifications**: `apps/server/src/notification/` — in-app persisted docs only; `relatedModel` limited to `Course|Enrollment|CourseContent`. No push, no email, **no scheduler** anywhere.

### Web — `apps/client`
- Org dashboard: create/edit form (`private-session-form`), sessions list, `booking-list` (instructor: complete/no-show, respond to reschedule).
- Student: `bookings/page.tsx` (list, cancel, reschedule dialog, join), `booking-dialog` (slot pick + pay), `booking-call-view` (Agora).

### Mobile — `apps/lms-mobile`
- `sessions-tab`, `session-booking-card`, `instructor-private-sessions` organ, call screen, `private-session.action.ts` / `private-session.hook.ts`.

---

## 3. Confirmed Product Decisions

1. **Timezone — store UTC instants + explicit IANA zone.** Bare local strings are replaced by absolute instants. Every server comparison (join window, ordering) is a plain `Date` comparison; each client renders in the viewer's local zone. This is both the simplest logic (no string parsing) and the most reliable.
3. **No cron/scheduler.** Deliberately no `@nestjs/schedule`. Booking "ended" state is derived at read time from `endsAt`; instructors mark COMPLETED/NO_SHOW manually; countdown/upcoming UI is client-computed. Notifications are event-driven only.
2. **Refund — instructor-approved cancel-and-refund request.** A student cannot self-refund. They submit a cancel-and-refund **request** (with reason); the instructor must approve. On approval, funds are reversed (debit the wallet that received the sale revenue, credit the student's wallet) and the booking becomes CANCELLED/REFUNDED. On rejection the booking stands.
   - **Open item flagged for confirmation:** the sale currently credits the **org super-admin** wallet, not the instructor's. The refund must debit whoever was actually credited. The design reverses the original credit; the "instructor vs org" ownership question is resolved at implementation against how private-session revenue is actually held.

---

## 4. Target Data Model Changes

### 4.1 Slot / booking time model (Phase 0)
Replace string times with absolute instants while keeping a human-readable zone.

**`IAvailableSlot` (new shape):**
```
{
  _id, 
  startsAt: Date,     // UTC instant
  endsAt: Date,       // UTC instant
  timezone: string,   // IANA, e.g. "Africa/Cairo" — the zone the instructor authored in
  provider: MeetingProvider,
  meetingUrl?: string,
  maxBookings: number
}
```

**`SessionBooking`:** replace `scheduledDate/startTime/endTime` with `startsAt: Date`, `endsAt: Date`, `timezone: string` (copied from the slot at booking time).

**Migration:** one-off script converts existing `private_sessions.availableSlots` and `session_bookings` from `{date, startTime, endTime}` → `{startsAt, endsAt, timezone}` using a configured default org timezone (e.g. `Africa/Cairo`) as the assumed authoring zone. Seeds (`private-session.seeder.ts`, `seed.ts`) updated to emit the new shape.

**Derived helpers removed:** `parseBookingDateTime`, `computeEndDate`, `timeSlotValidator`, and all `setUTCHours` day-window logic collapse into direct instant comparisons and `$gte/$lt` on `startsAt`.

### 4.2 Refund request (Phase 1)
Embedded on `SessionBooking` (mirrors `rescheduleRequest`):
```
refundRequest?: {
  requestedBy: ObjectId,
  reason: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  respondedAt?: Date,
  rejectionReason?: string,
  refundedAmount?: number,
  refundedCurrency?: Currency
}
```
New `BookingStatus.REFUNDED`. New enum `RefundRequestStatus`.

### 4.3 Shared types & messages
- `lib/shared-types`: new `RefundRequestStatus`, extend booking/session interfaces to instant-based fields, add error/success message keys (`refundRequested`, `refundApproved`, `refundRejected`, `refundAlreadyPending`, `bookingNotJoinableYet`, `sessionNotStartedYet`, etc.).
- `Notification.relatedModel`: add `'PrivateSession' | 'SessionBooking'`.

---

## 5. Phased Plan

### Phase 0 — Foundations
- Slot/booking time model migration to UTC instants + IANA timezone (§4.1).
- Shared-types updates: instant-based interfaces, `RefundRequestStatus`, `BookingStatus.REFUNDED`, new message keys, notification `relatedModel` extension.
- Update DTOs (`create-private-session.dto`, reschedule DTOs) to accept `{ startsAt, endsAt, timezone }`; validation via DTO per repo rule (see `validate-in-dto` skill). Remove regex time validators.
- Update seeds to new shape.

**Done when:** server compiles, migration runs on a seeded DB, existing bookings/slots readable as instants, no `setHours`/regex time parsing remains in the module.

### Phase 1 — Correctness & money safety (server)
- **Currency fix:** `convertSessionPrice` uses `CurrencyService` to convert `session.pricing` into the target (wallet/checkout) currency instead of returning the raw `priceUSD`. Web display math (`booking-dialog` `cardCheckoutAmount`) updated to match.
- **Oversell fix:** move the wallet-path capacity check inside the Mongo transaction (`countDocuments(...).session(mongoSession)` with the same slot filter used by the Paymob path) so concurrent wallet bookings cannot exceed `maxBookings`.
- **Cancel-and-refund flow:** endpoints `POST bookings/:id/refund-request` (student/parent) and `PUT bookings/refund/respond` (instructor). On approve: transaction reverses the original revenue credit (debit revenue-holder wallet) and credits the student's wallet the paid amount, sets `status = REFUNDED`, records `refundRequest` result + `cancellationReason`. Tax-reversal handled explicitly. On reject: booking stays CONFIRMED.
- **Lifecycle (no scheduler):** there is **no cron/scheduler**. A booking's "ended" state is **derived at read time** from `endsAt` (a past CONFIRMED booking renders as ended). Instructors still mark COMPLETED / NO_SHOW manually. No persisted auto-transition.
- **Reschedule hardening:** requested new time must map to a real, future, available slot of the same session; re-check capacity on approve; store instants.

**Done when:** unit/integration tests cover conversion, oversell under concurrency, refund reversal balances, derived-ended computation, reschedule validation.

### Phase 2 — Attending experience
- **Server:** join-window logic uses instants; response for bookings includes a computed `joinableFrom` (`startsAt - 15m`) and `isJoinable` so clients don't reimplement it. Distinct errors for "not started yet" vs "ended".
- **Web + Mobile join gating:** replace always-visible join button with state machine — `Scheduled (joinable in Xh Ym)` → `Join now` (enabled within window) → `In progress` → `Ended`. Countdown UI; disabled outside window with a clear label instead of a click-then-error.
- **Agora pre-join:** lightweight pre-join screen (session title, other participant, mic/cam permission check) reusing the existing `agora-call` organ; graceful return on end.
- **Event-driven notifications (no scheduler):** in-app notifications are emitted on events only — booking confirmed, reschedule requested/answered, refund requested/answered (extend notification module with `SessionBooking` relatedModel). No timed reminders. "Upcoming next session" emphasis and the join countdown are **client-computed** from `startsAt`.

**Done when:** join button reflects window state on both clients; event notifications appear in the in-app list; join outside window is impossible to click.

### Phase 3 — Booking experience
- **Slot picker polish (web dialog + mobile):** group slots by date, render tz-aware local times with the authoring zone shown, capacity bar, correct converted price/currency. Full i18n (ar/en) — remove hardcoded English strings in `booking-dialog`, `bookings/page.tsx`.
- **Reschedule by real slot:** student picks from the instructor's actual available future slots (dropdown/calendar) instead of typing `"10:00 am"`.
- **Cancel → refund request UX:** cancel action on a CONFIRMED booking opens a reason dialog that submits a refund request; UI reflects `refundRequest.status`.
- **Mobile booking card fix:** read `startsAt` (currently reads non-existent `booking.slot.startTime`), tz-aware label, refund-request action.

**Done when:** no hardcoded booking strings remain; reschedule/cancel use structured data; prices shown equal amount charged.

### Phase 4 — Creating experience
- **Web form refactor:** move to the organ pattern per `CLAUDE.md` (`private-session-form/` already exists — keep schema in `.schema.ts`), convert manual slot arrays to `useFieldArray`, fix `isActive` and `duration` binding bugs (bind to form state, not `session` prop), add timezone selector per session, validate slot ordering (`endsAt > startsAt`, future), i18n the remaining literals ("Active", "Remove", placeholders).
- **Instructor management parity on mobile:** manage bookings — complete / no-show / respond to reschedule / respond to refund — currently only a read view exists.
- **Instructor request-approval UI (web + mobile):** approve/reject reschedule **and** refund with real reasons (replace hardcoded `'Declined'`).

**Done when:** create/edit form is fully controlled + i18n; instructor can action all requests from web and mobile.

### Phase 5 — Polish & consistency
- Dedupe web/mobile private-session types into `lib/shared-types`.
- Consistent empty/loading/error and RTL states across surfaces.
- **Stretch:** post-session rating/review by student on COMPLETED bookings.

---

## 6. Non-Goals (this cycle)
- **No cron/scheduler** — no timed reminders, no auto-complete job.
- Push notifications / email delivery infrastructure (designed as a pluggable point, not built).
- Payment-provider refunds back to card — refunds go to in-app **wallet** only.
- Group/recurring session scheduling beyond current per-slot `maxBookings`.
- Instructor payout/settlement changes beyond the refund reversal.

---

## 7. Risks & Mitigations
- **Migration correctness:** wrong assumed authoring zone shifts existing times. Mitigate with a configurable default zone, a dry-run mode, and a verification count before/after.
- **Refund wallet ownership ambiguity:** reverse exactly the wallet credited at sale (traceable via `paymentDetails`/transaction metadata); confirm org-vs-instructor holder at implementation.
- **Derived "ended" state consistency:** since there is no auto-complete job, clients and server must compute "ended" the same way from `endsAt`; centralize the helper so web/mobile/server agree.
- **Concurrency on wallet booking:** capacity check must be inside the transaction with the same filter as Paymob path.

---

## 8. Testing Strategy
- Server: unit tests for currency conversion, refund reversal balancing, reschedule validation, join-window boundaries (instant math), derived-ended computation; integration test for wallet oversell under concurrent bookings.
- Web/Mobile: component tests for join-state machine, slot picker, refund-request flow; i18n key coverage (ar/en).
- Migration: dry-run assertion that counts and sample instants match expectations.

---

## 9. Open Items to Confirm During Implementation
1. Which wallet holds private-session revenue (org super-admin vs instructor) — determines the refund debit target.
2. Free-cancel grace vs. always-approve expectation — current decision is **instructor-approved every time** (no automatic window). Confirm no time-based auto-approval is wanted.
3. Default authoring timezone for the migration of legacy rows.
