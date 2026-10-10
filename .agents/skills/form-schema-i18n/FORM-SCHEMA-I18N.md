# Form schema validation i18n

Client-side **Yup** schemas used with `yupResolver` must not contain user-facing literal strings in a fixed language. Use **next-intl** and a **factory function** pattern.

## Why

- Validation messages appear in labels, toasts, and `react-hook-form` errors; they must follow the active locale.
- Keeping English inside `*.schema.ts` breaks Arabic (and any other) UI parity.

## Standard workflow

1. Add a `validation` object next to your feature messages in `en.json` / `ar.json`:

   ```json
   "MyFeature": {
     "validation": {
       "emailRequired": "…"
     }
   }
   ```

2. In `my-form.schema.ts`, export `buildMyFormSchema(tVal: (key: string) => string)` and use `tVal('emailRequired')` for every Yup message parameter.

3. In `my-form.tsx`:

   - `const tVal = useTranslations('MyFeature.validation');`
   - `const schema = useMemo(() => buildMyFormSchema(tVal), [tVal]);`
   - `resolver: yupResolver(schema)`

## Naming

- Use **camelCase** keys: `titleRequired`, `passwordMinLength`.
- Prefer **stable keys** over interpolated sentences when possible; use next-intl [rich text](https://next-intl-docs.vercel.app/docs/usage/messages#rich-text) only if you need variables in the message.

## Checklist for new forms

- [ ] No English strings inside Yup in `*.schema.ts`
- [ ] Matching keys in `en.json` and `ar.json`
- [ ] `useMemo(..., [tVal])` around the built schema
- [ ] Sub-schemas either take `tVal` or are created inside the main builder

See also: **form-schema-i18n** and **form-schema-colocation** skills under `.agents/skills/`.
