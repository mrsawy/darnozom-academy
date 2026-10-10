# Expo UI Native Atoms + Auth Pages Migration — Design

**Date:** 2026-07-15
**App:** `apps/lms-mobile` (Expo SDK 54, dev-client, pnpm workspace)

## Goal

Introduce `@expo/ui` (SwiftUI / Jetpack Compose native components) behind a set of
atoms under `components/atoms/native/`, and migrate the auth pages (login + signup)
to use them.

## Decisions (confirmed with user)

- **Components in this pass:** `button`, `text-input`, `picker`, `progress` — the set
  the auth pages need.
- **No web support:** the app will not run on web; atoms are native-only. No
  `.web.tsx` fallback files.
- **Auth migration scope:** buttons + text inputs + country/role selects in
  `login-form.tsx`, `signup-form.tsx`, and the Google button in `(auth)/login.tsx`.

## Structure

Each atom is a folder with exactly 3 files (matches `atoms/gluestack/select/` precedent):

```
components/atoms/native/
  index.ts                    # re-exports all native atoms
  button/
    button.tsx                # Platform branch: swift-ui / jetpack-compose in <Host>
    button.types.ts           # shared props contract (no JSX)
    index.ts
  text-input/  (same shape)
  picker/      (same shape)
  progress/    (same shape)
```

## Contracts

- `NativeButton` — `label`, `onPress`, `variant?`, `disabled?`. Renders `@expo/ui`
  `<Button>` inside `<Host matchContents>`.
- `NativeTextInput` — `value`, `onChangeText`, `onBlur?`, `placeholder?`,
  `secureTextEntry?`, `keyboardType?`, `autoCapitalize?`. If a platform's `@expo/ui`
  TextInput lacks secure entry, that case falls back to the existing styled `Input`
  so passwords never render as plain text.
- `NativePicker` — `options: { label, value }[]`, `selectedValue?`, `onValueChange`,
  `placeholder?`.
- `NativeProgress` — circular indeterminate spinner.

Exact `@expo/ui` prop names are verified against the installed package typings at
implementation time (the library is in beta and its API moves between SDKs).

## Auth pages migration

- `login-form.tsx`: `Input` → `NativeTextInput`, submit `Button` → `NativeButton`.
- `signup-form.tsx`: all `Input`/`PasswordInput` → `NativeTextInput`, country/role
  `Select` → `NativePicker`, submit → `NativeButton`.
- `(auth)/login.tsx`: Google `Pressable` → `NativeButton` (bordered variant).
- react-hook-form `Controller` wiring is unchanged; atoms are controlled components.

## Known trade-offs / risks

- Native components take system styling (Material 3 / SwiftUI) — they will not match
  the NativeWind theme pixel-for-pixel. Accepted.
- `@expo/ui` is a native module: requires a dev-client rebuild
  (`expo run:android`) to appear on device; not available in Expo Go.

## Verification

- `pnpm nx run lms-mobile:type-check` and `pnpm nx run lms-mobile:lint` pass.
- Manual run on Android emulator via dev build (Metro on port 8083 due to the
  Docker 8081 conflict).
