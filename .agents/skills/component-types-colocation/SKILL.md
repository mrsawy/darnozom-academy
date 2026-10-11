---
name: component-types-colocation
description: >-
  Colocate component props, type aliases, and type-narrowing helpers in
  `<same-name>.types.ts` next to the main `.tsx`. USE WHEN adding or editing
  React components under apps/client, moving inline `interface`/`type` out of
  a component file, or reviewing imports that define types beside JSX.
---

# Component types colocation (client + mobile)

## Rule

For any **folder-based component** whose main file is `<name>.tsx`:

| File | Contents |
|------|----------|
| **`<name>.types.ts`** | **Props interface** (e.g. `<Name>Props`), **type aliases**, **unions**, `as const` tuples used for keys/unions, and **small pure helpers** that exist only to support those types (e.g. normalizers, type guards). **No JSX**, no `'use client'`, no React hooks. |
| **`<name>.tsx`** | UI, hooks, imports `import type { XxxProps } from './<name>.types'`. |

The types filename **must match** the implementation stem: `foo-bar/foo-bar.types.ts` pairs with `foo-bar/foo-bar.tsx`, not a generic `types.ts`.

## Barrel

Re-export public types from the folder **`index.ts`**:

```ts
export type { FooProps } from './foo.types';
export { Foo } from './foo';
```

Consumers should import from the component folder barrel, not from inner `.types.ts` paths, when the project already uses that pattern.

## Do not

- Define `export interface FooProps` (or large `type` aliases) in the main `.tsx`
- Use a mismatched name like `types.ts` or `component.types.ts` instead of `<same-name>.types.ts`
