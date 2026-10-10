# Course School Type IDs (Multi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Courses can be associated with multiple school types (`schoolTypeIds` / `schoolTypes`), with a DB migration from legacy singular `schoolTypeId`, OR filter matching, and client/mobile display + form/filter updates that still accept legacy singular payloads when reading.

**Architecture:** Rename the course field to an ObjectId array (matching instructor `schoolTypesIds` style), migrate existing documents, update validation/populate/`$in` filters/featured lookup/delete guards. Clients normalize singular→array on read; org course form and public filters write/send plural arrays.

**Tech Stack:** NestJS + Mongoose, Next.js (client), Expo (lms-mobile), Yup, React Hook Form, MultipleSelector.

**Spec:** `docs/superpowers/specs/2026-08-31-course-school-type-ids-design.md`

## Global Constraints

- Storage field name: `schoolTypeIds` (array); populated virtual: `schoolTypes`
- Filter match: OR via `schoolTypeIds: { $in: [...] }`
- API always returns arrays (empty if none); clients may still receive legacy singular during rollout and must normalize
- Do **not** build a mobile course create/edit form
- Do **not** change instructor `schoolTypesIds` or make grade multi on the server
- No new i18n error keys; reuse `SchoolTypeErrors`
- URL string literals via `routes.constants.ts` only if new routes are added (none expected)
- Prefer `pnpm nx` / `pnpm --filter` for tests

## File map

| File | Responsibility |
|------|----------------|
| `apps/server/src/course/entities/course.entity.ts` | `schoolTypeIds` prop + `schoolTypes` virtual |
| `apps/server/src/course/dto/create-course.dto.ts` | Accept `schoolTypeIds?: string[]` |
| `apps/server/src/utils/types/CourseFilters.ts` | `schoolTypeIds` + legacy `schoolTypeId` |
| `apps/server/src/course/services/course.service.ts` | Validate, filter `$in`, populate `schoolTypes` |
| `apps/server/src/course/services/course.grade-school-type.spec.ts` | Multi-id validation tests |
| `apps/server/src/course/services/course.featured.service.ts` | `$lookup` → `schoolTypes` array |
| `apps/server/src/course/types/featured-course.interface.ts` | `schoolTypes` array type |
| `apps/server/src/school-type/school-type.service.ts` | Delete guard on `schoolTypeIds` |
| `apps/server/src/admin-review/services/admin-review.service.ts` | Populate `schoolTypes` |
| `apps/server/src/database/migrations/migrate-course-school-type-ids.ts` | Scalar → array migration |
| `apps/server/package.json` | `migrate:course-school-type-ids` script |
| `apps/server/src/database/seeds/seed.ts` | Seed `schoolTypeIds` |
| `apps/client/src/lib/utils/course/normalize-course-school-types.ts` | Read-compat helper |
| `apps/client/src/lib/utils/course/normalize-course-school-types.test.ts` | Helper unit tests |
| `apps/client/src/lib/types/course/course.interface.ts` | Plural + legacy optional |
| `apps/client/src/lib/types/course/ICourseFilters.ts` | `schoolTypeIds?: string[]` |
| `apps/client/src/lib/schema/course.schema.ts` | Yup `schoolTypeIds` |
| `apps/client/.../course-grade-school-type-section.tsx` | MultiSelect UI |
| `apps/client/.../course-form.tsx` | State/submit `schoolTypeIds` |
| `apps/client/.../course-card.tsx` + headers/dialogs | Multi badges |
| `apps/client/.../courses-header.tsx` | Multi filter + chips |
| `apps/client/.../admin-review.interface.ts` | `schoolTypes` on reviewable course |
| `apps/lms-mobile/lib/types/course/ICourse.interface.tsx` | Plural + legacy |
| `apps/lms-mobile/lib/utils/normalize-course-school-types.ts` | Same normalize helper |
| `apps/lms-mobile/.../course-card.tsx` + `[courseId].tsx` | Multi display |
| `apps/lms-mobile/lib/action/course.action.ts` | Serialize `schoolTypeIds` as CSV if needed |

---

### Task 1: Server entity + DTO + CourseFilters

**Files:**
- Modify: `apps/server/src/course/entities/course.entity.ts` (prop ~170–171, virtual ~362–367)
- Modify: `apps/server/src/course/dto/create-course.dto.ts` (~224–230)
- Modify: `apps/server/src/utils/types/CourseFilters.ts`

**Interfaces:**
- Produces: `Course.schoolTypeIds?: Types.ObjectId[]` default `[]`
- Produces: virtual `schoolTypes` (`justOne: false`)
- Produces: DTO `schoolTypeIds?: string[]`
- Produces: `ICourseFilters.schoolTypeIds?: string | string[]` and legacy `schoolTypeId?: string`

- [ ] **Step 1: Update entity prop**

Replace the singular prop with:

```ts
@Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'SchoolType', required: false, default: [] })
schoolTypeIds?: Types.ObjectId[];
```

- [ ] **Step 2: Update virtual**

```ts
CourseSchema.virtual('schoolTypes', {
  ref: 'SchoolType',
  localField: 'schoolTypeIds',
  foreignField: '_id',
  justOne: false,
});
```

Remove the old `schoolType` virtual.

- [ ] **Step 3: Update CreateCourseDto**

Replace `schoolTypeId` with:

```ts
@IsMongoId({ each: true })
@IsOptional()
schoolTypeIds?: string[];
```

(Ensure `IsArray` is used if other array MongoId fields in this file use it — mirror `categoriesIds` style in the same DTO.)

- [ ] **Step 4: Update CourseFilters**

```ts
gradeId?: string;
/** Preferred multi filter (CSV string or array). OR match via $in. */
schoolTypeIds?: string | string[];
/** @deprecated Prefer schoolTypeIds; mapped to $in for old URLs. */
schoolTypeId?: string;
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/course/entities/course.entity.ts apps/server/src/course/dto/create-course.dto.ts apps/server/src/utils/types/CourseFilters.ts
git commit -m "feat(server): store course schoolTypeIds as ObjectId array"
```

---

### Task 2: Validation helper + unit tests (TDD)

**Files:**
- Modify: `apps/server/src/course/services/course.grade-school-type.spec.ts`
- Modify: `apps/server/src/course/services/course.service.ts` (`assertGradeAndSchoolTypeExist`, create/update call sites)

**Interfaces:**
- Produces: `assertGradeAndSchoolTypeExist(gradeId?: string | null, schoolTypeIds?: string[] | null): Promise<void>`
- Behavior: skip when `schoolTypeIds` is null/undefined/empty; otherwise require every id to exist; throw `SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND` if any missing

- [ ] **Step 1: Rewrite failing/updated tests first**

Change the helper cast and cases to pass arrays:

```ts
const assertExist = (gradeId?: string | null, schoolTypeIds?: string[] | null) =>
  (
    service as unknown as {
      assertGradeAndSchoolTypeExist: (g?: string | null, s?: string[] | null) => Promise<void>;
    }
  ).assertGradeAndSchoolTypeExist(gradeId, schoolTypeIds);

it('passes when schoolTypeIds is empty', async () => {
  await expect(assertExist(null, [])).resolves.toBeUndefined();
  expect(schoolTypeExists).not.toHaveBeenCalled();
});

it('validates each school type id', async () => {
  schoolTypeExists.mockResolvedValue({ _id: 'st' });
  await expect(assertExist(null, ['st-1', 'st-2'])).resolves.toBeUndefined();
  expect(schoolTypeExists).toHaveBeenCalledTimes(2);
});

it('throws when any school type id is missing', async () => {
  schoolTypeExists.mockResolvedValueOnce({ _id: 'st-1' }).mockResolvedValueOnce(null);
  await expect(assertExist(null, ['st-1', 'missing'])).rejects.toThrow(
    SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND
  );
});
```

Update the old single-string cases to use `['st-1']` instead of `'st-1'`.

- [ ] **Step 2: Run tests — expect FAIL until implementation**

```bash
pnpm --filter server exec jest src/course/services/course.grade-school-type.spec.ts
```

Expected: FAIL (signature / call mismatch or old implementation).

- [ ] **Step 3: Implement validation**

```ts
private async assertGradeAndSchoolTypeExist(
  gradeId?: string | null,
  schoolTypeIds?: string[] | null
) {
  if (gradeId) {
    const grade = await this.gradeModel.exists({ _id: gradeId });
    if (!grade) throw new BadRequestException(GradeErrors.GRADE_NOT_FOUND);
  }
  if (schoolTypeIds && schoolTypeIds.length > 0) {
    for (const id of schoolTypeIds) {
      const schoolType = await this.schoolTypeModel.exists({ _id: id });
      if (!schoolType) throw new BadRequestException(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND);
    }
  }
}
```

Update create/update call sites:

```ts
await this.assertGradeAndSchoolTypeExist(createCourseDto.gradeId, createCourseDto.schoolTypeIds);
// and updateCourseDto.schoolTypeIds
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter server exec jest src/course/services/course.grade-school-type.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/course/services/course.service.ts apps/server/src/course/services/course.grade-school-type.spec.ts
git commit -m "feat(server): validate course schoolTypeIds array on create/update"
```

---

### Task 3: Course findAll filters + populate paths

**Files:**
- Modify: `apps/server/src/course/services/course.service.ts` (findAll destructuring ~151, filter ~265–267, all `populate('schoolType')`)
- Modify: `apps/server/src/admin-review/services/admin-review.service.ts` (populate arrays ~401, ~425)

**Interfaces:**
- Consumes: `options.schoolTypeIds` and legacy `options.schoolTypeId`
- Produces: query `schoolTypeIds: { $in: ObjectId[] }` when any ids present

- [ ] **Step 1: Normalize filter ids in `findAll`**

Replace singular destructure/filter with:

```ts
schoolTypeId, // legacy
schoolTypeIds,
// ...
const rawSchoolTypeIds = [
  ...(Array.isArray(schoolTypeIds)
    ? schoolTypeIds
    : typeof schoolTypeIds === 'string'
      ? schoolTypeIds.split(',')
      : []),
  ...(schoolTypeId ? [schoolTypeId] : []),
]
  .map((id) => (typeof id === 'string' ? id.trim() : id))
  .filter((id): id is string => typeof id === 'string' && mongoose.isValidObjectId(id));

if (rawSchoolTypeIds.length > 0) {
  query.schoolTypeIds = {
    $in: rawSchoolTypeIds.map((id) => new mongoose.Types.ObjectId(id)),
  };
}
```

(Mirror the existing `categoryIds` CSV/array parsing style in the same method.)

- [ ] **Step 2: Replace every populate path**

In `course.service.ts` and `admin-review.service.ts`, change `'schoolType'` → `'schoolTypes'` (including select blocks that used `path: 'schoolType'`).

- [ ] **Step 3: Smoke-check compile / unit tests already covering validation**

```bash
pnpm --filter server exec jest src/course/services/course.grade-school-type.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/course/services/course.service.ts apps/server/src/admin-review/services/admin-review.service.ts
git commit -m "feat(server): filter and populate course schoolTypes as array"
```

---

### Task 4: Featured aggregation + delete guard + seeds

**Files:**
- Modify: `apps/server/src/course/services/course.featured.service.ts` (`buildGradeAndSchoolTypeLookupStages`, projections that list `schoolTypeId`)
- Modify: `apps/server/src/course/types/featured-course.interface.ts`
- Modify: `apps/server/src/school-type/school-type.service.ts` (`remove` countDocuments)
- Modify: `apps/server/src/database/seeds/seed.ts` (course seed ~431)

**Interfaces:**
- Produces: featured course `schoolTypes?: FeaturedCourseLocalizedLookup[]`
- Delete guard: `countDocuments({ schoolTypeIds: schoolType._id })`

- [ ] **Step 1: Update featured lookup stages**

Replace the school-type `$lookup` / `$addFields` so `schoolTypes` stays an array of `{ _id, nameEn, nameAr }` (map `$schoolType` lookup results), not a single object. Keep `grade` singular as today.

Example shape:

```ts
{ $lookup: { from: 'schooltypes', localField: 'schoolTypeIds', foreignField: '_id', as: 'schoolTypes' } },
{
  $addFields: {
    schoolTypes: {
      $map: {
        input: '$schoolTypes',
        as: 'st',
        in: { _id: '$$st._id', nameEn: '$$st.nameEn', nameAr: '$$st.nameAr' },
      },
    },
  },
},
```

Update projections `schoolTypeId: 1` → `schoolTypeIds: 1`.

- [ ] **Step 2: Update FeaturedCourse interface**

```ts
schoolTypes?: FeaturedCourseLocalizedLookup[];
```

Remove singular `schoolType` (or keep optional deprecated — prefer remove for featured-only type).

- [ ] **Step 3: Delete guard**

```ts
const referencingCourses = await this.courseModel.countDocuments({
  schoolTypeIds: schoolType._id,
});
```

- [ ] **Step 4: Seed courses with array**

```ts
schoolTypeIds:
  schoolTypeIds.length > 0
    ? faker.helpers.arrayElements(schoolTypeIds, faker.number.int({ min: 0, max: Math.min(2, schoolTypeIds.length) }))
    : [],
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/course/services/course.featured.service.ts apps/server/src/course/types/featured-course.interface.ts apps/server/src/school-type/school-type.service.ts apps/server/src/database/seeds/seed.ts
git commit -m "feat(server): featured/delete/seed use course schoolTypeIds"
```

---

### Task 5: Migration script

**Files:**
- Create: `apps/server/src/database/migrations/migrate-course-school-type-ids.ts`
- Modify: `apps/server/package.json` (add script next to other `migrate:*`)

**Interfaces:**
- Produces: CLI `pnpm --filter server migrate:course-school-type-ids`
- Idempotent: leave docs that already have `schoolTypeIds`; convert scalar; set `[]` when null/missing; `$unset` `schoolTypeId`

- [ ] **Step 1: Write migration** (follow `set-organization-onboarded-existing-super-admins.ts` Nest context pattern, but register `Course` schema)

Logic outline:

```ts
// 1) scalar schoolTypeId present → set schoolTypeIds: [schoolTypeId]
await courseModel.updateMany(
  { schoolTypeId: { $type: 'objectId' }, schoolTypeIds: { $exists: false } },
  [{ $set: { schoolTypeIds: ['$schoolTypeId'] } }] // or find+update loop if aggregation update unsupported on your Mongo version
);

// Prefer safe loop if needed:
const withScalar = await courseModel.find({ schoolTypeId: { $exists: true, $ne: null }, $or: [{ schoolTypeIds: { $exists: false } }, { schoolTypeIds: { $size: 0 } }] });
for (const doc of withScalar) {
  if (!doc.schoolTypeIds?.length && doc.get('schoolTypeId')) {
    doc.set('schoolTypeIds', [doc.get('schoolTypeId')]);
    await doc.save();
  }
}

// 2) ensure schoolTypeIds exists as []
await courseModel.updateMany(
  { schoolTypeIds: { $exists: false } },
  { $set: { schoolTypeIds: [] } }
);

// 3) unset legacy
await courseModel.updateMany({}, { $unset: { schoolTypeId: 1 } });
```

Log matched/modified counts. Use Course model from `course.entity.ts`.

- [ ] **Step 2: Add package script**

```json
"migrate:course-school-type-ids": "pnpm exec tsx -r tsconfig-paths/register src/database/migrations/migrate-course-school-type-ids.ts"
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/database/migrations/migrate-course-school-type-ids.ts apps/server/package.json
git commit -m "feat(server): migrate course schoolTypeId to schoolTypeIds array"
```

---

### Task 6: Client normalize helper + types + schema

**Files:**
- Create: `apps/client/src/lib/utils/course/normalize-course-school-types.ts`
- Create: `apps/client/src/lib/utils/course/normalize-course-school-types.test.ts`
- Modify: `apps/client/src/lib/types/course/course.interface.ts`
- Modify: `apps/client/src/lib/types/course/ICourseFilters.ts`
- Modify: `apps/client/src/lib/schema/course.schema.ts`
- Modify: `apps/client/src/lib/types/admin-review/admin-review.interface.ts`

**Interfaces:**
- Produces:

```ts
export function normalizeCourseSchoolTypes(course: {
  schoolTypeIds?: string[] | null;
  schoolTypes?: ILocalizedLookup[] | null;
  schoolTypeId?: string | null;
  schoolType?: ILocalizedLookup | null;
}): { schoolTypeIds: string[]; schoolTypes: ILocalizedLookup[] }
```

- [ ] **Step 1: Write helper tests**

Cases: plural only; singular id + singular object; mixed (prefer plural when present); empty/missing → `[]`.

- [ ] **Step 2: Implement helper**

```ts
export function normalizeCourseSchoolTypes(course: {
  schoolTypeIds?: string[] | null;
  schoolTypes?: ILocalizedLookup[] | null;
  schoolTypeId?: string | null;
  schoolType?: ILocalizedLookup | null;
}): { schoolTypeIds: string[]; schoolTypes: ILocalizedLookup[] } {
  const schoolTypes =
    course.schoolTypes && course.schoolTypes.length > 0
      ? course.schoolTypes
      : course.schoolType
        ? [course.schoolType]
        : [];

  const schoolTypeIds =
    course.schoolTypeIds && course.schoolTypeIds.length > 0
      ? course.schoolTypeIds
      : course.schoolTypeId
        ? [course.schoolTypeId]
        : schoolTypes.map((s) => s._id);

  return { schoolTypeIds, schoolTypes };
}
```

- [ ] **Step 3: Update types**

`ICourse`:

```ts
schoolTypeIds?: string[];
schoolTypes?: ILocalizedLookup[];
/** @deprecated legacy read compat */
schoolTypeId?: string | null;
schoolType?: ILocalizedLookup | null;
```

`ICourseFilters`: `schoolTypeIds?: string[]` (keep optional legacy `schoolTypeId?: string` only if still needed for URL transition — prefer plural only on client filters).

Admin reviewable course: `schoolTypes?: { _id; nameEn; nameAr }[]` (+ optional legacy singular).

Yup:

```ts
schoolTypeIds: Yup.array().of(Yup.string().required()).optional(),
```

Remove required singular `schoolTypeId` from schema.

- [ ] **Step 4: Run helper test**

```bash
pnpm --filter client exec jest src/lib/utils/course/normalize-course-school-types.test.ts
```

(or the project’s existing test runner for client unit tests)

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/lib/utils/course/normalize-course-school-types.ts apps/client/src/lib/utils/course/normalize-course-school-types.test.ts apps/client/src/lib/types/course/course.interface.ts apps/client/src/lib/types/course/ICourseFilters.ts apps/client/src/lib/schema/course.schema.ts apps/client/src/lib/types/admin-review/admin-review.interface.ts
git commit -m "feat(client): add schoolTypeIds types and normalize helper"
```

---

### Task 7: Client course form MultiSelect

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-grade-school-type-section.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course-form.tsx`

**Interfaces:**
- Consumes: `normalizeCourseSchoolTypes`
- Produces: section props `schoolTypeIds: string[]`, `onSchoolTypeIdsChange: (ids: string[]) => void`

- [ ] **Step 1: Convert section to MultipleSelector**

Reuse `MultipleSelector` + `Option` from `@/components/molecules/multi-select/multi-select` (same pattern as `SchoolTypeMultiFilterField` / categories). Grade stays Combobox. Empty selection allowed (no `__none__` required for multi).

- [ ] **Step 2: Wire course-form state**

```ts
const initialSchool = normalizeCourseSchoolTypes(course ?? {});
const [selectedSchoolTypeIds, setSelectedSchoolTypeIds] = useState<string[]>(initialSchool.schoolTypeIds);
```

`setValue('schoolTypeIds', ids)`, FormData:

```ts
formData.set('schoolTypeIds', JSON.stringify(data.schoolTypeIds ?? []));
```

Remove singular `schoolTypeId` form wiring.

- [ ] **Step 3: Manual check** — create/edit course can select 0..N school types and save.

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-grade-school-type-section.tsx apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course-form.tsx
git commit -m "feat(client): multi-select school types on course form"
```

---

### Task 8: Client display + public filters

**Files:**
- Modify: `apps/client/src/components/organs/course-card.tsx`
- Modify: `apps/client/src/app/[locale]/(home-page)/courses/__components/single-course-header.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/__components/CourseDetailsDialog.tsx`
- Modify: `apps/client/src/app/[locale]/(home-page)/courses/__sections/courses-header.tsx`
- Modify: `apps/client/src/app/[locale]/(home-page)/__sections/__components/grade-school-type-filter.tsx` (if still used with singular query param)
- Modify: any other `course.schoolType` display sites found via ripgrep

**Interfaces:**
- Display uses `normalizeCourseSchoolTypes(course).schoolTypes` → one Badge per type
- Filters: `activeFilters.schoolTypeIds: string[]`; use `SchoolTypeMultiFilterField`; URL can store CSV or repeated params — pick one approach consistent with `categoryIds` on the same page

- [ ] **Step 1: Update display components** to map badges from normalized `schoolTypes`.

- [ ] **Step 2: Update courses-header filters**

- Read/write `schoolTypeIds` (array). Prefer `SchoolTypeMultiFilterField` already exported from `filter-fields.tsx`.
- Chips: one chip per selected school type; clear removes that id.
- Pass `schoolTypeIds` into `useFilteredCourses` / `findCourses`.

- [ ] **Step 3: Grep cleanup**

```bash
rg "schoolTypeId|course\\.schoolType" apps/client/src --glob "*.{ts,tsx}"
```

Fix remaining course (not instructor) references.

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/components/organs/course-card.tsx apps/client/src/app/[locale]/(home-page)/courses apps/client/src/app/[locale]/(dashboard)/main-admin-dashboard/__components/CourseDetailsDialog.tsx apps/client/src/app/[locale]/(home-page)/__sections
git commit -m "feat(client): show and filter multiple course school types"
```

---

### Task 9: Mobile types, normalize, display, filter serialization

**Files:**
- Modify: `apps/lms-mobile/lib/types/course/ICourse.interface.tsx`
- Create: `apps/lms-mobile/lib/utils/normalize-course-school-types.ts` (same logic as client; keep a local copy — mobile does not import client utils)
- Modify: `apps/lms-mobile/components/organs/courses/course-card.tsx`
- Modify: `apps/lms-mobile/app/(tabs)/browse/[courseId].tsx`
- Modify: `apps/lms-mobile/lib/action/course.action.ts` (ensure `schoolTypeIds` arrays serialize as CSV like instructor filters)

**Interfaces:**
- Same normalize signature as client
- Filters already use `schoolTypeIds?: string[]` — ensure HTTP query sends `schoolTypeIds=id1,id2` so server CSV parsing works

- [ ] **Step 1: Update ICourse** with `schoolTypeIds` / `schoolTypes` + legacy optional singular.

- [ ] **Step 2: Add normalize helper** (copy logic from Task 6).

- [ ] **Step 3: Display** — course card + detail page render all school type names/badges via normalize.

- [ ] **Step 4: Fix `fetchCourses` serialization** so array values join with commas instead of relying on `String(array)` alone if other keys need special handling — explicitly:

```ts
if (Array.isArray(value)) {
  if (value.length === 0) return;
  params.append(key, value.join(','));
  return;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/lms-mobile/lib/types/course/ICourse.interface.tsx apps/lms-mobile/lib/utils/normalize-course-school-types.ts apps/lms-mobile/components/organs/courses/course-card.tsx apps/lms-mobile/app/(tabs)/browse/[courseId].tsx apps/lms-mobile/lib/action/course.action.ts
git commit -m "feat(mobile): support multiple course school types on browse"
```

---

### Task 10: Final verification

**Files:** none new — verification only

- [ ] **Step 1: Server grep** — no remaining course `schoolTypeId` / `populate('schoolType')` except migration `$unset` and documented legacy filter param.

```bash
rg "schoolTypeId|populate\\('schoolType'\\)|path: 'schoolType'" apps/server/src --glob "*.{ts,tsx}"
```

- [ ] **Step 2: Client/mobile grep** for course singular usage (ignore instructor `schoolTypesIds`).

- [ ] **Step 3: Run targeted tests**

```bash
pnpm --filter server exec jest src/course/services/course.grade-school-type.spec.ts
pnpm --filter client exec jest src/lib/utils/course/normalize-course-school-types.test.ts
```

- [ ] **Step 4: Manual checklist**

1. Run migration against local Mongo.
2. Create course with 0, 1, and 2 school types.
3. Edit legacy-migrated course; form shows prior type(s).
4. Public filter OR match works on client and mobile.
5. Delete school type blocked when referenced by a course array membership.
6. Featured / admin review course payloads show `schoolTypes` array.

- [ ] **Step 5: Commit any leftover fixes** (only if needed)

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Entity `schoolTypeIds` + virtual `schoolTypes` | 1 |
| Migration scalar→array, unset legacy | 5 |
| DTO `schoolTypeIds` | 1 |
| Validate each id | 2 |
| Filter `$in` + legacy `schoolTypeId` | 3 |
| Populate `schoolTypes` | 3 |
| Featured `$lookup` array | 4 |
| Delete guard | 4 |
| Seeds | 4 |
| Pending/admin review populate/types | 3, 6 |
| Client normalize + types/schema | 6 |
| Course form MultiSelect | 7 |
| Display badges + public multi filter | 8 |
| Mobile types/display/filters (no create form) | 9 |
| Tests listed in spec | 2, 6, 10 |

No placeholders remaining. Naming is consistent: `schoolTypeIds` / `schoolTypes` throughout; instructor fields untouched.
