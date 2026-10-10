# darnozom academy — full-feature port from lms-organization

**Date:** 2026-10-10
**Status:** Design — approved, pending spec review
**Target repo:** `C:\COURSES\work\darnozom\academy`
**Source repo:** `C:\COURSES\work\_LMS\lms-organization`

---

## 1. Intent

Bring `academy` up to near-parity with `lms-organization`, rebranded from **safeer** to
**darnozom**, excluding the discussion/forum feature and the Expo mobile app.

`academy` is already a trimmed fork of `lms-organization` — same Nx/pnpm monorepo, same
`apps/client` (Next.js) + `apps/server` (NestJS) + `lib/shared-types` layout, same route-group
structure. It carries 10 of ~40 server modules and 32 of 123 shared-type files, and its three
dashboards are shells.

It also has **one feature the source does not**: a books store, currently Medusa-backed.
Preserving its storefront UI through this port is a hard requirement.

### This is the first of two specs

The books store is being **moved off Medusa onto a native academy module** — its own entities,
service, controllers, and admin UI inside `apps/server` and `apps/client`. Medusa stays where it
belongs, in the sibling project `C:\COURSES\work\darnozom\darnozom-react-regular-website`
(`apps/medusa` — "books commerce backend + admin dashboard", Postgres + Redis). `academy` will
not depend on Medusa long term.

That native module is substantial new feature work — per-organization catalogs, physical and
digital fulfilment, three payment paths, two admin surfaces — not a port. It therefore gets its
**own design → spec → plan cycle after this port lands**. Its agreed requirements are recorded in
§11 so nothing is lost between the two cycles.

Within *this* spec, the store's Medusa data layer is **transitional**: carried over so the
storefront keeps building and working, and retired by the second spec.

### Success criteria

1. Every selected feature from `lms-organization` runs in `academy`.
2. The books storefront UI still works, on its transitional Medusa data layer.
3. No `discussion` feature in the codebase — fully removed, not merely hidden.
4. No `safeer` string anywhere outside build artifacts.
5. Both apps build, lint, and pass their existing test suites.
6. The pre-port state is recoverable from a git tag.

---

## 2. Scope

### In scope

| Area | Features |
|---|---|
| Teaching | Courses & curriculum, enrollment & rosters, attendance, grades & assessments |
| Commerce | Payments & checkout, wallet & transactions, subscriptions & plans, withdrawals/payouts |
| Comms | Chat/messaging, notifications, reviews & ratings |
| Platform | Main admin (super-admin) dashboard, public pages & gallery, AI assistant & AI plans, live sessions (Agora) |
| Carried over | The books storefront UI, on its transitional Medusa data layer |

Concretely, these source server modules land in `academy`: `admin-review`, `agora`, `ai`,
`ai-plan`, `ai-subscription`, `attendance`, `category`, `chat`, `course`, `currency`,
`enrollment`, `file`, `gallery`, `grade`, `notification`, `options`, `page`, `payment`, `plan`,
`private-session`, `rate-limiter`, `reports`, `review`, `school-type`, `subscription`,
`transaction`, `transcription`, `verification`, `wallet`, `wishlist`, `withdrawal-request` —
joining the `auth`, `user`, `role`, `organization`, `realtime`, `config`, `database`, `filters`,
`utils` modules already present. The source's `types/` directory, which the target lacks, comes
across with them.

### Out of scope

- **Discussion / forums** — removed entirely (see §5).
- **`apps/lms-mobile`** — the Expo app is not ported. It is also 6.5 GB of the source tree, all
  of which this port skips.
- **The native book module** — replacing Medusa with academy's own book/order module is the
  subject of the next spec, not this one. Its agreed requirements are recorded in §11. During
  this port the storefront keeps its Medusa data layer so it stays buildable and usable.
- **The ERP subsystems** — groups/cohorts, teacher HR, supervision & quality, the automation
  engine, content governance, and accounting depth are later specs. See §12.
- **Data migration** — the target starts on a fresh, empty `darnozom` database.

---

## 3. Strategy

**Copy the source wholesale, then subtract.** Because ~95% of the source is wanted, copying
everything and removing one feature is substantially less error-prone than grafting ~30 modules
in one at a time and chasing imports across each graft.

The target's own history is preserved: this is a series of commits on `academy`'s existing
`master`, not a new repository. Its `.git` directory is never replaced.

### Rejected alternatives

- **Additive, module-by-module port.** ~30 separate grafts, each needing `app.module.ts` wiring,
  route-tree placement, and shared-type back-fill. Preserves target work untouched, but the
  import-chasing cost scales with the number of grafts and most of the target's trimmed state is
  being discarded anyway.
- **Fresh clone into a new directory.** Leaves `academy` pristine as a reference, but produces a
  new repo path instead of the requested one, and the books store would still need porting into it.

---

## 4. The port, phase by phase

Each phase has a gate. A phase does not start until the previous gate is green.

### Phase 0 — Snapshot and stage

The target tree is dirty, and **more so than it first appears**: 18 modified files
(579 insertions, 122 deletions), 2 deletions, and **24 untracked files** on `master`.

The untracked set is not incidental — it contains the things this port is built around:

| Untracked path | Why it matters |
|---|---|
| `apps/client/src/app/[locale]/(store)/` | **The entire books store. Never committed.** |
| `apps/client/src/lib/medusa-client.ts` | Medusa SDK wrapper |
| `apps/client/src/lib/context/` | `cart-context.tsx` |
| `apps/client/src/components/layout/` | `public-header.tsx` with the cart link |
| `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/` | **Whole dashboard, never committed** |
| `apps/client/src/app/[locale]/(dashboard)/student-dashboard/` | **Whole dashboard, never committed** |
| `apps/client/src/app/[locale]/(dashboard)/__components/` | Shared dashboard components |
| `apps/client/.env.example`, `components/ui/badge.tsx`, `lib/data/userRole.enum.ts`, `lib/utils/routes/requireDashboardUser.ts` | Misc. uncommitted support files |

**Consequence:** a `git stash` or `git checkout` would not protect this work, and the bulk copy in
Phase 1 could silently overwrite it with no git record to recover from. Committing *everything*
is therefore the first action of the port, not a tidiness step.

1. `git add -A` on `master` — all 18 modified, 2 deleted, and 24 untracked files — and commit
   with a message noting this is pre-port work.
2. Tag the commit `pre-darnozom-port`. This tag is the only rollback point for the whole port.
3. Verify `git status` is clean and `git ls-files` now tracks the `(store)` directory, both new
   dashboards, `medusa-client.ts`, and `cart-context.tsx`. Do not proceed otherwise.
4. Copy the store keepers to a staging directory outside the repo:

| Keeper | Path |
|---|---|
| Store routes (6 files) | `apps/client/src/app/[locale]/(store)/` — `layout.tsx`, `books/page.tsx`, `books/[id]/page.tsx`, `cart/page.tsx`, `checkout/page.tsx`, `checkout/success/page.tsx` |
| Medusa SDK wrapper | `apps/client/src/lib/medusa-client.ts` |
| Cart state | `apps/client/src/lib/context/cart-context.tsx` |
| Store translations | the `"store"` block in `apps/client/messages/en.json` (line ~211) and its `ar.json` counterpart |
| Store route constants | `ROUTE_BOOKS`, `ROUTE_CART`, `ROUTE_CHECKOUT`, `ROUTE_CHECKOUT_SUCCESS` in `apps/client/src/lib/data/constants/routes.constants.ts` |
| Public header cart link | `apps/client/src/components/layout/public-header.tsx` |
| Sidebar store entries | the `{ href: ROUTE_BOOKS, icon: BookOpen, labelKey: 'booksStore' }` item in the org, parent, and student sidebars |
| Client env | `apps/client/.env` — `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` |

**Gate:** tag `pre-darnozom-port` resolves; `git status` clean with zero untracked files; the
store, both new dashboards, `medusa-client.ts`, and `cart-context.tsx` all appear in
`git ls-files`; all keepers present in staging.

### Phase 1 — Bulk copy

Copy the source tree into the target, excluding:

```
node_modules/   .git/   .next/   dist/   .nx/
apps/lms-mobile/        patches/        flows/
```

`patches/` and `flows/` are excluded because both are mobile-only (React Native patches, an Expo
screenshot). Payload after exclusions is roughly 70 MB — mostly `apps/client/public`.

The target's `.git/` is explicitly not touched.

Dropping mobile and `patches/` breaks two things in the toolchain that must be fixed in this
same phase, before any install is attempted — see §6.1 and §6.2.

**Gate:** source tree present under `academy`; `git log` still shows the target's history with
`pre-darnozom-port` reachable; `apps/lms-mobile` absent; `pnpm install` succeeds.

### Phase 2 — Re-graft the storefront

The storefront UI is kept permanently; its Medusa data layer is kept **only until the native book
module lands** (§11). So this phase restores both, unchanged, and the next spec deletes
`medusa-client.ts` and rewires `cart-context.tsx` and the 6 pages to the native API.

Keeping Medusa alive through the port is deliberate: stubbing the data layer now would leave the
storefront non-building, which would both fail the Phase 2 gate and mask real breakage in the
`nx build client` gate of later phases.

1. Restore the 6 `(store)` route files, `medusa-client.ts`, and `cart-context.tsx`.
2. Add `@medusajs/js-sdk@^2.21.0` and `@medusajs/types@^2.21.0` to `apps/client/package.json`.
3. Merge the `"store"` translation block into the copied `en.json` and `ar.json`.
4. Re-add the four `ROUTE_*` store constants to the copied `routes.constants.ts`.
5. Re-add the cart link to the copied `public-header.tsx` and the `booksStore` nav item to the
   copied org / parent / student sidebars.
6. Restore the two `NEXT_PUBLIC_MEDUSA_*` vars into the copied client env, and add them to
   `.env.example` so the requirement is documented.
7. **Next 16 compatibility pass** on the store files (see §7).

**Gate:** `/books`, `/books/[id]`, `/cart`, `/checkout` render and reach Medusa; cart add/remove
works; the store nav entry appears in all three dashboards.

### Phase 3 — Surgical discussion removal

The risky phase. Detailed in §5. Runs after the store graft so that a build failure here is
unambiguously attributable to the removal.

**Gate:** `nx build server` clean; `nx build client` clean; the seed script runs to completion
against a fresh database; no `discussion` identifier remains in source (case-insensitive, build
output excluded).

### Phase 4 — Rebrand

1. `safeer` → `darnozom` across the 4 server source files, 3 client source files, 2 message
   catalogs, `.env`, `.env.example`, `.env.production`, and `Caddyfile`. Preserve case:
   `safeer`→`darnozom`, `Safeer`→`Darnozom`.
2. Rename the root Nx project to `darnozom-academy` — **all six references together**, per §6.3:
   `package.json` `"name"`, `nx.json` `"name"`, and the `--exclude=lms-organization` flag in the
   `lint`, `lint:format`, `type-check`, and `tsc` scripts.
3. Mongo database name → `darnozom`, split by environment as the target's existing config does.
4. `Caddyfile` and `.env.production` hostnames → darnozom placeholders for the operator to fill.
5. **Remote hygiene:** the source repo has `origin =
   https://github.com/safeer-lms/Multi-Tenant-LMS.git`. The target has no remote and must keep
   none. Verify `git remote -v` is empty after the copy.
6. Secrets are **not** copied from the source's real `.env`/`.env.production`. Placeholders only;
   the operator fills them in.
7. Config hygiene per §6.5: delete `.cursor/skills/lms-mobile-components/`, strip the
   source-absolute paths from `.claude/settings.local.json`, drop the three `apps/lms-mobile/**`
   rules from `.dockerignore`, and correct the mobile reference in
   `.agents/skills/component-types-colocation/SKILL.md`.
8. If the alias rename in §10 is approved, apply `@lms-organization/` → `@darnozom/` across the
   382 importing files plus `tsconfig.json` and `lib/shared-types/package.json`.

**Gate:** `grep -ri safeer` over source (excluding `.next`, `node_modules`, `dist`) returns
nothing; `git remote -v` empty; root package name is `darnozom-academy`; `pnpm lint` and
`pnpm type-check` both still exclude the root project correctly.

### Phase 5 — Verify

Full sequence in §8.

---

## 5. Discussion removal — the detailed map

**89 files reference `discussion`: 31 inside `discussion/` directories (pure deletes) and 58
requiring edits.** Discussion is not a leaf feature; it reaches into five systems. Two of them —
subscription plans and RBAC — are the non-obvious ones.

### 5.1 Pure deletes

- `apps/server/src/discussion/` — the whole module: 3 controllers, service, module, 3 DTOs,
  4 entities (`discussion`, `course-discussion`, `module-discussion`, `content-discussion`),
  enum, event, seeder, index, README, 2 spec files.
- `apps/server/src/notification/events/discussion-created.listener.ts`
- `apps/client/src/lib/realtime/notifications/handlers/discussion.handler.ts`
- `apps/client/.../courses/[id]/modules/[moduleId]/module-discussion-panel.tsx`
- `apps/client/.../content/[contentId]/edit/content-discussion-panel.tsx`

### 5.2 Course domain — 6 server files, ~20 client files

Server: `course/course.module.ts`, `course/dto/create-course.dto.ts`,
`course/dto/module-content-settings.dto.ts`, `course/entities/course.entity.ts`,
`course/entities/module-content-settings.embed.ts`, plus `app.module.ts` (unregister
`DiscussionModule`).

Client: course/module/content forms (`course-form.tsx`, `create-module-form.tsx`,
`edit-module-form.tsx`, `basic-info-card.tsx`, `get-default-values.ts`,
`course-settings-section.tsx`), the three data tables (`course-`, `module-`, `content-data-table`),
student course views (`content-view.tsx`, `course-modules.tsx`, `single-course-view.tsx`), the
module and content edit pages, main-admin content/course/module tables and tabs, Zod schemas
(`course.schema.ts`, `module.schema.ts`, `content.schema.ts`), types
(`course.interface.ts`, `modules.interface.ts`), `useContent.ts`, `content.action.ts`, and
`components/organs/index.ts`.

Each removes a discussion toggle, a settings field, a table column, or a panel mount.

### 5.3 Subscription plans ⚠️

`plan/entities/plan.entity.ts`, `plan/dto/create-plan.dto.ts`, `plan/seeds/plan.seeder.ts`,
and client `plans/__components/plan-form.tsx` + `plan-form.schema.ts`, `plan.action.ts`.

Plans **gate discussion as a billable feature**. Removing it changes the shape of a plan. On a
fresh database with re-seeded plans this is safe, but it is a deliberate product change, not a
mechanical edit.

### 5.4 RBAC / roles ⚠️

`lib/shared-types/src/lib/types/role/subject/subjects.enum.ts` plus all four role seed configs:
`role.admin.config.ts`, `role.instructor.config.ts`, `role.student.config.ts`,
`role.super-admin.config.ts`. Also `utils/approval.utils.ts`.

`discussion` is a permission *subject*. Dropping it from the enum requires dropping the matching
permission entries from every role definition, or seeding fails type-checking.

### 5.5 Notifications

`notification/notification.module.ts` (unregister the deleted listener),
`lib/shared-types/.../notification-text-key.enum.ts`,
`lib/shared-types/.../notification-type.enum.ts`,
`lib/shared-types/src/lib/messages/course.enum.ts`, and client
`notification-handlers.registry.ts` (deregister the deleted handler).

### 5.6 Seeders and enrollment

`database/seeds/seed.ts` (16 references — the heaviest single file),
`database/seeds/seed.config.ts`, `database/seeds/seed-config.interface.ts`, and
`enrollment/controllers/enrollment.message.controller.ts`.

### 5.7 Why full removal is viable here

Full removal was chosen over leaving the module dormant. The plan, RBAC, and seed edits would
normally carry migration risk against existing data — but the target starts on a **fresh, empty
`darnozom` database**, so there is no persisted plan or role document to reconcile. That removes
the main hazard. The residual risk is type-level and caught by the Phase 3 build gate.

---

## 6. Toolchain and config landmines

Four things in the source are wired to either the mobile app or the literal name
`lms-organization`. Each fails quietly or late if missed, so each is called out explicitly.

### 6.1 `patchedDependencies` blocks install

Root `package.json` declares:

```json
"patchedDependencies": {
  "react-native-css-interop@0.1.22": "patches/react-native-css-interop@0.1.22.patch",
  "react-native-gifted-chat@3.3.2": "patches/react-native-gifted-chat@3.3.2.patch"
}
```

Both patches are React-Native-only and `patches/` is excluded by Phase 1, so `pnpm install`
would fail on a missing patch file. **Remove the whole `patchedDependencies` block** — it is
mobile-only and mobile is out of scope.

### 6.2 `postinstall` points at the mobile app

Root `postinstall` runs `scripts/prune-nested-assistant-ui.cjs && scripts/patch-radix-compose-refs.cjs`.
`scripts/` is kept, but `prune-nested-assistant-ui.cjs` has `apps/lms-mobile` hardcoded in its
target list (line ~11). It must drop that entry so postinstall does not fail on the absent
directory. `patch-radix-compose-refs.cjs` is web-relevant and stays as-is.

### 6.3 Nx project name appears in lint/type-check flags

Renaming the root package is not a one-line change. The name `lms-organization` is the **root Nx
project name**, referenced in:

- `package.json` → `"name"`
- `nx.json` → `"name"`
- `package.json` scripts → `--exclude=lms-organization` in **four** targets: `lint`,
  `lint:format`, `type-check`, `tsc`

If the `--exclude=` flags are not updated in lockstep with the rename, they silently stop
excluding the root project and `nx run-many` starts trying to lint/type-check the workspace root.
All six references change to `darnozom-academy` together.

### 6.4 The `shared-types` TypeScript path alias

The source imports shared types as `@lms-organization/shared-types` in **382 files**, declared in
root `tsconfig.json` `paths` and as the `name` in `lib/shared-types/package.json`. The target
currently uses `@islamic-academy/shared-types` in 118 files.

Because the copy brings the source's `tsconfig.json`, `lib/shared-types/package.json`, and all
382 importing files together, **the alias works out of the box with no changes** — it is
internally consistent. The only question is cosmetic: whether `@lms-organization/` should become
`@darnozom/`. See §10.

Fortunately the store keepers are **alias-free** — none of the 6 store routes, `medusa-client.ts`,
`cart-context.tsx`, or `public-header.tsx` import shared types — so the Phase 2 graft needs no
import rewriting regardless of what is decided.

### 6.5 Agent config and stale absolute paths

The source root carries `.agents/`, `.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.opencode/`,
`.superpowers/`, `.vscode/`, `.github/`. These copy across harmlessly except that:

- `.claude/settings.local.json` contains **absolute paths into the source repo**
  (`c:\COURSES\work\_LMS\lms-organization\apps\lms-mobile\...`).
- `.cursor/skills/lms-mobile-components/` and `.agents/skills/component-types-colocation/`
  document the now-absent mobile app.
- `.dockerignore` has three `apps/lms-mobile/**` rules.

Clean these in Phase 4: delete the mobile-specific skill directories, strip source-absolute paths
from `.claude/settings.local.json`, and drop the mobile lines from `.dockerignore`.

---

## 7. Next.js version shift

The source is on **Next 16.0.0**; the target is on **15.5.4**. Copying wholesale adopts Next 16.

The visible consequence is the middleware convention. Next 16 renames `middleware.ts` to
`proxy.ts`; the source has `src/proxy.ts` + `src/middleware.config.ts`, while the target's
uncommitted work moved in the opposite direction, renaming `proxy.ts` → `middleware.ts`.

**That refactor is superseded by this port and will be discarded** — deliberately, not by
accident. It remains recoverable from the `pre-darnozom-port` tag.

The 6 store route files were written against Next 15 and need a compatibility pass in Phase 2:
they are all `'use client'` components using `useQuery`/`useState`, so the expected delta is
small, but async route-param typing and any server-boundary assumptions must be checked against
how the copied Next 16 client handles them.

---

## 8. Verification

Run in order; each must pass before the next.

1. `pnpm install` at the root — resolves the merged dependency set including `@medusajs/*`.
2. `nx build server` — catches every type break from §5, especially the RBAC enum and plan entity.
3. `nx build client` — catches removed-component imports and the Next 16 store delta.
4. Lint across the workspace.
5. Existing server and client test suites. Discussion's own spec files are deleted with the
   module; no other suite should reference it.
6. Seed a fresh `darnozom` database end to end — the real test of the plan/role/seed edits.
7. Manual smoke:
   - signup, login, OAuth entry point
   - organization dashboard: courses, enrollments, attendance, grades, wallet, users
   - student dashboard: courses, attendance, wallet, chat, AI assistant
   - parent dashboard: children, enrollment, wallet
   - main admin dashboard: organizations, plans, roles, verifications, withdrawal requests
   - public pages: courses, instructors, pricing, an org page at `/x/[slug]`
   - **books store: `/books` lists products from Medusa, add to cart, `/cart`, `/checkout`**
   - confirm no discussion UI is reachable anywhere in the course/module/content flows

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Discussion removal breaks the course domain | Own phase with a build + seed gate; `pre-darnozom-port` tag allows full rollback |
| RBAC enum edit desyncs from role seeds | Server build fails on type mismatch; seed run is an explicit gate |
| Plan shape change is a silent product decision | Called out in §5.3; plans re-seeded fresh |
| Store breaks under Next 16 | Dedicated compat pass in Phase 2 with its own render gate |
| Target's uncommitted work lost — incl. 24 **untracked** files holding the entire store and two dashboards | `git add -A` + tag in Phase 0 before any copy; Phase 0 gate verifies they are tracked (§4, Phase 0) |
| Source secrets leak into the target | Placeholders only; real `.env`/`.env.production` values never copied |
| Inheriting the `safeer-lms` git remote | Explicit `git remote -v` check in the Phase 4 gate |
| `pnpm install` fails on missing RN patch files | `patchedDependencies` removed in Phase 1 (§6.1); install is part of the Phase 1 gate |
| `postinstall` fails on absent `apps/lms-mobile` | Prune script's target list fixed in Phase 1 (§6.2) |
| Root rename silently breaks `nx run-many --exclude` | All six name references changed together (§6.3); lint/type-check behaviour is a Phase 4 gate |
| Stale source-absolute paths in agent config | Cleaned in Phase 4 (§6.5) |
| Academy keeps a transitional Medusa dependency until the book module lands | Deliberate and time-boxed (§4 Phase 2, §11); storefront UI is unaffected by the later swap |

---

## 10. Open decision: the `shared-types` alias

One cosmetic decision is deliberately left open, because it is a 382-file mechanical change that
is not required for correctness.

The ported code will import shared types as **`@lms-organization/shared-types`**. This is
internally consistent and builds fine (§6.4), but it leaves the source project's name in every
import statement in the codebase.

| Option | Cost | Result |
|---|---|---|
| **Keep `@lms-organization/`** | Zero | Works immediately; off-brand name in 382 import lines |
| **Rename to `@darnozom/`** | One global find/replace across 382 files + `tsconfig.json` + `lib/shared-types/package.json`, verified by `nx build` | Fully on-brand; mechanical but touches most files in the repo |

The rename is low-risk — the alias appears only in `import`/`from` positions and two config
files — but it inflates the port's diff considerably. Either choice is compatible with every
other phase. Recorded as Phase 4 step 8.

---

## 11. Recorded requirements for the next spec: native book module

Not built in this port. Recorded here so the agreed decisions survive into the next design cycle.

**Why native:** the books store moves off Medusa onto academy's own module. Medusa remains the
commerce backend of the sibling project
`C:\COURSES\work\darnozom\darnozom-react-regular-website` (`apps/medusa`, Postgres + Redis) and
is not shared with academy.

| Decision | Value |
|---|---|
| Catalog ownership | **Per-organization.** `Book` carries `organizationId`, scoped by existing tenant guards; revenue to that org's wallet |
| Fulfilment | **Both, per book.** Each book flagged physical or digital; checkout branches on cart contents. Physical: stock counts, shipping address, order status workflow. Digital: entitlement + signed download URLs via the existing `file` module |
| Payment paths | **All three:** existing gateways via the `payment` strategy factory (kashier, lemon-squeezy, paddle, paymob, paypal), **wallet** balance via the `wallet` ledger, and **cash / manual confirmation** by an org admin |
| Admin surfaces | **Both** the organization dashboard (own books, own orders, stock) and the main admin dashboard (all books and orders across orgs) |
| Storefront | **Keep the existing UI.** The 6 `(store)` pages stay; delete `medusa-client.ts` and rewire `cart-context.tsx` + the pages to the native API |

**House pattern to follow** (as used by every existing module, e.g. `wishlist`):

```
book/
  book.module.ts
  controllers/book.controller.http.ts
  controllers/book.controller.message.ts
  dto/
  entities/
  service/
  seeds/book.seeder.ts
  types/
```

Also required: a `book` RBAC subject in `subjects.enum.ts` with permissions added to the relevant
role seed configs, and `@darnozom/shared-types` (or `@lms-organization/…`, per §10) DTO/enum
exports for the client.

---

## 12. Roadmap: the Nozom Academy ERP subsystems

The agreed destination is the **Nozom Academy ERP**, built on this ported NestJS/Next.js base —
**not** on the Odoo three-tier architecture that the ERP document proposes. Academy remains a
**multi-tenant platform**, so the ported platform layer (main admin dashboard, organization
verification, plans, withdrawals) stays relevant.

This port delivers the commodity LMS layer the ERP sits on. Verified against the source, the ERP's
operational core is roughly half covered; what follows is absent and becomes its own spec.

### Covered by this port

Students/parents/teachers as users with RBAC · courses, modules, content · assignments
(in `course` + `enrollment`) · enrollment · attendance · payments across five gateways, wallet,
transactions, subscriptions, plans · reports and reviews · chat and notifications · live session
delivery (`agora`, `private-session`) · minimal certificates (`certificateUrl` on course and
enrollment).

### Not covered — each a candidate spec, in rough dependency order

| Subsystem | Notes |
|---|---|
| **Groups / cohorts & session lifecycle** | The ERP's spine is Course → Group → Session with readiness gating, weekly schedules, and session-start monitoring. The LMS has no cohort concept (`GroupSize`/`GroupProject` on private sessions are unrelated). Most other ERP features depend on this, so it goes first |
| **Automation / task engine** | Task generation on group creation and approaching sessions, reminders, absence and late-report tracking, post-first-session follow-ups, escalation. Nothing exists (2 incidental `task` hits) |
| **Teacher HR lifecycle** | Recruitment, interviews, training, evaluation, availability, schedules. Zero hits in source |
| **Teacher compensation** | Pay computed from completed and approved sessions; salaries, deductions. Zero hits — and depends on sessions + approval workflow |
| **Supervision & quality** | Program start monitoring, performance evaluation, improvement plans, escalation. Zero hits |
| **Content governance** | Curricula, worksheets, **Sharia review and version approval**. Zero hits; the existing content model has no review/versioning workflow |
| **Accounting depth** | Real invoicing, arrears, refunds, deductions. The 8 `invoice` hits are only PayPal/LemonSqueezy webhook payloads |
| **Certificates & ceremonies** | Eligibility verification from attendance + assessment + fees, issuance, graduation ceremony organization. Only `certificateUrl` exists today |
| **WhatsApp channel** | Zero hits. Messages, alerts, automated follow-ups |
| **Renewal pipeline** | Student renewal and transfer into the next session. The 10 `renewal` hits are subscription renewals, a different thing |

### Known sequencing conflict

The ERP document's own MVP **postpones the content store to a later phase**, while §11's book
module is currently queued as the next spec. These two priorities disagree and the order is an
open decision — see §13.

---

## 13. Open items for the operator

- Real secrets for the rebranded `.env` files (payment keys, Agora credentials, AI provider keys,
  SMTP, S3/CloudFront).
- Production hostnames for `Caddyfile` and `.env.production`.
- **Spec order after this port:** the native book module (§11) or the ERP's groups/cohorts &
  session lifecycle (§12) first. The ERP document postpones the store; the book module is
  currently queued next. Needs a decision before the next design cycle starts.
- Whether the Medusa instance the storefront points at (`localhost:9010`) stays available to
  academy for the transitional period, given Medusa now lives in the sibling website project.
