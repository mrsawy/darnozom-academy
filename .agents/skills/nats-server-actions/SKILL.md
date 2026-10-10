---
name: nats-server-actions
description: >-
  Write or edit Next.js server actions that communicate over NATS.
  USE WHEN: adding a new server action file, adding a function to an existing
  action file, or changing how an action communicates with the backend
  (auth/user/course/wallet/etc.). Also use when the user asks to "use NATS",
  "use createAuthorizedNatsRequest", or "use createNatsRequest" in a server action.
---

# NATS Server Actions (client app)

All communication from `apps/client` server actions to the NestJS backend goes
through NATS — never via raw HTTP `fetch` to internal endpoints.

Two helpers live in `apps/client/src/lib/utils/createNatsRequest.ts`:

| Helper | Use when |
|--------|----------|
| `createNatsRequest` | Public / unauthenticated calls (login, register, forgot-password, OAuth user-fetch with explicit token) |
| `createAuthorizedNatsRequest` | Authenticated calls — reads the JWT automatically from the `AUTH_COOKIE_NAME` cookie and injects `authorization` into the payload |

## createNatsRequest

```ts
import { createNatsRequest } from '@/lib/utils/createNatsRequest';

// Returns R; on NATS error returns { err: { message: string } } cast to R
const response = await createNatsRequest<SuccessType | { err: { message: string } }>(
  'feature.action',   // NATS subject — matches @MessagePattern on the server
  { field1, field2 }  // payload fields; merged into data: { ...fields }
);

if ('err' in response) {
  // handle error
}
// use response as SuccessType
```

## createAuthorizedNatsRequest

```ts
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

// Automatically adds authorization: <JWT from cookie>
// Handles token-expired → silent refresh → retry once
const result = await createAuthorizedNatsRequest<
  SuccessType | { err: { message: string } }
>('feature.action', payload);

if ('err' in result) { /* ... */ }
```

## React Query (`@/lib/utils`) — do not throw for `{ err }` in actions

The wrapped `useQuery` and `useMutation` imported from `@/lib/utils` (not directly from
`@tanstack/react-query`) run the query/mutation result through `throwIfNatsError` in
`apps/client/src/lib/utils/natsErrorHandler.ts`. That turns a returned
`{ err: { message: string } }` into a thrown `Error` **on the client**, so React Query
error state and `onError` work, and Next.js does not strip messages in production.

**In server actions:** return the NATS error object as-is — **do not**
`throw new Error(response.err.message)` when `'err' in response`. Pass-through:

```ts
return createAuthorizedNatsRequest<SuccessType | { err: { message: string } }>(
  'feature.action',
  payload
);
```

If the action must branch on success (e.g. set cookies, redirect), use
`if ('err' in response) return response` before the success path — same as
`apps/client/src/lib/actions/auth/auth.action.ts`.

Call sites that **do not** go through those hooks (rare) must check `'err'` themselves
or call `throwIfNatsError` after awaiting the action.

## Rules

1. **Never use `connectToNats` + `request` directly** in action files — always use
   `createNatsRequest` or `createAuthorizedNatsRequest`.

2. **Never use `fetch` to call internal API routes** (e.g., `GET /user/user-data`).
   Use the corresponding NATS message pattern instead (e.g., `user.getOwnData`).

3. **Public flows** (auth bootstrap, OAuth token exchange): use `createNatsRequest`
   and pass `authorization: token` explicitly when the cookie isn't set yet:
   ```ts
   await createNatsRequest<...>('user.getOwnData', { authorization: access_token });
   ```

4. **Authenticated flows**: use `createAuthorizedNatsRequest`; never manually read
   `AUTH_COOKIE_NAME` and inject it — the helper does it for you (plus retry on expiry).

5. **Error handling**: always type the response as `SuccessType | { err: { message: string } }`.
   **Do not throw** on `'err'` when consumers use `@/lib/utils` `useQuery` / `useMutation`;
   return the response (or `return response` after branching). Guard with
   `if ('err' in response)` only when the action needs to run success-only side effects.

6. **Always** `'use server'` at the top of the file.

7. **File location**: `apps/client/src/lib/actions/<feature>/<feature>.action.ts`

## Canonical example

`apps/client/src/lib/actions/auth/auth.action.ts` — covers all four patterns:
- `createNatsRequest` for public flows (signup, login, forgot/reset password, token refresh)
- `createNatsRequest` with explicit `authorization` for OAuth callback user fetch
- `createAuthorizedNatsRequest` for authenticated post-login flow (onboarding completion)
- `redis.del` to invalidate cached user after mutations that change the profile
