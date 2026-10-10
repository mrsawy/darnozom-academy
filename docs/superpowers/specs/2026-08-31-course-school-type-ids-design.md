# Course School Type IDs (Multi) Design

**Date:** 2026-08-31  
**Scope:** NestJS course/school-type (`apps/server`), web client course form/filters/display (`apps/client`), mobile course types/filters/display (`apps/lms-mobile`), shared course types/DTOs as needed.  
**Out of scope:** Instructor `schoolTypesIds` (already multi); building a new mobile course create/edit form.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Storage | Rename to `schoolTypeIds: ObjectId[]`; migrate legacy single `schoolTypeId` |
| Filter match | OR — course matches if it has **any** selected school type (`$in`) |
| API shape | Always `schoolTypeIds` + populated `schoolTypes` (arrays; empty if none) |
| Client/mobile read compat | Normalize legacy `schoolTypeId` / `schoolType` into arrays when present |
| Approach | Canonical rename + one-time migration (not dual-field forever) |

## Problem

Courses store a single optional `schoolTypeId` and expose a singular `schoolType` virtual. Organizations need to tag a course with multiple school types. Legacy documents and payloads must still display correctly during and after migration.

## Data model (server)

### Entity (`course.entity.ts`)

- Replace:

```ts
schoolTypeId?: Types.ObjectId | null;
```

- With:

```ts
schoolTypeIds?: Types.ObjectId[]; // default []
```

- Virtual: rename `schoolType` → `schoolTypes`, `localField: 'schoolTypeIds'`, `justOne: false`.

### Migration

One-time Mongo migration:

1. Documents with scalar `schoolTypeId` (ObjectId) → set `schoolTypeIds: [schoolTypeId]`.
2. Documents with `schoolTypeId: null` / missing and no `schoolTypeIds` → set `schoolTypeIds: []`.
3. Documents that already have `schoolTypeIds` → leave as-is.
4. `$unset` `schoolTypeId`.

Script location: `apps/server/src/database/migrations/` (same pattern as other course/user migrations). Idempotent where possible.

### DTOs

- `CreateCourseDto` / update path: `schoolTypeIds?: string[]` with `@IsMongoId({ each: true })` `@IsOptional()`.
- Empty array or omit = no school types.
- Do not accept write of singular `schoolTypeId` on new API (read-side filter legacy only).

### Validation

Extend `assertGradeAndSchoolTypeExist` to accept `schoolTypeIds?: string[] | null` and verify each id exists (`exists` / `$in` count). Throw `SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND` if any missing.

### Queries & populate

- Course list/filter (`CourseFilters`): prefer `schoolTypeIds` (array or CSV). Build:

```ts
query.schoolTypeIds = { $in: objectIds };
```

- Briefly accept legacy filter param `schoolTypeId` and map to the same `$in`.
- All `.populate('schoolType')` → `.populate('schoolTypes')`.
- Featured course aggregation: `$lookup` on `schoolTypeIds` → `schoolTypes` (array of `{ _id, nameEn, nameAr }`), not a single object.
- School type delete: `countDocuments({ schoolTypeIds: schoolType._id })` (or `$in`) instead of equality on `schoolTypeId`.
- Seeds/fixtures: write `schoolTypeIds`.

### Pending updates / admin review

Mirror course fields as `schoolTypeIds` / `schoolTypes` in pending-update and admin-review shapes. Consumers use the same normalize helper on read.

## Client (`apps/client`)

### Types & schema

- `ICourse`: `schoolTypeIds?: string[]`, `schoolTypes?: ILocalizedLookup[]`; keep optional legacy `schoolTypeId` / `schoolType` for read-compat only.
- Yup: `schoolTypeIds` optional `Yup.array().of(Yup.string())`.
- `ICourseFilters`: `schoolTypeIds?: string[]` (replace or supersede singular `schoolTypeId`).

### Normalize helper

Shared util (e.g. `normalizeCourseSchoolTypes(course)`):

- Input may have `schoolTypeIds` / `schoolTypes` and/or legacy singular fields.
- Output always `{ schoolTypeIds: string[]; schoolTypes: ILocalizedLookup[] }`.
- Singular id → one-element array; singular populated object → one-element array; missing → `[]`.

### Course form

- `CourseGradeSchoolTypeSection`: MultiSelect for school types (independent of grade; empty allowed).
- Form state / submit: `schoolTypeIds` JSON (same FormData pattern as today).
- Load: seed from normalized ids.

### Display & filters

- Course card, single-course header, admin course details: render all school types as badges; hide when empty.
- Public courses filters: send selected values as `schoolTypeIds` (multi-select preferred; a single chip still sends a one-element array). Chip removal clears that id from the array.
- Grade filter remains single `gradeId`.

## Mobile (`apps/lms-mobile`)

- No course create/edit form today — **do not** add one in this work.
- Update `ICourse` types: plural fields + legacy singular optional.
- Course card and `[courseId]` detail: show all school types via normalize helper.
- Browse course filters already use `schoolTypeIds` multi-select — ensure API/query wiring uses OR `$in` against course `schoolTypeIds`.
- Instructor filters unchanged except shared plumbing if any.

## Error handling

- Invalid / unknown school type ids on create/update → `BadRequestException(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND)`.
- Delete school type still in use by any course → `ConflictException(SchoolTypeErrors.SCHOOL_TYPE_IN_USE_CANNOT_DELETE)`.
- No new user-facing message keys required unless copy changes; reuse existing school-type error enums.

## Testing

- Extend `course.grade-school-type.spec.ts` for multi-id validation (all exist / one missing / empty).
- Filter builder: `$in` for one and many ids; legacy `schoolTypeId` maps correctly.
- Migration cases: scalar → `[id]`, null → `[]`, already array, then unset.
- Normalize helper: singular, plural, mixed, empty.

## Rollout

1. Deploy migration + server entity/DTO/query/populate/delete-guard changes.
2. Deploy client + mobile in the same change set so writers use `schoolTypeIds` and readers use `schoolTypes` (+ normalize).
3. Keep server acceptance of filter `schoolTypeId` briefly for old bookmarks/URLs; remove in a follow-up once unused.

## Non-goals

- Changing grade to multi-select.
- Migrating instructor school-type fields (already `schoolTypesIds`).
- Mobile org course authoring UI.
