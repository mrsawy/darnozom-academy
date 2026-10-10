# darnozom academy Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `C:\COURSES\work\darnozom\academy` to near-parity with `C:\COURSES\work\_LMS\lms-organization`, rebranded safeer → darnozom, with the discussion feature fully removed and the existing Medusa-backed books storefront carried over on a transitional basis.

**Architecture:** Copy the source monorepo wholesale over the target (excluding mobile and build artifacts), then subtract: remove the discussion feature everywhere it's wired, rebrand every identifier, and verify. The target's `.git` history is preserved and extended with new commits — this is not a new repository.

**Tech Stack:** Nx monorepo, pnpm workspaces, NestJS server (MongoDB/Mongoose), Next.js 16 client, `@lms-organization/shared-types` → renamed `@darnozom/shared-types` lib.

**Spec:** `docs/superpowers/specs/2026-10-10-darnozom-academy-port-design.md`

## Global Constraints

- Source root: `C:\COURSES\work\_LMS\lms-organization`. Target root: `C:\COURSES\work\darnozom\academy`. Every path below is relative to the target unless written as an absolute source path.
- Exclude from the copy: `node_modules/`, `.git/`, `.next/`, `dist/`, `.nx/`, `apps/lms-mobile/`, `patches/`, `flows/`.
- The target's `.git/` is never replaced, reset, or checked out destructively.
- No `discussion` identifier (case-insensitive) may remain in source after Phase 3, outside build output.
- No `safeer` string (case-insensitive) may remain in source after Phase 4, outside build output.
- Root Nx project renames to `darnozom-academy` — six references change together: `package.json` `name`, `nx.json` `name`, and `--exclude=lms-organization` in the `lint`, `lint:format`, `type-check`, `tsc` scripts.
- The `shared-types` TS path alias and package name rename from `@lms-organization/shared-types` to `@darnozom/shared-types` across every importing file.
- Database name is `darnozom`, fresh and empty — no data migration.
- The source's real `.env`/`.env.production` secrets are never copied; placeholders only.
- Target must end with zero git remotes (`git remote -v` empty) — never inherit the source's `origin`.
- The books storefront's Medusa data layer is carried over **unchanged and working** — it is explicitly transitional (see spec §11) and is not touched beyond what's needed to build under Next 16.
- Every phase gate in the spec (§4) must pass before the next phase's tasks start.

## Review Focus

- **A build break from a missed discussion reference** — e.g. an orphaned import of a deleted `discussion/` file, or a role seed config that still references the removed `Subjects.DISCUSSION` enum member. Expected: `nx build server` and `nx build client` both fail loudly with a clear "not found" error, never a silent `any`-typed fallback.
- **The store losing its Medusa env vars during the bulk copy** — Phase 1 copies the source's client env wholesale, which does not carry `NEXT_PUBLIC_MEDUSA_BACKEND_URL`/`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. Expected: after Phase 2, `/books` fetches real products, not a thrown "backend URL not configured" error.
- **A role seed config left listing a permission for a subject that no longer exists** — e.g. `role.instructor.config.ts` still granting `Actions.CREATE` on `Subjects.DISCUSSION` after the enum member is deleted. Expected: TypeScript compile error, not a silently-stale permission grant that never executes.
- **The `--exclude=lms-organization` lint/type-check flags surviving the rename unmatched** — if the six name references are changed out of sync, `nx run-many -t lint` silently stops excluding the root project and starts linting workspace-root files that were never meant to be linted. Expected: `pnpm lint` and `pnpm type-check` produce the same project set before and after the rename.
- **Seed data referencing deleted discussion fields** — `seed.config.ts` has 8 `discussions: [...]` arrays feeding `seed.ts`'s `discussionSeeder.seedForCourse(...)` call. If the array literal survives but the seeder call is removed, `discussions` becomes a silently-unused property that masks a partially-finished removal. Expected: the seed script runs to completion against a fresh `darnozom` database with zero discussion-related errors or silently ignored fields.

---

## Task 0: Snapshot and stage the target's uncommitted work

**Files:**
- Modify: all 18 currently-modified + 2 deleted + 24 untracked files in `academy` (see spec §4 Phase 0 table)
- Create: git tag `pre-darnozom-port`
- Create: staging directory `C:\COURSES\work\darnozom\_port-staging\` (outside the repo)

**Interfaces:**
- Produces: a tagged commit (`pre-darnozom-port`) that every later task can roll back to; a staging directory holding the store keepers that Task 2 restores.

- [ ] **Step 1: Verify the current dirty state matches expectations**

```bash
cd "C:/COURSES/work/darnozom/academy"
git status --short | wc -l
```

Expected: `44` (18 `M` + 2 `D` + 24 `??`). If the count differs, stop and report — the snapshot assumptions in this plan no longer hold.

- [ ] **Step 2: Commit everything on master**

```bash
git add -A
git commit -m "Pre-port snapshot: commit all WIP (store, parent/student dashboards, middleware rename)"
```

- [ ] **Step 3: Tag the snapshot**

```bash
git tag pre-darnozom-port
git log --oneline -1
git tag -l pre-darnozom-port
```

Expected: the tag resolves to the commit just made.

- [ ] **Step 4: Verify the keepers are now tracked**

```bash
git ls-files "apps/client/src/app/[locale]/(store)" | wc -l
git ls-files "apps/client/src/app/[locale]/(dashboard)/parent-dashboard" | wc -l
git ls-files "apps/client/src/app/[locale]/(dashboard)/student-dashboard" | wc -l
git ls-files apps/client/src/lib/medusa-client.ts apps/client/src/lib/context/cart-context.tsx
git status --short
```

Expected: all three counts are nonzero, both files listed, and `git status --short` prints nothing.

- [ ] **Step 5: Stage the store keepers to a directory outside the repo**

```bash
mkdir -p "C:/COURSES/work/darnozom/_port-staging/store"
cp -r "C:/COURSES/work/darnozom/academy/apps/client/src/app/[locale]/(store)" "C:/COURSES/work/darnozom/_port-staging/store/route-group"
cp "C:/COURSES/work/darnozom/academy/apps/client/src/lib/medusa-client.ts" "C:/COURSES/work/darnozom/_port-staging/store/"
cp -r "C:/COURSES/work/darnozom/academy/apps/client/src/lib/context" "C:/COURSES/work/darnozom/_port-staging/store/context"
cp "C:/COURSES/work/darnozom/academy/apps/client/src/components/layout/public-header.tsx" "C:/COURSES/work/darnozom/_port-staging/store/"
cp "C:/COURSES/work/darnozom/academy/apps/client/.env" "C:/COURSES/work/darnozom/_port-staging/store/client.env"
```

- [ ] **Step 6: Extract the store translation blocks and route constants into staging files**

```bash
cd "C:/COURSES/work/darnozom/academy"
node -e "
const fs = require('fs');
for (const lang of ['en', 'ar']) {
  const msgs = JSON.parse(fs.readFileSync(\`apps/client/messages/\${lang}.json\`, 'utf8'));
  fs.writeFileSync(\`C:/COURSES/work/darnozom/_port-staging/store/store.\${lang}.json\`, JSON.stringify({ store: msgs.store }, null, 2));
}
"
grep -A4 "Books Store (Medusa-powered)" apps/client/src/lib/data/constants/routes.constants.ts > "C:/COURSES/work/darnozom/_port-staging/store/route-constants.txt"
grep -n "booksStore" apps/client/src/app/'[locale]'/'(dashboard)'/organization-dashboard/__components/org-sidebar.tsx apps/client/src/app/'[locale]'/'(dashboard)'/parent-dashboard/__components/parent-sidebar.tsx apps/client/src/app/'[locale]'/'(dashboard)'/student-dashboard/__components/student-sidebar.tsx > "C:/COURSES/work/darnozom/_port-staging/store/sidebar-refs.txt"
```

- [ ] **Step 7: Verify staging is complete**

```bash
find "C:/COURSES/work/darnozom/_port-staging/store" -type f | sort
```

Expected: `route-group/` contains `layout.tsx`, `books/page.tsx`, `books/[id]/page.tsx`, `cart/page.tsx`, `checkout/page.tsx`, `checkout/success/page.tsx`; plus `medusa-client.ts`, `context/cart-context.tsx`, `public-header.tsx`, `client.env`, `store.en.json`, `store.ar.json`, `route-constants.txt`, `sidebar-refs.txt`.

**Gate:** tag `pre-darnozom-port` resolves; `git status` clean with zero untracked files; all keepers present in staging per Step 7.

---

## Task 1: Bulk copy the source into the target, fix the toolchain landmines, verify install

**Files:**
- Create: the entire source tree under `academy` (excluding the global exclusions)
- Modify: `package.json` (remove `patchedDependencies`), `scripts/prune-nested-assistant-ui.cjs` (drop the mobile target)

**Interfaces:**
- Consumes: nothing from Task 0 beyond the clean tag.
- Produces: a buildable (install-wise) copy of the source tree in the target, with `apps/lms-mobile`, `patches/`, `flows/` absent.

- [ ] **Step 1: Copy the source tree, excluding the global exclusions**

```bash
cd "C:/COURSES/work/darnozom/academy"
robocopy "C:/COURSES/work/_LMS/lms-organization" "C:/COURSES/work/darnozom/academy" /E /XD node_modules .git .next dist .nx apps\lms-mobile patches flows /XF pnpm-lock.yaml /NFL /NDL /NJH
echo "robocopy exit code: $?"
```

Note: robocopy exit codes 0–7 indicate success (files copied/skipped); only 8+ is a real failure. `pnpm-lock.yaml` is excluded from the copy here — Task will regenerate it from the merged `package.json` set rather than overwrite the target's own lockfile wholesale, avoiding an install based on stale source-only lock data.

- [ ] **Step 2: Verify the copy landed and mobile/patches/flows are absent**

```bash
ls apps/
ls apps/lms-mobile 2>&1 || echo "confirmed absent"
ls patches 2>&1 || echo "confirmed absent"
ls flows 2>&1 || echo "confirmed absent"
git status --short | grep -c "^??"
```

Expected: `apps/` lists `client`, `server` only (no `lms-mobile`); both "confirmed absent" lines print; a large number of untracked files (the new copy).

- [ ] **Step 3: Remove the mobile-only `patchedDependencies` block**

Read `package.json`, find:

```json
"pnpm": {
  "overrides": {
    ...
  },
  "patchedDependencies": {
    "react-native-css-interop@0.1.22": "patches/react-native-css-interop@0.1.22.patch",
    "react-native-gifted-chat@3.3.2": "patches/react-native-gifted-chat@3.3.2.patch"
  }
}
```

Remove the entire `patchedDependencies` key (and its value) so the block becomes:

```json
"pnpm": {
  "overrides": {
    ...
  }
}
```

- [ ] **Step 4: Fix `prune-nested-assistant-ui.cjs` to drop the absent mobile target**

```bash
grep -n "lms-mobile" scripts/prune-nested-assistant-ui.cjs
```

Remove the line (or array entry) that reads:

```js
path.join(__dirname, '..', 'apps', 'lms-mobile'),
```

Leave the rest of the target list (web client's nested `@assistant-ui` paths) untouched.

- [ ] **Step 5: Run install and confirm it succeeds**

```bash
pnpm install
echo "install exit code: $?"
```

Expected: exit code `0`. If `patchedDependencies` or the mobile prune path was missed, this step fails loudly — do not proceed until it's clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Bulk-copy lms-organization source into academy, fix mobile-only toolchain refs

Excludes apps/lms-mobile, patches/, flows/, node_modules, .git, .next,
dist, .nx. Removes the patchedDependencies block (React Native patches,
now absent) and the hardcoded apps/lms-mobile path from the
prune-nested-assistant-ui postinstall script, so pnpm install succeeds
with mobile excluded.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** source tree present under `academy`; `git log` shows history back through `pre-darnozom-port`; `apps/lms-mobile` absent; `pnpm install` exits 0.

---

## Task 2: Re-graft the books storefront onto the copied client

**Files:**
- Modify: `apps/client/src/app/[locale]/(store)/*` (restore from staging), `apps/client/src/lib/medusa-client.ts` (restore), `apps/client/src/lib/context/cart-context.tsx` (restore), `apps/client/package.json` (add Medusa deps), `apps/client/messages/en.json`, `apps/client/messages/ar.json` (merge `store` block), `apps/client/src/lib/data/constants/routes.constants.ts` (add `ROUTE_*`), `apps/client/src/components/layout/public-header.tsx` (restore cart link), the org/parent/student sidebar components (add `booksStore` nav item), `apps/client/.env` and `.env.example` (Medusa vars)

**Interfaces:**
- Consumes: everything staged by Task 0 Step 5–6, now under `C:/COURSES/work/darnozom/_port-staging/store/`.
- Produces: a building, rendering `(store)` route group on the newly-copied Next 16 client.

- [ ] **Step 1: Restore the store route group and its support files**

```bash
cd "C:/COURSES/work/darnozom/academy"
cp -r "C:/COURSES/work/darnozom/_port-staging/store/route-group" "apps/client/src/app/[locale]/(store)"
cp "C:/COURSES/work/darnozom/_port-staging/store/medusa-client.ts" "apps/client/src/lib/medusa-client.ts"
cp "C:/COURSES/work/darnozom/_port-staging/store/context/cart-context.tsx" "apps/client/src/lib/context/cart-context.tsx"
cp "C:/COURSES/work/darnozom/_port-staging/store/public-header.tsx" "apps/client/src/components/layout/public-header.tsx"
```

- [ ] **Step 2: Add the Medusa SDK dependencies**

In `apps/client/package.json`, add to `"dependencies"`:

```json
"@medusajs/js-sdk": "^2.21.0",
"@medusajs/types": "^2.21.0",
```

```bash
pnpm install
```

- [ ] **Step 3: Merge the store translation block into both message catalogs**

```bash
node -e "
const fs = require('fs');
for (const lang of ['en', 'ar']) {
  const main = JSON.parse(fs.readFileSync(\`apps/client/messages/\${lang}.json\`, 'utf8'));
  const store = JSON.parse(fs.readFileSync(\`C:/COURSES/work/darnozom/_port-staging/store/store.\${lang}.json\`, 'utf8'));
  main.store = store.store;
  fs.writeFileSync(\`apps/client/messages/\${lang}.json\`, JSON.stringify(main, null, 2) + '\n');
}
"
```

- [ ] **Step 4: Verify the merge and check for a naming collision**

```bash
node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('apps/client/messages/en.json','utf8'))).includes('store'))"
```

Expected: `true`. If the copied source's `en.json`/`ar.json` already defines a top-level `store` key for something unrelated, stop and report the conflict before overwriting it.

- [ ] **Step 5: Add the store route constants**

Open `apps/client/src/lib/data/constants/routes.constants.ts`, append (matching the style captured in `route-constants.txt`):

```ts
/** Books Store (Medusa-powered) */
export const ROUTE_BOOKS = '/books';
export const ROUTE_CART = '/cart';
export const ROUTE_CHECKOUT = '/checkout';
export const ROUTE_CHECKOUT_SUCCESS = '/checkout/success';
```

- [ ] **Step 6: Re-add the sidebar nav entries**

In each of `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/org-sidebar.tsx`, `parent-dashboard/__components/parent-sidebar.tsx`, `student-dashboard/__components/student-sidebar.tsx`, add the import for `ROUTE_BOOKS` and `BookOpen` (from `lucide-react`) if not already present, and add to the nav items array:

```ts
{ href: ROUTE_BOOKS, icon: BookOpen, labelKey: 'booksStore' },
```

Cross-check against `C:/COURSES/work/darnozom/_port-staging/store/sidebar-refs.txt` for the exact original line and surrounding array position in each file.

- [ ] **Step 7: Restore the Medusa client env vars**

Append to `apps/client/.env`:

```
# Medusa v2 Storefront API Configuration
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9010
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_e00aea1a05bf2cc79466b442b097df927379c48fd307563acf5a51e98b0edac2
```

Also add the two keys (with empty/placeholder values) to `apps/client/.env.example` so the requirement is documented for anyone bootstrapping the project fresh.

- [ ] **Step 8: Next 16 compatibility check on the store files**

```bash
pnpm --filter client exec tsc --noEmit
```

Read the output for errors originating in `app/[locale]/(store)/`. The known Next 16 delta to check for: dynamic route params (`[id]`) are asynchronous in Next 16 — `params` is a `Promise` that must be `await`ed, whereas Next 15 passed it synchronously. Fix `apps/client/src/app/[locale]/(store)/books/[id]/page.tsx` if it destructures `params` directly instead of awaiting it:

```tsx
// Next 16 shape:
export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

- [ ] **Step 9: Build and manually verify**

```bash
pnpm --filter client build
```

Then start the dev server and confirm in a browser: `/books` renders a product list fetched from Medusa, `/books/[id]` shows detail, `/cart` reflects an added item, `/checkout` loads, and the `booksStore` nav entry appears in all three dashboards' sidebars.

- [ ] **Step 10: Commit**

```bash
cd "C:/COURSES/work/darnozom/academy"
git add -A
git commit -m "Re-graft books storefront (Medusa, transitional) onto copied client

Restores the (store) route group, medusa-client.ts, cart-context.tsx,
public-header.tsx cart link, store translations, ROUTE_* constants, and
sidebar nav entries lost in the wholesale copy. Fixes the Next 16
async-params delta in the book detail page. This Medusa data layer is
transitional per spec sec 11 and will be replaced by a native book
module in a follow-on spec; the storefront UI stays.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** `/books`, `/books/[id]`, `/cart`, `/checkout` render and reach Medusa; cart add/remove works; the store nav entry appears in all three dashboards; `pnpm --filter client build` succeeds.

---

## Task 3: Discussion removal — pure deletes

**Files:**
- Delete: `apps/server/src/discussion/` (whole directory)
- Delete: `apps/server/src/notification/events/discussion-created.listener.ts`
- Delete: `apps/client/src/components/organs/discussion/` (whole directory: `discussion-dialog.tsx`, `discussion-form.tsx`, `discussion-item.tsx`, `discussion-list.tsx`, `discussion-section.tsx`, `index.ts`)
- Delete: `apps/client/src/lib/types/discussion/discussion.types.ts`
- Delete: `apps/client/src/lib/realtime/notifications/handlers/discussion.handler.ts`
- Delete: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/module-discussion-panel.tsx`
- Delete: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/content/[contentId]/edit/content-discussion-panel.tsx`

**Interfaces:**
- Produces: the discussion feature's own code fully absent. Every remaining task in Phase 3 removes references *into* this now-deleted code.

This task only deletes files whose sole purpose is the discussion feature itself (not files that merely reference it). Nothing here should break a build on its own — the breaks come from the dangling imports fixed in Tasks 4–7.

- [ ] **Step 1: Delete the server discussion module**

```bash
cd "C:/COURSES/work/darnozom/academy"
rm -rf apps/server/src/discussion
rm apps/server/src/notification/events/discussion-created.listener.ts
```

- [ ] **Step 2: Delete the client discussion UI and support files**

```bash
rm -rf "apps/client/src/components/organs/discussion"
rm -rf "apps/client/src/lib/types/discussion"
rm "apps/client/src/lib/realtime/notifications/handlers/discussion.handler.ts"
rm "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/module-discussion-panel.tsx"
rm "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/content/[contentId]/edit/content-discussion-panel.tsx"
```

- [ ] **Step 3: Verify nothing else was accidentally removed and confirm the deletions**

```bash
ls apps/server/src/discussion 2>&1 || echo "confirmed absent: server discussion module"
ls apps/server/src/notification/events/discussion-created.listener.ts 2>&1 || echo "confirmed absent: listener"
ls "apps/client/src/components/organs/discussion" 2>&1 || echo "confirmed absent: client organs/discussion"
ls "apps/client/src/lib/types/discussion" 2>&1 || echo "confirmed absent: lib/types/discussion"
ls "apps/client/src/lib/realtime/notifications/handlers/discussion.handler.ts" 2>&1 || echo "confirmed absent: client handler"
```

Expected: five "confirmed absent" lines.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Delete discussion feature code (server module, client UI, panels)

Removes apps/server/src/discussion, the notification listener, the
client organs/discussion component set, lib/types/discussion, the
realtime discussion.handler, and the two module/content discussion
panel mount components. This is the first step of discussion removal;
every remaining reference into this deleted code is fixed in
subsequent tasks, verified by the Task 7 build+seed gate.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** all five paths confirmed absent. (No build gate yet — expected to fail until Tasks 4–7 land.)

---

## Task 4: Discussion removal — course domain (server + client)

**Files:**
- Modify: `apps/server/src/app.module.ts`
- Modify: `apps/server/src/course/entities/course.entity.ts`
- Modify: `apps/server/src/course/entities/module-content-settings.embed.ts`
- Modify: `apps/server/src/course/dto/create-course.dto.ts`
- Modify: `apps/server/src/course/dto/module-content-settings.dto.ts`
- Modify: `apps/server/src/course/course.module.ts`
- Modify: `apps/client/src/lib/schema/course.schema.ts`
- Modify: `apps/client/src/lib/schema/module.schema.ts`
- Modify: `apps/client/src/lib/schema/content.schema.ts`
- Modify: `apps/client/src/lib/types/course/course.interface.ts`
- Modify: `apps/client/src/lib/types/course/modules.interface.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course-form.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-settings-section.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/basic-info-card.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/get-default-values.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/modules/create-module-form.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/modules/edit-module-form.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/page.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/content/[contentId]/edit/page.tsx`

**Interfaces:**
- Consumes: nothing (ground-floor fields).
- Produces: course/module/content `settings` objects with no `discussionEnabled` member anywhere, so Task 5's RBAC edits and Task 7's seed edits have nothing left pointing at it on the course side.

The entire feature on this domain is one repeated shape: a `discussionEnabled?: boolean` field (default `true`) declared in parallel across a Mongoose schema, a DTO, a Yup schema, a TS interface, and a form's default values — plus two UI toggle blocks and two panel-mount blocks already deleted in Task 3.

- [ ] **Step 1: Remove the field from the server entity and embed**

In `apps/server/src/course/entities/course.entity.ts`, delete:

```ts
  discussionEnabled?: boolean;
```
(interface member, near `certificateEnabled?: boolean;` / `downloadEnabled?: boolean;`)

and:

```ts
    discussionEnabled: { type: Boolean, default: true },
```
(schema field, same neighbors).

In `apps/server/src/course/entities/module-content-settings.embed.ts`, delete the schema field:

```ts
    discussionEnabled: { type: Boolean, default: true },
```

the interface member:

```ts
  discussionEnabled?: boolean;
```

and the now-unused helper (confirm no other caller remains — Task 7 Step 5 removes its one external caller in `enrollment.message.controller.ts`):

```ts
/** Missing settings or `discussionEnabled` ⇒ treated as enabled (same as course `settings`). */
export function isDiscussionEnabled(settings?: { discussionEnabled?: boolean } | null): boolean {
  return settings?.discussionEnabled !== false;
}
```

Update the file's remaining doc comment from `(discussion flags; extend later)` to just describe the shared embedded settings shape, since there is no longer a discussion flag to reference.

- [ ] **Step 2: Remove the field from server DTOs**

In `apps/server/src/course/dto/create-course.dto.ts`, delete the `discussionEnabled` property block (the `@IsOptional()` / `discussionEnabled?: boolean;` pair).

In `apps/server/src/course/dto/module-content-settings.dto.ts`, delete the `@IsBoolean() @IsOptional() discussionEnabled?: boolean;` block, and update the file's doc comment similarly to Step 1.

- [ ] **Step 3: Clean up the dead comment in `course.module.ts`**

Remove the now-irrelevant commented-out line:

```ts
          // { name: CourseType.DISCUSSION, schema: DiscussionSchema },
```

- [ ] **Step 4: Unregister the discussion module in `app.module.ts`**

Remove:

```ts
import { DiscussionModule } from './discussion/discussion.module';
```

and remove `DiscussionModule,` from the `imports` array.

- [ ] **Step 5: Remove the field from client schemas and interfaces**

In `apps/client/src/lib/schema/course.schema.ts`, delete:
```ts
    discussionEnabled: Yup.boolean().optional(),
```

In `apps/client/src/lib/schema/module.schema.ts`, delete:
```ts
  discussionEnabled: yup.boolean().optional(),
```

In `apps/client/src/lib/schema/content.schema.ts`, delete:
```ts
        discussionEnabled: yup.boolean().optional(),
```

In `apps/client/src/lib/types/course/course.interface.ts`, delete:
```ts
  discussionEnabled: boolean;
```

In `apps/client/src/lib/types/course/modules.interface.ts`, delete the interface member and update the doc comment (it currently reads "mirrors course `settings` shape for discussion"):
```ts
  discussionEnabled?: boolean;
```

- [ ] **Step 6: Remove the field from client form defaults**

In `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course-form.tsx`, delete both occurrences:
```ts
              discussionEnabled: course.settings?.discussionEnabled ?? true,
```
```ts
              discussionEnabled: true,
```

In `.../courses/__components/content/get-default-values.ts`, delete both occurrences:
```ts
      settings: { discussionEnabled: true },
```
```ts
      discussionEnabled: initialContent.settings?.discussionEnabled !== false,
```

- [ ] **Step 7: Remove the toggle UI blocks**

In `.../courses/__components/course/course-settings-section.tsx`, remove the whole toggle block (the `<span>{t('enableDiscussions')}</span>` label, the `id="discussionEnabled"` control, `checked={watch('settings')?.discussionEnabled ?? false}`, and the `onChange`/`onCheckedChange` handler that sets `discussionEnabled: checked`). Read the file first to capture the exact enclosing JSX element (likely a `<div>` wrapping a `<Switch>` or `<Checkbox>` plus label) and remove that whole element.

In `.../courses/__components/content/basic-info-card.tsx`, remove the whole toggle block: the `id="content-discussion-enabled"` control, `checked={watch('settings.discussionEnabled') !== false}`, the `setValue('settings.discussionEnabled', c === true, { shouldDirty: true })` handler, the `<Label htmlFor="content-discussion-enabled">` and its two translation keys (`basicInformation.discussionEnabled`, `basicInformation.discussionEnabledHelp`).

In `.../courses/__components/modules/create-module-form.tsx` and `.../modules/edit-module-form.tsx`, read each file, locate the equivalent module-settings toggle (same shape as the course one: a switch/checkbox bound to `settings.discussionEnabled` with a label), and remove it along with its default-value wiring.

- [ ] **Step 8: Remove the panel mounts in the module and content edit pages**

In `.../courses/[id]/modules/[moduleId]/page.tsx`, remove:
```tsx
import { ModuleDiscussionPanel } from './module-discussion-panel';
```
```tsx
  const showDiscussionPanel =
    course.settings?.discussionEnabled !== false &&
    moduleData?.settings?.discussionEnabled !== false;
```
```tsx
      {showDiscussionPanel ? (
        <div className="px-4">
          <ModuleDiscussionPanel courseId={courseId} moduleId={moduleId} canDeleteAny />
        </div>
      ) : null}
```

In `.../content/[contentId]/edit/page.tsx`, remove:
```tsx
import { ContentDiscussionPanel } from './content-discussion-panel';
```
```tsx
  const showDiscussionPanel =
    course.settings?.discussionEnabled !== false &&
    moduleEntity?.settings?.discussionEnabled !== false &&
    existingContent.settings?.discussionEnabled !== false;
```
and the corresponding conditional render block further down the file (same shape as the module page).

- [ ] **Step 9: Grep-verify no `discussion` references remain in these files**

```bash
cd "C:/COURSES/work/darnozom/academy"
grep -il "discussion" \
  apps/server/src/app.module.ts \
  apps/server/src/course/entities/course.entity.ts \
  apps/server/src/course/entities/module-content-settings.embed.ts \
  apps/server/src/course/dto/create-course.dto.ts \
  apps/server/src/course/dto/module-content-settings.dto.ts \
  apps/server/src/course/course.module.ts \
  apps/client/src/lib/schema/course.schema.ts \
  apps/client/src/lib/schema/module.schema.ts \
  apps/client/src/lib/schema/content.schema.ts \
  apps/client/src/lib/types/course/course.interface.ts \
  apps/client/src/lib/types/course/modules.interface.ts \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course-form.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-settings-section.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/basic-info-card.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/get-default-values.ts" \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/modules/create-module-form.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/modules/edit-module-form.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/page.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/[id]/modules/[moduleId]/content/[contentId]/edit/page.tsx"
```

Expected: no output (grep exits 1).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Remove discussion field and UI from course domain

Deletes discussionEnabled from course/module/content settings across
the Mongoose entity, embed, DTOs, Yup schemas, TS interfaces, form
defaults, and the two settings toggle UI blocks. Unregisters
DiscussionModule from app.module.ts and removes the panel mount blocks
in the module/content edit pages (panels themselves deleted in the
prior commit).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** Step 9's grep returns nothing. (Full build gate deferred to Task 7, after RBAC and seed data are also fixed — the course domain alone will not compile cleanly yet because of dangling notification/plan/seed references.)

---

## Task 5: Discussion removal — subscription plans and RBAC

**Files:**
- Modify: `apps/server/src/plan/entities/plan.entity.ts`
- Modify: `apps/server/src/plan/dto/create-plan.dto.ts`
- Modify: `apps/server/src/plan/seeds/plan.seeder.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Modify: `apps/server/src/role/seeds/role.admin.config.ts`
- Modify: `apps/server/src/role/seeds/role.instructor.config.ts`
- Modify: `apps/server/src/role/seeds/role.student.config.ts`
- Modify: `apps/server/src/role/seeds/role.super-admin.config.ts`
- Modify: `apps/server/src/utils/approval.utils.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/plans/__components/plan-form.schema.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/plans/__components/plan-form-dialog.tsx`
- Modify: `apps/client/src/lib/actions/plan/plan.action.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: no `discussions` field on any plan shape; no `Subjects.DISCUSSION` enum member and no role config referencing it.

This is the riskiest file set in the whole removal: `Subjects.DISCUSSION` is referenced by type in four role configs, so the enum member and every usage must be removed together or the server fails to compile.

- [ ] **Step 1: Remove the plan feature flag — server**

In `apps/server/src/plan/entities/plan.entity.ts`, delete:
```ts
    discussions: boolean;
```
(alongside `certificates: boolean;` / `customBranding: boolean;`)

In `apps/server/src/plan/dto/create-plan.dto.ts`, delete:
```ts
  @IsBoolean()
  discussions: boolean;
```

In `apps/server/src/plan/seeds/plan.seeder.ts`, delete all four occurrences of the `discussions: <bool>,` line (one per seeded plan tier — free, basic, pro, enterprise or similar):
```ts
          discussions: false,
```
```ts
          discussions: true,
```
(×3 more, matching whichever boolean each tier used)

- [ ] **Step 2: Remove the `DISCUSSION` RBAC subject**

In `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`, delete:
```ts
  DISCUSSION = 'DISCUSSION',
```

- [ ] **Step 3: Remove every role config reference**

In `apps/server/src/role/seeds/role.admin.config.ts` and `role.super-admin.config.ts`, delete the single line:
```ts
  Subjects.DISCUSSION,
```

In `apps/server/src/role/seeds/role.instructor.config.ts` and `role.student.config.ts`, delete all four permission-entry lines each:
```ts
  { action: Actions.READ, subject: Subjects.DISCUSSION },
  { action: Actions.CREATE, subject: Subjects.DISCUSSION },
  { action: Actions.UPDATE, subject: Subjects.DISCUSSION },
  { action: Actions.DELETE, subject: Subjects.DISCUSSION },
```

- [ ] **Step 4: Update the stale comment in `approval.utils.ts`**

The comment currently reads:
```ts
 * settings (e.g. discussionEnabled) and attendanceSettings are operational
```
Change `discussionEnabled` to a still-current example field, e.g. `downloadEnabled`, so the comment doesn't reference a deleted field:
```ts
 * settings (e.g. downloadEnabled) and attendanceSettings are operational
```

- [ ] **Step 5: Remove the plan feature flag — client**

In `.../main-admin-dashboard/plans/__components/plan-form.schema.ts`, delete both occurrences:
```ts
  discussions: boolFeature(),
```
```ts
  discussions: false,
```

In `.../main-admin-dashboard/plans/__components/plan-form-dialog.tsx`, delete the list entry:
```ts
  'discussions',
```

In `apps/client/src/lib/actions/plan/plan.action.ts`, delete:
```ts
  discussions: boolean;
```

- [ ] **Step 6: Grep-verify**

```bash
cd "C:/COURSES/work/darnozom/academy"
grep -il "discussion" \
  apps/server/src/plan/entities/plan.entity.ts \
  apps/server/src/plan/dto/create-plan.dto.ts \
  apps/server/src/plan/seeds/plan.seeder.ts \
  lib/shared-types/src/lib/types/role/subject/subjects.enum.ts \
  apps/server/src/role/seeds/role.admin.config.ts \
  apps/server/src/role/seeds/role.instructor.config.ts \
  apps/server/src/role/seeds/role.student.config.ts \
  apps/server/src/role/seeds/role.super-admin.config.ts \
  apps/server/src/utils/approval.utils.ts \
  "apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/plans/__components/plan-form.schema.ts" \
  "apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/plans/__components/plan-form-dialog.tsx" \
  apps/client/src/lib/actions/plan/plan.action.ts
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove discussion plan feature flag and RBAC subject

Deletes the 'discussions' boolean feature flag from plan entity, DTO,
seeder (all four tiers), and the main-admin plan form schema/dialog/
action. Deletes Subjects.DISCUSSION and every reference to it across
all four role seed configs (admin, instructor, student, super-admin).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** Step 6's grep returns nothing.

---

## Task 6: Discussion removal — notifications and shared-types enums

**Files:**
- Modify: `apps/server/src/notification/notification.module.ts`
- Modify: `lib/shared-types/src/lib/configurations/notification/notification-text-key.enum.ts`
- Modify: `lib/shared-types/src/lib/configurations/notification/notification-type.enum.ts`
- Modify: `lib/shared-types/src/lib/messages/course.enum.ts`
- Modify: `apps/client/src/components/organs/index.ts`
- Modify: `apps/client/src/lib/realtime/notifications/notification-handlers.registry.ts`

**Interfaces:**
- Consumes: Task 3's deletion of `discussion-created.listener.ts` and `discussion.handler.ts` (these edits remove the dangling references to both).
- Produces: a notification pipeline with no discussion event type, text keys, or handler registration.

- [ ] **Step 1: Unregister the deleted listener**

In `apps/server/src/notification/notification.module.ts`, remove:
```ts
import { DiscussionCreatedListener } from './events/discussion-created.listener';
```
and remove `DiscussionCreatedListener,` from the `providers` array (it currently reads `[NotificationService, DiscussionCreatedListener, CourseContentPublishedListener, ContentNotificationProcessor]`).

- [ ] **Step 2: Remove the discussion notification text keys**

In `lib/shared-types/src/lib/configurations/notification/notification-text-key.enum.ts`, delete all four:
```ts
  DISCUSSION_REPLY_TITLE = 'discussionReplyTitle',
  DISCUSSION_REPLY_BODY = 'discussionReplyBody',
  DISCUSSION_NEW_TITLE = 'discussionNewTitle',
  DISCUSSION_NEW_BODY = 'discussionNewBody',
```

- [ ] **Step 3: Remove the discussion notification type**

In `lib/shared-types/src/lib/configurations/notification/notification-type.enum.ts`, delete:
```ts
  DISCUSSION = 'discussion',
```

- [ ] **Step 4: Remove the discussion course event**

In `lib/shared-types/src/lib/messages/course.enum.ts`, delete:
```ts
  DISCUSSION_DISABLED = 'DiscussionDisabled',
```

- [ ] **Step 5: Remove the client barrel export**

In `apps/client/src/components/organs/index.ts`, delete:
```ts
export * from './discussion';
```

- [ ] **Step 6: Unregister the deleted client handler**

In `apps/client/src/lib/realtime/notifications/notification-handlers.registry.ts`, remove:
```ts
import { discussionNotificationHandler } from './handlers/discussion.handler';
```
and remove the registry entry:
```ts
  [NotificationType.DISCUSSION]: discussionNotificationHandler,
```

- [ ] **Step 7: Grep-verify**

```bash
cd "C:/COURSES/work/darnozom/academy"
grep -il "discussion" \
  apps/server/src/notification/notification.module.ts \
  lib/shared-types/src/lib/configurations/notification/notification-text-key.enum.ts \
  lib/shared-types/src/lib/configurations/notification/notification-type.enum.ts \
  lib/shared-types/src/lib/messages/course.enum.ts \
  apps/client/src/components/organs/index.ts \
  apps/client/src/lib/realtime/notifications/notification-handlers.registry.ts
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Remove discussion notification wiring and shared-types enums

Unregisters DiscussionCreatedListener from notification.module.ts and
discussionNotificationHandler from the client registry. Deletes the
four DISCUSSION_* notification text keys, the DISCUSSION notification
type, the DISCUSSION_DISABLED course event, and the client organs
barrel export for the now-deleted discussion component set.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** Step 7's grep returns nothing.

---

## Task 7: Discussion removal — seeders, enrollment, student UI; full build and seed gate

**Files:**
- Modify: `apps/server/src/database/seeds/seed.ts`
- Modify: `apps/server/src/database/seeds/seed.config.ts`
- Modify: `apps/server/src/database/seeds/seed-config.interface.ts`
- Modify: `apps/server/src/enrollment/controllers/enrollment.message.controller.ts`
- Modify: `apps/client/src/lib/hooks/course/content/useContent.ts`
- Modify: `apps/client/src/lib/actions/courses/content/content.action.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/content-view.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/course-modules.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/single-course-view.tsx`

**Interfaces:**
- Consumes: Task 4's removal of `isDiscussionEnabled` and `discussionEnabled` (this task removes the last caller, `enrollment.message.controller.ts`, and the `discussionAllowed` value it produced, which the three student-dashboard files below consume).
- Produces: an `enrollment.getSingleContentInEnrollment` response shape with no `discussionAllowed` field; a seed script with zero discussion seeding.

This is the convergence point: every removal from Tasks 3–6 gets its first real compile check here, plus the seed script's first real run against a fresh database.

- [ ] **Step 1: Remove discussion imports and model registration from `seed.ts`**

Delete the four discriminator-entity imports:
```ts
import { Discussion, DiscussionSchema } from '../../discussion/entities/discussion.entity';
import { CourseDiscussion, CourseDiscussionSchema } from '../../discussion/entities/course-discussion.entity';
import { ModuleDiscussion, ModuleDiscussionSchema } from '../../discussion/entities/module-discussion.entity';
import { ContentDiscussion, ContentDiscussionSchema } from '../../discussion/entities/content-discussion.entity';
```
and the seeder import:
```ts
import { DiscussionSeeder } from '../../discussion/seeds/discussion.seeder';
```

Delete the Mongoose feature registration block:
```ts
      {
        name: Discussion.name,
        schema: DiscussionSchema,
        discriminators: [
          { name: CourseDiscussion.name, schema: CourseDiscussionSchema },
          { name: ModuleDiscussion.name, schema: ModuleDiscussionSchema },
          { name: ContentDiscussion.name, schema: ContentDiscussionSchema },
        ],
      },
```

Delete the model handle:
```ts
  const discussionModel = app.get<Model<Discussion>>(getModelToken(Discussion.name));
```

Delete the seeder instantiation:
```ts
  const discussionSeeder = new DiscussionSeeder(discussionModel, courseModel, moduleModel, contentModel);
```

Delete the seeding call block:
```ts
    // ── 2j. Discussions ──────────────────────────────────────────
    log(`  Seeding Discussions for ${organizationConfig.name}...`);
    const allAuthors = [...students, ...instructors];
    for (const [courseIdx, course] of courses.entries()) {
      const courseConfig = organizationConfig.courses[courseIdx];
      await discussionSeeder.seedForCourse(course, org._id, {
        configDiscussions: courseConfig?.discussions,
        authors: allAuthors,
      });
    }
```

Renumber the remaining comment markers in that section if they're sequential (e.g. if `2k.` follows, it's fine to leave as-is since these are just log labels, not functional — but check for any code that indexes into a numbered phase array; if none, leave numbering untouched).

- [ ] **Step 2: Remove the `discussions?` field from the seed config interface**

In `apps/server/src/database/seeds/seed-config.interface.ts`, delete:
```ts
  discussions?: {
    title: string;
    content: string;
  }[];
```

- [ ] **Step 3: Remove all eight `discussions:` seed data arrays**

In `apps/server/src/database/seeds/seed.config.ts`, delete each `discussions: [...]` array literal (8 total, one per course config block). Each is shaped like:
```ts
        discussions: [
          { title: '...', content: '...' },
          { title: '...', content: '...' },
        ],
```
or the single-entry form:
```ts
        discussions: [{ title: '...', content: '...' }],
```

```bash
grep -n "discussions:" apps/server/src/database/seeds/seed.config.ts
```

Use this to locate and remove all 8 before moving on.

- [ ] **Step 4: Remove `discussionAllowed` from the enrollment controller**

In `apps/server/src/enrollment/controllers/enrollment.message.controller.ts`, delete the import:
```ts
import { isDiscussionEnabled } from 'src/course/entities/module-content-settings.embed';
```

Delete the computation block:
```ts
    const contentSettings = (content as { settings?: { discussionEnabled?: boolean } }).settings;
    const discussionAllowed = !!(
      courseDoc &&
      moduleDoc &&
      isDiscussionEnabled((courseDoc as { settings?: { discussionEnabled?: boolean } }).settings) &&
      isDiscussionEnabled((moduleDoc as { settings?: { discussionEnabled?: boolean } }).settings) &&
      isDiscussionEnabled(contentSettings)
    );
```

Remove `discussionAllowed,` from the returned object:
```ts
    return {
      enrollment,
      content,
      discussionAllowed,
    };
```
becomes:
```ts
    return {
      enrollment,
      content,
    };
```

- [ ] **Step 5: Remove `discussionAllowed` from the client content hook, action, and student views**

In `apps/client/src/lib/hooks/course/content/useContent.ts`, delete:
```ts
  /** False when course, module, or content has discussion disabled in settings. */
  discussionAllowed: boolean;
```

In `apps/client/src/lib/actions/courses/content/content.action.ts`, read the file around the three occurrences found by:
```bash
grep -n "discussionAllowed" "apps/client/src/lib/actions/courses/content/content.action.ts"
```
and remove `discussionAllowed` from: the destructured NATS response type, the intermediate `{ enrollment, content, discussionAllowed }` destructure, and the final returned object's `discussionAllowed: discussionAllowed !== false,` line.

In `.../student-dashboard/courses/__components/content-view.tsx`, `course-modules.tsx`, and `single-course-view.tsx`, read each file and locate its use of `discussionAllowed` (each gates some student-facing discussion UI or passes the flag down to a child). Since the discussion UI itself no longer exists, remove:
- the `discussionAllowed` prop/field wherever it's destructured or typed,
- any conditional block or passed-through prop that existed solely to gate discussion UI,
- while leaving everything else in each component (course/module/content listing, progress, navigation) untouched.

```bash
grep -n -B2 -A2 "discussionAllowed\|[Dd]iscussion" \
  "apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/content-view.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/course-modules.tsx" \
  "apps/client/src/app/[locale]/(dashboard)/student-dashboard/courses/__components/single-course-view.tsx"
```
Use this output to confirm exactly what to remove in each before editing.

- [ ] **Step 6: Full repo-wide grep for any remaining `discussion` identifier**

```bash
cd "C:/COURSES/work/darnozom/academy"
grep -ril "discussion" apps/server/src apps/client/src lib/shared-types/src 2>/dev/null
```

Expected: no output. If anything prints, it is a reference this plan missed — read that file, determine whether it's a leftover import/type/field from the discussion feature, and remove it following the same pattern as the task that covers its domain (course/plan/RBAC/notification/seed) before proceeding.

- [ ] **Step 7: Build both apps**

```bash
pnpm install
nx build server
nx build client
```

Expected: both exit 0. Any TypeScript error here is either a missed reference (go back to Step 6's grep and the relevant task) or a genuine mistake in one of the edits above — read the error, locate the exact line, and fix it in place.

- [ ] **Step 8: Run the seed script against a fresh `darnozom` database**

```bash
pnpm --filter server run seed
```

(Check `apps/server/package.json` for the actual script name if `seed` differs — likely `db:seed` or `seed:dev`.) Confirm the script logs through every organization's seeding phases to completion with no thrown errors, and that no phase references "Discussions" any more.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Remove discussion from seeders, enrollment response, student UI

Removes the Discussion/CourseDiscussion/ModuleDiscussion/
ContentDiscussion model registration, discussionModel, discussionSeeder,
and the 2j seeding call from seed.ts; the discussions? field from
seed-config.interface.ts; all eight discussions: seed data arrays from
seed.config.ts. Removes discussionAllowed from the enrollment message
controller's response and every client consumer (useContent hook,
content.action.ts, and the three student-dashboard course view
components).

This completes discussion removal: zero discussion references remain
in apps/server/src, apps/client/src, or lib/shared-types/src. Both
nx build server and nx build client pass, and the seed script runs
clean against a fresh darnozom database.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** `nx build server` clean; `nx build client` clean; seed script completes against a fresh database; repo-wide grep for `discussion` (case-insensitive, excluding build output) returns nothing.

---

## Task 8: Rebrand — safeer → darnozom strings

**Files:**
- Modify: the ~7 real source files found carrying `safeer`/`Safeer` (server source, client source), `apps/client/messages/en.json`, `apps/client/messages/ar.json`, `.env`, `.env.example`, `.env.production`, `Caddyfile`

**Interfaces:**
- Produces: zero `safeer` strings (case-insensitive) in source outside build output.

- [ ] **Step 1: Enumerate every real-source file containing `safeer`**

```bash
cd "C:/COURSES/work/darnozom/academy"
grep -ril "safeer" apps/server/src apps/client/src apps/client/messages .env .env.example .env.production Caddyfile 2>/dev/null
```

Record the full list — this is the authoritative set to edit (the spec's investigation found 4 server source files, 3 client source files, 2 message catalogs, plus the env files and Caddyfile; re-derive it here against the actual copied tree rather than trusting that count, since file layout may differ slightly after the copy).

- [ ] **Step 2: Replace case-sensitively, preserving capitalization**

```bash
for f in $(grep -ril "safeer" apps/server/src apps/client/src apps/client/messages .env .env.example .env.production Caddyfile 2>/dev/null); do
  sed -i 's/Safeer/Darnozom/g; s/safeer/darnozom/g; s/SAFEER/DARNOZOM/g' "$f"
done
```

- [ ] **Step 3: Verify**

```bash
grep -ril "safeer" apps/server/src apps/client/src apps/client/messages .env .env.example .env.production Caddyfile 2>/dev/null
```

Expected: no output.

- [ ] **Step 4: Spot-check two files manually**

Open two of the edited files (pick one server, one client) and read the surrounding context to confirm the replacement reads naturally (e.g. not `darnozom.com` where it should be a different placeholder domain, not breaking a URL path that happens to contain the substring). Fix by hand if the mechanical replace produced something wrong.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Rebrand safeer to darnozom across source, messages, env, Caddyfile

Case-preserving replace (Safeer/safeer/SAFEER -> Darnozom/darnozom/
DARNOZOM) across every real-source file found carrying the old brand
name, plus .env, .env.example, .env.production, and Caddyfile.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** `grep -ri safeer` over source (excluding `.next`, `node_modules`, `dist`) returns nothing.

---

## Task 9: Rebrand — root Nx project rename and database name

**Files:**
- Modify: `package.json`
- Modify: `nx.json`
- Modify: `.env`, `.env.example`, `.env.production` (database name)
- Modify: `Caddyfile` (hostname placeholders)

**Interfaces:**
- Produces: root project named `darnozom-academy` everywhere it's referenced; database name `darnozom`.

- [ ] **Step 1: Rename the root package and Nx project name**

In `package.json`, change:
```json
  "name": "islamic-academy",
```
to:
```json
  "name": "darnozom-academy",
```

In `nx.json`, change:
```json
  "name": "islamic-academy",
```

Wait — check the actual current value first (the spec recorded the source's value as `lms-organization`, but the target's own `nx.json` may already read `islamic-academy` or similar from before the copy; verify):

```bash
grep -n '"name"' nx.json package.json
```

Set both to `"darnozom-academy"`.

- [ ] **Step 2: Update the four `--exclude=` script flags together**

In `package.json`, find the four scripts referencing `--exclude=lms-organization` (from the bulk-copied source):
```json
    "lint": "nx run-many -t lint --exclude=lms-organization",
    "lint:format": "nx run-many -t lint:format --exclude=lms-organization",
    "type-check": "nx run-many -t tsc --exclude=lms-organization",
    "tsc": "nx run-many -t tsc --exclude=lms-organization"
```

Change all four to `--exclude=darnozom-academy`.

- [ ] **Step 3: Verify the lint/type-check project exclusion still works**

```bash
pnpm lint 2>&1 | tail -20
pnpm type-check 2>&1 | tail -20
```

Confirm neither run attempts to lint/type-check the workspace root itself (no errors originating from root-level config files being treated as a project).

- [ ] **Step 4: Set the database name**

In `.env`, `.env.example`, and `.env.production`, update the Mongo URI/database-name variables to use `darnozom` as the database name (split by environment, matching the target's existing pattern from its pre-port commit — e.g. `darnozom_dev`, `darnozom_prod` if that convention existed, or plain `darnozom` if not). Read the existing variable names first:

```bash
grep -n "MONGO\|DATABASE" .env .env.example .env.production
```

- [ ] **Step 5: Set Caddyfile and production hostname placeholders**

```bash
grep -n "safeer\|islamic-academy" Caddyfile .env.production
```

Replace any remaining project-specific hostnames with darnozom placeholders (e.g. `darnozom.example.com`), clearly marked as placeholders for the operator to fill with real production values.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Rebrand root Nx project to darnozom-academy, set database name

Renames package.json and nx.json name to darnozom-academy, updates the
--exclude=lms-organization flag in lint, lint:format, type-check, and
tsc scripts to --exclude=darnozom-academy so project exclusion keeps
working. Sets the Mongo database name to darnozom across .env,
.env.example, and .env.production, and darnozom placeholders in
Caddyfile.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** `grep -ri safeer` still clean; root package name is `darnozom-academy`; `pnpm lint` and `pnpm type-check` both still correctly exclude the root project.

---

## Task 10: Rebrand — shared-types alias rename

**Files:**
- Modify: `tsconfig.json`
- Modify: `lib/shared-types/package.json`
- Modify: every file importing `@lms-organization/shared-types` (382 files per the spec's count against the source — re-derive against the actual copied tree)

**Interfaces:**
- Produces: `@darnozom/shared-types` as the sole import path for the shared-types lib, with no remaining `@lms-organization/shared-types` references.

- [ ] **Step 1: Rename the path alias**

In `tsconfig.json`, change:
```json
    "paths": {
      "@lms-organization/shared-types": [
        "lib/shared-types/src/index.ts"
      ]
    }
```
to:
```json
    "paths": {
      "@darnozom/shared-types": [
        "lib/shared-types/src/index.ts"
      ]
    }
```

- [ ] **Step 2: Rename the package name**

In `lib/shared-types/package.json`, change:
```json
  "name": "@lms-organization/shared-types",
```
to:
```json
  "name": "@darnozom/shared-types",
```

- [ ] **Step 3: Rewrite every importing file**

```bash
cd "C:/COURSES/work/darnozom/academy"
grep -rl "@lms-organization/shared-types" apps lib --include="*.ts" --include="*.tsx" | wc -l
grep -rl "@lms-organization/shared-types" apps lib --include="*.ts" --include="*.tsx" \
  | xargs sed -i "s/@lms-organization\/shared-types/@darnozom\/shared-types/g"
```

- [ ] **Step 4: Verify zero remaining references**

```bash
grep -rl "@lms-organization/shared-types" apps lib --include="*.ts" --include="*.tsx"
```

Expected: no output.

- [ ] **Step 5: Reinstall and build to confirm the alias resolves**

```bash
pnpm install
nx build server
nx build client
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Rename shared-types alias to @darnozom/shared-types

Renames the TS path alias in tsconfig.json, the package name in
lib/shared-types/package.json, and every importing file (382 files in
the source) from @lms-organization/shared-types to
@darnozom/shared-types. Verified by a full server+client build.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** zero `@lms-organization/shared-types` references remain; `nx build server` and `nx build client` both pass.

---

## Task 11: Config hygiene and git remote check

**Files:**
- Delete: `.cursor/skills/lms-mobile-components/`
- Modify: `.agents/skills/component-types-colocation/SKILL.md`
- Modify: `.claude/settings.local.json`
- Modify: `.dockerignore`

**Interfaces:**
- Produces: no agent-config references to the absent mobile app or to source-tree absolute paths.

- [ ] **Step 1: Delete the mobile-only Cursor skill**

```bash
cd "C:/COURSES/work/darnozom/academy"
rm -rf ".cursor/skills/lms-mobile-components"
```

- [ ] **Step 2: Fix the mobile reference in the component-types-colocation skill**

```bash
grep -n "lms-mobile" ".agents/skills/component-types-colocation/SKILL.md"
```

Read the surrounding context and remove the sentence/reference to `apps/lms-mobile` and to the now-deleted `lms-mobile-components` skill, leaving the rest of the skill's guidance (about `apps/client`) intact.

- [ ] **Step 3: Strip source-absolute paths from `.claude/settings.local.json`**

```bash
grep -n "lms-organization\|lms-mobile" ".claude/settings.local.json"
```

Remove any permission entries or path references pointing at `c:\COURSES\work\_LMS\lms-organization\...` or `apps\lms-mobile\...` — these were granted against the source repo and are meaningless (and potentially misleading) in the target.

- [ ] **Step 4: Remove mobile rules from `.dockerignore`**

```bash
grep -n "lms-mobile" .dockerignore
```

Remove the three `apps/lms-mobile/**` rules found there.

- [ ] **Step 5: Verify git remote is empty**

```bash
git remote -v
```

Expected: no output. If the copy somehow introduced a remote (it shouldn't, since `.git/` was excluded from the copy — this is a sanity check, not an expected fix), remove it:
```bash
git remote remove origin 2>/dev/null || true
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Config hygiene: drop mobile-only skills, source-absolute paths

Deletes .cursor/skills/lms-mobile-components, removes the mobile
reference from the component-types-colocation skill, strips
source-repo-absolute paths from .claude/settings.local.json, and
removes the three apps/lms-mobile/** rules from .dockerignore. Confirms
the git remote list stays empty (never inherited the source's origin).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Gate:** `.cursor/skills/lms-mobile-components` absent; no `lms-mobile` or source-absolute path references remain in `.agents/`, `.claude/`, or `.dockerignore`; `git remote -v` empty.

---

## Task 12: Full verification pass

**Files:**
- None (verification only; fixes applied inline if anything fails)

**Interfaces:**
- Consumes: the fully-ported, rebranded, discussion-free codebase from Tasks 1–11.
- Produces: a verified-working `darnozom-academy`.

- [ ] **Step 1: Clean install**

```bash
cd "C:/COURSES/work/darnozom/academy"
rm -rf node_modules apps/client/node_modules apps/server/node_modules lib/shared-types/node_modules
pnpm install
```

Expected: exit 0.

- [ ] **Step 2: Build both apps**

```bash
nx build server
nx build client
```

Expected: both exit 0.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: exit 0 (or only pre-existing warnings unrelated to this port — read any failures and fix if they trace to a port edit).

- [ ] **Step 4: Run existing test suites**

```bash
nx run-many -t test --exclude=darnozom-academy
```

Expected: all pass. Confirm no test references the deleted discussion module (none should, since its own spec files were deleted in Task 3).

- [ ] **Step 5: Seed a fresh database end to end**

```bash
pnpm --filter server run seed
```

Expected: completes with no errors (this re-confirms Task 7's seed gate against the final rebranded state).

- [ ] **Step 6: Manual smoke test**

Start both apps (`nx serve server`, `nx serve client` or equivalent dev scripts) and in a browser verify:
- signup, login, OAuth entry point work
- organization dashboard: courses, enrollments, attendance, grades, wallet, users all load
- student dashboard: courses, attendance, wallet, chat, AI assistant all load
- parent dashboard: children, enrollment, wallet all load
- main admin dashboard: organizations, plans, roles, verifications, withdrawal requests all load
- public pages: courses, instructors, pricing, an org page at `/x/[slug]` all render
- books store: `/books` lists products from Medusa, add to cart, `/cart`, `/checkout` all work
- no discussion UI is reachable anywhere in the course/module/content flows (no discussion tab, panel, or column visible)
- every page shows "darnozom" branding, never "safeer"

- [ ] **Step 7: Final repo-wide checks**

```bash
grep -ril "safeer" apps lib --include="*.ts" --include="*.tsx" --include="*.json" 2>/dev/null
grep -ril "discussion" apps/server/src apps/client/src lib/shared-types/src 2>/dev/null
git remote -v
```

Expected: first two produce no output; third produces no output.

- [ ] **Step 8: Tag the completed port**

```bash
git tag darnozom-academy-port-complete
git log --oneline pre-darnozom-port..darnozom-academy-port-complete
```

**Gate:** every check in Steps 1–7 passes. This is the final gate of the whole plan.

---

## Post-plan: recorded for the next spec (not implemented here)

Per the spec (§11), the native book module — replacing the transitional Medusa data layer with academy's own per-organization, physical+digital book/order module across all three payment paths and both admin surfaces — is **out of scope for this plan** and gets its own design → spec → plan cycle. Do not start it as part of this plan's execution.
