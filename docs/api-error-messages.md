# API error and success messages (shared-types → i18n)

Backend APIs (Nest/NATS) return **stable string keys** in exception `message` and in success payloads (`{ message: string }`). Keys are defined in `@lms-organization/shared-types` and registered in `ALL_ERROR_KEYS` / `ALL_ERROR_KEYS_SET`.

The Next.js app translates them with **next-intl** using the **root `errors`** object in `apps/client/messages/en.json` and `apps/client/messages/ar.json`. The translation key path is `errors.<enumValue>`.

## Rules

1. **Single source of truth for keys**  
   Add new message keys as enum members under `lib/shared-types/src/lib/messages/*.enum.ts`, then append their **string values** to `ALL_ERROR_KEYS` in `lib/shared-types/src/lib/messages/index.ts`.

2. **Backend**  
   Throw Nest exceptions with the enum value as the message (plain string). Do not embed user-facing English in the server for keys that must be translated.

3. **Frontend**  
   - Add the same string key under `errors` in **both** `en.json` and `ar.json`.  
   - Use `translateApiMessage(rawMessage, useTranslations('errors'))` (or pass `t` from `useTranslations('errors')`) so unknown/non-catalog strings still display as returned.

4. **Dynamic parameters**  
   When a message needs interpolation, the backend sends **`key|value`** (one pipe, value is numeric or opaque). The client maps that key to a next-intl string with placeholders (e.g. `{seconds}`, `{minutes}`).  
   Keys that use this today are wired in `apps/client/src/lib/utils/errors/translateApiMessage.ts`; when you add a new parameterized key, extend that helper with the correct placeholder names.

5. **Success vs error**  
   Success responses may use the same pattern (`VerificationSuccessMessages`, etc.). Store their strings under **`errors`** as well so one namespace and one `translateApiMessage` path covers toasts for both.

## Example: verification OTP

| Enum | Value (`errors` key) | Notes |
|------|----------------------|--------|
| `UserErrors.ORGANIZATION_NOT_FOUND` | `organizationNotFound` | 404 |
| `VerificationErrors.ORGANIZATION_SUPER_ADMIN_NOT_FOUND` | `organizationSuperAdminNotFound` | 404 |
| `VerificationErrors.EMAIL_ALREADY_VERIFIED` | `emailAlreadyVerified` | 400 |
| `VerificationErrors.OTP_RESEND_COOLDOWN` | `otpResendCooldown` | Wire: `otpResendCooldown\|42` → `{seconds}` |
| `VerificationErrors.OTP_NOT_FOUND` | `otpNotFoundRequestNew` | 400 |
| `VerificationErrors.INVALID_VERIFICATION_CODE` | `invalidVerificationCode` | 400 |
| `VerificationErrors.OTP_ACCOUNT_LOCKED_MINUTES` | `otpAccountLockedMinutes` | Wire: `otpAccountLockedMinutes\|15` → `{minutes}` |
| `CommonErrors.TOO_MANY_REQUESTS` | `tooManyRequests` | Wire: `tooManyRequests\|30` → `{seconds}` (HTTP 429) |
| `VerificationSuccessMessages.VERIFICATION_CODE_SENT` | `verificationCodeSentToEmail` | Success toast |
| `VerificationSuccessMessages.EMAIL_VERIFIED_SUCCESS` | `emailVerifiedSuccessfully` | Success toast |

## Checklist for a new API message

- [ ] Enum value in `lib/shared-types/src/lib/messages/`  
- [ ] Value included in `ALL_ERROR_KEYS`  
- [ ] Backend uses enum (or `key|param` for dynamic text)  
- [ ] `errors.<value>` in `en.json` and `ar.json`  
- [ ] If parameterized: ICU placeholders in JSON + branch in `translateApiMessage.ts`  
- [ ] Client uses `useTranslations('errors')` with `translateApiMessage`

## Related files

- `lib/shared-types/src/lib/messages/index.ts` — `ALL_ERROR_KEYS`, `ALL_ERROR_KEYS_SET`  
- `apps/client/src/lib/utils/errors/translateApiMessage.ts` — lookup and parameter mapping  
- `apps/client/src/lib/utils/errors/errorMessage.ts` — optional helper when you already have `useTranslations('errors')`  
- `.cursor/skills/api-error-messages/SKILL.md` — agent workflow for this pattern  
