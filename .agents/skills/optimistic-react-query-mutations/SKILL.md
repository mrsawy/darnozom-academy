---
name: optimistic-react-query-mutations
description: >-
  TanStack React Query mutations that update the cache immediately on mutate and
  restore the previous cache on error. USE WHEN adding or editing useMutation
  flows that should feel instant (likes, toggles, counters, list membership), or
  when reviewing mutations that only invalidateQueries after success.
---

# Optimistic React Query mutations (client)

## Rule

For mutations where the UI should **update immediately** when the user acts:

1. **`onMutate`** — Before the request finishes:
   - `await queryClient.cancelQueries({ queryKey: ... })` for the data that might race with this update (see wishlist hook comments in `use-wishlist.hook.ts`).
   - **Snapshot** every affected cache entry you are about to change (`getQueriesData` / `getQueryData` into a variable or list of `[queryKey, data]` pairs).
   - **Apply the optimistic change** with `setQueryData` / `setQueriesData` (match the same key scope you cancelled).

2. **`onError`** — Restore snapshots with `setQueryData` for each saved entry. Show the error toast/message here.

3. **`onSuccess`** — Prefer **merging the server payload** into the same cache shape (`setQueriesData` updater) so the UI matches the backend without a full refetch flash. Use `invalidateQueries` only when you cannot patch safely or after several related mutations.

If the optimistic change **requires the current user id** (e.g. toggling “liked by me”) and it is missing, skip the optimistic patch but still run `mutationFn`; `onSuccess` can still apply the server entity.

## Key prefix vs single query

- One list: snapshot `getQueryData(queryKey)` and rollback one entry.
- Many lists (same resource, different filters): use a **stable partial `queryKey`** with `getQueriesData` / `setQueriesData` so every cached list that contains the row updates (see `useDiscussion.hook.ts` `toggleLike`).

## Nested / tree data

If items appear in **nested** structures (`replies`, `children`, etc.), use a **recursive** map from the root `docs` (or page rows) down so the target `id` is found wherever it lives.

## Canonical doc

Longer examples and checklist: `OPTIMISTIC-REACT-QUERY-MUTATIONS.md` in this folder.

## References in this repo

- `apps/client/src/lib/hooks/discussion/useDiscussion.hook.ts` — `toggleLike`: multi-query optimistic toggle, rollback, then merge server `IDiscussion`.
- `apps/client/src/lib/hooks/wishlist/use-wishlist.hook.ts` — add/remove wishlist with snapshot + rollback.

## Do not

- Rely only on `invalidateQueries` in `onSuccess` for interactions that should feel instant (unless product accepts a loading state).
- Forget `cancelQueries` when a refetch could overwrite the optimistic patch mid-flight.
- Lose the rollback path: every `setQueryData` in `onMutate` must have a matching restore in `onError`.
