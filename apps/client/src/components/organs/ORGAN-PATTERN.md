# Organ Component Pattern

Organs are page-level UI sections shared across multiple routes (e.g., the same account page
rendered inside the student, parent, and org dashboards). Each organ that owns a form or has
meaningful loading state **must** be split into a dedicated folder.

## Folder Structure

```
organs/
  <organ-name>/
    <organ-name>.tsx          # Main component — 'use client', imports from schema
    <organ-name>.schema.ts    # Yup schemas + inferred TypeScript types (no JSX)
    <organ-name>.skeleton.tsx # Skeleton loading state — no hooks, pure UI
```

### Rules

| File             | Responsibility                      | Has JSX | `'use client'`   |
| ---------------- | ----------------------------------- | ------- | ---------------- |
| `*.tsx`          | React component, hooks, handlers    | Yes     | Yes              |
| `*.schema.ts`    | Yup schemas and `InferType` exports | No      | No               |
| `*.skeleton.tsx` | Shimmer/placeholder layout          | Yes     | No (server-safe) |

- **Schema file** — export every schema (`export const xSchema = yup.object(...)`) and its
  inferred type (`export type XForm = yup.InferType<typeof xSchema>`). Never define schemas
  inside the component file.
- **Skeleton file** — mirrors the visual structure of the main component using `<Skeleton />`
  atoms. Import and render it while data is loading (Suspense boundary or `isPending` guard).
- **No index barrel** — dashboard pages import the component directly:
  ```ts
  import AccountPage from '@/components/organs/account-page/account-page';
  ```

## Example — `account-page`

```
organs/
  account-page/
    account-page.tsx          ← 'use client' form with 4 tabs
    account-page.schema.ts    ← basicSchema, profileSchema, securitySchema, preferencesSchema
    account-page.skeleton.tsx ← AccountPageSkeleton component
```

Dashboard pages (student / parent / org) each contain one line:

```tsx
import AccountPage from '@/components/organs/account-page/account-page';
export default function Page() {
  return <AccountPage />;
}
```

## Route-level forms (`app/.../__components/`)

The **same folder layout** applies to any client form under a route, not only `components/organs/`:

```
app/[locale]/some-route/__components/
  <form-name>/
    <form-name>.tsx          # 'use client' — imports schema only from ./<form-name>.schema
    <form-name>.schema.ts    # Yup + InferType (no JSX, no hooks)
```

- **Never** define Yup schemas inside the `.tsx` file — always colocate `<name>.schema.ts` in the same folder.
- If the form is a single flat `my-form.tsx` today and you add validation, refactor to `my-form/my-form.tsx` + `my-form.schema.ts`.
- Optional skeleton: `<form-name>.skeleton.tsx` in the same folder when needed.

## When to apply this pattern

Apply this folder pattern when an organ:

- Contains **one or more forms** with Yup validation
- Has a **loading/skeleton state** worth showing
- Is **shared across two or more routes**

Single-use organs with no form or skeleton may remain as flat `.tsx` files inside `organs/`.

**Exception:** As soon as a component gains a Yup schema, move it into a **named subfolder** with a matching `.schema.ts` file (see “Route-level forms” above), even if it is single-use.
