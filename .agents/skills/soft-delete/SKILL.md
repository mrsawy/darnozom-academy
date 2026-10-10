---
name: soft-delete
description: >-
  Soft-delete NestJS/Mongoose entities with deletedAt + deletedById, schema
  middleware, NOT_DELETED_FILTER, withDeleted for admin/audit, and aggregation
  $lookup filters. USE WHEN adding or changing soft delete, replacing
  deleteOne/deleteMany, excluding deleted docs from finds/aggregations, or when
  the user mentions soft delete, deletedAt, deletedById, or withDeleted.
---

# Soft delete (Mongoose / NestJS server)

Canonical pattern: **User** (`apps/server/src/user`). Shared helpers live in `apps/server/src/utils/soft-delete/`.

## Goal

Never hard-delete domain documents (`deleteOne` / `deleteMany` / `findByIdAndDelete`) for entities that need audit or FK integrity. Soft-delete by setting **`deletedAt`** + **`deletedById`**, exclude deleted rows from normal reads (schema middleware + explicit filters), and allow platform admin / restore paths via **`{ withDeleted: true }`**.

## Checklist (copy per entity)

```
- [ ] Schema: deletedAt (Date|null, indexed), deletedById (ObjectId ref User|null)
- [ ] Schema: virtual deletedByUser → User on deletedById
- [ ] Schema: applySoftDeleteMiddleware(EntitySchema)
- [ ] Delete service: updateOne/updateMany + buildSoftDeleteSet(actorId) — no deleteMany
- [ ] Controllers pass req/context user _id as deletedById
- [ ] Aggregations / $lookup: ...NOT_DELETED_FILTER in $match
- [ ] Admin list/detail that must see deleted: withDeletedQueryOptions()
- [ ] Tests under apps/server/__test__/<feature>/ mirroring src
- [ ] Identity uniqueness: partial unique `{ deletedAt: null }`, never `@Prop({ unique: true })`
- [ ] Soft-delete must not delete S3 media or emit billing/`COURSE_DELETED` side effects
```

## Shared utilities

```typescript
import {
  NOT_DELETED_FILTER,
  withNotDeletedFilter,
  withDeletedQueryOptions,
  buildSoftDeleteSet,
  lookupNotDeleted,
  applySoftDeleteMiddleware,
} from 'src/utils/soft-delete';
```

| Helper | Use |
|---|---|
| `NOT_DELETED_FILTER` | `{ deletedAt: null }` — spread into find filters and `$match` / `$lookup` pipelines |
| `withNotDeletedFilter(filter)` | Merge not-deleted into a filter object |
| `withDeletedQueryOptions(opts?)` | Opt out of schema middleware (admin lists, OAuth reclaim, restore) |
| `buildSoftDeleteSet(deletedById?)` | `{ deletedAt: new Date(), deletedById }` for `$set` |
| `lookupNotDeleted(from, localField, as, extraPipeline?)` | `$lookup` by `_id` with `NOT_DELETED_FILTER` in the foreign pipeline |

Entity-specific re-exports (optional): keep thin wrappers like `NOT_DELETED_USER_FILTER` that alias the shared filter for readable call sites.

## Schema fields + virtual

```typescript
@Prop({ type: Date, required: false, default: null, index: true })
deletedAt?: Date | null;

@Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
deletedById?: Types.ObjectId | null;

// after SchemaFactory.createForClass:
EntitySchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});
EntitySchema.set('toJSON', { virtuals: true });
EntitySchema.set('toObject', { virtuals: true });
applySoftDeleteMiddleware(EntitySchema);
```

## Delete service (soft)

```typescript
async delete(filters: FilterQuery<Entity>, deletedById?: string | Types.ObjectId | null) {
  const result = await this.model.updateOne(withNotDeletedFilter(filters), {
    $set: {
      ...buildSoftDeleteSet(deletedById),
      // entity-specific cleanup (e.g. clear session tokens)
    },
  });
  return {
    acknowledged: result.acknowledged,
    deletedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}
```

Wire **`deletedById`** from HTTP `@Req()` / NATS `@Ctx()` `userPayload._id`.

## Reads: double belt

1. **Schema middleware** — default queries hide soft-deleted docs.
2. **Call-site filter** — still use `withNotDeletedFilter` / `NOT_DELETED_FILTER` in services.

**Aggregations & `$lookup`**: middleware does **not** run inside foreign `$lookup` pipelines. Always:

```typescript
lookupNotDeleted('categories', 'categoriesIds', 'categories')
```

or an explicit pipeline:

```typescript
{
  $lookup: {
    from: 'collection_name',
    let: { ids: '$someIds' },
    pipeline: [
      { $match: { $expr: { $in: ['$_id', '$$ids'] }, ...NOT_DELETED_FILTER } },
    ],
    as: 'items',
  },
}
```

## Admin / include deleted

Platform admin (or restore) must see soft-deleted rows:

```typescript
await this.model.paginate(orgFilter, {
  ...paginateOpts,
  ...withDeletedQueryOptions(),
});

await this.model.find(filter).setOptions(withDeletedQueryOptions());
```

Do **not** hardcode `deletedAt: null` on admin “get all” endpoints if they should include deleted users/entities.

## Unique indexes

Never keep `@Prop({ unique: true })` on fields that must be reusable after soft-delete (email, username, enrollment `(userId, courseId)`, etc.). Soft-deleted docs still occupy a full unique index and block re-create.

Use a **partial unique** index instead:

```typescript
EntitySchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'email_unique_if_not_deleted',
  }
);
```

Existing DBs: drop the old unique index (`email_1`) then let Mongoose create the named partial index.

## Anti-patterns

- `deleteOne` / `deleteMany` / `findByIdAndDelete` for domain entities that need audit
- Relying only on middleware and forgetting `NOT_DELETED_FILTER` in `$lookup`
- Soft-deleting without `deletedById` when an authenticated actor exists
- Using `status: DELETED` alone without `deletedAt` for new work (prefer User pattern: **`deletedAt` is the source of truth**)
- Forgetting `withDeleted` on platform-admin list endpoints
- `@Prop({ unique: true })` on identity fields after introducing `deletedAt` (blocks re-registration / re-enroll)
- Deleting S3 files or emitting billing/`COURSE_DELETED` events on soft-delete (docs are soft; media and quota must stay until a hard purge)

## Deferred domains (still hard-delete)

Do **not** expand soft-delete into these until product asks for it:

- Roles
- Plans
- Pages
- Wallets
- AI (threads / plans / subscriptions)

When expanding later, follow this skill end-to-end (schema fields, middleware, delete service, `$lookup`, unique indexes, tests).

## Reference implementations

- User filter: `apps/server/src/user/utils/not-deleted-user.filter.ts`
- User middleware: `apps/server/src/user/utils/user-soft-delete.middleware.ts`
- User delete: `apps/server/src/user/services/user.service.ts` (`delete`)
- Shared: `apps/server/src/utils/soft-delete/`

## Tests

Prefer `apps/server/__test__/<feature>/...` mirroring `src/` (see existing `__test__/course/`). Assert:

- update sets `deletedAt` + `deletedById`
- no `deleteMany`/`deleteOne` on the model
- list/get paths apply `NOT_DELETED_FILTER`
- admin path can use `withDeletedQueryOptions`
