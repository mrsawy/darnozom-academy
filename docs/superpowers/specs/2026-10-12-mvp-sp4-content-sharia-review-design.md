# MVP Sub-project 4: Content with Basic Sharia Review — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Scope authority:** `docs/MVP.md` §3 row 4. The concept's MVP list says "content with basic Sharia review". The full concept says "Content moves through educational, linguistic and Sharia review stages with full version history. Old versions are never overwritten without a record." The MVP takes **only the Sharia stage**, together with the version history.

## 1. Goal

Every new or edited course content item must be approved by a Sharia reviewer before students can see it. Each version is kept, so earlier content is never lost without a record.

## 2. Out of scope

- **Educational and linguistic review stages:** later, per the concept.
- **Review of course modules:** modules are containers holding a title. Only content items are reviewed (assumption A1).

## 3. What already exists (reused, not rebuilt)

`CourseContent` already has a **platform-level** approval: `approvalStatus`, `pendingUpdate`, `applyUpdateWithApproval`, and the `APPROVED_STATUSES` filter that student queries use. The platform admin uses it to review organizations that aren't verified yet. Sharia review is a separate gate inside the academy that runs **before** that path. It does not replace it.

## 4. Data model

### 4.1 CourseContent (existing): new fields

- `shariaStatus: 'PENDING' | 'APPROVED' | 'REJECTED'`, indexed
- `currentVersion: number`, the version currently live for students
- `pendingVersion?: number`, the version waiting for Sharia review

### 4.2 ContentVersion (new, `course/content-version`)

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `contentId`, `courseId` | ObjectId | |
| `version` | integer | unique per content; starts at 1 |
| `changes` | object | for version 1, the full creation payload; afterwards, the update change-set exactly as `CourseContentService.update` receives it |
| `createdBy`, `createdAt` | | |
| `shariaStatus` | `PENDING \| APPROVED \| REJECTED` | |
| `reviewedBy?`, `reviewedAt?`, `reviewComment?` | | `reviewComment` is required on reject |

ContentVersion documents are never updated after review and never deleted. That makes them the "record" the concept requires.

## 5. Rules

- **Create:** the content is saved as today, with `shariaStatus = PENDING`, and version 1 is created as `PENDING`. Students can't see it until it is approved.
- **Edit of content that has never been approved (`PENDING`/`REJECTED`):** the edit is applied directly, a new version is created as `PENDING`, and `shariaStatus` becomes `PENDING`.
- **Edit of approved content:** the edit is **not** applied to the content. It is stored as a new `PENDING` version, and its number is put in `pendingVersion`. Students keep seeing the current approved content. If another edit arrives while one is pending, the earlier pending version is marked `REJECTED` with the comment `SUPERSEDED`, and the new one becomes pending.
- **Approve** (`SHARIA_REVIEWER`): the version becomes `APPROVED`.
  - If it is a pending edit, its `changes` are passed into the **existing** `applyUpdateWithApproval` path, so platform approval still applies exactly as today. `currentVersion` takes the version's number and `pendingVersion` is cleared.
  - The content's `shariaStatus` becomes `APPROVED`.
  - The existing "notify students" step runs only now.
- **Reject** (`SHARIA_REVIEWER`, comment required): the version becomes `REJECTED`. For a pending edit, the live content is left unchanged; otherwise the content's `shariaStatus` becomes `REJECTED`. The author sees the comment and can edit again.
- **Student visibility:** every student-facing content query and the student notification query add `shariaStatus: 'APPROVED'` next to the existing `approvalStatus ∈ APPROVED_STATUSES` filter. Those are the places that use `APPROVED_STATUSES` today: `course-content-query.service.ts`, `course-content-notification.service.ts`, `course-featured.service.ts`.
- **File cleanup:** a superseded or rejected version's uploaded file (`fileKey`) is deleted only if no approved version references it.

## 6. Roles & permissions

- New subject: `SHARIA_REVIEW`.
- **SHARIA_REVIEWER:** `MANAGE SHARIA_REVIEW` and `READ CONTENT` in their organization.
- **OWNER, MANAGER:** `READ SHARIA_REVIEW`, for the queue count on the admin dashboard (sub-project 10). They can view the queue but can't approve or reject. Sharia reviewers have no financial permissions, which matches the concept rule "content staff can't see financial data".
- **CONTENT_OFFICER:** `MANAGE` on `CONTENT` and `MODULE`, and `READ COURSE` in their organization.
- **Existing authors** (`INSTRUCTOR`, `ADMIN`) keep their content permissions, and their edits go through the same Sharia gate.

## 7. API

- `GET /sharia-review/queue`: pending versions with the course and content title.
- `GET /contents/:id/versions`: the version history.
- `GET /contents/:id/versions/:version`
- `POST /contents/:id/versions/:version/approve`
- `POST /contents/:id/versions/:version/reject` with `{ comment }`

## 8. Screens (en + ar)

- **Sharia review queue page:** for SHARIA_REVIEWER, showing pending items and a view of each version. For an edit, the live and pending values are shown side by side per field. Each item has approve and reject (with comment) actions.
- **Content editor:** a badge for the Sharia status, the rejection comment, and a "Versions" drawer with the read-only history.

## 9. Migration

A one-time script runs over all existing content:
- sets `shariaStatus = APPROVED` and `currentVersion = 1`
- creates version 1 as `APPROVED`, with the content's current values as its `changes`, `reviewedBy` = null and `reviewComment` = `MIGRATED`

Without this, all existing content would disappear for students.

## 10. Testing

- **Creating content:** new content is hidden from students until it's approved.
- **Editing approved content:** students still see the old values; approving applies the edit through the existing path.
- **Superseding:** a second pending edit supersedes the first.
- **Rejecting:** requires a comment and leaves the live content unchanged.
- **Version history:** stays append-only.
- **Notifications:** sent only after approval.
- **Migration:** existing content stays visible.

## 11. Assumptions to confirm

- **A1:** Only content items are reviewed, not module titles.
- **A2:** Reviews apply to all course content in the organization, including self-paced courses.
