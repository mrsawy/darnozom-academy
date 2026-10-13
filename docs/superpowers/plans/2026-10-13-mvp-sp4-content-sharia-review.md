# Content with Basic Sharia Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every new or edited course content item must be approved by a Sharia reviewer before students see it, and every version is kept so earlier content is never lost without a record.

**Architecture:** A new append-only `ContentVersion` collection records each change-set; `CourseContent` gains `shariaStatus`, `currentVersion` and `pendingVersion`. The gate sits **around** `CourseContentService.update`, not inside it: an edit to approved content is captured as a pending version and the existing update path is never entered, so storage quotas, transcription and file cleanup keep working untouched. On approval, the stored change-set is replayed through that same path, which keeps the platform-level `applyUpdateWithApproval` approval exactly as it is today. Student-facing queries gain one extra filter next to the `APPROVED_STATUSES` filter they already carry.

**Tech Stack:** NestJS 11, Mongoose, Jest (server), Next.js 15 + React Query + next-intl (client), Vitest (client).

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp4-content-sharia-review-design.md`

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`. Never start a test run in the background.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection. Role changes go through `pnpm --filter server seed:prod`, which is upsert-only.
- **`eslint --fix` only on specific new or modified files, never on a directory.**
- Server controllers are NATS message handlers. Content patterns are namespaced `course.*`; the new ones are `course.sharia.*`.
- Every user-facing string is a next-intl key present in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- **Sharia review is a second, independent gate.** It never replaces the existing platform `approvalStatus` workflow, never writes `approvalStatus`, `pendingUpdate`, `reviewedBy` or `reviewedAt`, and never calls `mergeApproval` or `rejectApproval`. Those belong to the platform admin reviewing unverified organizations.
- **Scope confirmed 2026-10-13:** the gate applies to **all** course content in the organization, self-paced courses included, and the migration stamps every existing content item as approved so nothing disappears for current students.
- `ContentVersion` documents are never updated after review and never deleted. That is the record the concept requires.
- Only content items are reviewed, not module titles (spec assumption A1).

## Review Focus

Failure modes the spec implies but does not pin with a test. Each has a test in the task that owns the code.

1. **A reviewer approves a version that is no longer the pending one** — a second edit superseded it while the queue page was open. Approving a superseded or already-reviewed version must be refused, not silently applied over the newer edit. — Task 7.
2. **A rejected edit leaves the live content untouched and still visible**, and the author can edit again afterwards, so a rejection is not a dead end. — Task 6.
3. **Content created while the organization is unverified** carries `approvalStatus: PENDING` from the platform gate *and* `shariaStatus: PENDING`. Sharia approval must not make it student-visible on its own — both gates have to pass. — Task 9.
4. **An edit that touches only bypass fields** (`publishStatus`, `settings`, `attendanceSettings`) is an operational toggle, not editorial content: it must not open a Sharia review or hide approved content. — Task 5.
5. **A file replaced across two pending edits**: the superseded version's `fileKey` is deleted only when no approved version still references it, so approving nothing must never orphan the live file. — Task 8.

---

## File Structure

**Shared types**
- `lib/shared-types/src/lib/types/sharia/sharia.types.ts` (new) — `ShariaStatus`, `SHARIA_SUPERSEDED_COMMENT`, `SHARIA_MIGRATED_COMMENT`.
- `lib/shared-types/src/lib/messages/sharia-errors.enum.ts` (new) — `ShariaErrors`.
- `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts` — `SHARIA_REVIEW`.
- the barrel files that re-export the two new modules.

**Server** — new directory `apps/server/src/course/services/content/sharia/`:
- `sharia-decision.ts` — the pure rule deciding what an edit does. No database.
- `content-version.service.ts` — append-only version writes and reads.
- `sharia-gate.service.ts` — what `CourseContentService` calls on create and update.
- `sharia-review.service.ts` — the queue, approve and reject.
- `sharia-file-cleanup.service.ts` — deletes a dead `fileKey` only when no approved version holds it.

Also: `course/entities/content-version.entity.ts` (new), `course/entities/course-content.entity.ts`, `course/services/content/course-content.service.ts`, `course/services/content/course-content-query.service.ts`, `course/services/content/notification/course-content-notification.service.ts`, `course/services/course/course-featured.service.ts`, `course/controller/message/sharia.controller.message.ts` (new), `course/course.module.ts`, the `sharia-reviewer` and `content-officer` role seeds, and `database/migrations/migrate-content-sharia-approved.ts` (new).

**Client** — `lib/types/course/sharia.ts` (new), `lib/actions/course/sharia.action.ts` (new), `lib/hooks/course/use-sharia.hook.ts` (new), a new `organization-dashboard/sharia-review/` route, additions to the content editor, `organization-dashboard/data.ts`, and both message catalogues.

---

### Task 1: Shared types for Sharia review

**Files:**
- Create: `lib/shared-types/src/lib/types/sharia/sharia.types.ts`
- Create: `lib/shared-types/src/lib/messages/sharia-errors.enum.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Modify: the barrel `index.ts` files that export `types/` and `messages/`
- Test: `lib/shared-types/src/lib/types/sharia/sharia.types.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ShariaStatus { PENDING, APPROVED, REJECTED }`; `SHARIA_SUPERSEDED_COMMENT = 'SUPERSEDED'`; `SHARIA_MIGRATED_COMMENT = 'MIGRATED'`; `ShariaErrors` with `VERSION_NOT_FOUND`, `VERSION_ALREADY_REVIEWED`, `VERSION_NOT_PENDING`, `REJECT_COMMENT_REQUIRED`, `CONTENT_NOT_FOUND`; `Subjects.SHARIA_REVIEW`.

- [ ] **Step 1: Write the failing test**

Create `lib/shared-types/src/lib/types/sharia/sharia.types.spec.ts`:

```ts
import { SHARIA_MIGRATED_COMMENT, SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from './sharia.types';

describe('Sharia shared types', () => {
  it('has exactly three review states', () => {
    expect(Object.values(ShariaStatus)).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });

  it('names the two machine-written review comments', () => {
    expect(SHARIA_SUPERSEDED_COMMENT).toBe('SUPERSEDED');
    expect(SHARIA_MIGRATED_COMMENT).toBe('MIGRATED');
  });

  it('keeps its states distinct from the platform ApprovalStatus, which has four', () => {
    expect(Object.values(ShariaStatus)).not.toContain('PENDING_UPDATE');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest sharia.types --runInBand`
Expected: FAIL — `Cannot find module './sharia.types'`.

- [ ] **Step 3: Write the types**

Create `lib/shared-types/src/lib/types/sharia/sharia.types.ts`:

```ts
/**
 * The academy's own content gate, run by a Sharia reviewer before students see anything.
 * Deliberately separate from the platform-level `ApprovalStatus`, which the platform admin uses
 * to review organizations that are not verified yet. Both gates must pass.
 */
export enum ShariaStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Written as the review comment when a newer edit replaces a version still awaiting review. */
export const SHARIA_SUPERSEDED_COMMENT = 'SUPERSEDED';
/** Written as the review comment on the version the one-time migration creates for existing content. */
export const SHARIA_MIGRATED_COMMENT = 'MIGRATED';
```

Create `lib/shared-types/src/lib/messages/sharia-errors.enum.ts`:

```ts
/** Sharia review message keys, translated by the client under its `errors` namespace. */
export enum ShariaErrors {
  CONTENT_NOT_FOUND = 'shariaContentNotFound',
  VERSION_NOT_FOUND = 'shariaVersionNotFound',
  VERSION_ALREADY_REVIEWED = 'shariaVersionAlreadyReviewed',
  VERSION_NOT_PENDING = 'shariaVersionNotPending',
  REJECT_COMMENT_REQUIRED = 'shariaRejectCommentRequired',
}
```

Add `SHARIA_REVIEW = 'SHARIA_REVIEW',` to `Subjects`, directly before `ALL = '*'`.

Export both new modules from the barrels. Open `lib/shared-types/src/lib/types/index.ts` (or whichever barrel re-exports the sibling type folders — follow how `types/academics` and `types/approval` are exported) and `lib/shared-types/src/lib/messages/` likewise, and add the matching lines. Confirm `import { ShariaStatus, ShariaErrors } from '@darnozom/shared-types';` resolves before moving on.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest sharia.types --runInBand`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/shared-types/src
git commit -m "feat(sp4): add Sharia review shared types, error keys and subject"
```

---

### Task 2: ContentVersion entity and the content fields

**Files:**
- Create: `apps/server/src/course/entities/content-version.entity.ts`
- Modify: `apps/server/src/course/entities/course-content.entity.ts`
- Modify: `apps/server/src/course/course.module.ts`
- Test: `apps/server/src/course/entities/content-version.entity.spec.ts`

**Interfaces:**
- Consumes: `ShariaStatus` (Task 1).
- Produces: `ContentVersion`, `ContentVersionSchema`; the `CourseContent` fields `shariaStatus: ShariaStatus`, `currentVersion: number`, `pendingVersion: number | null`.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/entities/content-version.entity.spec.ts`:

```ts
import { ShariaStatus } from '@darnozom/shared-types';
import { ContentVersionSchema } from './content-version.entity';

describe('ContentVersionSchema', () => {
  it('numbers versions uniquely per content item', () => {
    const entry = ContentVersionSchema.indexes().find(([, options]) => options?.name === 'content_version_unique');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ contentId: 1, version: 1 });
    expect(options?.unique).toBe(true);
  });

  it('indexes the reviewer queue by organization and status', () => {
    const names = ContentVersionSchema.indexes().map(([, options]) => options?.name);
    expect(names).toContain('sharia_queue');
  });

  it('starts a version as pending review', () => {
    expect((ContentVersionSchema.path('shariaStatus') as { options: { default: unknown } }).options.default).toBe(ShariaStatus.PENDING);
  });

  it('stores the change-set as a free-form object, since content types differ', () => {
    expect(ContentVersionSchema.path('changes')).toBeDefined();
  });

  it('has no soft-delete fields, because a version is never deleted', () => {
    expect(ContentVersionSchema.path('deletedAt')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest content-version.entity --runInBand`
Expected: FAIL — `Cannot find module './content-version.entity'`.

- [ ] **Step 3: Create the entity**

Create `apps/server/src/course/entities/content-version.entity.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ShariaStatus } from '@darnozom/shared-types';

/**
 * One recorded change to a content item. Append-only: never updated after review, never deleted.
 * That is what makes "old versions are never overwritten without a record" true.
 */
@Schema({ timestamps: true })
export class ContentVersion extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CourseContent', required: true })
  contentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  /** 1 for the creation payload; afterwards one per edit, in order. */
  @Prop({ type: Number, required: true, min: 1 })
  version: number;

  /** Version 1 holds the full creation payload; later versions hold only the change-set. */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true, default: {} })
  changes: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(ShariaStatus), default: ShariaStatus.PENDING, index: true })
  shariaStatus: ShariaStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  reviewedAt: Date | null;

  /** Required on reject. Also carries SUPERSEDED and MIGRATED, which the system writes itself. */
  @Prop({ type: String, required: false, default: null })
  reviewComment: string | null;
}

export const ContentVersionSchema = SchemaFactory.createForClass(ContentVersion);
ContentVersionSchema.index({ contentId: 1, version: 1 }, { unique: true, name: 'content_version_unique' });
ContentVersionSchema.index({ organizationId: 1, shariaStatus: 1, createdAt: 1 }, { name: 'sharia_queue' });
```

- [ ] **Step 4: Add the content fields**

In `apps/server/src/course/entities/course-content.entity.ts`, add to the `CourseContent` class, directly after the existing `approvalStatus` prop so the two gates sit side by side:

```ts
  /** The academy's Sharia gate. Independent of `approvalStatus`; both must pass for a student to see it. */
  @Prop({ type: String, enum: Object.values(ShariaStatus), default: ShariaStatus.PENDING, index: true })
  shariaStatus: ShariaStatus;

  /** The version whose values are currently live for students. */
  @Prop({ type: Number, default: 1, min: 1 })
  currentVersion: number;

  /** The version awaiting review, when an edit to approved content is being held back. */
  @Prop({ type: Number, required: false, default: null })
  pendingVersion: number | null;
```

Add `ShariaStatus` to that file's `@darnozom/shared-types` import.

In `apps/server/src/course/course.module.ts`, add `import { ContentVersion, ContentVersionSchema } from './entities/content-version.entity';` and `{ name: ContentVersion.name, schema: ContentVersionSchema },` to the `MongooseModule.forFeature([...])` array.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest content-version.entity src/course --runInBand`
Expected: PASS — 5 new tests, and every existing course suite still green. A new field with a default breaks nothing, but read any failure carefully before changing a test.

- [ ] **Step 6: Type-check, lint, commit**

```bash
pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json
pnpm --filter server exec eslint src/course/entities/content-version.entity.ts src/course/entities/content-version.entity.spec.ts src/course/entities/course-content.entity.ts src/course/course.module.ts
git add apps/server/src/course
git commit -m "feat(sp4): add the ContentVersion collection and the Sharia fields on content"
```

---

### Task 3: The Sharia decision rule (pure)

**Files:**
- Create: `apps/server/src/course/services/content/sharia/sharia-decision.ts`
- Test: `apps/server/src/course/services/content/sharia/sharia-decision.spec.ts`

**Interfaces:**
- Consumes: `ShariaStatus` (Task 1).
- Produces:

```ts
export type ShariaPath = 'APPLY_AND_PEND' | 'HOLD_AS_PENDING' | 'APPLY_UNGATED';
export function decideShariaPath(shariaStatus: ShariaStatus, changes: Record<string, unknown>): ShariaPath;
export function isEditorialChange(changes: Record<string, unknown>): boolean;
export const SHARIA_BYPASS_FIELDS: ReadonlySet<string>;
```

This task carries **Review Focus 4** (an edit touching only bypass fields).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/services/content/sharia/sharia-decision.spec.ts`:

```ts
import { ShariaStatus } from '@darnozom/shared-types';
import { decideShariaPath, isEditorialChange } from './sharia-decision';

describe('isEditorialChange', () => {
  it('is false for an empty change-set', () => {
    expect(isEditorialChange({})).toBe(false);
  });

  it('is false when only publish and operational toggles changed', () => {
    expect(isEditorialChange({ publishStatus: 'PUBLISHED', publishedAt: new Date(), settings: {}, attendanceSettings: {} })).toBe(false);
  });

  it('is true as soon as one editorial field changed', () => {
    expect(isEditorialChange({ publishStatus: 'PUBLISHED', title: 'New title' })).toBe(true);
  });

  it('is true for a replaced file', () => {
    expect(isEditorialChange({ fileKey: 'uploads/new.pdf' })).toBe(true);
  });
});

describe('decideShariaPath', () => {
  it('lets a non-editorial edit through ungated, whatever the review state', () => {
    for (const status of Object.values(ShariaStatus)) {
      expect(decideShariaPath(status, { publishStatus: 'PUBLISHED' })).toBe('APPLY_UNGATED');
    }
  });

  it('applies an edit to content that was never approved and sends it back for review', () => {
    expect(decideShariaPath(ShariaStatus.PENDING, { title: 'x' })).toBe('APPLY_AND_PEND');
    expect(decideShariaPath(ShariaStatus.REJECTED, { title: 'x' })).toBe('APPLY_AND_PEND');
  });

  it('holds an edit to approved content back, so students keep seeing the approved values', () => {
    expect(decideShariaPath(ShariaStatus.APPROVED, { title: 'x' })).toBe('HOLD_AS_PENDING');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest sharia-decision --runInBand`
Expected: FAIL — `Cannot find module './sharia-decision'`.

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/course/services/content/sharia/sharia-decision.ts`:

```ts
import { ShariaStatus } from '@darnozom/shared-types';

/**
 * Fields that are operational toggles rather than editorial content. They mirror the
 * BYPASS_APPROVAL_FIELDS of `src/utils/approval.utils.ts`: publishing or un-publishing an item,
 * or flipping a download switch, is not a change a Sharia reviewer has anything to say about.
 */
export const SHARIA_BYPASS_FIELDS: ReadonlySet<string> = new Set([
  'publishStatus',
  'publishedAt',
  'settings',
  'attendanceSettings',
]);

/** True when the change-set touches at least one field a reviewer would need to read. */
export function isEditorialChange(changes: Record<string, unknown>): boolean {
  return Object.keys(changes).some((key) => !SHARIA_BYPASS_FIELDS.has(key));
}

export type ShariaPath =
  /** Write the edit now and put the item back in the queue: it was never approved anyway. */
  | 'APPLY_AND_PEND'
  /** Do not write the edit. Record it as a pending version; students keep the approved values. */
  | 'HOLD_AS_PENDING'
  /** Not editorial. Write it and leave the review state alone. */
  | 'APPLY_UNGATED';

export function decideShariaPath(shariaStatus: ShariaStatus, changes: Record<string, unknown>): ShariaPath {
  if (!isEditorialChange(changes)) return 'APPLY_UNGATED';
  return shariaStatus === ShariaStatus.APPROVED ? 'HOLD_AS_PENDING' : 'APPLY_AND_PEND';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest sharia-decision --runInBand`
Expected: PASS, 7 tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/services/content/sharia/sharia-decision.ts src/course/services/content/sharia/sharia-decision.spec.ts
git add apps/server/src/course/services/content/sharia
git commit -m "feat(sp4): add the pure rule deciding what a content edit does to its Sharia state"
```

---

### Task 4: The version store

**Files:**
- Create: `apps/server/src/course/services/content/sharia/content-version.service.ts`
- Modify: `apps/server/src/course/course.module.ts`
- Test: `apps/server/src/course/services/content/sharia/content-version.service.spec.ts`

**Interfaces:**
- Consumes: `ContentVersion` (Task 2), `ShariaStatus`, `SHARIA_SUPERSEDED_COMMENT`.
- Produces:

```ts
record(input: { organizationId; contentId; courseId; changes; createdBy }): Promise<ContentVersionLean>  // allocates the next number
listForContent(organizationId: string, contentId: string): Promise<ContentVersionLean[]>                 // newest first
findVersion(organizationId: string, contentId: string, version: number): Promise<ContentVersionLean | null>
supersedePending(contentId: Types.ObjectId, exceptVersion: number): Promise<number>
markReviewed(versionId, status: ShariaStatus, reviewerId, comment: string | null): Promise<void>
```

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/services/content/sharia/content-version.service.spec.ts`:

```ts
import { SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ContentVersionService } from './content-version.service';

const ORG = new Types.ObjectId();
const CONTENT = new Types.ObjectId();
const COURSE = new Types.ObjectId();
const AUTHOR = new Types.ObjectId();

const makeService = (highest: { version: number } | null) => {
  const created: Record<string, unknown>[] = [];
  const model = {
    findOne: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => highest }) }) })),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => created }) }) })),
    create: jest.fn(async (doc: Record<string, unknown>) => {
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
    updateMany: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  return { service: new ContentVersionService(model as never), model, created };
};

const input = { organizationId: ORG, contentId: CONTENT, courseId: COURSE, changes: { title: 'x' }, createdBy: AUTHOR };

describe('ContentVersionService.record', () => {
  it('numbers the first version 1', async () => {
    const { service } = makeService(null);
    await expect(service.record(input)).resolves.toMatchObject({ version: 1 });
  });

  it('numbers the next version one above the highest, not above the count', async () => {
    const { service } = makeService({ version: 7 });
    await expect(service.record(input)).resolves.toMatchObject({ version: 8 });
  });

  it('records a new version as pending review', async () => {
    const { service } = makeService(null);
    await expect(service.record(input)).resolves.toMatchObject({ shariaStatus: ShariaStatus.PENDING });
  });

  it('stores the change-set verbatim', async () => {
    const { service } = makeService(null);
    const result = await service.record({ ...input, changes: { title: 'x', body: '<p>y</p>' } });
    expect(result.changes).toEqual({ title: 'x', body: '<p>y</p>' });
  });
});

describe('ContentVersionService.supersedePending', () => {
  it('rejects every other pending version with the SUPERSEDED comment', async () => {
    const { service, model } = makeService(null);
    await service.supersedePending(CONTENT, 9);
    expect(model.updateMany).toHaveBeenCalledWith(
      { contentId: CONTENT, shariaStatus: ShariaStatus.PENDING, version: { $ne: 9 } },
      { $set: { shariaStatus: ShariaStatus.REJECTED, reviewComment: SHARIA_SUPERSEDED_COMMENT, reviewedAt: expect.any(Date), reviewedBy: null } }
    );
  });
});

describe('ContentVersionService.markReviewed', () => {
  it('writes the outcome only onto a version still pending, so a review cannot be redone', async () => {
    const { service, model } = makeService(null);
    const versionId = new Types.ObjectId();
    await service.markReviewed(versionId, ShariaStatus.APPROVED, AUTHOR, null);
    const [filter, update] = model.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: versionId, shariaStatus: ShariaStatus.PENDING });
    expect(update.$set).toMatchObject({ shariaStatus: ShariaStatus.APPROVED, reviewedBy: AUTHOR, reviewComment: null });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest content-version.service --runInBand`
Expected: FAIL — `Cannot find module './content-version.service'`.

- [ ] **Step 3: Write the service**

Create `apps/server/src/course/services/content/sharia/content-version.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { ContentVersion } from '../../../entities/content-version.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface ContentVersionLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  contentId: Types.ObjectId;
  courseId: Types.ObjectId;
  version: number;
  changes: Record<string, unknown>;
  createdBy: Types.ObjectId | null;
  shariaStatus: ShariaStatus;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdAt?: Date;
}

export interface RecordVersionInput {
  organizationId: Types.ObjectId | string;
  contentId: Types.ObjectId | string;
  courseId: Types.ObjectId | string;
  changes: Record<string, unknown>;
  createdBy?: Types.ObjectId | string | null;
}

@Injectable()
export class ContentVersionService {
  constructor(@InjectModel(ContentVersion.name) private readonly versionModel: Model<ContentVersion>) {}

  /** Appends a pending version, numbered one above the highest this content has ever had. */
  async record(input: RecordVersionInput): Promise<ContentVersionLean> {
    const highest = await this.versionModel
      .findOne({ contentId: oid(input.contentId) })
      .sort({ version: -1 })
      .lean<{ version: number } | null>()
      .exec();

    // One above the highest, never the count: superseded versions stay in place and still own a number.
    const version = (highest?.version ?? 0) + 1;
    const created = await this.versionModel.create({
      organizationId: oid(input.organizationId),
      contentId: oid(input.contentId),
      courseId: oid(input.courseId),
      version,
      changes: input.changes,
      createdBy: input.createdBy ? oid(input.createdBy) : null,
      shariaStatus: ShariaStatus.PENDING,
    });
    return created as unknown as ContentVersionLean;
  }

  /** Newest first — the history drawer reads most-recent-first. */
  async listForContent(organizationId: string, contentId: string): Promise<ContentVersionLean[]> {
    return this.versionModel
      .find({ organizationId: oid(organizationId), contentId: oid(contentId) })
      .sort({ version: -1 })
      .lean<ContentVersionLean[]>()
      .exec();
  }

  async findVersion(organizationId: string, contentId: string, version: number): Promise<ContentVersionLean | null> {
    return this.versionModel
      .findOne({ organizationId: oid(organizationId), contentId: oid(contentId), version })
      .lean<ContentVersionLean | null>()
      .exec();
  }

  /** A newer edit replaced the ones still waiting. They are closed as rejected, with a reason. */
  async supersedePending(contentId: Types.ObjectId | string, exceptVersion: number): Promise<number> {
    const result = await this.versionModel
      .updateMany(
        { contentId: oid(contentId), shariaStatus: ShariaStatus.PENDING, version: { $ne: exceptVersion } },
        {
          $set: {
            shariaStatus: ShariaStatus.REJECTED,
            reviewComment: SHARIA_SUPERSEDED_COMMENT,
            reviewedAt: new Date(),
            reviewedBy: null,
          },
        }
      )
      .exec();
    return result.modifiedCount;
  }

  /**
   * Records the review outcome. The `PENDING` guard is what makes approve and reject
   * single-shot: a second call, or a race between two reviewers, modifies nothing.
   */
  async markReviewed(
    versionId: Types.ObjectId | string,
    status: ShariaStatus,
    reviewerId: Types.ObjectId | string,
    comment: string | null
  ): Promise<boolean> {
    const result = await this.versionModel
      .updateOne(
        { _id: oid(versionId), shariaStatus: ShariaStatus.PENDING },
        { $set: { shariaStatus: status, reviewedBy: oid(reviewerId), reviewedAt: new Date(), reviewComment: comment } }
      )
      .exec();
    return result.modifiedCount === 1;
  }
}
```

The spec's test expects `markReviewed` to resolve without a value; it returns a boolean because Task 7 needs to know whether it won the race. Change the spec's last assertion to `await expect(service.markReviewed(...)).resolves.toBe(true);` and record a `Ruling:` line.

- [ ] **Step 4: Register the provider**

Add `ContentVersionService` to the `providers` of `apps/server/src/course/course.module.ts`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest content-version.service --runInBand`
Expected: PASS, 6 tests.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/services/content/sharia/content-version.service.ts src/course/services/content/sharia/content-version.service.spec.ts src/course/course.module.ts
git add apps/server/src/course
git commit -m "feat(sp4): add the append-only content version store"
```

---

### Task 5: The gate on create and update

**Files:**
- Create: `apps/server/src/course/services/content/sharia/sharia-gate.service.ts`
- Modify: `apps/server/src/course/services/content/course-content.service.ts`
- Modify: `apps/server/src/course/course.module.ts`
- Test: `apps/server/src/course/services/content/sharia/sharia-gate.service.spec.ts`

**Interfaces:**
- Consumes: `decideShariaPath` (Task 3), `ContentVersionService` (Task 4).
- Produces:

```ts
onCreated(content: { _id; organizationId; courseId; shariaStatus }, payload: Record<string, unknown>, authorId): Promise<void>
/** Returns true when the caller should go on and apply the edit; false when it was held back. */
beforeUpdate(content: { _id; organizationId; courseId; shariaStatus }, changes: Record<string, unknown>, authorId): Promise<boolean>
```

This task carries **Review Focus 4** end-to-end (a bypass-only edit must not re-open review).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/services/content/sharia/sharia-gate.service.spec.ts`:

```ts
import { ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ShariaGateService } from './sharia-gate.service';

const CONTENT = new Types.ObjectId();
const ORG = new Types.ObjectId();
const COURSE = new Types.ObjectId();
const AUTHOR = new Types.ObjectId();

const content = (shariaStatus: ShariaStatus) => ({ _id: CONTENT, organizationId: ORG, courseId: COURSE, shariaStatus });

const makeService = (recordedVersion = 2) => {
  const versions = {
    record: jest.fn(async (input: Record<string, unknown>) => ({ _id: new Types.ObjectId(), version: recordedVersion, ...input })),
    supersedePending: jest.fn(async () => 0),
  };
  const contentModel = { updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })) };
  return { service: new ShariaGateService(contentModel as never, versions as never), versions, contentModel };
};

describe('ShariaGateService.onCreated', () => {
  it('records the creation payload as version 1', async () => {
    const { service, versions } = makeService(1);
    await service.onCreated(content(ShariaStatus.PENDING), { title: 'Lesson 1' }, AUTHOR);
    expect(versions.record).toHaveBeenCalledWith(
      expect.objectContaining({ contentId: CONTENT, courseId: COURSE, changes: { title: 'Lesson 1' }, createdBy: AUTHOR })
    );
  });

  it('leaves the new content pending and at version 1', async () => {
    const { service, contentModel } = makeService(1);
    await service.onCreated(content(ShariaStatus.PENDING), { title: 'Lesson 1' }, AUTHOR);
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: 1, pendingVersion: null } }
    );
  });
});

describe('ShariaGateService.beforeUpdate', () => {
  it('lets a non-editorial edit through without recording a version', async () => {
    const { service, versions, contentModel } = makeService();
    await expect(service.beforeUpdate(content(ShariaStatus.APPROVED), { publishStatus: 'PUBLISHED' }, AUTHOR)).resolves.toBe(true);
    expect(versions.record).not.toHaveBeenCalled();
    expect(contentModel.updateOne).not.toHaveBeenCalled();
  });

  it('applies an edit to content that was never approved and records a pending version', async () => {
    const { service, versions, contentModel } = makeService();
    await expect(service.beforeUpdate(content(ShariaStatus.REJECTED), { title: 'fixed' }, AUTHOR)).resolves.toBe(true);
    expect(versions.record).toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: 2, pendingVersion: null } }
    );
  });

  it('holds an edit to approved content back and points pendingVersion at it', async () => {
    const { service, versions, contentModel } = makeService(5);
    await expect(service.beforeUpdate(content(ShariaStatus.APPROVED), { title: 'reworded' }, AUTHOR)).resolves.toBe(false);
    expect(versions.record).toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith({ _id: CONTENT }, { $set: { pendingVersion: 5 } });
  });

  it('supersedes an earlier pending edit when a second one arrives', async () => {
    const { service, versions } = makeService(6);
    await service.beforeUpdate(content(ShariaStatus.APPROVED), { title: 'again' }, AUTHOR);
    expect(versions.supersedePending).toHaveBeenCalledWith(CONTENT, 6);
  });

  it('does not touch the live shariaStatus when holding an edit back', async () => {
    const { service, contentModel } = makeService(5);
    await service.beforeUpdate(content(ShariaStatus.APPROVED), { title: 'reworded' }, AUTHOR);
    const [, update] = contentModel.updateOne.mock.calls[0];
    expect(update.$set).not.toHaveProperty('shariaStatus');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest sharia-gate --runInBand`
Expected: FAIL — `Cannot find module './sharia-gate.service'`.

- [ ] **Step 3: Write the gate**

Create `apps/server/src/course/services/content/sharia/sharia-gate.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShariaStatus } from '@darnozom/shared-types';
import { CourseContent } from '../../../entities/course-content.entity';
import { ContentVersionService } from './content-version.service';
import { decideShariaPath } from './sharia-decision';

interface GatedContent {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  courseId: Types.ObjectId;
  shariaStatus: ShariaStatus;
}

@Injectable()
export class ShariaGateService {
  constructor(
    @InjectModel(CourseContent.name) private readonly contentModel: Model<CourseContent>,
    private readonly versions: ContentVersionService
  ) {}

  /** Called right after a content item is created: version 1 is the full creation payload. */
  async onCreated(content: GatedContent, payload: Record<string, unknown>, authorId?: Types.ObjectId | string | null): Promise<void> {
    const version = await this.versions.record({
      organizationId: content.organizationId,
      contentId: content._id,
      courseId: content.courseId,
      changes: payload,
      createdBy: authorId ?? null,
    });
    await this.contentModel
      .updateOne(
        { _id: content._id },
        { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: version.version, pendingVersion: null } }
      )
      .exec();
  }

  /**
   * Called before an edit is written.
   *
   * Returns true when the caller should go on and apply it, false when the edit was captured as a
   * pending version instead and the live content must not change. Returning false is what keeps
   * students on the approved values while a reviewer looks at the new ones.
   */
  async beforeUpdate(content: GatedContent, changes: Record<string, unknown>, authorId?: Types.ObjectId | string | null): Promise<boolean> {
    const path = decideShariaPath(content.shariaStatus, changes);
    if (path === 'APPLY_UNGATED') return true;

    const version = await this.versions.record({
      organizationId: content.organizationId,
      contentId: content._id,
      courseId: content.courseId,
      changes,
      createdBy: authorId ?? null,
    });

    if (path === 'APPLY_AND_PEND') {
      // Nothing of this item was ever approved, so there is nothing to protect: write the edit now
      // and leave the whole item in the queue.
      await this.contentModel
        .updateOne(
          { _id: content._id },
          { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: version.version, pendingVersion: null } }
        )
        .exec();
      return true;
    }

    // HOLD_AS_PENDING: only one edit may wait at a time, so an older one is closed as superseded.
    await this.versions.supersedePending(content._id, version.version);
    await this.contentModel.updateOne({ _id: content._id }, { $set: { pendingVersion: version.version } }).exec();
    return false;
  }
}
```

- [ ] **Step 4: Call the gate from the content service**

In `apps/server/src/course/services/content/course-content.service.ts`:

Inject `private readonly shariaGate: ShariaGateService`.

In the **create** method, after the document is saved and before the notification call, add:

```ts
    await this.shariaGate.onCreated(
      { _id: created._id, organizationId: created.organizationId, courseId: created.courseId, shariaStatus: created.shariaStatus },
      createCourseContentDto as unknown as Record<string, unknown>,
      createCourseContentDto.createdBy
    );
```

Use the real local variable name the method uses for the saved document, and strip `authorization` from the payload the same way the update path does — a version record must never hold a token.

Give `update` a new trailing parameter so the reviewer can replay an approved change-set through this
same path in Task 7 without the gate catching it again:

```ts
  async update(
    contentId: string,
    createCourseContentDto: UpdateCourseContentDto,
    options: { shariaBypass?: boolean } = {}
  ) {
```

Keep the existing parameter names and types exactly as they are; only append `options`. Then, immediately after the `const { authorization, organizationId: _orgId, courseId: _cId, moduleId: _mId, createdBy: _cb, ...changes } = updateData;` destructuring and **before** any storage reservation, file deletion or `applyUpdateWithApproval` call, add:

```ts
    // options.shariaBypass is set only by ShariaReviewService.approve, replaying a change-set a
    // reviewer has already passed. Without it the gate would hold the replay back for ever.
    const proceed = options.shariaBypass
      ? true
      : await this.shariaGate.beforeUpdate(
          {
            _id: existingDoc._id,
            organizationId: existingDoc.organizationId,
            courseId: existingDoc.courseId,
            shariaStatus: existingDoc.shariaStatus,
          },
          changes as Record<string, unknown>,
          createCourseContentDto.createdBy
        );
    // The edit is parked for review; the live content, its files and its quota stay as they are.
    if (!proceed) return existingDoc;
```

Placing the guard before the quota reservation matters: a held edit must not reserve storage for a file the reviewer may reject. Move the `isFileContent` / `deltaBytes` block below the guard if it currently sits above the destructuring.

- [ ] **Step 5: Register the provider**

Add `ShariaGateService` to the `providers` of `course.module.ts`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest sharia-gate src/course --runInBand`
Expected: PASS — 7 new tests. Existing `course-content.service` specs construct the service directly, so add a `{ onCreated: jest.fn(async () => undefined), beforeUpdate: jest.fn(async () => true) }` double to each `new CourseContentService(...)` call. `beforeUpdate` defaulting to `true` keeps every existing update test behaving as before. Do not change any existing assertion.

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/services/content/sharia/sharia-gate.service.ts src/course/services/content/sharia/sharia-gate.service.spec.ts src/course/services/content/course-content.service.ts src/course/course.module.ts
git add apps/server/src/course
git commit -m "feat(sp4): gate content creation and edits behind Sharia review"
```

---
### Task 6: The queue and rejection

**Files:**
- Create: `apps/server/src/course/services/content/sharia/sharia-review.service.ts`
- Modify: `apps/server/src/course/course.module.ts`
- Test: `apps/server/src/course/services/content/sharia/sharia-reject.service.spec.ts`

**Interfaces:**
- Consumes: `ContentVersionService` (Task 4), `CourseContent`, `ShariaErrors`.
- Produces:

```ts
queue(organizationId: string): Promise<ShariaQueueItem[]>   // { contentId, contentTitle, courseId, courseName, version, createdAt, createdBy, isEdit }
versions(organizationId: string, contentId: string): Promise<ContentVersionLean[]>
version(organizationId: string, contentId: string, version: number): Promise<ShariaVersionDetail>  // { version, liveValues, pendingValues }
reject(reviewerId: string, organizationId: string, contentId: string, version: number, comment: string): Promise<void>
```

This task carries **Review Focus 2** (a rejection leaves live content untouched and visible, and the author can edit again).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/services/content/sharia/sharia-reject.service.spec.ts`:

```ts
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ShariaErrors, ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ShariaReviewService } from './sharia-review.service';

const ORG = new Types.ObjectId();
const CONTENT = new Types.ObjectId();
const REVIEWER = new Types.ObjectId();
const VERSION_ID = new Types.ObjectId();

const version = (overrides: Record<string, unknown> = {}) => ({
  _id: VERSION_ID,
  organizationId: ORG,
  contentId: CONTENT,
  courseId: new Types.ObjectId(),
  version: 3,
  changes: { title: 'Reworded' },
  createdBy: new Types.ObjectId(),
  shariaStatus: ShariaStatus.PENDING,
  reviewedBy: null,
  reviewedAt: null,
  reviewComment: null,
  ...overrides,
});

const contentDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: CONTENT,
  organizationId: ORG,
  title: 'Lesson 1',
  shariaStatus: ShariaStatus.APPROVED,
  currentVersion: 2,
  pendingVersion: 3,
  ...overrides,
});

const makeService = (foundVersion: Record<string, unknown> | null, content: Record<string, unknown> | null, markReviewedWins = true) => {
  const versions = {
    findVersion: jest.fn(async () => foundVersion),
    listForContent: jest.fn(async () => (foundVersion ? [foundVersion] : [])),
    markReviewed: jest.fn(async () => markReviewedWins),
    supersedePending: jest.fn(async () => 0),
  };
  const contentModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => content }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    aggregate: jest.fn(async () => []),
  };
  const contentService = { update: jest.fn(async () => contentDoc()) };
  const notifications = { notifyStudentsIfVisible: jest.fn(async () => undefined) };
  const cleanup = { onVersionClosed: jest.fn(async () => undefined) };
  const service = new ShariaReviewService(
    contentModel as never,
    versions as never,
    contentService as never,
    notifications as never,
    cleanup as never
  );
  return { service, versions, contentModel, contentService, notifications, cleanup };
};

describe('ShariaReviewService.reject', () => {
  it('requires a comment', async () => {
    const { service, versions } = makeService(version(), contentDoc());
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, '   ')).rejects.toThrow(
      new BadRequestException(ShariaErrors.REJECT_COMMENT_REQUIRED)
    );
    expect(versions.markReviewed).not.toHaveBeenCalled();
  });

  it('records the rejection with the reviewer’s comment', async () => {
    const { service, versions } = makeService(version(), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'Needs a source for the hadith.');
    expect(versions.markReviewed).toHaveBeenCalledWith(VERSION_ID, ShariaStatus.REJECTED, String(REVIEWER), 'Needs a source for the hadith.');
  });

  it('leaves live approved content untouched when a pending edit is rejected', async () => {
    const { service, contentModel, contentService } = makeService(version(), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.');
    expect(contentService.update).not.toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith({ _id: CONTENT }, { $set: { pendingVersion: null } });
  });

  it('marks never-approved content rejected, so the author sees why', async () => {
    const neverApproved = contentDoc({ shariaStatus: ShariaStatus.PENDING, currentVersion: 3, pendingVersion: null });
    const { service, contentModel } = makeService(version(), neverApproved);
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'Not acceptable.');
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.REJECTED, pendingVersion: null } }
    );
  });

  it('never notifies students on a rejection', async () => {
    const { service, notifications } = makeService(version(), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.');
    expect(notifications.notifyStudentsIfVisible).not.toHaveBeenCalled();
  });

  it('asks the cleanup service to consider the rejected version’s file', async () => {
    const { service, cleanup } = makeService(version({ changes: { fileKey: 'uploads/a.pdf' } }), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.');
    expect(cleanup.onVersionClosed).toHaveBeenCalledWith(CONTENT, { fileKey: 'uploads/a.pdf' });
  });

  it('404s on a version that does not exist', async () => {
    const { service } = makeService(null, contentDoc());
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 9, 'No.')).rejects.toThrow(
      new NotFoundException(ShariaErrors.VERSION_NOT_FOUND)
    );
  });

  it('409s on a version someone already reviewed', async () => {
    const { service } = makeService(version({ shariaStatus: ShariaStatus.APPROVED }), contentDoc());
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.')).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
  });

  it('409s when another reviewer won the race', async () => {
    const { service } = makeService(version(), contentDoc(), false);
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.')).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest sharia-reject --runInBand`
Expected: FAIL — `Cannot find module './sharia-review.service'`.

- [ ] **Step 3: Write the service with its queue and reject paths**

Create `apps/server/src/course/services/content/sharia/sharia-review.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShariaErrors, ShariaStatus } from '@darnozom/shared-types';
import { CourseContent } from '../../../entities/course-content.entity';
import { CourseContentService } from '../course-content.service';
import { CourseContentNotificationService } from '../notification/course-content-notification.service';
import { ContentVersionLean, ContentVersionService } from './content-version.service';
import { ShariaFileCleanupService } from './sharia-file-cleanup.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface ShariaQueueItem {
  contentId: string;
  contentTitle: string;
  courseId: string;
  version: number;
  createdAt: Date | null;
  createdBy: string | null;
  /** True when the live content is already approved and this version is a held-back edit. */
  isEdit: boolean;
}

interface ContentForReview {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  title: string;
  shariaStatus: ShariaStatus;
  currentVersion: number;
  pendingVersion: number | null;
}

@Injectable()
export class ShariaReviewService {
  constructor(
    @InjectModel(CourseContent.name) private readonly contentModel: Model<CourseContent>,
    private readonly versions: ContentVersionService,
    private readonly contentService: CourseContentService,
    private readonly notifications: CourseContentNotificationService,
    private readonly cleanup: ShariaFileCleanupService
  ) {}

  /** Everything waiting for a reviewer in this organization, oldest first. */
  async queue(organizationId: string): Promise<ShariaQueueItem[]> {
    const rows = await this.contentModel.aggregate<{
      _id: Types.ObjectId;
      version: number;
      createdAt: Date | null;
      createdBy: Types.ObjectId | null;
      title: string;
      courseId: Types.ObjectId;
      contentShariaStatus: ShariaStatus;
    }>([
      { $match: { organizationId: oid(organizationId), deletedAt: null } },
      {
        $lookup: {
          from: 'contentversions',
          let: { contentId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$contentId', '$$contentId'] }, shariaStatus: ShariaStatus.PENDING } },
            { $sort: { version: -1 } },
            { $limit: 1 },
          ],
          as: 'pending',
        },
      },
      { $unwind: '$pending' },
      {
        $project: {
          _id: 1,
          title: 1,
          courseId: 1,
          contentShariaStatus: '$shariaStatus',
          version: '$pending.version',
          createdAt: '$pending.createdAt',
          createdBy: '$pending.createdBy',
        },
      },
      { $sort: { createdAt: 1 } },
    ]);

    return rows.map((row) => ({
      contentId: String(row._id),
      contentTitle: row.title,
      courseId: String(row.courseId),
      version: row.version,
      createdAt: row.createdAt ?? null,
      createdBy: row.createdBy ? String(row.createdBy) : null,
      isEdit: row.contentShariaStatus === ShariaStatus.APPROVED,
    }));
  }

  async versions(organizationId: string, contentId: string): Promise<ContentVersionLean[]> {
    return this.versions.listForContent(organizationId, contentId);
  }

  /** Rejects a version. A comment is required: the author needs to know what to change. */
  async reject(
    reviewerId: string,
    organizationId: string,
    contentId: string,
    version: number,
    comment: string
  ): Promise<void> {
    const trimmed = comment?.trim();
    if (!trimmed) throw new BadRequestException(ShariaErrors.REJECT_COMMENT_REQUIRED);

    const { versionDoc, content } = await this.loadPending(organizationId, contentId, version);

    const won = await this.versions.markReviewed(versionDoc._id, ShariaStatus.REJECTED, reviewerId, trimmed);
    if (!won) throw new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED);

    // A held-back edit leaves the live content exactly as it was; only the pointer is cleared, so
    // students keep seeing the approved values and the author can edit again straight away.
    const set: Record<string, unknown> =
      content.shariaStatus === ShariaStatus.APPROVED
        ? { pendingVersion: null }
        : { shariaStatus: ShariaStatus.REJECTED, pendingVersion: null };
    await this.contentModel.updateOne({ _id: content._id }, { $set: set }).exec();

    await this.cleanup.onVersionClosed(content._id, versionDoc.changes);
  }

  /** Shared load-and-validate for approve and reject. */
  protected async loadPending(
    organizationId: string,
    contentId: string,
    version: number
  ): Promise<{ versionDoc: ContentVersionLean; content: ContentForReview }> {
    const versionDoc = await this.versions.findVersion(organizationId, contentId, version);
    if (!versionDoc) throw new NotFoundException(ShariaErrors.VERSION_NOT_FOUND);
    if (versionDoc.shariaStatus !== ShariaStatus.PENDING) throw new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED);

    const content = await this.contentModel
      .findOne({ _id: oid(contentId), organizationId: oid(organizationId) })
      .lean<ContentForReview | null>()
      .exec();
    if (!content) throw new NotFoundException(ShariaErrors.CONTENT_NOT_FOUND);

    return { versionDoc, content };
  }
}
```

The `contentversions` collection name in the `$lookup` must match what Mongoose pluralises `ContentVersion` to. Verify it with `mongoose.model('ContentVersion').collection.name` or in Compass before trusting the aggregate, and fix the string if it differs.

- [ ] **Step 4: Register the provider**

Add `ShariaReviewService` to the `providers` of `course.module.ts`. It injects `CourseContentService`, which already lives in that module.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest sharia-reject --runInBand`
Expected: PASS, 9 tests. `ShariaFileCleanupService` does not exist yet — create it as an empty injectable stub with `async onVersionClosed(): Promise<void> {}` now so this task compiles, and fill it in Task 8.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/services/content/sharia/sharia-review.service.ts src/course/services/content/sharia/sharia-reject.service.spec.ts src/course/services/content/sharia/sharia-file-cleanup.service.ts src/course/course.module.ts
git add apps/server/src/course
git commit -m "feat(sp4): add the Sharia review queue and rejection"
```

---

### Task 7: Approval, replaying the change-set

**Files:**
- Modify: `apps/server/src/course/services/content/sharia/sharia-review.service.ts`
- Test: `apps/server/src/course/services/content/sharia/sharia-approve.service.spec.ts`

**Interfaces:**
- Consumes: `loadPending` and `markReviewed` (Task 6), `CourseContentService.update(contentId, dto, { shariaBypass: true })` (Task 5).
- Produces: `approve(reviewerId: string, organizationId: string, contentId: string, version: number): Promise<void>`.

This task carries **Review Focus 1** (approving a superseded or already-reviewed version).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/services/content/sharia/sharia-approve.service.spec.ts`:

```ts
import { ConflictException } from '@nestjs/common';
import { ShariaErrors, SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ShariaReviewService } from './sharia-review.service';

const ORG = new Types.ObjectId();
const CONTENT = new Types.ObjectId();
const REVIEWER = new Types.ObjectId();
const VERSION_ID = new Types.ObjectId();

const version = (overrides: Record<string, unknown> = {}) => ({
  _id: VERSION_ID,
  organizationId: ORG,
  contentId: CONTENT,
  courseId: new Types.ObjectId(),
  version: 3,
  changes: { title: 'Reworded' },
  createdBy: new Types.ObjectId(),
  shariaStatus: ShariaStatus.PENDING,
  reviewedBy: null,
  reviewedAt: null,
  reviewComment: null,
  ...overrides,
});

const contentDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: CONTENT,
  organizationId: ORG,
  title: 'Lesson 1',
  shariaStatus: ShariaStatus.APPROVED,
  currentVersion: 2,
  pendingVersion: 3,
  ...overrides,
});

const makeService = (foundVersion: Record<string, unknown> | null, content: Record<string, unknown> | null, markReviewedWins = true) => {
  const versions = {
    findVersion: jest.fn(async () => foundVersion),
    listForContent: jest.fn(async () => []),
    markReviewed: jest.fn(async () => markReviewedWins),
    supersedePending: jest.fn(async () => 0),
  };
  const contentModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => content }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    aggregate: jest.fn(async () => []),
  };
  const contentService = { update: jest.fn(async () => contentDoc()) };
  const notifications = { notifyStudentsIfVisible: jest.fn(async () => undefined) };
  const cleanup = { onVersionClosed: jest.fn(async () => undefined) };
  const service = new ShariaReviewService(
    contentModel as never,
    versions as never,
    contentService as never,
    notifications as never,
    cleanup as never
  );
  return { service, versions, contentModel, contentService, notifications };
};

describe('ShariaReviewService.approve — a held-back edit', () => {
  it('replays the change-set through the existing update path, bypassing the gate', async () => {
    const { service, contentService } = makeService(version(), contentDoc());
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(contentService.update).toHaveBeenCalledWith(String(CONTENT), expect.objectContaining({ title: 'Reworded' }), {
      shariaBypass: true,
    });
  });

  it('moves currentVersion to the approved version and clears the pointer', async () => {
    const { service, contentModel } = makeService(version(), contentDoc());
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: 3, pendingVersion: null } }
    );
  });

  it('records the approval against the version', async () => {
    const { service, versions } = makeService(version(), contentDoc());
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(versions.markReviewed).toHaveBeenCalledWith(VERSION_ID, ShariaStatus.APPROVED, String(REVIEWER), null);
  });
});

describe('ShariaReviewService.approve — content that was never approved', () => {
  it('applies no replay, because the values are already on the document', async () => {
    const neverApproved = contentDoc({ shariaStatus: ShariaStatus.PENDING, currentVersion: 3, pendingVersion: null });
    const { service, contentService, contentModel } = makeService(version(), neverApproved);
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(contentService.update).not.toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: 3, pendingVersion: null } }
    );
  });

  it('notifies students, which is the first moment they may see it', async () => {
    const neverApproved = contentDoc({ shariaStatus: ShariaStatus.PENDING, currentVersion: 3, pendingVersion: null });
    const { service, notifications } = makeService(version(), neverApproved);
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(notifications.notifyStudentsIfVisible).toHaveBeenCalledWith(String(CONTENT), undefined);
  });
});

describe('ShariaReviewService.approve — guards', () => {
  it('refuses a version a newer edit superseded', async () => {
    const superseded = version({ shariaStatus: ShariaStatus.REJECTED, reviewComment: SHARIA_SUPERSEDED_COMMENT });
    const { service, contentService } = makeService(superseded, contentDoc({ pendingVersion: 4 }));
    await expect(service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3)).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
    expect(contentService.update).not.toHaveBeenCalled();
  });

  it('refuses a version that is not the one the content is waiting on', async () => {
    const { service, contentService } = makeService(version({ version: 3 }), contentDoc({ pendingVersion: 4 }));
    await expect(service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3)).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_NOT_PENDING)
    );
    expect(contentService.update).not.toHaveBeenCalled();
  });

  it('refuses when another reviewer won the race, and never replays', async () => {
    const { service, contentService } = makeService(version(), contentDoc(), false);
    await expect(service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3)).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
    expect(contentService.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest sharia-approve --runInBand`
Expected: FAIL — `service.approve is not a function`.

- [ ] **Step 3: Add the approve method**

Add to `ShariaReviewService`:

```ts
  /**
   * Approves a version. For a held-back edit the stored change-set is replayed through
   * `CourseContentService.update`, so the platform `applyUpdateWithApproval` path, the storage
   * accounting, the file cleanup and the transcription re-enqueue all behave exactly as they do
   * for a normal edit. Nothing here writes `approvalStatus` itself.
   */
  async approve(reviewerId: string, organizationId: string, contentId: string, version: number): Promise<void> {
    const { versionDoc, content } = await this.loadPending(organizationId, contentId, version);

    const isHeldEdit = content.shariaStatus === ShariaStatus.APPROVED;
    // A held edit is only approvable while it is still the one the content points at. If a newer
    // edit arrived, this one was superseded and approving it would overwrite the newer values.
    if (isHeldEdit && content.pendingVersion !== versionDoc.version) {
      throw new ConflictException(ShariaErrors.VERSION_NOT_PENDING);
    }

    // Claim the review before touching the content, so a lost race changes nothing.
    const won = await this.versions.markReviewed(versionDoc._id, ShariaStatus.APPROVED, reviewerId, null);
    if (!won) throw new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED);

    if (isHeldEdit) {
      await this.contentService.update(String(content._id), versionDoc.changes as never, { shariaBypass: true });
    }

    await this.contentModel
      .updateOne(
        { _id: content._id },
        { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: versionDoc.version, pendingVersion: null } }
      )
      .exec();

    if (!isHeldEdit) {
      // The replay already fires this from inside update; for a first approval nothing else would.
      await this.notifications.notifyStudentsIfVisible(String(content._id), undefined);
    }
  }
```

Check `notifyStudentsIfVisible`'s real signature in `course-content-notification.service.ts` and pass what it actually takes; if its second parameter is a required author id, pass `versionDoc.createdBy ? String(versionDoc.createdBy) : undefined` and update the test's expectation to match.

- [ ] **Step 4: Run both review suites to verify they pass**

Run: `pnpm --filter server exec jest sharia-approve sharia-reject --runInBand`
Expected: PASS — 8 approve tests and the 9 reject tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/services/content/sharia/sharia-review.service.ts src/course/services/content/sharia/sharia-approve.service.spec.ts
git add apps/server/src/course
git commit -m "feat(sp4): approve a Sharia version by replaying its change-set"
```

---

### Task 8: File cleanup

**Files:**
- Modify: `apps/server/src/course/services/content/sharia/sharia-file-cleanup.service.ts`
- Test: `apps/server/src/course/services/content/sharia/sharia-file-cleanup.service.spec.ts`

**Interfaces:**
- Consumes: `ContentVersion` (Task 2), the existing `FileService.deleteFile(key: string)`.
- Produces: `onVersionClosed(contentId: Types.ObjectId | string, changes: Record<string, unknown>): Promise<void>`.

This task carries **Review Focus 5** (a file replaced across two pending edits).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/services/content/sharia/sharia-file-cleanup.service.spec.ts`:

```ts
import { ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ShariaFileCleanupService } from './sharia-file-cleanup.service';

const CONTENT = new Types.ObjectId();

const makeService = (approvedCount: number, liveFileKey: string | null = null) => {
  const versionModel = { countDocuments: jest.fn(() => ({ exec: async () => approvedCount })) };
  const contentModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => ({ _id: CONTENT, fileKey: liveFileKey }) }) })) };
  const files = { deleteFile: jest.fn(async () => undefined) };
  return { service: new ShariaFileCleanupService(versionModel as never, contentModel as never, files as never), versionModel, files };
};

describe('ShariaFileCleanupService.onVersionClosed', () => {
  it('does nothing when the closed version carried no file', async () => {
    const { service, files } = makeService(0);
    await service.onVersionClosed(CONTENT, { title: 'x' });
    expect(files.deleteFile).not.toHaveBeenCalled();
  });

  it('deletes the orphaned file when no approved version references it', async () => {
    const { service, files } = makeService(0);
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/rejected.pdf' });
    expect(files.deleteFile).toHaveBeenCalledWith('uploads/rejected.pdf');
  });

  it('keeps the file when an approved version still references it', async () => {
    const { service, files } = makeService(1);
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/shared.pdf' });
    expect(files.deleteFile).not.toHaveBeenCalled();
  });

  it('keeps the file when it is the one the live content is serving', async () => {
    const { service, files } = makeService(0, 'uploads/live.pdf');
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/live.pdf' });
    expect(files.deleteFile).not.toHaveBeenCalled();
  });

  it('asks only about approved versions holding that exact key', async () => {
    const { service, versionModel } = makeService(0);
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/a.pdf' });
    expect(versionModel.countDocuments).toHaveBeenCalledWith({
      contentId: CONTENT,
      shariaStatus: ShariaStatus.APPROVED,
      'changes.fileKey': 'uploads/a.pdf',
    });
  });

  it('swallows a storage failure, because a stranded file must not fail a review', async () => {
    const { service, files } = makeService(0);
    files.deleteFile.mockRejectedValueOnce(new Error('S3 unavailable'));
    await expect(service.onVersionClosed(CONTENT, { fileKey: 'uploads/a.pdf' })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest sharia-file-cleanup --runInBand`
Expected: FAIL — the stub from Task 6 takes no constructor arguments and deletes nothing.

- [ ] **Step 3: Replace the stub with the implementation**

Rewrite `apps/server/src/course/services/content/sharia/sharia-file-cleanup.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShariaStatus } from '@darnozom/shared-types';
import { FileService } from 'src/file/file.service';
import { ContentVersion } from '../../../entities/content-version.entity';
import { CourseContent } from '../../../entities/course-content.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class ShariaFileCleanupService {
  private readonly logger = new Logger(ShariaFileCleanupService.name);

  constructor(
    @InjectModel(ContentVersion.name) private readonly versionModel: Model<ContentVersion>,
    @InjectModel(CourseContent.name) private readonly contentModel: Model<CourseContent>,
    private readonly files: FileService
  ) {}

  /**
   * A superseded or rejected version's upload is deleted only when nothing still needs it: no
   * approved version references the key, and the live content is not serving it. Two pending edits
   * can name the same key, so counting references is the only safe test.
   */
  async onVersionClosed(contentId: Types.ObjectId | string, changes: Record<string, unknown>): Promise<void> {
    const fileKey = changes?.fileKey;
    if (typeof fileKey !== 'string' || fileKey.length === 0) return;

    const approved = await this.versionModel
      .countDocuments({ contentId: oid(contentId), shariaStatus: ShariaStatus.APPROVED, 'changes.fileKey': fileKey })
      .exec();
    if (approved > 0) return;

    const content = await this.contentModel
      .findOne({ _id: oid(contentId) })
      .lean<{ _id: Types.ObjectId; fileKey?: string | null } | null>()
      .exec();
    if (content?.fileKey === fileKey) return;

    try {
      await this.files.deleteFile(fileKey);
    } catch (error) {
      // An orphaned object costs storage; a failed review costs the reviewer their work.
      this.logger.error(`Could not delete the orphaned upload ${fileKey}: ${(error as Error).message}`);
    }
  }
}
```

Check `FileService`'s real import path and its delete method's name and signature in `apps/server/src/file/`; `course-content.service.ts` already calls `this.fileService.deleteFile(...)`, so copy from there.

- [ ] **Step 4: Register the provider**

`ShariaFileCleanupService` is already in `providers` from Task 6. Confirm `FileService` is available in `course.module.ts` — `CourseContentService` already injects it, so it is.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter server exec jest sharia-file-cleanup sharia-reject --runInBand`
Expected: PASS — 6 cleanup tests, 9 reject tests.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/services/content/sharia/sharia-file-cleanup.service.ts src/course/services/content/sharia/sharia-file-cleanup.service.spec.ts
git add apps/server/src/course
git commit -m "feat(sp4): delete an orphaned upload only when no approved version holds it"
```

---

### Task 9: Student visibility

**Files:**
- Modify: `apps/server/src/course/services/content/course-content-query.service.ts`
- Modify: `apps/server/src/course/services/content/notification/course-content-notification.service.ts`
- Modify: `apps/server/src/course/services/course/course-featured.service.ts`
- Create: `apps/server/src/course/services/content/sharia/student-visible-filter.ts`
- Test: `apps/server/src/course/services/content/sharia/student-visible-filter.spec.ts`

**Interfaces:**
- Consumes: `APPROVED_STATUSES` from `src/utils/approval.utils`, `ShariaStatus`.
- Produces: `STUDENT_VISIBLE_CONTENT_FILTER: { approvalStatus: { $in: ApprovalStatus[] }; shariaStatus: ShariaStatus.APPROVED }`.

This task carries **Review Focus 3** (both gates must pass independently).

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/course/services/content/sharia/student-visible-filter.spec.ts`:

```ts
import { ApprovalStatus, ShariaStatus } from '@darnozom/shared-types';
import { APPROVED_STATUSES } from 'src/utils/approval.utils';
import { STUDENT_VISIBLE_CONTENT_FILTER, isStudentVisible } from './student-visible-filter';

describe('STUDENT_VISIBLE_CONTENT_FILTER', () => {
  it('keeps the platform approval filter exactly as it is', () => {
    expect(STUDENT_VISIBLE_CONTENT_FILTER.approvalStatus).toEqual({ $in: APPROVED_STATUSES });
  });

  it('adds the Sharia gate beside it', () => {
    expect(STUDENT_VISIBLE_CONTENT_FILTER.shariaStatus).toBe(ShariaStatus.APPROVED);
  });
});

describe('isStudentVisible', () => {
  it('is true only when both gates pass', () => {
    expect(isStudentVisible(ApprovalStatus.APPROVED, ShariaStatus.APPROVED)).toBe(true);
    expect(isStudentVisible(ApprovalStatus.PENDING_UPDATE, ShariaStatus.APPROVED)).toBe(true);
  });

  it('hides content the Sharia reviewer has not passed, even once the platform approved it', () => {
    expect(isStudentVisible(ApprovalStatus.APPROVED, ShariaStatus.PENDING)).toBe(false);
    expect(isStudentVisible(ApprovalStatus.APPROVED, ShariaStatus.REJECTED)).toBe(false);
  });

  it('hides content the platform has not approved, even once the reviewer passed it', () => {
    expect(isStudentVisible(ApprovalStatus.PENDING, ShariaStatus.APPROVED)).toBe(false);
    expect(isStudentVisible(ApprovalStatus.REJECTED, ShariaStatus.APPROVED)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest student-visible-filter --runInBand`
Expected: FAIL — `Cannot find module './student-visible-filter'`.

- [ ] **Step 3: Write the filter**

Create `apps/server/src/course/services/content/sharia/student-visible-filter.ts`:

```ts
import { ApprovalStatus, ShariaStatus } from '@darnozom/shared-types';
import { APPROVED_STATUSES } from 'src/utils/approval.utils';

/**
 * The two gates a content item passes before a student sees it. They are independent: the platform
 * gate is the platform admin reviewing an unverified organization, the Sharia gate is the academy
 * reviewing its own material. Neither one implies the other.
 */
export const STUDENT_VISIBLE_CONTENT_FILTER = {
  approvalStatus: { $in: APPROVED_STATUSES },
  shariaStatus: ShariaStatus.APPROVED,
} as const;

export function isStudentVisible(approvalStatus: ApprovalStatus, shariaStatus: ShariaStatus): boolean {
  return APPROVED_STATUSES.includes(approvalStatus) && shariaStatus === ShariaStatus.APPROVED;
}
```

- [ ] **Step 4: Apply it at every student-facing read**

Find every place a **content** query filters on `APPROVED_STATUSES`:

```bash
cd C:/COURSES/work/darnozom/academy && grep -rn "APPROVED_STATUSES" apps/server/src --include=*.ts
```

The spec names three files: `course-content-query.service.ts`, `course-content-notification.service.ts` and `course-featured.service.ts`. In each, replace a content-collection filter such as

```ts
      matchStage.approvalStatus = { $in: APPROVED_STATUSES };
```

with

```ts
      Object.assign(matchStage, STUDENT_VISIBLE_CONTENT_FILTER);
```

**Leave course-level filters alone.** `course.service.ts` and some `course-featured.service.ts` stages filter the `Course` collection, which has no `shariaStatus` — adding the filter there would hide every course. Before each edit, confirm from the surrounding pipeline which collection the stage runs against, and change only the content ones. List in the ledger each line number you changed and each you deliberately did not.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest student-visible-filter src/course --runInBand`
Expected: PASS — 7 new tests. Existing content-query tests that assert a student can read approved content will now fail, because their fixtures have no `shariaStatus`. Add `shariaStatus: ShariaStatus.APPROVED` to those fixtures — the content is meant to be visible — and do not weaken the filter.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/services/content/sharia/student-visible-filter.ts src/course/services/content/sharia/student-visible-filter.spec.ts src/course/services/content/course-content-query.service.ts src/course/services/content/notification/course-content-notification.service.ts src/course/services/course/course-featured.service.ts
git add apps/server/src/course
git commit -m "feat(sp4): hide content from students until the Sharia reviewer approves it"
```

---

### Task 10: The API and the permissions

**Files:**
- Create: `apps/server/src/course/controller/message/sharia.controller.message.ts`
- Create: `apps/server/src/course/dto/sharia.dto.ts`
- Modify: `apps/server/src/course/course.module.ts`
- Modify: `apps/server/src/role/seeds/role.sharia-reviewer.config.ts`
- Modify: `apps/server/src/role/seeds/role.content-officer.config.ts`
- Modify: `apps/server/src/role/seeds/role.manager.config.ts`
- Test: `apps/server/src/role/seeds/roles.config.spec.ts` (extend)

**Interfaces:**
- Consumes: `ShariaReviewService` (Tasks 6 and 7).
- Produces: message patterns `course.sharia.queue`, `course.sharia.versions`, `course.sharia.approve`, `course.sharia.reject`.

- [ ] **Step 1: Write the failing test**

Extend `apps/server/src/role/seeds/roles.config.spec.ts`:

```ts
  it('lets the Sharia reviewer manage reviews and read content, and nothing financial', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.SHARIA_REVIEWER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW });
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.CONTENT });
    for (const financial of [Subjects.PAYMENT, Subjects.WALLET, Subjects.PLAN]) {
      expect(permissions.some((rule) => rule.subject === financial)).toBe(false);
    }
  });

  it('lets the content officer manage content and modules but not review it', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.CONTENT_OFFICER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.CONTENT });
    expect(permissions).toContainEqual({ action: Actions.MANAGE, subject: Subjects.MODULE });
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.COURSE });
    expect(permissions.some((rule) => rule.subject === Subjects.SHARIA_REVIEW)).toBe(false);
  });

  it('lets the manager watch the review queue without approving anything', () => {
    const permissions = ROLE_SEED_DEFINITIONS.find((seed) => seed.name === Roles.MANAGER)?.permissions ?? [];
    expect(permissions).toContainEqual({ action: Actions.READ, subject: Subjects.SHARIA_REVIEW });
    expect(permissions).not.toContainEqual({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest roles.config --runInBand`
Expected: FAIL — the Sharia reviewer and content officer seeds are both empty arrays today.

- [ ] **Step 3: Fill in the role seeds**

`role.sharia-reviewer.config.ts`:

```ts
import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

/**
 * Reviews the academy's own material. Deliberately holds no financial subject: the concept's rule
 * is that content staff cannot see financial data.
 */
export const SHARIA_REVIEWER_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW },
  { action: Actions.READ, subject: Subjects.CONTENT },
  { action: Actions.READ, subject: Subjects.MODULE },
  { action: Actions.READ, subject: Subjects.COURSE },
];

export const SHARIA_REVIEWER_SEED: RoleSeedEntry = { name: Roles.SHARIA_REVIEWER, permissions: SHARIA_REVIEWER_PERMISSIONS };
```

`role.content-officer.config.ts`:

```ts
import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { RolePermissionRule, RoleSeedEntry } from './role.types';

/** Authors content. Their edits go through the same Sharia gate as anyone else's. */
export const CONTENT_OFFICER_PERMISSIONS: RolePermissionRule[] = [
  { action: Actions.MANAGE, subject: Subjects.CONTENT },
  { action: Actions.MANAGE, subject: Subjects.MODULE },
  { action: Actions.READ, subject: Subjects.COURSE },
];

export const CONTENT_OFFICER_SEED: RoleSeedEntry = { name: Roles.CONTENT_OFFICER, permissions: CONTENT_OFFICER_PERMISSIONS };
```

Add `{ action: Actions.READ, subject: Subjects.SHARIA_REVIEW },` to `MANAGER_PERMISSIONS`. `OWNER_SEED` reuses `ADMIN_PERMISSIONS`; add the same read rule there if that array does not already grant `MANAGE` on `Subjects.ALL`.

- [ ] **Step 4: Write the DTOs and the controller**

Create `apps/server/src/course/dto/sharia.dto.ts`:

```ts
import { IsInt, IsMongoId, IsString, Min, MinLength } from 'class-validator';

export class ShariaVersionPayload {
  @IsMongoId()
  contentId: string;

  @IsInt()
  @Min(1)
  version: number;
}

export class ShariaRejectPayload extends ShariaVersionPayload {
  @IsString()
  @MinLength(1)
  comment: string;
}

export class ShariaContentPayload {
  @IsMongoId()
  contentId: string;
}
```

Create `apps/server/src/course/controller/message/sharia.controller.message.ts`:

```ts
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { ShariaReviewService } from '../../services/content/sharia/sharia-review.service';
import { ShariaContentPayload, ShariaRejectPayload, ShariaVersionPayload } from '../../dto/sharia.dto';

@Controller()
@ApplyRpcErrorHandling
export class ShariaControllerMessage {
  constructor(private readonly review: ShariaReviewService) {}

  /** READ, not MANAGE: owners and managers may watch the queue without being able to act on it. */
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.queue')
  queue(@Ctx() context: IUserContext) {
    return this.review.queue(String(context.userPayload.organizationId));
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.versions')
  versions(@Payload(new RpcValidationPipe()) payload: ShariaContentPayload, @Ctx() context: IUserContext) {
    return this.review.versions(String(context.userPayload.organizationId), payload.contentId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.approve')
  approve(@Payload(new RpcValidationPipe()) payload: ShariaVersionPayload, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.review.approve(String(user._id), String(user.organizationId), payload.contentId, payload.version);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.reject')
  reject(@Payload(new RpcValidationPipe()) payload: ShariaRejectPayload, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.review.reject(String(user._id), String(user.organizationId), payload.contentId, payload.version, payload.comment);
  }
}
```

Register `ShariaControllerMessage` in the `controllers` array of `course.module.ts`.

A content author also needs to read their own item's history. Add one more pattern to the same controller, guarded on content rather than review:

```ts
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @MessagePattern('course.sharia.myVersions')
  myVersions(@Payload(new RpcValidationPipe()) payload: ShariaContentPayload, @Ctx() context: IUserContext) {
    return this.review.versions(String(context.userPayload.organizationId), payload.contentId);
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter server exec jest roles.config --runInBand`
Expected: PASS, including the three new cases.

- [ ] **Step 6: Apply the role changes**

Run: `pnpm --filter server seed:prod`
Expected: completes without error. **Never run `pnpm seed`.**

- [ ] **Step 7: Lint and commit**

```bash
pnpm --filter server exec eslint src/course/controller/message/sharia.controller.message.ts src/course/dto/sharia.dto.ts src/role/seeds/role.sharia-reviewer.config.ts src/role/seeds/role.content-officer.config.ts src/role/seeds/role.manager.config.ts src/role/seeds/roles.config.spec.ts src/course/course.module.ts
git add apps/server/src
git commit -m "feat(sp4): expose the Sharia review API and grant the content roles their permissions"
```

---

### Task 11: The migration

**Files:**
- Create: `apps/server/src/database/migrations/migrate-content-sharia-approved.ts`
- Modify: `apps/server/package.json`
- Modify: `apps/server/src/database/migrations/run-all-migrations.ts`
- Test: `apps/server/src/database/migrations/migrate-content-sharia-approved.spec.ts`

**Interfaces:**
- Consumes: `ContentVersion` (Task 2), `SHARIA_MIGRATED_COMMENT`.
- Produces: the pure `buildMigrationVersion(content)` helper plus the runnable script `pnpm --filter server migrate:content-sharia`.

**Without this migration every existing content item disappears for students** the moment Task 9 ships. Run it in the same deployment.

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/database/migrations/migrate-content-sharia-approved.spec.ts`:

```ts
import { SHARIA_MIGRATED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { buildMigrationVersion } from './migrate-content-sharia-approved';

const content = {
  _id: new Types.ObjectId(),
  organizationId: new Types.ObjectId(),
  courseId: new Types.ObjectId(),
  title: 'Lesson 1',
  type: 'ARTICLE',
  fileKey: 'uploads/a.pdf',
  approvalStatus: 'APPROVED',
  pendingUpdate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

describe('buildMigrationVersion', () => {
  it('creates version 1, already approved', () => {
    const version = buildMigrationVersion(content);
    expect(version.version).toBe(1);
    expect(version.shariaStatus).toBe(ShariaStatus.APPROVED);
  });

  it('records that it was a migration, with no human reviewer', () => {
    const version = buildMigrationVersion(content);
    expect(version.reviewComment).toBe(SHARIA_MIGRATED_COMMENT);
    expect(version.reviewedBy).toBeNull();
  });

  it('snapshots the content’s own values as the change-set', () => {
    const version = buildMigrationVersion(content);
    expect(version.changes).toMatchObject({ title: 'Lesson 1', type: 'ARTICLE', fileKey: 'uploads/a.pdf' });
  });

  it('keeps the platform approval fields out of the snapshot, which belong to the other gate', () => {
    const version = buildMigrationVersion(content);
    expect(version.changes).not.toHaveProperty('approvalStatus');
    expect(version.changes).not.toHaveProperty('pendingUpdate');
    expect(version.changes).not.toHaveProperty('_id');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server exec jest migrate-content-sharia --runInBand`
Expected: FAIL — `Cannot find module './migrate-content-sharia-approved'`.

- [ ] **Step 3: Write the script**

Create `apps/server/src/database/migrations/migrate-content-sharia-approved.ts`, modelled on `seed-grades.ts` — read that file first and copy its Nest bootstrap, `resolveMigrationMongoUri` usage and logging shape exactly. The pure part the test drives:

```ts
const EXCLUDED_FROM_SNAPSHOT = new Set([
  '_id',
  '__v',
  'organizationId',
  'courseId',
  'createdAt',
  'updatedAt',
  'approvalStatus',
  'approvalComment',
  'reviewedBy',
  'reviewedAt',
  'pendingUpdate',
  'shariaStatus',
  'currentVersion',
  'pendingVersion',
  'deletedAt',
  'deletedById',
]);

export interface MigrationVersion {
  organizationId: Types.ObjectId;
  contentId: Types.ObjectId;
  courseId: Types.ObjectId;
  version: 1;
  changes: Record<string, unknown>;
  createdBy: null;
  shariaStatus: ShariaStatus;
  reviewedBy: null;
  reviewedAt: Date;
  reviewComment: string;
}

/**
 * Version 1 for a content item that predates Sharia review. It is approved, because the academy was
 * already showing it to students: making it pending would blank every course on deploy.
 */
export function buildMigrationVersion(content: Record<string, unknown> & { _id: Types.ObjectId; organizationId: Types.ObjectId; courseId: Types.ObjectId }): MigrationVersion {
  const changes = Object.fromEntries(Object.entries(content).filter(([key]) => !EXCLUDED_FROM_SNAPSHOT.has(key)));
  return {
    organizationId: content.organizationId,
    contentId: content._id,
    courseId: content.courseId,
    version: 1,
    changes,
    createdBy: null,
    shariaStatus: ShariaStatus.APPROVED,
    reviewedBy: null,
    reviewedAt: new Date(),
    reviewComment: SHARIA_MIGRATED_COMMENT,
  };
}
```

The runnable part must be idempotent, so re-running it is safe:

```ts
async function migrate(contentModel: Model<CourseContent>, versionModel: Model<ContentVersion>): Promise<{ stamped: number; versioned: number }> {
  const contents = await contentModel.find({ shariaStatus: { $ne: ShariaStatus.APPROVED } }).lean().exec();

  let versioned = 0;
  for (const content of contents) {
    const exists = await versionModel.countDocuments({ contentId: content._id, version: 1 }).exec();
    if (exists === 0) {
      await versionModel.create(buildMigrationVersion(content as never));
      versioned += 1;
    }
  }

  const stamped = await contentModel
    .updateMany(
      { shariaStatus: { $ne: ShariaStatus.APPROVED } },
      { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: 1, pendingVersion: null } }
    )
    .exec();

  return { stamped: stamped.modifiedCount, versioned };
}
```

Order matters: write the versions first, then stamp the content. Stamping first and crashing would leave approved content with no version record, which is the one state the concept forbids.

Add to `apps/server/package.json` scripts, matching the existing `migrate:seed-grades` line exactly:

```json
    "migrate:content-sharia": "pnpm exec tsx -r tsconfig-paths/register src/database/migrations/migrate-content-sharia-approved.ts",
```

Register it in `run-all-migrations.ts` following that file's pattern.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec jest migrate-content-sharia --runInBand`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the migration against the development database**

Run: `pnpm --filter server migrate:content-sharia`
Expected: it reports how many items it stamped and versioned, and a second run reports 0 versioned. Record both numbers in the ledger.

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter server exec eslint src/database/migrations/migrate-content-sharia-approved.ts src/database/migrations/migrate-content-sharia-approved.spec.ts src/database/migrations/run-all-migrations.ts
git add apps/server
git commit -m "feat(sp4): migrate existing content to approved, with a version 1 record"
```

---

### Task 12: Client data layer

**Files:**
- Create: `apps/client/src/lib/types/course/sharia.ts`
- Create: `apps/client/src/lib/actions/course/sharia.action.ts`
- Create: `apps/client/src/lib/hooks/course/use-sharia.hook.ts`
- Test: `apps/client/src/lib/hooks/course/use-sharia.hook.test.ts`

**Interfaces:**
- Consumes: the Task 10 message patterns.
- Produces: `IShariaQueueItem`, `IContentVersion`; `getShariaQueue`, `getContentVersions`, `approveShariaVersion`, `rejectShariaVersion`; `useShariaQueue()`, `useContentVersions(contentId)`, `useApproveShariaVersion()`, `useRejectShariaVersion()`; `shariaKeys`.

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/lib/hooks/course/use-sharia.hook.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shariaKeys } from './use-sharia.hook';

describe('shariaKeys', () => {
  it('namespaces every key under sharia, so one review refreshes the queue and the history', () => {
    expect(shariaKeys.queue[0]).toBe('sharia');
    expect(shariaKeys.versions('c1')[0]).toBe('sharia');
  });

  it('keys the history by content', () => {
    expect(shariaKeys.versions('c1')).not.toEqual(shariaKeys.versions('c2'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter client exec vitest run use-sharia --no-file-parallelism`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the types, actions and hooks**

Create `apps/client/src/lib/types/course/sharia.ts`:

```ts
import type { ShariaStatus } from '@darnozom/shared-types';

export interface IShariaQueueItem {
  contentId: string;
  contentTitle: string;
  courseId: string;
  version: number;
  createdAt: string | null;
  createdBy: string | null;
  /** True when the live content is already approved and this version is a held-back edit. */
  isEdit: boolean;
}

export interface IContentVersion {
  _id: string;
  contentId: string;
  courseId: string;
  version: number;
  changes: Record<string, unknown>;
  createdBy: string | null;
  shariaStatus: ShariaStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
}
```

Create `apps/client/src/lib/actions/course/sharia.action.ts`:

```ts
'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { IContentVersion, IShariaQueueItem } from '@/lib/types/course/sharia';

export async function getShariaQueue() {
  return createAuthorizedNatsRequest<IShariaQueueItem[]>('course.sharia.queue', {});
}

export async function getContentVersions(contentId: string) {
  return createAuthorizedNatsRequest<IContentVersion[]>('course.sharia.myVersions', { contentId });
}

export async function approveShariaVersion(contentId: string, version: number) {
  return createAuthorizedNatsRequest<void>('course.sharia.approve', { contentId, version });
}

export async function rejectShariaVersion(contentId: string, version: number, comment: string) {
  return createAuthorizedNatsRequest<void>('course.sharia.reject', { contentId, version, comment });
}
```

Create `apps/client/src/lib/hooks/course/use-sharia.hook.ts`, modelled on `apps/client/src/lib/hooks/academics/use-academics.hook.ts` — reuse its `useAcademicsMutation` shape for the toast and error handling, but with its own `ROOT`:

```ts
'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as shariaApi from '@/lib/actions/course/sharia.action';

const ROOT = 'sharia';

export const shariaKeys = {
  queue: [ROOT, 'queue'] as const,
  versions: (contentId: string) => [ROOT, 'versions', contentId] as const,
};

export const useShariaQueue = (enabled = true) =>
  useQuery({ queryKey: shariaKeys.queue, queryFn: async () => unwrap(await shariaApi.getShariaQueue()), enabled });

export const useContentVersions = (contentId: string, enabled = true) =>
  useQuery({
    queryKey: shariaKeys.versions(contentId),
    queryFn: async () => unwrap(await shariaApi.getContentVersions(contentId)),
    enabled: enabled && Boolean(contentId),
  });

function useShariaMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const t = useTranslations('Sharia');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const useApproveShariaVersion = () =>
  useShariaMutation(async (vars: { contentId: string; version: number }) =>
    unwrap(await shariaApi.approveShariaVersion(vars.contentId, vars.version))
  );

export const useRejectShariaVersion = () =>
  useShariaMutation(async (vars: { contentId: string; version: number; comment: string }) =>
    unwrap(await shariaApi.rejectShariaVersion(vars.contentId, vars.version, vars.comment))
  );
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter client exec vitest run use-sharia --no-file-parallelism`
Expected: PASS, 2 tests.

- [ ] **Step 5: Lint, type-check, commit**

```bash
pnpm --filter client exec eslint src/lib/types/course/sharia.ts src/lib/actions/course/sharia.action.ts src/lib/hooks/course/use-sharia.hook.ts src/lib/hooks/course/use-sharia.hook.test.ts
pnpm --filter client tsc --noEmit
git add apps/client/src/lib
git commit -m "feat(sp4): add the client data layer for Sharia review"
```

`pnpm --filter client tsc --noEmit` has a known baseline of 5 pre-existing errors. Only new ones matter.

---

### Task 13: The review queue page

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/sharia-review/page.tsx`
- Create: `.../sharia-review/__components/sharia-queue.tsx`
- Create: `.../sharia-review/__components/version-diff.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts`
- Modify: `apps/client/src/lib/data/constants/routes.constants.ts`
- Modify: `apps/client/messages/en.json`, `apps/client/messages/ar.json`
- Test: `.../__components/sharia-queue.test.tsx`, `.../__components/version-diff.test.tsx`

**Interfaces:**
- Consumes: `useShariaQueue`, `useApproveShariaVersion`, `useRejectShariaVersion`, `IShariaQueueItem`, `IContentVersion` (Task 12).
- Produces: `ShariaQueue({ items, isLoading, onApprove, onReject })` and `VersionDiff({ live, pending })`.

- [ ] **Step 1: Write the failing tests**

Create `version-diff.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionDiff } from './version-diff';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('VersionDiff', () => {
  it('shows the live value beside the proposed one for each changed field', () => {
    render(<VersionDiff live={{ title: 'Old title' }} pending={{ title: 'New title' }} />);
    expect(screen.getByText('Old title')).toBeInTheDocument();
    expect(screen.getByText('New title')).toBeInTheDocument();
  });

  it('shows only the fields the edit touches', () => {
    render(<VersionDiff live={{ title: 'Old', body: 'Unchanged body' }} pending={{ title: 'New' }} />);
    expect(screen.queryByText('Unchanged body')).not.toBeInTheDocument();
  });

  it('marks a field the live content does not have yet', () => {
    render(<VersionDiff live={{}} pending={{ title: 'Brand new' }} />);
    expect(screen.getByText('sharia.notSet')).toBeInTheDocument();
    expect(screen.getByText('Brand new')).toBeInTheDocument();
  });

  it('renders an object value as readable JSON rather than [object Object]', () => {
    render(<VersionDiff live={{}} pending={{ settings: { downloadEnabled: true } }} />);
    expect(screen.getByText(/downloadEnabled/)).toBeInTheDocument();
  });
});
```

Create `sharia-queue.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { IShariaQueueItem } from '@/lib/types/course/sharia';
import { ShariaQueue } from './sharia-queue';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useLocale: () => 'en',
}));

const item = (overrides: Partial<IShariaQueueItem> = {}): IShariaQueueItem => ({
  contentId: 'c1',
  contentTitle: 'Lesson 1',
  courseId: 'co1',
  version: 2,
  createdAt: '2026-03-10T00:00:00.000Z',
  createdBy: 'u1',
  isEdit: true,
  ...overrides,
});

describe('ShariaQueue', () => {
  it('says the queue is empty when there is nothing to review', () => {
    render(<ShariaQueue items={[]} isLoading={false} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('sharia.empty')).toBeInTheDocument();
  });

  it('shows the loading state instead of the empty state while fetching', () => {
    render(<ShariaQueue items={[]} isLoading onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('sharia.loading')).toBeInTheDocument();
    expect(screen.queryByText('sharia.empty')).not.toBeInTheDocument();
  });

  it('names the content and marks an edit as an edit', () => {
    render(<ShariaQueue items={[item()]} isLoading={false} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('sharia.kind.edit')).toBeInTheDocument();
  });

  it('marks new content as new', () => {
    render(<ShariaQueue items={[item({ isEdit: false })]} isLoading={false} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('sharia.kind.new')).toBeInTheDocument();
  });

  it('approves with the content id and version', () => {
    const onApprove = vi.fn();
    render(<ShariaQueue items={[item()]} isLoading={false} onApprove={onApprove} onReject={vi.fn()} />);
    screen.getByRole('button', { name: 'sharia.approve' }).click();
    expect(onApprove).toHaveBeenCalledWith({ contentId: 'c1', version: 2 });
  });

  it('does not reject until a comment has been typed', () => {
    const onReject = vi.fn();
    render(<ShariaQueue items={[item()]} isLoading={false} onApprove={vi.fn()} onReject={onReject} />);
    screen.getByRole('button', { name: 'sharia.reject' }).click();
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByText('sharia.commentRequired')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter client exec vitest run sharia-queue version-diff --no-file-parallelism`
Expected: FAIL — both imports unresolved.

- [ ] **Step 3: Write `version-diff.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

const show = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

/** Only the fields the edit touches, live value beside proposed value. */
export function VersionDiff({ live, pending }: { live: Record<string, unknown>; pending: Record<string, unknown> }) {
  const t = useTranslations('Sharia');
  const fields = Object.keys(pending);
  if (fields.length === 0) return <p className="text-muted-foreground">{t('sharia.noChanges')}</p>;

  return (
    <dl className="space-y-3">
      {fields.map((field) => {
        const before = show(live[field]);
        return (
          <div key={field} className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs uppercase">{`${field} — ${t('sharia.live')}`}</dt>
              <dd className="whitespace-pre-wrap text-sm">{before === '' ? t('sharia.notSet') : before}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">{`${field} — ${t('sharia.proposed')}`}</dt>
              <dd className="whitespace-pre-wrap text-sm">{show(pending[field])}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
```

- [ ] **Step 4: Write `sharia-queue.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import type { IShariaQueueItem } from '@/lib/types/course/sharia';

export function ShariaQueue({
  items,
  isLoading,
  onApprove,
  onReject,
}: {
  items: IShariaQueueItem[];
  isLoading: boolean;
  onApprove: (vars: { contentId: string; version: number }) => void;
  onReject: (vars: { contentId: string; version: number; comment: string }) => void;
}) {
  const t = useTranslations('Sharia');
  const locale = useLocale();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Record<string, boolean>>({});

  if (isLoading) return <p>{t('sharia.loading')}</p>;
  if (items.length === 0) return <p className="text-muted-foreground">{t('sharia.empty')}</p>;

  const reject = (item: IShariaQueueItem) => {
    const key = `${item.contentId}:${item.version}`;
    const comment = (comments[key] ?? '').trim();
    // A rejection with no comment tells the author nothing, so the button refuses to fire.
    if (!comment) {
      setMissing((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setMissing((prev) => ({ ...prev, [key]: false }));
    onReject({ contentId: item.contentId, version: item.version, comment });
  };

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const key = `${item.contentId}:${item.version}`;
        return (
          <li key={key} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{item.contentTitle}</span>
              <Badge variant="outline">{item.isEdit ? t('sharia.kind.edit') : t('sharia.kind.new')}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('sharia.submitted', { date: item.createdAt ? new Date(item.createdAt).toLocaleString(locale) : '' })}
            </p>
            <Textarea
              aria-label={t('sharia.commentLabel')}
              value={comments[key] ?? ''}
              onChange={(event) => setComments((prev) => ({ ...prev, [key]: event.target.value }))}
            />
            {missing[key] ? <p className="text-destructive text-sm">{t('sharia.commentRequired')}</p> : null}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onApprove({ contentId: item.contentId, version: item.version })}>
                {t('sharia.approve')}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => reject(item)}>
                {t('sharia.reject')}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

Check the real `Textarea`, `Badge` and `Button` paths and variant names in `apps/client/src/components/atoms/` before writing.

- [ ] **Step 5: Write the page, the route and the nav entry**

`page.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useApproveShariaVersion, useRejectShariaVersion, useShariaQueue } from '@/lib/hooks/course/use-sharia.hook';
import { ShariaQueue } from './__components/sharia-queue';

export default function ShariaReviewPage() {
  const t = useTranslations('Sharia');
  const { data: items = [], isLoading } = useShariaQueue();
  const approve = useApproveShariaVersion();
  const reject = useRejectShariaVersion();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sharia.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ShariaQueue
          items={items}
          isLoading={isLoading}
          onApprove={(vars) => approve.mutate(vars)}
          onReject={(vars) => reject.mutate(vars)}
        />
      </CardContent>
    </Card>
  );
}
```

Add `export const ROUTE_ORG_SHARIA_REVIEW = '/organization-dashboard/sharia-review';` to `routes.constants.ts`, and a nav item in `data.ts` gated to the Sharia reviewer, manager and owner, the way that file gates its other entries.

- [ ] **Step 6: Add the translations**

Add a `Sharia` namespace to **both** catalogues. English:

```json
"Sharia": {
  "saved": "Saved",
  "sharia": {
    "title": "Sharia review",
    "empty": "Nothing is waiting for review.",
    "loading": "Loading…",
    "approve": "Approve",
    "reject": "Reject",
    "commentLabel": "Reason for rejection",
    "commentRequired": "A reason is required to reject.",
    "submitted": "Submitted {date}",
    "live": "Live",
    "proposed": "Proposed",
    "notSet": "Not set",
    "noChanges": "This version changes nothing.",
    "kind": { "new": "New content", "edit": "Edit" },
    "status": { "PENDING": "Pending review", "APPROVED": "Approved", "REJECTED": "Rejected" },
    "versions": "Versions",
    "version": "Version {number}",
    "superseded": "Replaced by a newer edit",
    "migrated": "Approved automatically when Sharia review was introduced"
  }
}
```

Arabic: `"حُفظ"`, `"المراجعة الشرعية"`, `"لا يوجد ما ينتظر المراجعة."`, `"جارٍ التحميل…"`, `"اعتماد"`, `"رفض"`, `"سبب الرفض"`, `"يجب ذكر سبب للرفض."`, `"أُرسل في {date}"`, `"الحالي"`, `"المقترح"`, `"غير محدد"`, `"هذه النسخة لا تغيّر شيئًا."`, `"محتوى جديد"`, `"تعديل"`, `"بانتظار المراجعة"`, `"معتمد"`, `"مرفوض"`, `"النسخ"`, `"النسخة {number}"`, `"استُبدلت بتعديل أحدث"`, `"اعتُمدت تلقائيًا عند تطبيق المراجعة الشرعية"`.

Add the `errors` keys for the five `ShariaErrors` values to both catalogues too, under the namespace `translateApiMessage` reads.

- [ ] **Step 7: Run the tests and the i18n check**

Run: `pnpm --filter client exec vitest run sharia-queue version-diff --no-file-parallelism`
Expected: PASS — 7 + 4 tests.

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 8: Lint and commit**

Lint each touched file by name, then:

```bash
git add apps/client
git commit -m "feat(sp4): add the Sharia review queue page"
```

---

### Task 14: Status badge and version history in the content editor

**Files:**
- Create: `apps/client/src/components/organs/course/sharia-status-badge.tsx`
- Create: `apps/client/src/components/organs/course/content-versions-drawer.tsx`
- Modify: the organization content editor that submits a content update (find it under `organization-dashboard/content/`)
- Test: `apps/client/src/components/organs/course/sharia-status-badge.test.tsx`, `.../content-versions-drawer.test.tsx`

**Interfaces:**
- Consumes: `IContentVersion`, `useContentVersions` (Task 12), `ShariaStatus`.
- Produces: `ShariaStatusBadge({ status, reviewComment })` and `ContentVersionsDrawer({ versions, isLoading })`.

- [ ] **Step 1: Write the failing tests**

`sharia-status-badge.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShariaStatus } from '@darnozom/shared-types';
import { ShariaStatusBadge } from './sharia-status-badge';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

describe('ShariaStatusBadge', () => {
  it('names each state', () => {
    for (const status of Object.values(ShariaStatus)) {
      const { unmount } = render(<ShariaStatusBadge status={status} reviewComment={null} />);
      expect(screen.getByText(`sharia.status.${status}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('shows the rejection reason, which is the whole point of a rejection', () => {
    render(<ShariaStatusBadge status={ShariaStatus.REJECTED} reviewComment="Needs a source." />);
    expect(screen.getByText('Needs a source.')).toBeInTheDocument();
  });

  it('shows no comment when there is none', () => {
    render(<ShariaStatusBadge status={ShariaStatus.APPROVED} reviewComment={null} />);
    expect(screen.queryByText('Needs a source.')).not.toBeInTheDocument();
  });
});
```

`content-versions-drawer.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SHARIA_MIGRATED_COMMENT, SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import type { IContentVersion } from '@/lib/types/course/sharia';
import { ContentVersionsDrawer } from './content-versions-drawer';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useLocale: () => 'en',
}));

const version = (overrides: Partial<IContentVersion> = {}): IContentVersion => ({
  _id: 'v1',
  contentId: 'c1',
  courseId: 'co1',
  version: 2,
  changes: { title: 'Reworded' },
  createdBy: 'u1',
  shariaStatus: ShariaStatus.APPROVED,
  reviewedBy: 'r1',
  reviewedAt: '2026-03-11T00:00:00.000Z',
  reviewComment: null,
  createdAt: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

describe('ContentVersionsDrawer', () => {
  it('lists each version by number, newest first as given', () => {
    render(<ContentVersionsDrawer versions={[version({ version: 3 }), version({ _id: 'v0', version: 2 })]} isLoading={false} />);
    expect(screen.getByText('sharia.version:{"number":3}')).toBeInTheDocument();
    expect(screen.getByText('sharia.version:{"number":2}')).toBeInTheDocument();
  });

  it('is read-only: it offers no button', () => {
    render(<ContentVersionsDrawer versions={[version()]} isLoading={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('explains a superseded version in words rather than showing the raw marker', () => {
    render(<ContentVersionsDrawer versions={[version({ shariaStatus: ShariaStatus.REJECTED, reviewComment: SHARIA_SUPERSEDED_COMMENT })]} isLoading={false} />);
    expect(screen.getByText('sharia.superseded')).toBeInTheDocument();
    expect(screen.queryByText(SHARIA_SUPERSEDED_COMMENT)).not.toBeInTheDocument();
  });

  it('explains a migrated version in words', () => {
    render(<ContentVersionsDrawer versions={[version({ reviewComment: SHARIA_MIGRATED_COMMENT })]} isLoading={false} />);
    expect(screen.getByText('sharia.migrated')).toBeInTheDocument();
  });

  it('shows a reviewer’s own comment as written', () => {
    render(<ContentVersionsDrawer versions={[version({ shariaStatus: ShariaStatus.REJECTED, reviewComment: 'Needs a source.' })]} isLoading={false} />);
    expect(screen.getByText('Needs a source.')).toBeInTheDocument();
  });

  it('says so when there is no history yet', () => {
    render(<ContentVersionsDrawer versions={[]} isLoading={false} />);
    expect(screen.getByText('sharia.empty')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter client exec vitest run sharia-status-badge content-versions-drawer --no-file-parallelism`
Expected: FAIL — both imports unresolved.

- [ ] **Step 3: Write the badge**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { ShariaStatus } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';

const VARIANT: Record<ShariaStatus, 'secondary' | 'default' | 'destructive'> = {
  [ShariaStatus.PENDING]: 'secondary',
  [ShariaStatus.APPROVED]: 'default',
  [ShariaStatus.REJECTED]: 'destructive',
};

export function ShariaStatusBadge({ status, reviewComment }: { status: ShariaStatus; reviewComment: string | null }) {
  const t = useTranslations('Sharia');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={VARIANT[status]}>{t(`sharia.status.${status}`)}</Badge>
      {reviewComment ? <span className="text-muted-foreground text-sm">{reviewComment}</span> : null}
    </div>
  );
}
```

- [ ] **Step 4: Write the drawer**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SHARIA_MIGRATED_COMMENT, SHARIA_SUPERSEDED_COMMENT } from '@darnozom/shared-types';
import type { IContentVersion } from '@/lib/types/course/sharia';
import { ShariaStatusBadge } from './sharia-status-badge';

/** SUPERSEDED and MIGRATED are machine markers, not sentences a person should read. */
const commentLabel = (comment: string | null, t: (key: string) => string): string | null => {
  if (!comment) return null;
  if (comment === SHARIA_SUPERSEDED_COMMENT) return t('sharia.superseded');
  if (comment === SHARIA_MIGRATED_COMMENT) return t('sharia.migrated');
  return comment;
};

export function ContentVersionsDrawer({ versions, isLoading }: { versions: IContentVersion[]; isLoading: boolean }) {
  const t = useTranslations('Sharia');
  const locale = useLocale();
  if (isLoading) return <p>{t('sharia.loading')}</p>;
  if (versions.length === 0) return <p className="text-muted-foreground">{t('sharia.empty')}</p>;

  return (
    <ul className="space-y-3">
      {versions.map((version) => (
        <li key={version._id} className="space-y-1 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{t('sharia.version', { number: version.version })}</span>
            <ShariaStatusBadge status={version.shariaStatus} reviewComment={null} />
          </div>
          <p className="text-muted-foreground text-sm">{new Date(version.createdAt).toLocaleString(locale)}</p>
          {commentLabel(version.reviewComment, t) ? (
            <p className="text-sm">{commentLabel(version.reviewComment, t)}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Wire both into the content editor**

Find the organization content editor that submits content updates:

```bash
cd C:/COURSES/work/darnozom/academy && grep -rln "updateContent\|useUpdateContent" "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/content" apps/client/src/components/organs 2>/dev/null
```

In the editor, render `<ShariaStatusBadge status={content.shariaStatus} reviewComment={content.approvalComment ?? null} />` near the title, and a collapsible "Versions" section holding `<ContentVersionsDrawer …>` fed by `useContentVersions(contentId)`. Add `shariaStatus`, `currentVersion` and `pendingVersion` to the client content interface so this type-checks, and add a line to the editor that tells the author their edit is awaiting review when `pendingVersion !== null`, using `t('sharia.status.PENDING')`.

- [ ] **Step 6: Run the tests and the i18n check**

Run: `pnpm --filter client exec vitest run sharia-status-badge content-versions-drawer --no-file-parallelism`
Expected: PASS — 3 + 6 tests.

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 7: Lint and commit**

Lint each touched file by name, then:

```bash
git add apps/client
git commit -m "feat(sp4): show the Sharia status and version history in the content editor"
```

---

### Task 15: Whole sub-project verification

**Files:** none created. This task proves the branch.

- [ ] **Step 1: Run the full server suite**

Run: `pnpm --filter server exec jest --runInBand`
Expected: every new suite passes. Compare the failure set against the baseline sub-project 2 recorded and name any **new** failure. A new failure means this task is not done.

- [ ] **Step 2: Run the full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: all green, including the 22 new tests from Tasks 12 to 14.

- [ ] **Step 3: Type-check both apps**

Run: `pnpm --filter server exec node ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.app.json`
Expected: 0 errors.

Run: `pnpm --filter client tsc --noEmit`
Expected: the 5 baseline errors only.

- [ ] **Step 4: Check the translations**

Run: `pnpm --filter client i18n:check-keys`
Expected: ok.

- [ ] **Step 5: Prove existing content is still visible**

Confirm the migration ran (Task 11) and then, as a student enrolled in an existing course, open a content item that was visible before this branch. It must still render. **This is the single most dangerous regression in this sub-project**: if the migration did not run, every course goes blank. Record what you saw.

- [ ] **Step 6: Walk the golden path in the browser**

With `pnpm dev` running: as a content officer, create a content item — confirm a student cannot see it. As a Sharia reviewer, approve it — confirm the student now can. Edit the approved item as the content officer — confirm the student still sees the **old** values and the reviewer sees a live-versus-proposed comparison. Approve the edit — confirm the student sees the new values. Then edit again and reject with a comment — confirm the student still sees the approved values and the author sees the comment. If no dev server is available in your context, say so explicitly rather than claiming the walk passed.

- [ ] **Step 7: Ledger the result**

No commit is needed if the tree is clean. If a step surfaced a fix, make it with a test that fails first, then commit.
