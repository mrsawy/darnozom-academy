# Instructor grade/subject/school-type + unified filter system

**Date:** 2026-07-23
**Status:** Approved design — ready for implementation planning

## Problem

The web instructors page has working filters (search, minimum rating, subject/category), but
the mobile instructors tab has **search only** — even though the same instructor data supports
more. Separately, the server's instructor filtering is built inconsistently and duplicated
across callers, which is what makes mobile parity awkward today.

Additionally, instructors have no way to declare the **grades** and **school types** they teach.
Only `categoriesIds` (their subjects) exists on the entity, and it is set exclusively through
the web admin/self user-form.

## Goals

1. Give the mobile instructors tab real filters: subject + grade + school-type + rating.
2. Add `gradesIds` and `schoolTypesIds` (both multi-select) to the instructor entity, editable
   by instructors on web (admin + self modes).
3. Centralize and de-duplicate the server-side instructor filter construction behind a validated
   flat DTO, removing raw-Mongo-query building from clients.
4. Reach web/mobile filter parity for instructors.

## Non-goals (deferred)

- **Sort** (top-rated / most-students / most-courses). Cheap server-side but adds UI to all three
  surfaces; ship filters first, treat sort as a fast follow.
- **Mobile edit UI.** The mobile app is learner-facing and has no profile-editing surface at all.
  Instructors edit grade/subject/school-type on **web only**. Mobile gets filters only.
- Course filters. Courses already use the clean pattern (flat filters → server builds the query);
  no change needed there.

## Key decisions (resolved during brainstorming)

- **"Subject" reuses the existing `categoriesIds`** — no new entity. UI labels it "Subject" for
  instructors. Grade and school-type are the genuinely new fields.
- **Grade and school-type are multi-select** on the instructor (an instructor can teach several
  grades and several school types).
- **Filter semantics:** an instructor matches if *any* of their grades / school-types / subjects
  is in the selected set (`$in`).
- **Edit surface:** web user-form only (admin + self). No mobile edit screen.

## Current state (grounding)

- **Entity** `apps/server/src/user/entities/user.entity.ts`: instructor has
  `categoriesIds: ObjectId[]` (ref `Category`, instructor-only validator, populate virtual).
  `Grade` and `SchoolType` are standalone collections (`nameEn`/`nameAr`).
- **Two entry points into `InstructorService.findAll`:**
  - NATS `instructors.findAll` (`instructor.controller.message.ts`) — used by web server action
    `findInstructors`, which builds raw `$or`/`averageCoursesRating`/`categoriesIds` operators
    **client-side and unescaped**, passed straight through.
  - HTTP `GET /instructor` (`instructor.controller.http.ts`) — used by mobile, builds an escaped
    `$or` search **server-side**, search only.
  - The service accepts an arbitrary `mongoose.RootFilterQuery` and merges it into its `$match`.
- **Shared DTO** `lib/shared-types/src/lib/dto/user/create-user.dto.ts`: `CreateUserDto` has
  `categoriesIds?: string[]` guarded by `MustBeEmptyWhen(roleName !== INSTRUCTOR)`. Update paths
  use `Partial<CreateUserDto>`, so update inherits new fields automatically.
- **Web filters** `.../instructors/__sections/instructors-header.tsx` with `FiltersDrawer` +
  `CategoryFilterField`/`RatingFilterField`, URL-synced, active-filter chips.
- **Web edit** `components/organs/user-form/components/basic-tab.tsx` — `CategoryCombobox` shown
  for instructors when `!isSelf`. Supports a `self` mode.
- **Mobile instructors** `components/organs/courses/browse-tabs/InstructorsTab.tsx` — search only.
  Mobile courses (`CoursesTab.tsx` + `course-filters.tsx`) is the pattern to mirror: filter modal,
  active chips, `useGrades`/`useSchoolTypes` hooks already exist on mobile.

## Design

### Phase 1 — Server foundation

**1a. Entity fields.** Add to `User` two instructor-only array props mirroring `categoriesIds`:

```ts
gradesIds:      ObjectId[]  // ref 'Grade',      default [], instructor-only validator
schoolTypesIds: ObjectId[]  // ref 'SchoolType', default [], instructor-only validator
```

Add populate virtuals (`grades`, `schoolTypes`) alongside the existing `categories` virtual, and
extend the `findAll` aggregation with `$lookup`s for grades and schoolTypes so they populate on
read the way categories do. Ensure the new fields are excluded from raw projection the same way
`categoriesIds` is, and the populated arrays are returned.

**1b. Shared-types.** In `CreateUserDto`, add `gradesIds?: string[]` and `schoolTypesIds?: string[]`,
each `@IsOptional @IsArray @IsMongoId({each:true})` and guarded by
`MustBeEmptyWhen(roleName !== INSTRUCTOR)` — identical to `categoriesIds`. Add the same optional
fields (plus populated `grades`/`schoolTypes`) to the instructor/user read interface(s) in
shared-types so web and mobile types line up.

**1c. `FindInstructorsDto` + centralized query building.** New validated DTO:

```ts
class FindInstructorsDto {
  search?: string;              // @IsOptional @IsString
  minRating?: number;           // @IsOptional @Type(()=>Number) @IsNumber @Min(0) @Max(5)
  categoryIds?: string[];       // @IsOptional @IsArray @IsMongoId({each:true})
  gradeIds?: string[];          // same
  schoolTypeIds?: string[];     // same
  page?: number;                // @IsOptional @Type(()=>Number) @IsInt @Min(1)
  limit?: number;               // @IsOptional @Type(()=>Number) @IsInt @Min(1)
}
```

Validation lives in the DTO (per the repo `validate-in-dto` rule). Query strings that arrive as
CSV or repeated params are normalized to arrays at the DTO/controller boundary.

Move all Mongo `$match` construction into a single place in `InstructorService.findAll` (or a small
private `buildInstructorMatch(dto)` helper on the service):

- `search` → escaped `$or` regex over firstName/lastName/email/username (escaping centralized here).
- `minRating` → `averageCoursesRating: { $gte: n }` (numeric-guarded).
- `categoryIds` → `categoriesIds: { $in }`.
- `gradeIds` → `gradesIds: { $in }`.
- `schoolTypeIds` → `schoolTypesIds: { $in }`.

`findAll` now takes the flat DTO, not a raw filter query.

**1d. Both controllers use the DTO.** The NATS message controller and the HTTP controller both
accept `FindInstructorsDto` and pass it to the service. **Neither constructs Mongo operators.** This
removes the duplication and the unescaped-regex path on the web side.

**1e. Update path.** `user.updateOwnData` and `users.organizationUpdateUser` already take
`Partial<CreateUserDto>`, so once 1b lands they accept `gradesIds`/`schoolTypesIds` for instructors
with the same instructor-only guard. No new endpoint.

### Phase 2 — Web

**2a. Action.** `findInstructors` (`lib/actions/instructors/getInstructors.action.ts`) stops building
`mongoFilters` and sends the flat DTO shape: `{ search, minRating, categoryIds, gradeIds,
schoolTypeIds, page, limit }`.

**2b. Filter types + UI.** Extend `IInstructorFilters` with `gradeIds?: string[]` and
`schoolTypeIds?: string[]` (keep `selectedCategory` as the subject; may generalize to
`categoryIds` for multi — decide in plan, but web currently single-category so single is fine and
maps to `categoryIds: [selectedCategory]`). In `instructors-header.tsx`:

- Add Grade (multi) and School-type (multi) filter fields to the `FiltersDrawer` next to the
  existing Subject + Rating fields. Reuse/extend the `filter-fields` module; relabel category as
  "Subject".
- Extend URL param parse/serialize (`parseFiltersFromParams` / `buildSearchParams`) and the active
  filter chips + remove-filter handlers for the two new params.

**2c. Edit UI.** In `user-form/components/basic-tab.tsx`, add Grade (multi) and School-type (multi)
pickers shown for instructors, and expose the Subject/category picker in **self** mode too (today
it is `!isSelf` only). Update the Yup schema (`lib/schema/user.schema.ts`) and form data types to
carry `gradesIds`/`schoolTypesIds`, and ensure the update mutation submits them.

### Phase 3 — Mobile (filters only)

**3a. Action + type.** `lib/action/instructor.action.ts`: extend `InstructorFilters` with
`minRating?`, `categoryIds?`, `gradeIds?`, `schoolTypeIds?` and append them to the request params
(matching the server DTO / HTTP query contract).

**3b. Dedicated filter modal.** New `components/organs/courses/browse-tabs/instructor-filters.tsx`,
structured like `course-filters.tsx`:

- Subject via `SearchableSelect` over categories (by `_id`).
- Grade multi-select and School-type multi-select using `useGrades`/`useSchoolTypes`
  (localized labels via `localizedLookupName`).
- Rating buttons (3/4/5), reusing the courses pattern.
- Reset + Apply footer.

**3c. Wire into `InstructorsTab`.** Add the filter button + `Modal` hosting the new modal, active
filter chips + remove-filter, mirroring `CoursesTab`. Keep the existing search input. Feed the
selected filters into `useInstructors`.

## Testing

- **Server:** unit-test `buildInstructorMatch`/`findAll` for each filter and combinations
  (`$in` intersection semantics, escaped search, rating gte, populated grades/schoolTypes). Verify
  both controllers produce identical results for equal inputs. Verify update rejects
  grades/schoolTypes for non-instructor roles.
- **Web:** filter drawer applies/removes each param and reflects in URL; edit form persists
  grades/schoolTypes; instructor list narrows correctly.
- **Mobile:** modal applies each filter, chips add/remove, list narrows; parity with web for the
  same selections.

## Implementation order

Phase 1 (server) → Phase 2 (web) → Phase 3 (mobile). Each phase is independently testable; web and
mobile both depend on the Phase 1 DTO/entity contract.
