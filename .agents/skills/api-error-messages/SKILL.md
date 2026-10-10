---
name: api-error-messages
description: >-
  API error/success message keys in @lms-organization/shared-types, root errors in
  en.json/ar.json, translateApiMessage on the client. USE WHEN adding or changing
  Nest exception messages, NATS/RPC error text, QueryService findOneOrThrow
  messages, token/auth service strings, success payloads { message }, ALL_ERROR_KEYS,
  or when the user asks to internationalize API errors or stop hardcoding English
  on the server.
---

# API error messages (shared-types + `errors` i18n)

## Goal

Anything the **end user** can see from the API (HTTP or NATS)—exception `message`, `{ message: string }` success bodies, `NotFoundException` text—must be a **stable key** from `@lms-organization/shared-types`, not ad hoc English in `apps/server`.

The Next.js app maps keys with **next-intl** under the root **`errors`** namespace in `apps/client/messages/en.json` and `ar.json`.

## When to read this skill (mandatory)

- Editing `apps/server/**/*.ts` and throwing `*Exception(...)` with a string.
- Editing `*controller.message.ts`, `handleRpcError`, or NATS handlers.
- Editing `QueryService.findOneOrThrow` / similar helpers that take a `message` argument.
- Editing `apps/client` code that displays `error.message` or server `message` without `translateApiMessage`.
- Editing **Mongoose schema hooks** (`pre('validate', ...)`, `pre('save', ...)`) — `this.invalidate(field, message)` calls are user-facing and **must** use a shared-types key, never a raw English string.

## Workflow

1. **Pick or add an enum** in `lib/shared-types/src/lib/messages/` (e.g. `AuthErrors`, `UserErrors`, `CommonErrors`, or a feature `*-errors.enum.ts`). Use **camelCase** string values (`emailAlreadyVerified`).

2. **`ALL_ERROR_KEYS`** — In `lib/shared-types/src/lib/messages/index.ts`, ensure the enum is included in `ALL_ERROR_KEYS` (usually `...Object.values(MyErrors)`). **New enum members are included automatically** once the enum is in that spread; you do not duplicate each key by hand unless you add a standalone string constant.

3. **Backend** — import enums from `@lms-organization/shared-types`:
   - Static: `throw new BadRequestException(AuthErrors.SOME_KEY)` or `return { message: AuthSuccessMessages.SOME_KEY }`.
   - Dynamic: `` throw new BadRequestException(`${AuthErrors.SOME_KEY}|${numericParam}`) `` (single `|`). Add ICU placeholders in JSON and a branch in `translateApiMessage.ts` if needed.

4. **Translations** — add **`errors.<key>`** to **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`.

5. **Client** — `const t = useTranslations('errors')` and `translateApiMessage(serverString, t)` for toasts and inline errors.

## NestJS exceptions (do / don't)

**Do**

```typescript
import { AuthErrors, UserErrors } from '@lms-organization/shared-types';

throw new NotFoundException(UserErrors.USER_NOT_FOUND);
throw new UnauthorizedException(AuthErrors.AUTHENTICATION_FAILED);
await this.query.findOneOrThrow(Model.name, filter, AuthErrors.ROLE_NOT_FOUND_CREATE_FIRST);
```

**Don't**

```typescript
throw new BadRequestException('User not found');
throw new NotFoundException('Feature not found');
```

## Mongoose schema hooks (do / don't)

`this.invalidate(field, message)` inside `pre('validate', ...)` / `pre('save', ...)` hooks is surfaced as a Mongoose `ValidationError` that propagates to the client. It **must** use a shared-types key.

**Do**

```typescript
import { UserErrors } from '@lms-organization/shared-types';

UserSchema.pre('validate', function (next) {
  if (!this.phone && this.authProvider !== 'google') {
    this.invalidate('phone', UserErrors.PHONE_REQUIRED_FOR_NON_OAUTH);
  }
  next();
});
```

**Don't**

```typescript
UserSchema.pre('validate', function (next) {
  if (!this.phone) {
    this.invalidate('phone', 'Phone is required for onboarded users'); // ❌ hardcoded English
  }
  next();
});
```

## Exceptions (English-only is OK)

- **Internal logs**: `Logger`, `console.error` context strings for operators.
- **Validation**: `class-validator` default messages are separate; if those are user-facing, align with team i18n policy.
- **Purely technical codes** never shown to users (rare).

## Do not

- Hardcode new user-facing English only on the server for flows that should be translated.
- Add keys to shared-types without **`errors.*`** entries in **both** locales.
- Put catalog keys only under feature namespaces unless the team explicitly opts out; **default is root `errors`**.

## Reference

- **`docs/api-error-messages.md`** — checklist, parameterized messages, related files.
- **`.cursor/rules/server.mdc`** — "User-facing API messages" in server rules.
