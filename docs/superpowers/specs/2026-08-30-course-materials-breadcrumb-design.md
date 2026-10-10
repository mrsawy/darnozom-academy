# Course Materials Breadcrumb Navigation Design

**Date:** 2026-08-30  
**Scope:** Web client (`apps/client`) — organization dashboard course hierarchy pages and student dashboard course viewing pages.  
**Out of scope:** Main-admin org course pages, mobile app (`apps/lms-mobile`), changes to student course sidebar / prev-next content nav.

---

## 1. Purpose

Nested course material pages (course → module → content on org; course → content on student) currently lack a clear way to climb the hierarchy. Users rely on browser back or sidebar/tables. This design adds a shared breadcrumb trail with real entity titles so users can jump to any ancestor level in one click.

---

## 2. Approach

**Shared `CourseBreadcrumb` molecule** built on existing `components/atoms/breadcrumb` primitives.

- Pages (or shells that already hold the data) pass a typed items array; the molecule does not fetch.
- Entity labels use real titles from data already loaded on the page.
- Static segments (`Courses`, `My Courses`, `Modules`, etc.) use i18n keys.
- All links use `@/i18n/navigation` `Link` and route constants from `routes.constants.ts`.

Rejected alternatives:

- Route-aware auto-breadcrumb (extra fetches, brittle across org vs student URL shapes).
- Separate one-off headers per surface (duplication and drift).

---

## 3. Component API

**Location:** `apps/client/src/components/molecules/course-breadcrumb/course-breadcrumb.tsx`  
(Export from molecules index if that is the local pattern.)

```ts
interface CourseBreadcrumbItem {
  label: string;
  href?: string; // omit on the current (last) item
}

interface CourseBreadcrumbProps {
  items: CourseBreadcrumbItem[];
  className?: string;
}
```

Behavior:

- Render with existing `Breadcrumb` / `BreadcrumbList` / `BreadcrumbItem` / `BreadcrumbLink` / `BreadcrumbPage` / `BreadcrumbSeparator`.
- Items with `href` → `BreadcrumbLink asChild` + `Link`; last item (or items without `href`) → `BreadcrumbPage`.
- Long labels: truncate with CSS ellipsis (`max-w` + `truncate`); full label via `title` attribute for hover.
- RTL: rely on layout direction; use `ChevronLeft` as separator when locale is `ar` (or mirror via existing locale patterns), so the trail reads correctly in Arabic.

Placement: top of the main content area on each target page, above the page title/form — not inside the student sidebar.

---

## 4. Trails by page

### Organization dashboard

| Page | Trail |
|------|--------|
| Course edit (`/courses/[id]`) | `Courses › {courseTitle}` |
| Modules list (`/courses/[id]/modules`) | `Courses › {courseTitle} › Modules` |
| Module edit (`/courses/[id]/modules/[moduleId]`) | `Courses › {courseTitle} › {moduleTitle}` |
| Content list (`.../modules/[moduleId]/content`) | `Courses › {courseTitle} › {moduleTitle} › Contents` |
| Content edit | `Courses › {courseTitle} › {moduleTitle} › {contentTitle}` |
| Content add-new | `Courses › {courseTitle} › {moduleTitle} › New content` |
| Live call | `Courses › {courseTitle} › {moduleTitle} › {contentTitle} › Live call` |

Link targets:

- `Courses` → `ROUTE_ORG_COURSES`
- `{courseTitle}` → `ROUTE_ORG_COURSE_DETAILS(courseId)`
- `{moduleTitle}` → module edit route (add constant if missing)
- `{contentTitle}` → `ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT(...)`
- Intermediate static crumbs (`Modules`, `Contents`) link to modules list / content list routes (add constants if missing)
- Current page: no `href`

### Student dashboard

| Page | Trail |
|------|--------|
| Course overview (`/student-dashboard/courses/[id]`) | `My Courses › {courseTitle}` |
| Content view (`.../[id]/[contentId]`) | `My Courses › {courseTitle} › {contentTitle}` |
| Live call | `My Courses › {courseTitle} › {contentTitle} › Live call` |

Link targets:

- `My Courses` → `ROUTE_STUDENT_COURSES`
- `{courseTitle}` → `ROUTE_STUDENT_COURSE(enrollmentId)`
- `{contentTitle}` → `ROUTE_STUDENT_COURSE_CONTENT(enrollmentId, contentId)`
- Current page: no `href`

Module is omitted on student trails (URL has no module segment; sidebar already supports module browsing).

---

## 5. Data wiring

- No new API calls. Use titles already available from existing page loaders / hooks (`getCourse`, `getModule`, `getContent`, `useDetailedEnrolledCourse`, `useSingleContentInEnrollment`, etc.).
- Prefer wiring at the page or immediate form/view wrapper that already receives the entities.
- Student content pages may render the crumb in the content view / layout client when course + content titles are already in hand.
- If a parent title is briefly unavailable, omit that crumb or show a short fallback only when unavoidable; prefer waiting until the existing query has data (same loading UX as the page).

---

## 6. Routes

Ensure (or add) constants in `apps/client/src/lib/data/constants/routes.constants.ts` for any org module/content list paths still using string literals, e.g.:

- Org modules list: `/organization-dashboard/courses/${courseId}/modules`
- Org module detail: `/organization-dashboard/courses/${courseId}/modules/${moduleId}`
- Org module content list: `/organization-dashboard/courses/${courseId}/modules/${moduleId}/content`

Use those constants in breadcrumb `href`s and, where touched, replace nearby hard-coded course URLs (only in files already being edited for crumbs).

---

## 7. Internationalization

Add keys under a shared namespace (e.g. `CourseBreadcrumb`) in `en.json` and `ar.json`:

| Key | EN (indicative) |
|-----|-----------------|
| `courses` | Courses |
| `myCourses` | My Courses |
| `modules` | Modules |
| `contents` | Contents |
| `newContent` | New content |
| `liveCall` | Live call |

Entity titles are displayed as returned by the API (not translated).

---

## 8. Success criteria

- From any listed nested course page, the user can navigate to any ancestor level via the breadcrumb in one click.
- Crumbs show real course / module / content titles when those entities are loaded.
- Works in English and Arabic (RTL-friendly separators and layout).
- No extra network requests solely for breadcrumbs.

---

## 9. Testing (manual)

- Org: walk Courses → course → modules → module → content list → content edit → live call; click each crumb level.
- Student: My Courses → course → content → live call; click each crumb level.
- Verify AR locale trail direction and truncated long titles.
