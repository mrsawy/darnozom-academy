# Home Screen Redesign — Safeer "Ambient Helper" (Direction 1c)

**Date:** 2026-07-22
**Target:** `apps/lms-mobile` (Expo / React Native / NativeWind)
**Design source:** Claude Design project `Safeer Home.dc.html`, option **1c — مساعد عائم / Ambient helper**

## Goal

Rework the mobile Home tab toward design direction **1c**: keep the existing layout and
information architecture, refresh its visual language, and introduce **Safeer** — the app's
AI mascot — as an *ambient floating helper* that sits above the tab bar and offers AI help.
Decompose the current 350-line monolithic `app/(tabs)/index.tsx` into a clean, testable
`features/home/` module.

1c is the subtlest of the three explored directions ("keep the current design roughly as-is,
add a floating Safeer"). We deliberately do **not** adopt the bolder hero (1a) or coach-card
(1b) treatments.

## Confirmed decisions

- **Floating helper:** always visible, bobbing mascot + tooltip pinned above the tab bar;
  tapping navigates to the **AI tab**. A new `HREF_TABS_AI` route constant is added.
- **Sections scope:** keep the existing **Featured Courses** and **Featured Instructors**
  sections (restyled), below the insights card. 1c is additive, not a content trim.

## Server alignment

The design needs **no new server endpoints**. Every value it shows is already available:

| Design element | Data source (existing) |
| --- | --- |
| Greeting name | `useAuthStore().user.firstName` |
| Search → Browse | static, navigates to `HREF_TABS_BROWSE` |
| Safeer banner copy | static (i18n) |
| Continue-learning progress | `useEnrollments()` → `enrollment.progressPercentage` |
| Insights "avg progress" | derived: mean of `progressPercentage` over enrollments |
| Insights "study time (h)" | derived: sum of `enrollment.timeSpentMinutes` ÷ 60 |
| Featured courses / instructors | `useFeaturedCourses()`, `useInstructors()` |

`timeSpentMinutes` is already defined on `IEnrollment` and populated by the enrollment entity.
The only server-side verification task is confirming the enrollments **list** response includes
`timeSpentMinutes` (not just the detail response); if it is omitted from the list projection,
add it there. No schema, controller, or DTO changes are anticipated.

## Architecture — `features/home/`

```
features/home/
  components/
    home-header/            home-header.tsx        greeting + notification bell
    home-search-bar/        home-search-bar.tsx    tappable search → Browse
    safeer-banner/          safeer-banner.tsx      promo banner w/ Safeer "reading" mascot
    continue-learning/      continue-learning.tsx  enrollment progress cards (horizontal)
    learning-insights-card/ learning-insights-card.tsx  mini area chart + avg/study stats
    featured-courses/       featured-courses.tsx   restyled featured courses rail
    featured-instructors/   featured-instructors.tsx  restyled instructor avatars rail
    safeer-helper/          safeer-helper.tsx      ambient floating mascot (signature of 1c)
  hooks/
    use-home-data.ts        aggregates enrollments + featured + instructors queries
  utils/
    home-stats.ts           avgProgress(enrollments), totalStudyHours(enrollments)
  assets/
    safeer-reading.png      pulled from the design project
    safeer-waving.png       pulled from the design project
  index.ts                  barrel export
```

`app/(tabs)/index.tsx` collapses to a thin composition root (~40 lines): a `ScrollView`
stacking the section components, with `<SafeerHelper/>` rendered as a sibling overlay
(absolute-positioned above the tab bar) outside the scroll content.

### Component contracts

- **`home-header`** — props `{ name: string; avatarUrl?: string; onBellPress(): void }`.
  Presentational; no data fetching.
- **`home-search-bar`** — props `{ onPress(): void }`. Non-editable input that routes to Browse.
- **`safeer-banner`** — no props; static i18n copy + `safeer-reading.png` in a glow "pod".
- **`continue-learning`** — props `{ enrollments; isLoading }`. Renders horizontal cards or the
  empty/loading states (behavior preserved from the current screen).
- **`learning-insights-card`** — props `{ enrollments }`. Computes `avgProgress` and
  `totalStudyHours` via `home-stats`; renders the existing chart-kit component plus the two
  stat labels. Rendered only when `enrollments.length > 0` (preserves current behavior).
- **`featured-courses`** / **`featured-instructors`** — props `{ items; isLoading }`.
  Extracted from the current screen with 1c styling.
- **`safeer-helper`** — props `{ onPress(): void }` (defaulting to AI-tab navigation).
  Absolute-positioned, bobbing animation via `Animated`; tooltip bubble with i18n copy.
- **`use-home-data`** — wraps `useEnrollments`, `useFeaturedCourses`, `useInstructors`; returns
  `{ enrollments, featured, instructors, loading flags }`. Keeps `index.tsx` declarative.
- **`home-stats`** — pure functions, unit-testable:
  - `avgProgress(enrollments): number` — rounded mean of `progressPercentage`, 0 when empty.
  - `totalStudyHours(enrollments): number` — `sum(timeSpentMinutes)/60`, 1-dp, 0 when empty.

## Visual direction (from 1c)

- Dark-purple surface consistent with the **existing app theme** (no palette invention —
  reuse `THEME` / NativeWind tokens already in the codebase).
- Safeer "pod": mascot image over a soft radial-glow disc inside the banner.
- Insights card: subtle translucent surface, small area-chart, two inline stat labels
  ("avg progress", "study time Xh").
- Floating helper: rounded mascot pod + speech-bubble tooltip, gentle vertical bob.
- All copy via i18n (en + ar); RTL already supported app-wide. New keys added under `home.*`.

## Assets

`safeer-reading.png` and `safeer-waving.png` are fetched from the design project via
`DesignSync.get_file` (persisted to disk, base64-decoded to `features/home/assets/`) — they do
not pass through the model context as literals. Imported with `require()` and rendered via
`expo-image`.

## Testing

- Unit tests for `home-stats` (`avgProgress`, `totalStudyHours`): empty list, single item,
  rounding, and hours conversion.
- Manual/visual verification of the screen in light + dark and LTR + RTL.

## Out of scope

- Directions 1a (hero) and 1b (coach card).
- Any change to the AI tab itself beyond adding a navigation entry point.
- New analytics/study-time endpoints (existing data suffices).
