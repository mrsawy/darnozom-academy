# Content Completion Rules

This document explains how each course content type is marked "completed" for a
student's enrollment, on both the web client (`apps/client`) and the mobile app
(`apps/lms-mobile`), and what changed to make the two platforms behave the same.

## Source of truth

A content item is completed when its id is present in:

```ts
enrollment.progress.completedContents
```

That array is only ever mutated server-side, in
`EnrollmentService.toggleContentComplete` (`apps/server/src/enrollment/services/enrollment.service.ts`).
Both clients call this same endpoint/message (`toggleContentComplete`,
`enrollment.submitQuiz`, `enrollment.submitAssignment`, `enrollment.submitProject`,
`enrollment.markLiveSessionAttendance`) — the clients never compute completion
locally, they only decide **when** to fire the request.

Whenever a content is toggled, the server also recalculates:

1. **Module completion** — a module is complete when all of its contents are in
   `completedContents`.
2. **Course completion** — a course is complete when all of its modules are
   complete. On first completion, `enrollment.completedAt` is set and a
   certificate is issued.
3. **`progressPercentage`** — `completedContents.length / totalContents.length`.

## Per-type completion trigger

| Type | Web (`apps/client`) | Mobile (`apps/lms-mobile`) | Status |
|---|---|---|---|
| Video | Auto, once **≥ 80%** watched | Auto, once **≥ 80%** watched | ✅ Unified |
| Article | Auto, **1s** after the article is opened | Auto, **1s** after the article is opened (manual toggle still available) | ✅ Unified |
| Attachment | Auto, as soon as the content page mounts | Only after the learner actually opens the file | ⚠️ Intentionally left different (see below) |
| Quiz | On successful submit (server-side, any score) | Same | ✅ Same (shared server logic) |
| Assignment | On successful submit (server-side) | Same | ✅ Same (shared server logic) |
| Live session | Explicit engagement only: joining within the window, or opening a recording | Same | ✅ Unified |
| Project | On successful submit (server-side) | No dedicated project UI in the mobile content player | Out of scope for this pass |

### Video — 80% watched (unified)

Both platforms now read the threshold from a single shared constant:

```ts
// lib/shared-types/src/lib/configurations/course/enums/progress.enum.ts
export enum ProgressTrack {
  ARTICLE_TIME_TO_COMPLETE = 1000,
  VIDEO_COMPLETION_PERCENT = 80,
}
```

- **Web** (`video-content.tsx`): the player reports a played fraction (`0`–`1`).
  We compare against `ProgressTrack.VIDEO_COMPLETION_PERCENT / 100` (`0.8`).
  Previously this was hardcoded to `> 0.9`.
- **Mobile** (`video-content.tsx`): the player reports a played percent
  (`0`–`100`), for both the local/uploaded player and the YouTube embed. We
  compare against `ProgressTrack.VIDEO_COMPLETION_PERCENT` directly (`80`).
  This already matched (a local `COMPLETION_WATCH_PERCENT = 80` constant), it
  now just imports the shared value instead of duplicating it.

### Article — 1 second after opening (unified)

- **Web** (`article-content.tsx`): already auto-completed via
  `setTimeout(..., ProgressTrack.ARTICLE_TIME_TO_COMPLETE)` in a `useEffect` on
  mount.
- **Mobile** (`article-content.tsx`): previously required tapping a manual
  "Mark complete" button. It now has the same `useEffect` + `setTimeout`
  using the shared `ProgressTrack.ARTICLE_TIME_TO_COMPLETE` constant, so it
  auto-completes 1s after the article is opened, exactly like web. The manual
  "Mark complete / Mark incomplete" button is kept as an extra affordance
  (e.g. to let a student un-mark themselves), it just no longer is the only
  way to complete the content.

### Attachment — left as-is (per request)

This one was **intentionally not changed**, but is documented here since the
behavior differs by design:

- **Web** (`attachment-content.tsx`): marks complete in a mount `useEffect` —
  simply opening the content page completes it.
- **Mobile** (`attachment-content.tsx`): only marks complete once the learner
  actually opens the file (`Linking.openURL` succeeds). Merely previewing the
  attachment in the in-app WebView does not, by itself, trigger completion —
  only the "Open" action does.

If this inconsistency ever needs to be resolved, the mobile behavior (require
an explicit open) is the more defensible one; that's a separate decision left
for later.

### Quiz / Assignment / Project — unchanged, server-driven

These are completed by the server as a side effect of a successful submission
(`quiz.service.ts`, `assignment.service.ts`, project submission), so both
platforms are inherently identical — there's no client-side threshold to
diverge. Not touched in this pass. Project submission isn't reachable from the
mobile content player at all, so it's out of scope here as requested.

### Live session — unified around explicit engagement

Before this change, the two platforms disagreed in two ways:

1. **Web** had a passive effect that auto-marked the session attended purely
   because the content page was open during the join window — even if the
   student never clicked "Join". Mobile had no such effect.
2. **Web** also had an always-available "Mark as attended / not attended"
   button with no window restriction, letting a student mark themselves
   attended without ever joining. Mobile had the same button, but commented
   out/disabled.
3. On web, clicking "Watch recording" tried to mark complete via the
   window-gated helper — but a recording is normally watched **after** the
   join window has already closed, so that call would silently no-op. Mobile
   didn't attempt to mark complete on recording clicks at all.

**Decision:** completion should reflect genuine engagement, not merely having
the tab open, and recordings (watched after the session ends) shouldn't be
penalized by the join-window check. Both platforms now share this model:

- `markComplete()` — the base action, marks the session attended. Not
  window-gated, since it's also used for recordings.
- `markCompleteIfInWindow()` — wraps `markComplete()` but only proceeds if
  `isWithinLiveSessionJoinWindow(content)` is true. Used by the "Join Session"
  actions (in-app Agora call and external meeting link), so a click only
  counts as attendance while the session is actually joinable.
- The recording buttons ("Watch recording" / "Recorded session") call
  `markComplete()` directly (no window check), since recordings are expected
  to be viewed after the live window has passed.
- The passive "auto-complete just by having the page open" effect was removed
  from web.
- The free-form manual attendance toggle was commented out on web to match
  the already-disabled version on mobile, so attendance can no longer be
  self-declared without joining or watching the recording.

Join window definition (unchanged, already identical on both platforms):

```ts
const EARLY_JOIN_MS = 15 * 60 * 1000; // can join 15 min before start
const DEFAULT_LIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // default 2h session length if no end/duration given
```

A session is joinable from `startDate - 15min` through `endDate` (or
`startDate + durationInMinutes`, or `startDate + 2h` as a fallback).

## Files touched

- `lib/shared-types/src/lib/configurations/course/enums/progress.enum.ts`
- `apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/video-content.tsx`
- `apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/live-session-content.tsx`
- `apps/lms-mobile/components/organs/courses/content/video-content.tsx`
- `apps/lms-mobile/components/organs/courses/content/article-content.tsx`
- `apps/lms-mobile/components/organs/courses/content/live-session-content.tsx`
