# Admin Review Module Pattern

All platform-admin operations follow a consistent three-layer pattern.

## Guard Chain

Every message handler must declare both guards in order:

```typescript
@UseGuards(AuthGuard, PlatformAdminGuard)
@MessagePattern('adminReview.<action>')
```

- `AuthGuard` — verifies the JWT and attaches `context.userPayload`
- `PlatformAdminGuard` — checks `userPayload.roleName === Roles.PLATFORM_ADMIN`

## Message Pattern Naming

```
adminReview.<verb><Resource>
```

Examples: `getOrganizationUsers`, `deleteOrganizationCourse`, `approveCategory`

## Payload Shape

List endpoints:
```typescript
payload: { orgId?: string; options?: AdminPaginateDto }
```

Mutate endpoints:
```typescript
payload: { orgId: string; <resourceId>: string }
```

Review endpoints:
```typescript
payload: AdminReviewActionDto  // { itemId, comment?, deleteFiles? }
```

## Multi-service layout

There is **no** monolithic `AdminReviewService`. Domain logic lives in focused injectables under `services/`:

| File | Responsibility |
|---|---|
| `admin-review.types.ts` | Shared types (`IBulkActionResult`) |
| `admin-review.support.ts` | `AdminReviewSupport` — approve/reject, pagination/search helpers, file cleanup, enrich refs, bulk summarise |
| `admin-review-stats.service.ts` | Dashboard counts |
| `admin-review-category.service.ts` | Category review + bulk |
| `admin-review-course.service.ts` | Course review/admin + bulk; course active/publish |
| `admin-review-module.service.ts` | Module review + `setModuleActiveStatus` + bulk |
| `admin-review-content.service.ts` | Content review (storage adjust) + `setContentActiveStatus` + bulk |
| `admin-review-organization.service.ts` | Org list/detail, plan/subscription, org-scoped CRUD/browse |
| `admin-review-verification.service.ts` | Identity verification queue |
| `admin-review-suspend.service.ts` | Suspend/unsuspend org/course/module/content/user |

The message controller injects the relevant domain service(s) directly. Domain services inject `AdminReviewSupport` for shared helpers — do not duplicate approve/reject.

## Service Helpers (`AdminReviewSupport`)

| Helper | Purpose |
|---|---|
| `organizationIdMatch(orgId)` | Returns `{ organizationId: { $in: [ObjectId, string] } }` — safe for legacy and new documents |
| `buildSearchFilter(search, fields)` | Case-insensitive regex across given fields; returns `{}` when search is empty |
| `extractPaginateOptions(dto)` | Strips `search` from dto and returns paginate options for `mongoose-paginate-v2` |
| `extractFileKeys(obj)` | Finds `fileKey`, `thumbnailKey`, `trailerKey` in a plain object for cleanup |
| `approveEntity` / `rejectEntity` | Shared approval workflow |
| `bulkApproveEntities` / `bulkRejectEntities` / `summariseBulkResults` | Bulk helpers |

## Adding a New Resource

1. **Service** — add methods on the matching domain service (or a new `admin-review-<resource>.service.ts`), using `AdminReviewSupport` helpers such as `organizationIdMatch`.
2. **Controller** — inject that service; add `@MessagePattern('adminReview.getOrganization<X>')` + delete pattern.
3. **Module** — register the new provider (and Mongoose model if not already present).
4. **Client types** — add `IAdmin<X>` to `admin-review.interface.ts`.
5. **Client actions** — add `getOrganization<X>` and `deleteOrganization<X>` to `admin-review.action.ts`.
6. **Client hooks** — add query key + `useOrganization<X>` + `useDeleteOrganization<X>` to `use-admin-review.hook.ts`.
7. **i18n** — add keys to both `en.json` and `ar.json` under `AdminDashboard`.
