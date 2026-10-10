# Section Component Pattern

Sections are top-level visual blocks rendered on a page (e.g. hero, courses grid, teachers
grid, pricing). When a section fetches data client-side and has a meaningful loading state,
it **must** be split into a dedicated folder.

## Folder Structure

```
__sections/
  <section-name>/
    <section-name>.tsx            # Main component — 'use client', hooks, rendering
    <section-name>.skeleton.tsx   # Skeleton loading state — no hooks, pure UI
```

### Rules

| File             | Responsibility                   | Has JSX | `'use client'`   |
| ---------------- | -------------------------------- | ------- | ---------------- |
| `*.tsx`          | React component, hooks, handlers | Yes     | Yes              |
| `*.skeleton.tsx` | Shimmer/placeholder layout       | Yes     | No (server-safe) |

- **Skeleton file** — mirrors the visual structure of the main component using `<Skeleton />`
  atoms. The main component renders it while data is loading (`isLoading` guard).
- **No index barrel** — pages import the component directly:
  ```ts
  import TeachersSection from './__sections/teacher-section/teacher-section';
  ```

## When to apply this pattern

Apply this folder pattern when a section:

- Fetches data client-side (via `useQuery` or similar)
- Has a **loading/skeleton state** worth showing
- Would otherwise inline a large JSX skeleton block inside the component

Single-use sections with no data fetching or skeleton may remain as flat `.tsx` files
inside `__sections/`.
