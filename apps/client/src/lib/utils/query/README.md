# React Query wrappers (`@/lib/utils`)

`useQuery`, `useMutation`, and `useQueryClient` are re-exported from `@/lib/utils` with shared defaults (`queryOptions.ts`).

## NATS errors from server actions

Server actions that call `createNatsRequest` / `createAuthorizedNatsRequest` should **return**
`{ err: { message: string } }` on failure — **not** `throw new Error(...)` in the action.

These wrappers pass the query/mutation result through `throwIfNatsError` (`lib/utils/natsErrorHandler.ts`) so that:

- React Query sees a real failure (query error / mutation `onError`).
- Error messages are not lost to Next.js production behavior for thrown server errors.

Direct `@tanstack/react-query` imports do **not** apply this guard; prefer `@/lib/utils` for data that comes from NATS server actions.

See `.agents/skills/nats-server-actions/SKILL.md`.
