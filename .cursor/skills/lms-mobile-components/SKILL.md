---
name: lms-mobile-components
description: >-
  Folder-per-component layout with mandatory index barrels for apps/lms-mobile
  and apps/client: each component folder exports only via index; atoms,
  molecules, organs, and ui each have index files aggregating children — same
  nested export pattern as lib/shared-types. USE WHEN creating or moving
  components, wiring barrels, or fixing imports that reach past a component's
  index.
---

# Component library layout (mobile + client)

## Scope

Applies to:

- **`apps/lms-mobile/components`** (`atoms/`, `molecules/`, `organs/`, `ui/`)
- **`apps/client/src/components`** (same buckets plus any parallel structure such as `chat/`, `kibo-ui/` — use the same barrel rules within those trees)

**New work** should follow this layout; migrate legacy flat files when you touch them.

---

## Barrel hierarchy (same idea as `lib/shared-types`)

The **`@lms-organization/shared-types`** package exposes APIs through **nested `index.ts` files only**: the package entry re-exports from `./lib/types/index`, domains like `./course/index` re-export their leaf modules, and consumers import from the package or a stable barrel — not from arbitrary inner file paths.

Apply the **same pattern** to components:

| Level | Role |
|--------|------|
| **`components/index.ts`** (when present) | Re-export from **`./atoms`**, **`./molecules`**, **`./organs`**, **`./ui`** (and other top-level buckets you maintain). |
| **`atoms/index.ts`**, **`molecules/index.ts`**, **`organs/index.ts`**, **`ui/index.ts`** | Re-export **only** from **component folders**: `export * from './badge'`, `export * from './course-card'`, etc. Each path resolves to that folder’s **`index`** — never to a raw `.tsx` file. |
| **`components/<layer>/<component-name>/index.ts`** | **Single public entry** for that component. Export components, hooks, and types that outside code may need. Implementation stays in `<component-name>.tsx` and **`<component-name>.types.ts`**. |

### Rules

1. **Every new component** must be **exported from its folder `index`** (`index.ts`, or `index.tsx` only if the barrel must contain JSX).
2. **Every layer** (`atoms`, `molecules`, `organs`, `ui`) **must have an `index`** that registers each component via `export * from './<folder>'` / named exports — same aggregation style as `shared-types` domain folders.
3. **Consumers import from the component boundary**, not from inner files:
   - Prefer: `import { Badge } from '@/components/atoms/badge'` or `import { Badge } from '@/components/atoms'` when the layer barrel re-exports it.
   - Avoid: `import { Badge } from '@/components/atoms/badge/badge'` or `.../badge.tsx`.

After adding a component, **update the parent layer `index.ts`** so the component is part of the public tree (mirroring how adding a type domain requires exporting it from `lib/types/index.ts`).

---

## Rule: one folder per component

Put each component in a **directory whose name matches the component** (**kebab-case**, same idea as `apps/client` folders such as `nav-bar`, `hero`, `apple-hello-effect`).

Inside that folder, keep **three primary files**:

| File | Role |
|------|------|
| **`index.ts`** (or `index.tsx` only if the barrel must contain JSX) | **Only public API** for this component: re-export implementation and types. |
| **`<folder-name>.tsx`** | Main implementation — primary React file (same pairing as `nav-bar/nav-bar.tsx`, `hero/hero.section.tsx` on the client). |
| **`<folder-name>.types.ts`** | Props, unions, component-specific types — imported by the main tsx from `./<folder-name>.types`. |

The types filename **must match** the implementation stem (e.g. `badge/badge.types.ts` paired with `badge/badge.tsx`, not a generic `types.ts`).

### Example layout

```
apps/lms-mobile/components/atoms/badge/
├── index.ts
├── badge.tsx
└── badge.types.ts

apps/client/src/components/atoms/badge/
├── index.ts
├── badge.tsx
└── badge.types.ts
```

### `index.ts` (component)

```ts
export { Badge } from './badge';
export type { BadgeProps } from './badge.types';
```

### `badge.types.ts`

```ts
export interface BadgeProps {
  // ...
}
```

### `badge.tsx`

```tsx
import type { BadgeProps } from './badge.types';

export function Badge(props: BadgeProps) {
  // ...
}
```

---

## Naming

- **Folder and main file**: same kebab-case stem (e.g. `course-card/course-card.tsx`).
- **Types file**: `<same-stem>.types.ts` (e.g. `course-card.types.ts`).
- **Exported symbol**: PascalCase (`CourseCard`).
- Optional domain suffixes (e.g. `hero.section.tsx`) **only** when matching an established client convention for that feature; if the main file is `hero.section.tsx`, pair types as **`hero.section.types.ts`** (same stem before `.types.ts`).

---

## Atomic layers

- **`atoms/`** — small primitives  
- **`molecules/`** — composed pieces  
- **`organs/`** — feature-level UI  
- **`ui/`** — design-system / primitives / providers  

Each **component** under these buckets gets its **own folder** with **`index` + main tsx + `<stem>.types.ts`**, and each **layer** maintains **`index.ts`** that lists its children.

---

## Path aliases (reference)

| App | Typical base |
|-----|----------------|
| Mobile | `@/components/...` (points at `apps/lms-mobile/components`) |
| Client | `@/components/...` (points at `apps/client/src/components`) |

Use the alias your app already defines; the **shape** is always: **layer → component folder → index**.

---

## Exceptions

- **Third-party or generated clusters** (e.g. Gluestack provider with `config.ts`, `index.web.tsx`) may keep multiple implementation files; still expose **app-owned** types and the stable entry through **`index`** and **`<stem>.types.ts`** where applicable.
- **Route-local `__components`** under `apps/client/src/app/...` should follow the same principle when practical: a **folder + `index`** per UI unit, and a **section-level barrel** if the folder exports multiple related entries (same spirit as `shared-types` nested barrels).
- **Non-exported helpers** inside a feature folder (e.g. `organs/chat-view/components/chat-helpers.ts`) do not require an `index` barrel; optional local **`*.types.ts`** files are fine for props-only modules used only inside that feature.

---

## Checklist when creating a component

1. Add **`/<layer>/<name>/index.ts`**, **`<name>.types.ts`**, **`<name>.tsx`**.
2. Export everything consumers need **from the component `index` only**.
3. Append **`export * from './<name>'`** (or explicit named exports) to **`/<layer>/index.ts`**.
4. If the repo uses **`components/index.ts`**, ensure it still re-exports that **layer** (no orphan buckets).
5. Import elsewhere **only** via **`@/components/<layer>/<name>`** or **`@/components/<layer>`**, never through inner file paths.

---

## Alignment with `apps/client` (historical note)

Older client atoms may still be flat files (`button.tsx` next to `atoms/index.ts`). **New and migrated** client components should use **folder + index + `<stem>.types.ts` + layer barrel**, identical to mobile, so both apps stay consistent with **`shared-types`**-style aggregation.
