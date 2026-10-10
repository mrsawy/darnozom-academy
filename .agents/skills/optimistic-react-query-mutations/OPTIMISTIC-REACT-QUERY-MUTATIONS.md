# Optimistic updates with TanStack React Query

This document describes the pattern used in this codebase for mutations that **update the cache as soon as the user triggers the mutation** and **roll back to the previous cache if the request fails**.

## Why

- **Perceived performance**: The UI reflects the new state immediately.
- **Correctness on failure**: `onError` restores cached data so the user does not see a lie after a failed request.
- **Server as source of truth on success**: After a successful response, merge the returned entity into the cache so fields match the backend (optional `invalidateQueries` if merge is not practical).

## Flow

```
User action
    → onMutate: cancelQueries → snapshot cache → optimistic setQueryData/setQueriesData
    → mutationFn (server)
    → onSuccess: merge server result into cache (or invalidate)
    → OR onError: restore snapshot(s) + user-visible error
```

## Implementation checklist

1. **Choose query key scope**  
   Use the narrowest key that still covers every cache entry that displays the affected data (e.g. all discussion lists for a course: prefix `['discussions', type, courseId]`).

2. **Cancel in-flight queries**  
   `await queryClient.cancelQueries({ queryKey: ... })` so a stale refetch does not overwrite the optimistic update.

3. **Snapshot**  
   For each entry you will change: store `previousData = queryClient.getQueryData(key)` or iterate `getQueriesData({ queryKey: prefix })` and push `[key, data]` pairs for rollback.

4. **Optimistic update**  
   Immutably update the cached structure (map pages, map `docs`, recurse into nested lists if needed).

5. **Return context from `onMutate`**  
   Pass the snapshot(s) into `onError` via the mutation context object.

6. **`onError`**  
   For each snapshot, `queryClient.setQueryData(key, previousData)`. Then show toast/error UI.

7. **`onSuccess`**  
   Prefer patching with the response DTO. Preserve nested fields that the API does not return on the list item (e.g. keep `replies` / `children` on discussion nodes when merging `IDiscussion`).

## When not to use

- **Opaque server state** where the client cannot predict the result (complex validations, server-side rules). Prefer pending UI or disable the control until resolved.
- **Very large graphs** where copying the whole tree is expensive: consider narrowing the cached slice or using a normalized store (out of scope for this doc).

## See also

- Skill entry: `.agents/skills/optimistic-react-query-mutations/SKILL.md`
- Example: `apps/client/src/lib/hooks/discussion/useDiscussion.hook.ts` (`toggleLikeMutation`)
- Example: `apps/client/src/lib/hooks/wishlist/use-wishlist.hook.ts`
