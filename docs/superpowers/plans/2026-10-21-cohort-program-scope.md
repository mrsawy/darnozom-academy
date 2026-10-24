# Cohort Program Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `levelId` off `Cohort` and onto group creation, so one cohort (an intake, e.g. "January 2026") can hold groups studying different levels and therefore different courses.

**Architecture:** `Cohort` becomes a program-scoped time bucket (`programId` + `startDate`). `Group` already stores `levelId` and `courseId`; today they are copied from the cohort's level, and after this change they come from a caller-supplied `levelId` validated against the cohort's program. Everything downstream (certificates, WhatsApp templates, sessions, readiness) already reads `group.levelId` and is untouched.

**Tech Stack:** NestJS + Mongoose (server), Next.js 16 + React Query + shadcn/ui (client), Jest (server tests), `@darnozom/shared-types` (shared enums/errors), tsx migration scripts.

**Spec:** None. This plan originates from a design discussion on 2026-10-21; the authority is the Nozom concept doc's MVP scope item "core entities and scheduling". The decision recorded there: a cohort is an administrative intake sharing a start date, not a curriculum node, and certificates remain per-level (one certificate per group's level).

## Global Constraints

- A cohort is scoped to a **program**, not a level. Groups inside it may use any level whose course belongs to that program.
- Certificates remain **per level**. No certificate logic changes in this plan.
- `Group.levelId` and `Group.courseId` keep their current meaning and stay **required**. Only their source changes.
- All queries stay organization-scoped via `withNotDeletedFilter({ organizationId })`. Never widen a query past the actor's organization.
- Soft delete everywhere: use `withNotDeletedFilter` for reads and `buildSoftDeleteSet` for deletes. Never hard-delete.
- Arabic is the primary locale. Every new user-facing string lands in **both** `apps/client/messages/ar.json` and `en.json` under `Academics.*`.
- Error identifiers come from `AcademicsErrors` in `@darnozom/shared-types`. Do not introduce raw string errors.
- Server tests run with `pnpm --filter server test`. Run one Jest process at a time (no stacked background runs).

## Review Focus

These are input classes the tasks' tests do not exercise but that a user will hit:

1. **Group created with a level from another program** — `dto.levelId` resolves to a level whose course has a different `programId` than the cohort. Must throw, not silently create a cross-program group. (Covered by Task 3's test; listed here because it is the core security boundary.)
2. **Cohort deleted while groups reference it** — existing `HAS_DEPENDENTS` guard must still fire after the schema change.
3. **Legacy cohort with no `programId`** — a cohort whose level's course has `programId: null` cannot be migrated. Migration must report these rather than write `null` and silently break group creation.
4. **Level deleted after groups exist** — groups keep a dangling `levelId`. Pre-existing behavior; confirm this plan does not make it worse.
5. **Client cohort list cached under the old `levelId` key** — React Query keys change shape; a stale key would show an empty or wrong list after deploy.

---

### Task 1: Cohort entity and DTO move to programId

**Files:**
- Modify: `apps/server/src/academics/cohort/entities/cohort.entity.ts`
- Modify: `apps/server/src/academics/cohort/dto/cohort.dto.ts`
- Test: `apps/server/src/academics/cohort/cohort.service.spec.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `Cohort` schema with `programId: Types.ObjectId` (ref `'Program'`, required, indexed) and **no** `levelId`.
  - `CreateCohortDto { programId: string; name: string; startDate: string }`
  - `FindCohortsPayload { programId: string }`
  - `UpdateCohortDto` unchanged (`name?`, `startDate?`).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/academics/cohort/cohort.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CohortService } from './cohort.service';
import { Cohort } from './entities/cohort.entity';
import { Level } from '../level/entities/level.entity';
import { Program } from '../program/entities/program.entity';
import { Group } from '../group/entities/group.entity';
import { GroupTeacherService } from '../group/group-teacher.service';

const mockQuery = <T>(value: T) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('CohortService', () => {
  const organizationId = new Types.ObjectId().toString();
  const programId = new Types.ObjectId().toString();
  const actor = { _id: new Types.ObjectId().toString(), organizationId } as never;

  let service: CohortService;
  let cohortModel: { create: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let programModel: { findOne: jest.Mock };

  beforeEach(async () => {
    cohortModel = { create: jest.fn(), find: jest.fn(), findOne: jest.fn() };
    programModel = { findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CohortService,
        { provide: getModelToken(Cohort.name), useValue: cohortModel },
        { provide: getModelToken(Program.name), useValue: programModel },
        { provide: getModelToken(Level.name), useValue: { findOne: jest.fn() } },
        { provide: getModelToken(Group.name), useValue: { countDocuments: jest.fn() } },
        { provide: GroupTeacherService, useValue: { assertCohortStartDateFits: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(CohortService);
  });

  it('creates a cohort against a program', async () => {
    programModel.findOne.mockReturnValue(mockQuery({ _id: new Types.ObjectId(programId) }));
    cohortModel.create.mockResolvedValue({
      toObject: () => ({ _id: new Types.ObjectId(), programId, name: 'January 2026' }),
    });

    const created = await service.create(actor, {
      programId,
      name: 'January 2026',
      startDate: '2026-01-10',
    });

    expect(created.programId).toBe(programId);
    expect(cohortModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ programId: expect.anything() })
    );
    expect(cohortModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ levelId: expect.anything() })
    );
  });

  it('rejects a cohort whose program is missing', async () => {
    programModel.findOne.mockReturnValue(mockQuery(null));

    await expect(
      service.create(actor, { programId, name: 'January 2026', startDate: '2026-01-10' })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists cohorts filtered by program', async () => {
    const sorted = { sort: jest.fn().mockReturnValue(mockQuery([])) };
    cohortModel.find.mockReturnValue(sorted);

    await service.findAll(actor, programId);

    expect(cohortModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ programId: expect.anything() })
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server test -- cohort.service.spec`
Expected: FAIL — `service.create` is called with `programId` but `CreateCohortDto` declares `levelId`, and `CohortService` has no `Program` model injected. TypeScript errors on the `programId` property plus a Nest DI error for the unknown `Program` provider.

- [ ] **Step 3: Replace levelId with programId on the entity**

In `apps/server/src/academics/cohort/entities/cohort.entity.ts`, replace the `levelId` prop:

```typescript
  @Prop({ type: Types.ObjectId, ref: 'Program', required: true, index: true })
  programId: Types.ObjectId;
```

Leave `organizationId`, `name`, `startDate`, and the soft-delete props exactly as they are.

- [ ] **Step 4: Update the DTOs**

In `apps/server/src/academics/cohort/dto/cohort.dto.ts`, rename the field on `CreateCohortDto`:

```typescript
export class CreateCohortDto {
  @IsMongoId()
  programId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /** ISO date, e.g. "2026-10-20" */
  @IsDateString()
  startDate!: string;
}
```

and on `FindCohortsPayload`:

```typescript
export class FindCohortsPayload {
  @IsMongoId()
  programId!: string;
}
```

`UpdateCohortDto` and `UpdateCohortPayload` stay unchanged.

- [ ] **Step 5: Update the service to validate the program**

In `apps/server/src/academics/cohort/cohort.service.ts`:

Add the import and inject the model:

```typescript
import { Program } from '../program/entities/program.entity';
```

```typescript
    @InjectModel(Program.name) private readonly programModel: Model<Program>,
```

Replace `findAll`:

```typescript
  async findAll(actor: AcademicsActor, programId: string) {
    return (
      this.cohortModel
        .find(withNotDeletedFilter({ organizationId: oid(actor.organizationId), programId: oid(programId) }))
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ startDate: -1 })
        .lean()
        .exec()
    );
  }
```

Replace `create`:

```typescript
  async create(actor: AcademicsActor, dto: CreateCohortDto) {
    const program = await this.programModel
      .findOne(withNotDeletedFilter({ _id: oid(dto.programId), organizationId: oid(actor.organizationId) }))
      .select('_id')
      .lean()
      .exec();
    if (!program) throw new NotFoundException(AcademicsErrors.PROGRAM_NOT_FOUND);
    const created = await this.cohortModel.create({
      organizationId: oid(actor.organizationId),
      programId: oid(dto.programId),
      name: dto.name.trim(),
      startDate: new Date(dto.startDate),
    });
    return created.toObject();
  }
```

The `Level` model injection is now unused in this service — remove the `@InjectModel(Level.name)` constructor parameter and its import. `update` and `remove` are unchanged.

- [ ] **Step 6: Confirm PROGRAM_NOT_FOUND exists**

Run: `grep -n "PROGRAM_NOT_FOUND" lib/shared-types/src/lib/messages/academics-errors.enum.ts`
Expected: `PROGRAM_NOT_FOUND = 'programNotFound',` at line 5. It already exists — no change needed. Note the enum lives in `lib/shared-types/src/lib/messages/academics-errors.enum.ts` (NOT in `types/academics/academics.types.ts`), and its values are camelCase i18n message keys, not SCREAMING_CASE.

- [ ] **Step 7: Wire the Program model into the academics module**

In `apps/server/src/academics/academics.module.ts`, confirm `Program` appears in the `MongooseModule.forFeature([...])` array. It is already registered for `ProgramService`; no change is expected, but the test's DI failure in Step 2 will recur if it is missing.

- [ ] **Step 8: Update the controller**

In `apps/server/src/academics/cohort/cohort.controller.message.ts`, change `findAll` to pass the new field:

```typescript
    return this.cohortService.findAll(actorFromContext(context), payload.programId);
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `pnpm --filter server test -- cohort.service.spec`
Expected: PASS, 3/3.

- [ ] **Step 10: Commit**

```bash
git add apps/server/src/academics/cohort lib/shared-types
git commit -m "feat(academics): scope cohorts to programs instead of levels"
```

---

### Task 2: Group creation takes an explicit levelId

**Files:**
- Modify: `apps/server/src/academics/group/dto/group.dto.ts`
- Modify: `apps/server/src/academics/group/group.service.ts:125-155`
- Test: `apps/server/src/academics/group/group.service.spec.ts:75-115` (existing file)

**Interfaces:**
- Consumes: `Cohort.programId` from Task 1.
- Produces: `CreateGroupDto` gains a required `levelId: string`. `GroupService.create` resolves the level from `dto.levelId`, asserts the level's course belongs to the cohort's program, and writes `levelId` + `courseId` onto the group.

- [ ] **Step 1: Write the failing tests**

In `apps/server/src/academics/group/group.service.spec.ts`, replace the existing create-path tests with these. The exact mock wiring follows the file's existing `mockQuery` helper and model mocks:

```typescript
  it('creates a group using the supplied level', async () => {
    const programId = new Types.ObjectId();
    cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, programId }));
    levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId, programId }));

    const created = await service.create(actor, {
      cohortId: String(cohortId),
      levelId: String(levelId),
      name: 'Group A',
      schedule: [{ dayOfWeek: 0, startTime: '17:00', durationMinutes: 60 }],
      timezone: 'Africa/Cairo',
      minStudents: 1,
      maxStudents: 10,
      totalSessions: 12,
    } as never);

    expect(created.levelId).toBe(levelId);
    expect(levelModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.anything() })
    );
  });

  it('rejects a level whose course is outside the cohort program', async () => {
    const programId = new Types.ObjectId();
    const otherProgramId = new Types.ObjectId();
    cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, programId }));
    levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId, programId: otherProgramId }));

    await expect(
      service.create(actor, {
        cohortId: String(cohortId),
        levelId: String(levelId),
        name: 'Group A',
        schedule: [{ dayOfWeek: 0, startTime: '17:00', durationMinutes: 60 }],
        timezone: 'Africa/Cairo',
        minStudents: 1,
        maxStudents: 10,
        totalSessions: 12,
      } as never)
    ).rejects.toBeInstanceOf(BadRequestException);
  });
```

Add `courseModel` to the spec's mock providers alongside the existing `levelModel` and `cohortModel` mocks, registered under `getModelToken(Course.name)`, and import `BadRequestException` from `@nestjs/common`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter server test -- group.service.spec`
Expected: FAIL — `create` still reads `cohort.levelId` (now `undefined` in the mock) so `levelModel.findOne` is called with `{ _id: undefined }` and the `NotFoundException` path fires instead of the expected result; the cross-program test fails because no program check exists.

- [ ] **Step 3: Add levelId to the DTO**

In `apps/server/src/academics/group/dto/group.dto.ts`, add to `CreateGroupDto`, directly under `cohortId`:

```typescript
  @IsMongoId()
  levelId!: string;
```

`UpdateGroupDto` is **not** changed — a group's level is fixed at creation.

- [ ] **Step 4: Rewrite GroupService.create**

In `apps/server/src/academics/group/group.service.ts`, replace lines 125-144 (the cohort/level lookup and the `create` call's id fields):

```typescript
  async create(actor: AcademicsActor, dto: CreateGroupDto): Promise<GroupView> {
    const cohort = await this.cohortModel
      .findOne(withNotDeletedFilter({ _id: oid(dto.cohortId), organizationId: oid(actor.organizationId) }))
      .lean<{ _id: Types.ObjectId; programId: Types.ObjectId }>()
      .exec();
    if (!cohort) throw new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND);

    const level = await this.levelModel
      .findOne(withNotDeletedFilter({ _id: oid(dto.levelId), organizationId: oid(actor.organizationId) }))
      .select('_id courseId')
      .lean<{ _id: Types.ObjectId; courseId: Types.ObjectId }>()
      .exec();
    if (!level) throw new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND);

    const course = await this.courseModel
      .findOne({ _id: level.courseId })
      .select('_id programId')
      .lean<{ _id: Types.ObjectId; programId: Types.ObjectId | null }>()
      .exec();
    if (!course) throw new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION);
    if (String(course.programId ?? '') !== String(cohort.programId)) {
      throw new BadRequestException(AcademicsErrors.LEVEL_OUTSIDE_COHORT_PROGRAM);
    }

    if (!isValidSchedule(dto.schedule)) throw new BadRequestException(AcademicsErrors.INVALID_SCHEDULE);
    if (dto.maxStudents < dto.minStudents) throw new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS);

    const created = await this.groupModel.create({
      organizationId: oid(actor.organizationId),
      cohortId: cohort._id,
      levelId: level._id,
      courseId: level.courseId,
      name: dto.name.trim(),
      schedule: dto.schedule,
      timezone: dto.timezone,
      minStudents: dto.minStudents,
      maxStudents: dto.maxStudents,
      totalSessions: dto.totalSessions,
      meetingLink: dto.meetingLink ?? null,
      whatsappGroupLink: dto.whatsappGroupLink ?? null,
    });
    return await this.state.toView(created.toObject() as unknown as GroupLean);
  }
```

Inject the `Course` model in the constructor if it is not already present:

```typescript
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
```

with `import { Course } from 'src/course/entities/course.entity';`.

- [ ] **Step 5: Add the one new error identifier and its translations**

`COURSE_NOT_FOUND_IN_ORGANIZATION` already exists at line 10 of `lib/shared-types/src/lib/messages/academics-errors.enum.ts` — reuse it. Only one identifier is new. Add it after `COHORT_NOT_FOUND`:

```typescript
  LEVEL_OUTSIDE_COHORT_PROGRAM = 'levelOutsideCohortProgram',
```

The enum value is the i18n message key, so it needs an entry in the `errors` namespace of **both** locale files, beside the existing `cohortNotFound`:

| File | Key | Value |
|---|---|---|
| `apps/client/messages/ar.json` | `errors.levelOutsideCohortProgram` | `المستوى المختار لا ينتمي إلى برنامج هذه الدفعة.` |
| `apps/client/messages/en.json` | `errors.levelOutsideCohortProgram` | `The selected level does not belong to this cohort's program.` |

Verify placement with: `grep -n "cohortNotFound" apps/client/messages/ar.json` — the new key goes in that same object.

- [ ] **Step 6: Register Course in the academics module**

In `apps/server/src/academics/academics.module.ts`, add `{ name: Course.name, schema: CourseSchema }` to `MongooseModule.forFeature([...])` if it is not already registered, importing both from `src/course/entities/course.entity`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter server test -- group.service.spec`
Expected: PASS. Both new tests green and the file's pre-existing tests still green.

- [ ] **Step 8: Run the full server suite**

Run: `pnpm --filter server test`
Expected: PASS. Any failure naming `cohort`, `group`, `certificate`, or `template` must be fixed before the commit; report any unrelated pre-existing failure by name.

- [ ] **Step 9: Commit**

```bash
git add apps/server/src/academics/group lib/shared-types apps/server/src/academics/academics.module.ts
git commit -m "feat(academics): take level explicitly on group creation"
```

---

### Task 3: Migration for existing cohorts

**Files:**
- Create: `apps/server/src/database/migrations/migrate-cohort-program-scope.ts`
- Modify: `apps/server/src/database/migrations/run-all-migrations.ts:21-33`
- Modify: `apps/server/package.json` (scripts)

**Interfaces:**
- Consumes: `Cohort.programId` (Task 1), the unchanged `Level.courseId` and `Course.programId`.
- Produces: every pre-existing cohort gains `programId`, resolved as `cohort.levelId → level.courseId → course.programId`; the legacy `levelId` field is unset. Groups are not modified — they already hold correct `levelId`/`courseId`.

- [ ] **Step 1: Write the migration**

Create `apps/server/src/database/migrations/migrate-cohort-program-scope.ts`, following the structure of `migrate-course-school-type-ids.ts`:

```typescript
/**
 * One-off: resolve Cohort.programId from the legacy Cohort.levelId chain
 * (level → course → program), then unset the legacy field.
 *
 *   pnpm --filter server migrate:cohort-program-scope
 *   pnpm --filter server migrate:cohort-program-scope -- --prod
 *   pnpm --filter server migrate:cohort-program-scope -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { Cohort, CohortSchema } from '../../academics/cohort/entities/cohort.entity';
import { Level, LevelSchema } from '../../academics/level/entities/level.entity';
import { Course, CourseSchema } from '../../course/entities/course.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([
      { name: Cohort.name, schema: CohortSchema },
      { name: Level.name, schema: LevelSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
})
class MigrationModule {}

interface LegacyCohortDoc {
  _id: Types.ObjectId;
  levelId?: Types.ObjectId | null;
  programId?: Types.ObjectId | null;
}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:cohort-program-scope] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const cohortModel = app.get<Model<Cohort>>(getModelToken(Cohort.name));
  const levelModel = app.get<Model<Level>>(getModelToken(Level.name));
  const courseModel = app.get<Model<Course>>(getModelToken(Course.name));

  // Native collection: levelId is gone from the Mongoose schema.
  const collection = cohortModel.collection;

  const legacy = (await collection
    .find({ levelId: { $exists: true, $type: 'objectId' } })
    .project({ _id: 1, levelId: 1, programId: 1 })
    .toArray()) as LegacyCohortDoc[];

  let resolved = 0;
  const orphaned: string[] = [];

  for (const doc of legacy) {
    if (doc.programId) continue;

    const level = await levelModel.findById(doc.levelId).select('courseId').lean().exec();
    const course = level ? await courseModel.findById(level.courseId).select('programId').lean().exec() : null;
    const programId = course?.programId ?? null;

    if (!programId) {
      orphaned.push(String(doc._id));
      continue;
    }

    await collection.updateOne({ _id: doc._id }, { $set: { programId } });
    resolved += 1;
  }

  const unset = await collection.updateMany(
    { levelId: { $exists: true }, programId: { $exists: true, $ne: null } },
    { $unset: { levelId: 1 } }
  );

  // eslint-disable-next-line no-console
  console.log(
    `[migrate:cohort-program-scope] resolved=${resolved} unsetLegacy=${unset.modifiedCount} orphaned=${orphaned.length}`
  );
  if (orphaned.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[migrate:cohort-program-scope] cohorts with no reachable program (levelId kept, needs manual fix): ${orphaned.join(', ')}`
    );
  }

  await app.close();
}

void bootstrap();
```

The migration is idempotent: cohorts that already carry `programId` are skipped, and `levelId` is only unset once `programId` is present.

- [ ] **Step 2: Register the migration in the runner**

In `apps/server/src/database/migrations/run-all-migrations.ts`, append to `MIGRATION_FILES` after `'migrate-content-sharia-approved.ts'`:

```typescript
  'migrate-cohort-program-scope.ts',
```

- [ ] **Step 3: Add the package script**

In `apps/server/package.json`, add beside the other `migrate:*` entries, matching their exact shape:

```json
    "migrate:cohort-program-scope": "tsx -r tsconfig-paths/register src/database/migrations/migrate-cohort-program-scope.ts",
```

Run `grep -n "migrate:course-school-type-ids" apps/server/package.json` first and copy that line's command form verbatim, substituting the filename — the runner shells out with the same flags.

- [ ] **Step 4: Run the migration against the local database**

Run: `pnpm --filter server migrate:cohort-program-scope`
Expected: a line `[migrate:cohort-program-scope] resolved=<N> unsetLegacy=<N> orphaned=<M>`. If `orphaned` is non-zero, the warning lists cohort ids whose course has no `programId`; those cohorts keep `levelId` and must be linked to a program by hand before their groups can be created.

- [ ] **Step 5: Verify idempotency**

Run: `pnpm --filter server migrate:cohort-program-scope`
Expected: `resolved=0 unsetLegacy=0` on the second run — nothing left to convert.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/database/migrations apps/server/package.json
git commit -m "feat(academics): migrate cohorts from level scope to program scope"
```

---

### Task 4: Client data layer follows the new shape

**Files:**
- Modify: `apps/client/src/lib/actions/academics/structure.action.ts:18-24`
- Modify: `apps/client/src/lib/hooks/academics/use-academics.hook.ts:87-92`
- Modify: `apps/client/src/lib/types/academics/academics.ts` (`ICohort`, `GroupFormValues`)

**Interfaces:**
- Consumes: the server contracts from Tasks 1 and 2.
- Produces:
  - `ICohort { _id, programId, name, startDate }` — `levelId` removed.
  - `getCohorts(programId: string)`, `createCohort({ programId, name, startDate })`.
  - `useCohorts(programId: string)` with query key keyed on `programId`.
  - `createGroup` payload gains `levelId`.

- [ ] **Step 1: Update the cohort type**

In `apps/client/src/lib/types/academics/academics.ts`, change `ICohort`:

```typescript
export interface ICohort {
  _id: string;
  programId: string;
  name: string;
  startDate: string;
}
```

- [ ] **Step 2: Update the structure actions**

In `apps/client/src/lib/actions/academics/structure.action.ts`, change the two cohort functions so the parameter and the request body both carry `programId` instead of `levelId`. Keep the surrounding request helper, the message pattern name, and the return handling exactly as they are — only the field name and the parameter name change.

- [ ] **Step 3: Update the cohorts hook**

In `apps/client/src/lib/hooks/academics/use-academics.hook.ts`:

```typescript
export const useCohorts = (programId: string) =>
  useQuery({
    queryKey: academicsKeys.cohorts(programId),
    queryFn: async () => unwrap(await structureApi.getCohorts(programId)),
    enabled: !!programId,
  });
```

The key factory at `use-academics.hook.ts:44` currently reads:

```typescript
  cohorts: (levelId: string) => [ROOT, 'cohorts', levelId] as const,
```

Change it to rename both the parameter and the literal — the literal rename is what prevents a cached entry stored under a level id from being served as a program id (Review Focus item 5):

```typescript
  cohorts: (programId: string) => [ROOT, 'cohorts-by-program', programId] as const,
```

No invalidation call sites need updating: `useAcademicsMutation` (line 123) invalidates the whole `[ROOT]` subtree on every success, so no mutation references `academicsKeys.cohorts` directly. `useCohorts` is the only consumer.

Also change `useCreateCohort`'s variable type at line 171, since it still declares `levelId`:

```typescript
export const useCreateCohort = () =>
  useAcademicsMutation(async (v: { programId: string; name: string; startDate: string }) =>
    unwrap(await structureApi.createCohort(v))
  );
```

- [ ] **Step 4: Add levelId to the group form values**

In the same types file, add `levelId: string;` to `GroupFormValues`.

- [ ] **Step 5: Typecheck**

Run: `cd apps/client && npx tsc --noEmit -p tsconfig.json`
Expected: errors ONLY in the components that consume these signatures — `level-cohorts.tsx`, `cohort-groups.tsx`, `new/page.tsx`, `group-form.tsx`. Those are fixed in Task 5. There are 32 pre-existing errors from `@ai-sdk` version conflicts; they are unrelated and must not grow.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/lib
git commit -m "feat(client): point cohort data layer at programs"
```

---

### Task 5: Program page restructure — cohorts beside levels

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs/[id]/__components/program-detail.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs/[id]/__components/course-levels.tsx`
- Rename: `level-cohorts.tsx` → `program-cohorts.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs/[id]/__components/cohort-groups.tsx`
- Modify: `apps/client/messages/ar.json`, `apps/client/messages/en.json`

**Interfaces:**
- Consumes: `useCohorts(programId)` from Task 4.
- Produces: `ProgramCohorts({ programId })` replacing `LevelCohorts({ levelId })`. `CourseLevels` no longer renders cohorts.

The page's information architecture changes from nested to parallel, because cohorts and levels are now siblings under a program:

```
Before:  Step 1 Courses → Step 2 Levels → Step 3 Cohorts → groups
After:   Step 1 Courses → Step 2 Levels (curriculum)
         Step 3 Cohorts (intakes) → groups, each labeled with its level
```

- [ ] **Step 1: Rename the cohorts component**

```bash
git mv "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs/[id]/__components/level-cohorts.tsx" "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs/[id]/__components/program-cohorts.tsx"
```

- [ ] **Step 2: Rewrite it to take a programId**

In the renamed file, change the exported component to `ProgramCohorts({ programId }: { programId: string })`, call `useCohorts(programId)`, and pass `{ programId, name, startDate }` to `createCohort.mutate`. The dialog form, the `StepHeader`, the cohort card markup, the **عرض المجموعات** / **مجموعة جديدة** buttons, and the nested `<CohortGroups />` block all stay exactly as they are. Only the id that scopes the list and the created record changes.

- [ ] **Step 3: Drop cohorts out of CourseLevels**

In `course-levels.tsx`, remove the `import { LevelCohorts }` line and the `<div className="border-t px-4 py-4"><LevelCohorts levelId={level._id} /></div>` block at the end of each level card. A level card now shows order, name, certificate-rules button, and delete only. Keep `StepHeader step={2}`.

- [ ] **Step 4: Add the cohorts section to the program page**

In `program-detail.tsx`, import `ProgramCohorts` and render it as a sibling section after the courses section, outside the `courses.map(...)` loop:

```tsx
      <section className="space-y-4">
        <ProgramCohorts programId={programId} />
      </section>
```

`ProgramCohorts` carries its own `StepHeader step={3}`.

- [ ] **Step 5: Show the level on each group row**

In `cohort-groups.tsx`, a cohort's groups can now span different levels, so each row must say which. Add a `levelNames: Record<string, string>` prop resolved by the parent from `useLevels`, and render the group's level name as an `<Badge variant="outline">` beside the status badge. Where the level is unknown, render nothing rather than an empty badge.

- [ ] **Step 6: Add and update translation keys**

Add to `Academics.programs` in **both** `ar.json` and `en.json`:

| Key | ar | en |
|---|---|---|
| `cohortsHint` | `كل دفعة تمثل فوجًا يبدأ في تاريخ محدد، وقد تضم مجموعات من مستويات مختلفة.` | `Each cohort is an intake starting on a specific date; its groups may span different levels.` |
| `hierarchyStep2` | `حدّد المستويات المتسلسلة داخل كل دورة.` | `Define the sequential levels inside each course.` |
| `hierarchyStep3` | `أنشئ الدفعات وحدّد تاريخ بدء كل دفعة.` | `Create intakes and set each one a start date.` |
| `hierarchyStep4` | `كوّن المجموعات، واختر لكل مجموعة مستواها، ووزّع الطلاب والمعلمين.` | `Form groups, pick each group's level, and assign students and teachers.` |

`cohortsHint`, `hierarchyStep2`, `hierarchyStep3`, and `hierarchyStep4` already exist from the 2026-10-21 UI pass — overwrite their values rather than adding duplicates.

- [ ] **Step 7: Typecheck and view the page**

Run: `cd apps/client && npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `academics/programs/**`. Pre-existing `@ai-sdk` errors stay at 32.

Then open `http://localhost:3065/ar/organization-dashboard/academics/programs/<id>` and confirm: courses list levels only; a separate cohorts section lists intakes; each cohort lists its groups with a level badge.

- [ ] **Step 8: Commit**

```bash
git add "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/programs" apps/client/messages
git commit -m "feat(client): show cohorts as program intakes beside levels"
```

---

### Task 6: Group creation form picks a level

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/new/page.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/__components/group-form.tsx`
- Modify: `apps/client/messages/ar.json`, `apps/client/messages/en.json`

**Interfaces:**
- Consumes: `GroupFormValues.levelId` (Task 4), `CreateGroupDto.levelId` (Task 2).
- Produces: the new-group page resolves the cohort's program, lists that program's levels, and submits the chosen `levelId`.

- [ ] **Step 1: Add a level selector to the form**

In `group-form.tsx`, add a `levels: { _id: string; name: string; courseName: string }[]` prop and a `lockLevel?: boolean` prop. Render a `Select` bound to `values.levelId` as the first field, before the name field, labeled `t('form.level')`, with each option showing `` `${courseName} — ${name}` `` so two levels named "المستوى الأول" under different courses are distinguishable. Disable it when `lockLevel` is true (the edit path, where the level is fixed).

- [ ] **Step 2: Resolve levels on the new-group page**

In `new/page.tsx`:
- Read `cohortId` from the search params as today.
- Fetch the cohort to get its `programId`. **`useCohort` does not exist** — you must add it. The server already exposes `academics.cohorts.findOne` ([cohort.controller.message.ts:25](../../../apps/server/src/academics/cohort/cohort.controller.message.ts#L25)), so add a `getCohort(id)` action in `structure.action.ts` mirroring `getCohorts`, a `cohort: (id: string) => [ROOT, 'cohort', id] as const` key, and:

```typescript
export const useCohort = (id: string) =>
  useQuery({
    queryKey: academicsKeys.cohort(id),
    queryFn: async () => unwrap(await structureApi.getCohort(id)),
    enabled: !!id,
  });
```
- Fetch the program's courses with `useProgramCourses(programId)`, then their levels with `useLevels(courseId)` per course, and flatten into the `levels` prop with each level's `courseName` attached.
- Seed `initial.levelId` with `''` and keep the submit button disabled until a level is chosen.
- Pass `{ ...values, cohortId }` to `createGroup.mutate` — `values` now carries `levelId`.

- [ ] **Step 3: Add the translation keys**

Add to `Academics.form` in both locale files:

| Key | ar | en |
|---|---|---|
| `level` | `المستوى` | `Level` |
| `selectLevel` | `اختر المستوى` | `Select a level` |
| `noLevels` | `لا توجد مستويات في هذا البرنامج. أضف مستوى أولًا.` | `No levels in this program. Add a level first.` |

- [ ] **Step 4: Typecheck**

Run: `cd apps/client && npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `academics/groups/**`; pre-existing count unchanged at 32.

- [ ] **Step 5: Create a group end to end**

With the dev server running, open a cohort's **مجموعة جديدة** link, pick a level, fill the form, submit.
Expected: redirect to the group page; the group shows the chosen level. Then create a second group in the **same cohort** with a **different level** and confirm both appear under that cohort with different level badges — this is the behavior the whole plan exists to enable.

- [ ] **Step 6: Commit**

```bash
git add "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups" apps/client/messages
git commit -m "feat(client): choose a level when creating a group"
```

---

### Task 7: Verify downstream consumers still resolve

**Files:**
- Read-only verification across `apps/server/src/certificate`, `apps/server/src/message-template`, `apps/server/src/academics/session`, `apps/server/src/academics/task`.

**Interfaces:**
- Consumes: everything above.
- Produces: no code change unless a defect is found.

- [ ] **Step 1: Confirm nothing still reads a cohort's level**

Run: `grep -rn "cohort.levelId\|cohort\.levelId\|levelId.*cohort" apps/server/src --include=*.ts | grep -v spec`
Expected: no results. Any hit outside a test is a missed consumer and must be fixed before the task completes.

- [ ] **Step 2: Confirm certificate resolution is level-based**

Run: `grep -n "levelId" apps/server/src/certificate/services/certificate.service.ts`
Expected: hits at the `group.levelId` lookup and the `cert.levelId` name lookup — both already read from the group, so a cohort spanning levels issues the correct per-level certificate.

- [ ] **Step 3: Run the full server suite**

Run: `pnpm --filter server test`
Expected: PASS. Report by name any failure, including ones that predate this plan.

- [ ] **Step 4: Run the client tests**

Run: `pnpm --filter client test`
Expected: PASS. `follow-ups-card`, `open-tasks-card`, `readiness-panel`, and `staff-card` specs exist under the groups route and must stay green.

- [ ] **Step 5: Commit any fixes**

If Steps 1-4 surfaced defects, fix each with a failing test first, then:

```bash
git commit -m "fix(academics): <specific defect>"
```

If nothing was found, there is nothing to commit and the task is complete.

---

## Rollout Notes

**Order matters.** Tasks 1-2 change the server contract; Task 3 migrates the data; Tasks 4-6 move the client. Deploying the client before the migration would send `programId` to a server whose cohorts still carry `levelId`, and every cohort list would come back empty.

**Single-deploy sequence:** migration first (`pnpm --filter server migrate:cohort-program-scope`), then server, then client. The migration is idempotent and safe to run before the new server code ships, because the new field is additive and the legacy field is only unset once the new one is written.

**No backfill is needed for groups.** Every existing group already stores the `levelId` and `courseId` it was created with. This plan changes where *new* groups get those values, not what *old* groups hold.
