---
name: form-schema-colocation
description: >-
  Colocate Yup form schemas with form components. USE WHEN adding or editing any
  client form that uses Yup/react-hook-form: scaffolding a new form, moving inline
  schema out of a component, or reviewing form file layout under organs or
  app routes.
---

# Form schema colocation (client)

## Rule

Any **form component** that uses **Yup** must keep the schema out of the `.tsx` file.

Use a **folder** named after the form (kebab-case), with two siblings:

| File | Contents |
|------|----------|
| `<name>.tsx` | `'use client'`, UI, hooks, `useForm`, `yupResolver`; **import schema from** `./<name>.schema` |
| `<name>.schema.ts` | `yup` object(s), `InferType` / exported value types, shared constants for the form (e.g. role lists). **No JSX**, no React hooks. |

Optional: `<name>.skeleton.tsx` for loading UI (same folder).

## Where this applies

- `apps/client/src/components/organs/<organ>/` — see `ORGAN-PATTERN.md`
- `apps/client/src/app/.../__components/<form>/` — same layout (e.g. `onboarding-form/onboarding-form.schema.ts`)

## i18n

**Mandatory for user-facing validation copy:** follow **form-schema-i18n** (`.agents/skills/form-schema-i18n/SKILL.md`). Export a **factory** `buildXxxSchema(tVal: (key: string) => string)`, keys under `<Namespace>.validation` in `en.json` / `ar.json`, and call from the component with `useTranslations('….validation')` inside `useMemo` so strings stay translated. Do not hardcode English inside Yup chains.

## Do not

- Define `Yup.object(...)` inside the main form `.tsx`
- Use a barrel `index.ts` to re-export the component unless an existing pattern already requires it (organs prefer direct path imports)

## Canonical doc

`apps/client/src/components/organs/ORGAN-PATTERN.md` (includes route-level `__components` forms).
