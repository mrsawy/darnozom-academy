# Platform-Adaptive Tab Bar — Native Liquid Glass on iOS

**Date:** 2026-07-23
**App:** `apps/lms-mobile`
**Status:** Approved (revised — native approach)

## Goal

On iOS devices that support Liquid Glass (iOS 26+), render the **genuine, OS-drawn
Liquid Glass tab bar** by delegating the bottom bar to the system via
`NativeTabs` (`expo-router/unstable-native-tabs`). On Android and any iOS device
without Liquid Glass, keep the existing custom animated tab bar unchanged.

This supersedes the earlier "wrap the same layout in a GlassView" approach, which
produced a fake-glass reskin of the old bar. The old custom design is intentionally
**not** reused on the native path — iOS gets a fully native design.

## Approach (decided)

Native OS tab bar via `NativeTabs`. Chosen over a hand-built floating GlassView
capsule because it yields the real iOS 26 Liquid Glass bar automatically, matching
the referenced articles. Accepted tradeoffs are listed below.

## Runtime Selection

`app/(tabs)/_layout.tsx` branches at render time on the existing
`canUseLiquidGlass()` (from `@/components/atoms/native/glass`, which checks
`isLiquidGlassAvailable()` **and** `isGlassEffectAPIAvailable()`):

- `canUseLiquidGlass()` → **`NativeTabs`** navigator (OS Liquid Glass).
- otherwise → existing **`Tabs`** navigator with the custom `TabBar`
  (`DefaultTabBar`), exactly as today.

Both branches declare the same five routes, which map to the existing route
folders: `(home)`, `ai`, `browse`, `enrollments`, `profile`.

## Native Branch: `NativeTabs`

```tsx
<NativeTabs tintColor={selectedAccent} minimizeBehavior="onScrollDown">
  <NativeTabs.Trigger name="(home)">
    <Icon sf={{ default: 'house', selected: 'house.fill' }} />
    <Label>{t('tabs.home')}</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="ai">
    <Icon sf="sparkles" />
    <Label>{t('tabs.ai')}</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="browse" role="search">
    <Icon sf="magnifyingglass" />
    <Label>{t('tabs.browse')}</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="enrollments">
    <Icon sf={{ default: 'book', selected: 'book.fill' }} />
    <Label>{t('tabs.enrollments')}</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="profile">
    <Icon sf={{ default: 'person', selected: 'person.fill' }} />
    <Label>{t('tabs.profile')}</Label>
  </NativeTabs.Trigger>
</NativeTabs>
```

- **`backgroundColor` is left unset** so the OS renders Liquid Glass. Setting an
  opaque color would defeat the glass.
- **`tintColor`** = app primary (from `THEME`), for the selected item accent.
- **`minimizeBehavior="onScrollDown"`** enables the iOS-26 liquid minimize on
  scroll. (Can be dropped if undesired.)
- SF Symbols are iOS-native and replace the current lucide icons on this path.

## Android / Non-Liquid Branch

Unchanged: existing `Tabs` navigator + the refactored folder-based custom
`TabBar` (`DefaultTabBar`), including all current animations and the custom
`enrollments` tap logic (`navigateToEnrollmentsList`).

## Headers

Each tab already owns its header via its **own nested Stack** — `(home)`, `ai`,
`enrollments`, and `profile` render their headers (and `TabHeaderActions` /
`ToggleTheme`) inside their own `Stack`, and set `headerShown:false` at the
parent `Tabs`. These are unaffected: `NativeTabs` only replaces the bottom bar;
nested-Stack headers still render.

**Only `browse` is different** — it currently sources its header (title +
`TabHeaderActions`) from the *parent* `Tabs` navigator. Since `NativeTabs` renders
no header, browse must self-manage:

- `browse/_layout.tsx`: show a header on the `index` screen with
  `title: t('tabs.browse')` and `headerRight: () => <TabHeaderActions />`.
- Custom `Tabs` branch: set browse to `headerShown:false` (it no longer needs the
  parent header). Net result on both platforms matches today's browse header
  (native nav bar with title + actions above the existing in-page header).

## Component / File Changes

- `app/(tabs)/_layout.tsx` — branch NativeTabs vs Tabs on `canUseLiquidGlass()`.
  Extract the two navigators into small components:
  `app/(tabs)/_native-tabs.tsx` and `app/(tabs)/_custom-tabs.tsx` (keeps
  `_layout.tsx` a thin selector).
- `app/(tabs)/browse/_layout.tsx` — browse self-manages its header.
- `components/molecules/tab-bar/` — keep the folder refactor and `DefaultTabBar`
  (used by the custom branch). **Delete `variants/glass-tab-bar.tsx`** (the
  fake-glass reskin) and remove its wiring from `tab-bar.tsx`, which becomes a
  thin default export of `DefaultTabBar` (the custom branch is the only caller).

## Accepted Tradeoffs

- **iOS loses the custom `enrollments` tap logic.** `NativeTabs` uses native tab
  behavior (re-tapping the active tab pops its stack to root). The custom
  `navigateToEnrollmentsList` ("from another tab, open list-only") runs only on
  the Android / non-liquid branch. Documented, accepted.
- **iOS icons become SF Symbols**, not the lucide set. This is inherent to a
  native tab bar and is the desired native look.
- `NativeTabs` is an `unstable_` expo-router API (import from
  `expo-router/unstable-native-tabs`). Acceptable per the referenced guidance.

## Verification

- `nx run lms-mobile:type-check` and `:lint` clean for changed files.
- Manual: Android + iOS-without-liquid-glass → custom animated bar unchanged;
  iOS 26+ → native Liquid Glass bar with correct icons, labels, selected accent,
  and working headers on every tab including browse.

## Out of Scope

- Any redesign of the Android custom bar.
- Custom JS tab-press behavior on the native iOS path (native behavior accepted).
