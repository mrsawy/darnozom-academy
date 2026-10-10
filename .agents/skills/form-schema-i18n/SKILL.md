---
name: form-schema-i18n
description: >-
  Translate all Yup validation strings via next-intl. USE WHEN adding or editing
  any `*.schema.ts` used with yupResolver, moving English literals out of Yup
  chains, or reviewing form validation copy. Pairs with form-schema-colocation.
---

# Form schema validation i18n (Yup + next-intl)

## Rule

**Never hardcode English (or any single locale) inside Yup** in `apps/client`: no `.required('Title is required')`, no default Yup message keys surfacing to users.

Validation copy must come from **next-intl** using a **schema factory** that receives the scoped translator for a `validation` namespace.

## Pattern

1. **Namespace per feature form** (or shared namespace if reused): e.g. `PrivateSessions.validation`, `onboarding.validation`.

2. **Export a builder** from `<name>.schema.ts`:

   ```ts
   export function buildXxxSchema(tVal: (key: string) => string) {
     return Yup.object({
       title: Yup.string().required(tVal('titleRequired')),
       // ...
     });
   }
   ```

3. **In the client component**, bind `tVal` and memoize the schema:

   ```tsx
   const tVal = useTranslations('FeatureName.validation');
   const schema = useMemo(() => buildXxxSchema(tVal), [tVal]);
   ```

   Use `[tVal]` as the dependency array (next-intl’s `t` is stable per locale).

4. **Add keys** to `apps/client/messages/en.json` and `ar.json` under the same path (e.g. `PrivateSessions.validation.titleRequired`).

5. **Resolver**: `yupResolver(schema)` — do not import a static `Yup.object` for production forms unless the form is tests-only or locale-free.

## Nested / shared fragments

Sub-schemas (e.g. array item shape) should be **functions** that take `tVal`, or built inside the main `buildXxxSchema`, so every `.matches()`, `.min()`, `.max()`, and `.required()` receives translated strings.

## Tests

Unit tests that import the schema may pass `(k: string) => k` or English literals **only in test files** if they need a static schema; production code must use the factory + `useTranslations`.

## Do not

- Rely on Yup’s built-in English for `.min()` / `.max()` without passing a second argument.
- Put `useTranslations` inside `*.schema.ts` (schemas stay hook-free; see form-schema-colocation).

## Related

- **Colocation**: `.agents/skills/form-schema-colocation/SKILL.md`
- **Reference doc**: `.agents/skills/form-schema-i18n/FORM-SCHEMA-I18N.md`
- **Examples**: `apps/client/src/app/[locale]/onboarding/__components/onboarding-form/onboarding-form.schema.ts`, `private-session-form.schema.ts`
