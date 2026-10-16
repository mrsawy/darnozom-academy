# Portals & Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a teacher home page (sessions in the next 7 days), a parent home page (child cards with next session, latest evaluation, action items), and an admin dashboard (9 count cards linking to existing list pages), each backed by a single NATS call, and hide admin nav entries for instructor-only users.

**Architecture:** A new NestJS module `dashboard` in `apps/server/src/dashboard/` with three service methods — one per portal — that run indexed aggregations against existing collections (Group, Session, Task, ShariaReview, FamilyPayment, PayStatement, Certificate, SessionEvaluation). NATS patterns `dashboard.admin`, `dashboard.parent`, `dashboard.teacher`. Client data layer follows the existing action + React Query hook pattern. UI updates: replace the org-dashboard home sections with count cards; add a teacher home page and a parent home page; extend parent sidebar navigation; update `filter-nav.ts` to hide admin items for instructor-only users.

**Tech Stack:** NestJS 11, Mongoose 8, Jest 29 (server, `--runInBand`, `jest.config.cjs`), Next.js 16, next-intl, @tanstack/react-query, Vitest 2 (client and shared-types), pnpm + Nx monorepo.

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp10-portals-admin-dashboard-design.md`

**Depends on:** Sub-projects 1–9 (all existing collections and entities must exist).

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection.
- **`eslint --fix` only on specific new or modified files, never on a directory.**
- Server controllers are NATS message handlers (`@MessagePattern`). No HTTP controllers.
- Every server-side error is a key from `DashboardErrors`; the client translates it with `translateApiMessage`.
- Every user-facing string is a next-intl key in both `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- All aggregations are scoped to the caller's `organizationId`. Other orgs' data must never appear.
- Dashboard endpoints are read-only. No writes introduced.

## Review Focus

- An instructor-only user (role `INSTRUCTOR` only, no additional staff roles) must see no admin nav items; a user with `INSTRUCTOR` + `COORDINATOR` must see both sets.
- Admin count cards are hidden when the caller lacks `READ` on the card's subject (e.g., a supervisor must not see the billing-related cards).
- Parent dashboard must never include data for a child who is not linked to the calling parent via `validateParentChildLink`.
- Teacher dashboard date window: "today + next 7 days" is `[startOfDay(now, tz), startOfDay(now + 8 days, tz))` in the teacher's timezone; a session starting at 23:59 tonight must appear.
- Another organization's sessions, groups, tasks, or certificates must never appear in any dashboard endpoint even when the aggregation joins multiple collections.

---

## File Structure

**Shared types** (`lib/shared-types/src/lib/`):
- `types/dashboard/dashboard.types.ts` — `IAdminDashboardCounts`, `ITeacherDashboardData`, `IParentChildCard`, `IParentDashboardData`, `IUpcomingSession`, `IActionItem`.
- `types/dashboard/index.ts`
- `messages/dashboard-errors.enum.ts` — `DashboardErrors`.
- Update `lib/shared-types/src/index.ts` to re-export both.

**Server** (`apps/server/src/dashboard/`):
- `dashboard.service.ts` — `getAdminCounts(userId, orgId)`, `getTeacherDashboard(userId, orgId)`, `getParentDashboard(userId, orgId)`.
- `dashboard.service.spec.ts`
- `dashboard.controller.message.ts` — patterns `dashboard.admin`, `dashboard.parent`, `dashboard.teacher`.
- `dashboard.controller.message.spec.ts`
- `dashboard.module.ts`
- Update `apps/server/src/app.module.ts`.

**Client**:
- `apps/client/src/lib/types/dashboard/dashboard.ts` — barrel re-export from `@darnozom/shared-types`.
- `apps/client/src/lib/actions/dashboard/dashboard.action.ts` — three server actions.
- `apps/client/src/lib/actions/dashboard/dashboard.action.spec.ts`
- `apps/client/src/lib/hooks/dashboard/use-dashboard.hook.ts` — three React Query hooks.
- `apps/client/src/lib/hooks/dashboard/use-dashboard.hook.spec.ts`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/sections/admin-dashboard-section.tsx` — 9 count cards.
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/sections/reports/reports-section.tsx` — update to use `AdminDashboardSection`.
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.ts` — add instructor-only guard.
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.test.ts` — add tests.
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-sessions/page.tsx` — repurpose or rename to teacher home page (sessions in next 7 days).
- `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/__components/parent-dashboard-view.tsx` — replace with child-card view.
- `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/__components/ParentSidebar.tsx` — add Sessions & Reports and Certificates nav entries.
- Update `apps/client/messages/en.json` and `apps/client/messages/ar.json`.

---

## Task Breakdown

### Task 1: Shared types and error enum

**Files:**
- Create: `lib/shared-types/src/lib/types/dashboard/dashboard.types.ts`
- Create: `lib/shared-types/src/lib/types/dashboard/index.ts`
- Create: `lib/shared-types/src/lib/messages/dashboard-errors.enum.ts`
- Modify: `lib/shared-types/src/index.ts`

**Interfaces:**
- Produces: `IAdminDashboardCounts`, `ITeacherDashboardData`, `IParentDashboardData`, `IParentChildCard`, `IUpcomingSession`, `IActionItem`, `DashboardErrors` — exact shapes consumed by Tasks 2–6.

- [ ] **Step 1: Write the failing shared-types test**

```typescript
// lib/shared-types/src/lib/types/dashboard/dashboard.types.spec.ts
import {
  IAdminDashboardCounts,
  IParentDashboardData,
  ITeacherDashboardData,
} from './dashboard.types';
import { DashboardErrors } from '../../messages/dashboard-errors.enum';

describe('dashboard shared types', () => {
  it('IAdminDashboardCounts has all 9 count card fields', () => {
    const counts: IAdminDashboardCounts = {
      groupsByStatus: { FORMING: 0, READY_TO_START: 0, RUNNING: 0, COMPLETED: 0, CANCELLED: 0 },
      atRiskGroups: 0,
      todaySessions: { SCHEDULED: 0, REPORT_PENDING: 0, COMPLETED: 0 },
      openTasks: 0,
      overdueTasks: 0,
      contentAwaitingShariaReview: 0,
      receiptsAwaitingReview: 0,
      outstandingBalance: [],
      payStatementsAwaitingApproval: 0,
      certificatesAwaitingReview: 0,
    };
    expect(counts.atRiskGroups).toBe(0);
  });

  it('IParentChildCard has groupCards and actionItems', () => {
    const card: IParentChildCard = {
      studentId: 'sid',
      studentName: 'Ali',
      groupCards: [],
      latestEvaluation: null,
      actionItems: [],
    };
    expect(card.groupCards).toHaveLength(0);
  });

  it('DashboardErrors has FORBIDDEN', () => {
    expect(DashboardErrors.FORBIDDEN).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @darnozom/shared-types exec vitest run --no-file-parallelism src/lib/types/dashboard/dashboard.types.spec.ts`
Expected: FAIL — cannot find module `./dashboard.types`.

- [ ] **Step 3: Create the shared-types files**

`lib/shared-types/src/lib/messages/dashboard-errors.enum.ts`:
```typescript
export enum DashboardErrors {
  FORBIDDEN = 'dashboard/forbidden',
  NOT_FOUND = 'dashboard/not-found',
}
```

`lib/shared-types/src/lib/types/dashboard/dashboard.types.ts`:
```typescript
export interface IBalanceEntry {
  currency: string;
  amount: number;
}

export interface IActionItem {
  type: 'PAYMENT_DUE' | 'CERT_NAME_REVIEW' | 'RECEIPT_REJECTED';
  groupId?: string;
  groupName?: string;
  familyPaymentId?: string;
  certificateId?: string;
}

export interface IUpcomingSession {
  _id: string;
  groupId: string;
  groupName: string;
  startsAt: string; // ISO
  status: string;
  sessionNumber: number;
}

export interface IGroupCard {
  groupId: string;
  groupName: string;
  nextSession: IUpcomingSession | null;
}

export interface ILatestEvaluation {
  sessionId: string;
  sessionNumber: number;
  scores: Record<string, number>;
  comment?: string;
}

export interface IParentChildCard {
  studentId: string;
  studentName: string;
  groupCards: IGroupCard[];
  latestEvaluation: ILatestEvaluation | null;
  actionItems: IActionItem[];
}

export interface IParentDashboardData {
  children: IParentChildCard[];
}

export interface ITeacherSession extends IUpcomingSession {
  actionLabel: 'TAKE_ATTENDANCE' | 'SUBMIT_REPORT' | 'ENTER_FINAL_RESULTS' | null;
}

export interface ITeacherDashboardData {
  sessions: ITeacherSession[];
}

export interface IAdminDashboardCounts {
  groupsByStatus: Record<string, number>;
  atRiskGroups: number;
  todaySessions: Record<string, number>;
  openTasks: number;
  overdueTasks: number;
  contentAwaitingShariaReview: number;
  receiptsAwaitingReview: number;
  outstandingBalance: IBalanceEntry[];
  payStatementsAwaitingApproval: number;
  certificatesAwaitingReview: number;
}
```

`lib/shared-types/src/lib/types/dashboard/index.ts`:
```typescript
export * from './dashboard.types';
```

- [ ] **Step 4: Add to shared-types barrel**

In `lib/shared-types/src/index.ts`, add:
```typescript
export * from './lib/types/dashboard/index';
export * from './lib/messages/dashboard-errors.enum';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @darnozom/shared-types exec vitest run --no-file-parallelism src/lib/types/dashboard/dashboard.types.spec.ts`
Expected: PASS — 3 tests pass.

- [ ] **Step 6: Run full shared-types suite**

Run: `pnpm --filter @darnozom/shared-types exec vitest run --no-file-parallelism`
Expected: All tests pass (≥ 54 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/shared-types/src/lib/types/dashboard lib/shared-types/src/lib/messages/dashboard-errors.enum.ts lib/shared-types/src/index.ts
git commit -m "feat(sp10): shared types for dashboard endpoints

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Server dashboard module

**Files:**
- Create: `apps/server/src/dashboard/dashboard.service.ts`
- Create: `apps/server/src/dashboard/dashboard.service.spec.ts`
- Create: `apps/server/src/dashboard/dashboard.controller.message.ts`
- Create: `apps/server/src/dashboard/dashboard.controller.message.spec.ts`
- Create: `apps/server/src/dashboard/dashboard.module.ts`
- Modify: `apps/server/src/app.module.ts`

**Interfaces:**
- Consumes: `IAdminDashboardCounts`, `ITeacherDashboardData`, `IParentDashboardData`, `DashboardErrors` from Task 1.
- Consumes: `GroupStatus`, `SessionStatus`, `TaskStatus`, `FamilyPaymentState` from `@darnozom/shared-types`.
- Consumes: `Group`, `Session`, `Task`, `ShariaReview`, `FamilyPayment`, `PayStatement`, `Certificate`, `SessionEvaluation` Mongoose models from existing modules (inject via module imports).
- Produces: NATS patterns `dashboard.admin`, `dashboard.parent`, `dashboard.teacher`.

**Note:** Look up the Mongoose injection token for each model before writing the service. The pattern is `@InjectModel(ModelName.name)` with `MongooseModule.forFeature([{ name: ModelName.name, schema: ModelNameSchema }])` in the module. Check existing modules (e.g., `apps/server/src/academics/group/group.module.ts`) for the exact token names.

- [ ] **Step 1: Read existing model token patterns**

Read `apps/server/src/academics/group/group.module.ts` to confirm MongooseModule.forFeature usage. Read `apps/server/src/academics/session/session.module.ts` similarly. Note entity names used as injection tokens.

- [ ] **Step 2: Write the failing service test**

```typescript
// apps/server/src/dashboard/dashboard.service.spec.ts
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { Group } from '../academics/group/entities/group.entity';
import { Session } from '../academics/session/entities/session.entity';

const mockModel = () => ({ countDocuments: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue([]) });

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Group.name), useFactory: mockModel },
        { provide: getModelToken(Session.name), useFactory: mockModel },
        { provide: getModelToken('Task'), useFactory: mockModel },
        { provide: getModelToken('ShariaReview'), useFactory: mockModel },
        { provide: getModelToken('FamilyPayment'), useFactory: mockModel },
        { provide: getModelToken('PayStatement'), useFactory: mockModel },
        { provide: getModelToken('Certificate'), useFactory: mockModel },
        { provide: getModelToken('SessionEvaluation'), useFactory: mockModel },
        { provide: getModelToken('GroupStudent'), useFactory: mockModel },
      ],
    }).compile();
    service = module.get(DashboardService);
  });

  it('getAdminCounts returns zero counts for empty collections', async () => {
    const result = await service.getAdminCounts('userId', 'orgId', []);
    expect(result.atRiskGroups).toBe(0);
    expect(result.openTasks).toBe(0);
  });

  it('getTeacherDashboard returns empty sessions for empty collection', async () => {
    const result = await service.getTeacherDashboard('teacherId', 'orgId');
    expect(result.sessions).toHaveLength(0);
  });

  it('getParentDashboard returns empty children for empty collection', async () => {
    const result = await service.getParentDashboard('parentId', 'orgId');
    expect(result.children).toHaveLength(0);
  });
});
```

Run: `cd apps/server && npx jest --runInBand --testPathPattern="dashboard.service.spec" --no-coverage`
Expected: FAIL — `DashboardService` not defined.

- [ ] **Step 3: Write the service**

Read the following files to confirm exact model names and entity class names:
- `apps/server/src/academics/group/entities/group.entity.ts`
- `apps/server/src/academics/session/entities/session.entity.ts`
- `apps/server/src/academics/task/entities/task.entity.ts` (if exists; otherwise check `apps/server/src/academics/`)
- `apps/server/src/billing/entities/` (for `FamilyPayment`)
- `apps/server/src/payroll/entities/` (for `PayStatement`)
- `apps/server/src/certificate/entities/` (for `Certificate`)
- `apps/server/src/academics/session/entities/session-evaluation.entity.ts` (or similar)
- `apps/server/src/academics/group/entities/group-student.entity.ts`

`apps/server/src/dashboard/dashboard.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IAdminDashboardCounts, ITeacherDashboardData, IParentDashboardData,
  IParentChildCard, ITeacherSession, IGroupCard, DashboardErrors,
  GroupStatus, SessionStatus, TaskStatus, FamilyPaymentState,
} from '@darnozom/shared-types';
import { Group } from '../academics/group/entities/group.entity';
import { Session } from '../academics/session/entities/session.entity';
// ... other imports resolved from reading actual entity files

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    // ... inject other models using their actual class.name tokens
  ) {}

  async getAdminCounts(
    userId: string,
    orgId: string,
    userSubjectPermissions: string[],
  ): Promise<IAdminDashboardCounts> {
    const oid = new Types.ObjectId(orgId);

    const [groupsByStatus, atRiskGroups, todaySessions, openTasks, overdueTasks,
      contentAwaitingShariaReview, receiptsAwaitingReview, outstandingBalance,
      payStatementsAwaitingApproval, certificatesAwaitingReview] = await Promise.all([
      this.groupModel.aggregate([
        { $match: { organizationId: oid, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.groupModel.countDocuments({ organizationId: oid, atRisk: true, deletedAt: null }),
      this.sessionModel.aggregate([
        { $match: { organizationId: oid, startsAt: this._todayRange(), deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // tasks: open
      this._countTasks(oid, [TaskStatus.OPEN], false),
      // tasks: overdue (open tasks past their dueAt)
      this._countTasks(oid, [TaskStatus.OPEN], true),
      // sharia review count
      this._countShariaReview(oid),
      // receipts awaiting review
      this._countReceipts(oid),
      // outstanding balance per currency
      this._outstandingBalance(oid),
      // pay statements awaiting approval
      this._countPayStatements(oid),
      // certificates awaiting name review
      this._countCertificates(oid),
    ]);

    return {
      groupsByStatus: Object.fromEntries(groupsByStatus.map((g: { _id: string; count: number }) => [g._id, g.count])),
      atRiskGroups,
      todaySessions: Object.fromEntries(todaySessions.map((s: { _id: string; count: number }) => [s._id, s.count])),
      openTasks,
      overdueTasks,
      contentAwaitingShariaReview,
      receiptsAwaitingReview,
      outstandingBalance,
      payStatementsAwaitingApproval,
      certificatesAwaitingReview,
    };
  }

  async getTeacherDashboard(teacherId: string, orgId: string): Promise<ITeacherDashboardData> {
    const oid = new Types.ObjectId(orgId);
    const tid = new Types.ObjectId(teacherId);
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 8);

    const sessions = await this.sessionModel.find({
      organizationId: oid,
      teacherId: tid,
      startsAt: { $gte: now, $lt: windowEnd },
      deletedAt: null,
    }).sort({ startsAt: 1 }).lean();

    // Fetch group names in one query
    const groupIds = [...new Set(sessions.map((s) => String(s.groupId)))];
    const groups = await this.groupModel.find({ _id: { $in: groupIds.map(id => new Types.ObjectId(id)) } }, { name: 1 }).lean();
    const groupNameMap = Object.fromEntries(groups.map((g) => [String(g._id), g.name]));

    const teacherSessions: ITeacherSession[] = sessions.map((s) => ({
      _id: String(s._id),
      groupId: String(s.groupId),
      groupName: groupNameMap[String(s.groupId)] ?? '',
      startsAt: (s.startsAt as Date).toISOString(),
      status: s.status,
      sessionNumber: s.sessionNumber ?? 0,
      actionLabel: this._teacherActionLabel(s.status as string),
    }));

    return { sessions: teacherSessions };
  }

  async getParentDashboard(parentId: string, orgId: string): Promise<IParentDashboardData> {
    const oid = new Types.ObjectId(orgId);
    // Look up children via GroupStudent with parentId link — check actual entity
    // for the field name; it is likely stored on GroupStudent as parentUserId or
    // resolved via a separate parent-student link collection from SP6.
    // Return empty if no children found.
    return { children: [] };
  }

  private _todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { $gte: start, $lt: end };
  }

  private _teacherActionLabel(status: string): ITeacherSession['actionLabel'] {
    if (status === SessionStatus.SCHEDULED) return 'TAKE_ATTENDANCE';
    if (status === SessionStatus.REPORT_PENDING) return 'SUBMIT_REPORT';
    return null;
  }

  // Stub helpers — fill in with real model references after reading entity files:
  private async _countTasks(oid: Types.ObjectId, statuses: string[], overdue: boolean): Promise<number> { return 0; }
  private async _countShariaReview(oid: Types.ObjectId): Promise<number> { return 0; }
  private async _countReceipts(oid: Types.ObjectId): Promise<number> { return 0; }
  private async _outstandingBalance(oid: Types.ObjectId): Promise<{ currency: string; amount: number }[]> { return []; }
  private async _countPayStatements(oid: Types.ObjectId): Promise<number> { return 0; }
  private async _countCertificates(oid: Types.ObjectId): Promise<number> { return 0; }
}
```

**After reading the actual entity files in Step 1**, replace the stub helpers with real queries using the correct model injection tokens. For each stub: look up the entity's schema field names (e.g., `status`, `organizationId`, `dueAt`, `deletedAt`) from the entity files before writing the query.

- [ ] **Step 4: Write the controller**

`apps/server/src/dashboard/dashboard.controller.message.ts`:
```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { DashboardService } from './dashboard.service';
import { CallerUser } from '../auth/decorators/caller-user.decorator';
import { IUser } from '@darnozom/shared-types';

@Controller()
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @MessagePattern('dashboard.admin')
  async getAdminDashboard(@CallerUser() user: IUser) {
    // Pass the caller's casl permissions subjects to service for card hiding
    const userSubjectPermissions: string[] = user.permissions?.map((p) => p.subject) ?? [];
    return this.dashboardService.getAdminCounts(user._id, user.organizationId, userSubjectPermissions);
  }

  @MessagePattern('dashboard.teacher')
  async getTeacherDashboard(@CallerUser() user: IUser) {
    return this.dashboardService.getTeacherDashboard(user._id, user.organizationId);
  }

  @MessagePattern('dashboard.parent')
  async getParentDashboard(@CallerUser() user: IUser) {
    return this.dashboardService.getParentDashboard(user._id, user.organizationId);
  }
}
```

**Note on `@CallerUser` / `AuthGuard`:** Check how existing controllers (e.g., `apps/server/src/academics/group/group.controller.message.ts`) extract the calling user from the NATS payload. Use the same decorator/pattern. Do not invent a new pattern.

- [ ] **Step 5: Write the module**

`apps/server/src/dashboard/dashboard.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller.message';
import { Group, GroupSchema } from '../academics/group/entities/group.entity';
import { Session, SessionSchema } from '../academics/session/entities/session.entity';
// ... import other entity/schema pairs after reading them in Step 1

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Session.name, schema: SessionSchema },
      // ... other models
    ]),
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
```

- [ ] **Step 6: Register in AppModule**

In `apps/server/src/app.module.ts`, add:
```typescript
import { DashboardModule } from './dashboard/dashboard.module';
// ...
DashboardModule,
```

- [ ] **Step 7: Write controller spec**

`apps/server/src/dashboard/dashboard.controller.message.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller.message';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  const mockService = {
    getAdminCounts: jest.fn().mockResolvedValue({ atRiskGroups: 0, openTasks: 0, overdueTasks: 0, groupsByStatus: {}, todaySessions: {}, contentAwaitingShariaReview: 0, receiptsAwaitingReview: 0, outstandingBalance: [], payStatementsAwaitingApproval: 0, certificatesAwaitingReview: 0 }),
    getTeacherDashboard: jest.fn().mockResolvedValue({ sessions: [] }),
    getParentDashboard: jest.fn().mockResolvedValue({ children: [] }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockService }],
    }).compile();
    controller = module.get(DashboardController);
  });

  it('getAdminDashboard delegates to service', async () => {
    const user = { _id: 'u1', organizationId: 'o1', permissions: [] } as any;
    const result = await controller.getAdminDashboard(user);
    expect(mockService.getAdminCounts).toHaveBeenCalledWith('u1', 'o1', []);
    expect(result.atRiskGroups).toBe(0);
  });

  it('getTeacherDashboard delegates to service', async () => {
    const user = { _id: 'u1', organizationId: 'o1', permissions: [] } as any;
    const result = await controller.getTeacherDashboard(user);
    expect(result.sessions).toHaveLength(0);
  });

  it('getParentDashboard delegates to service', async () => {
    const user = { _id: 'u1', organizationId: 'o1', permissions: [] } as any;
    const result = await controller.getParentDashboard(user);
    expect(result.children).toHaveLength(0);
  });
});
```

- [ ] **Step 8: Run service and controller specs**

Run: `cd apps/server && npx jest --runInBand --testPathPattern="dashboard\.(service|controller)" --no-coverage`
Expected: All 6 tests pass.

- [ ] **Step 9: Run full server suite**

Run: `cd apps/server && npx jest --runInBand --no-coverage`
Expected: All tests pass (≥ 59 pre-existing + new dashboard tests).

- [ ] **Step 10: Commit**

```bash
git add apps/server/src/dashboard apps/server/src/app.module.ts
git commit -m "feat(sp10): server dashboard module with three NATS endpoints

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Client data layer

**Files:**
- Create: `apps/client/src/lib/types/dashboard/dashboard.ts`
- Create: `apps/client/src/lib/actions/dashboard/dashboard.action.ts`
- Create: `apps/client/src/lib/actions/dashboard/dashboard.action.spec.ts`
- Create: `apps/client/src/lib/hooks/dashboard/use-dashboard.hook.ts`
- Create: `apps/client/src/lib/hooks/dashboard/use-dashboard.hook.spec.ts`

**Interfaces:**
- Consumes: `IAdminDashboardCounts`, `ITeacherDashboardData`, `IParentDashboardData` from Task 1 (via `@darnozom/shared-types`).
- Produces: `useAdminDashboard()`, `useTeacherDashboard()`, `useParentDashboard()` React Query hooks; `dashboardKeys` query key factory; three server actions.

- [ ] **Step 1: Write the failing actions test**

`apps/client/src/lib/actions/dashboard/dashboard.action.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/utils/nats/createAuthorizedNatsRequest', () => ({
  createAuthorizedNatsRequest: vi.fn(),
}));

import { getAdminDashboard, getTeacherDashboard, getParentDashboard } from './dashboard.action';
import { createAuthorizedNatsRequest } from '@/lib/utils/nats/createAuthorizedNatsRequest';

const mockNats = vi.mocked(createAuthorizedNatsRequest);

describe('dashboard actions', () => {
  beforeEach(() => { mockNats.mockReset(); });

  it('getAdminDashboard calls dashboard.admin', async () => {
    mockNats.mockResolvedValueOnce({ atRiskGroups: 2 } as any);
    const result = await getAdminDashboard();
    expect(mockNats).toHaveBeenCalledWith('dashboard.admin', {});
    expect(result).toEqual({ atRiskGroups: 2 });
  });

  it('getTeacherDashboard calls dashboard.teacher', async () => {
    mockNats.mockResolvedValueOnce({ sessions: [] } as any);
    await getTeacherDashboard();
    expect(mockNats).toHaveBeenCalledWith('dashboard.teacher', {});
  });

  it('getParentDashboard calls dashboard.parent', async () => {
    mockNats.mockResolvedValueOnce({ children: [] } as any);
    await getParentDashboard();
    expect(mockNats).toHaveBeenCalledWith('dashboard.parent', {});
  });
});
```

Run: `pnpm --filter client exec vitest run --no-file-parallelism src/lib/actions/dashboard/dashboard.action.spec.ts`
Expected: FAIL — cannot find module `./dashboard.action`.

- [ ] **Step 2: Create the types barrel**

`apps/client/src/lib/types/dashboard/dashboard.ts`:
```typescript
export {
  type IAdminDashboardCounts,
  type ITeacherDashboardData,
  type IParentDashboardData,
  type IParentChildCard,
  type IGroupCard,
  type IUpcomingSession,
  type ITeacherSession,
  type IActionItem,
  type ILatestEvaluation,
  type IBalanceEntry,
  DashboardErrors,
} from '@darnozom/shared-types';
```

- [ ] **Step 3: Create the actions**

`apps/client/src/lib/actions/dashboard/dashboard.action.ts`:
```typescript
'use server';
import { createAuthorizedNatsRequest } from '@/lib/utils/nats/createAuthorizedNatsRequest';
import type { IAdminDashboardCounts, ITeacherDashboardData, IParentDashboardData } from '@darnozom/shared-types';

export async function getAdminDashboard() {
  return createAuthorizedNatsRequest<IAdminDashboardCounts>('dashboard.admin', {});
}

export async function getTeacherDashboard() {
  return createAuthorizedNatsRequest<ITeacherDashboardData>('dashboard.teacher', {});
}

export async function getParentDashboard() {
  return createAuthorizedNatsRequest<IParentDashboardData>('dashboard.parent', {});
}
```

- [ ] **Step 4: Run the actions test**

Run: `pnpm --filter client exec vitest run --no-file-parallelism src/lib/actions/dashboard/dashboard.action.spec.ts`
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Write the failing hooks test**

`apps/client/src/lib/hooks/dashboard/use-dashboard.hook.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/utils', () => ({ useQuery: vi.fn(), useMutation: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: vi.fn(() => (k: string) => k) }));
vi.mock('@/lib/utils/errors/translateApiMessage', () => ({ translateApiMessage: vi.fn() }));
vi.mock('@/lib/actions/dashboard/dashboard.action', () => ({
  getAdminDashboard: vi.fn(),
  getTeacherDashboard: vi.fn(),
  getParentDashboard: vi.fn(),
}));

import { dashboardKeys } from './use-dashboard.hook';

describe('dashboardKeys', () => {
  it('admin key is stable', () => {
    expect(dashboardKeys.admin()).toEqual(['dashboard', 'admin']);
  });

  it('teacher key is stable', () => {
    expect(dashboardKeys.teacher()).toEqual(['dashboard', 'teacher']);
  });

  it('parent key is stable', () => {
    expect(dashboardKeys.parent()).toEqual(['dashboard', 'parent']);
  });
});
```

Run: `pnpm --filter client exec vitest run --no-file-parallelism src/lib/hooks/dashboard/use-dashboard.hook.spec.ts`
Expected: FAIL — cannot find module `./use-dashboard.hook`.

- [ ] **Step 6: Create the hooks**

`apps/client/src/lib/hooks/dashboard/use-dashboard.hook.ts`:
```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard, getTeacherDashboard, getParentDashboard } from '@/lib/actions/dashboard/dashboard.action';

const ROOT = 'dashboard';

export const dashboardKeys = {
  all: [ROOT] as const,
  admin: () => [ROOT, 'admin'] as const,
  teacher: () => [ROOT, 'teacher'] as const,
  parent: () => [ROOT, 'parent'] as const,
};

export const useAdminDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.admin(), queryFn: getAdminDashboard, enabled });

export const useTeacherDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.teacher(), queryFn: getTeacherDashboard, enabled });

export const useParentDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.parent(), queryFn: getParentDashboard, enabled });
```

- [ ] **Step 7: Run hooks test**

Run: `pnpm --filter client exec vitest run --no-file-parallelism src/lib/hooks/dashboard/use-dashboard.hook.spec.ts`
Expected: PASS — 3 tests pass.

- [ ] **Step 8: Run full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: All tests pass (≥ 8 pre-existing client tests).

- [ ] **Step 9: Commit**

```bash
git add apps/client/src/lib/types/dashboard apps/client/src/lib/actions/dashboard apps/client/src/lib/hooks/dashboard
git commit -m "feat(sp10): client data layer for dashboard endpoints

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Admin dashboard UI

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/sections/admin-dashboard-section.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/sections/reports/reports-section.tsx`
- Modify: `apps/client/messages/en.json`
- Modify: `apps/client/messages/ar.json`

**Interfaces:**
- Consumes: `useAdminDashboard()` from Task 3; `IAdminDashboardCounts` types.
- Consumes: routes `ROUTE_ORG_ACADEMICS_GROUPS`, `ROUTE_ORG_MY_SESSIONS`, `ROUTE_ORG_MY_TASKS`, `ROUTE_ORG_SHARIA_REVIEW`, `ROUTE_ORG_BILLING_RECEIPTS`, `ROUTE_ORG_BILLING_FAMILIES`, `ROUTE_ORG_PAYROLL`, `ROUTE_ORG_MY_CERTIFICATES` from routes constants.
- Consumes: user CASL permissions from `useAuthUser()` to hide cards (use `ability.can('read', Subjects.BILLING)` pattern — check how existing screens read permissions).

**Note:** Before writing the component, read `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/sections/reports/reports-section.tsx` to understand the current layout of the org dashboard home. Keep any existing KPI/report sections and add the count cards; do not remove content already shown there.

- [ ] **Step 1: Add i18n keys**

In `apps/client/messages/en.json`, add under `"AdminDashboard"` (create the key if absent):
```json
"AdminDashboard": {
  "groupsByStatus": "Groups by Status",
  "atRiskGroups": "At-Risk Groups",
  "todaySessions": "Today's Sessions",
  "openTasks": "Open Tasks",
  "overdueTasks": "Overdue Tasks",
  "contentAwaitingShariaReview": "Awaiting Sharia Review",
  "receiptsAwaitingReview": "Receipts to Review",
  "outstandingBalance": "Outstanding Balance",
  "payStatementsAwaitingApproval": "Pay Statements Pending",
  "certificatesAwaitingReview": "Certificates to Review",
  "viewAll": "View All",
  "loading": "Loading dashboard…",
  "scheduled": "Scheduled",
  "reportPending": "Report Pending",
  "completed": "Completed"
}
```

Mirror the same keys in `apps/client/messages/ar.json` with Arabic translations (use the same English values as placeholders — a translator will update them — but the keys must be present for `i18n:check-keys`).

- [ ] **Step 2: Write the admin dashboard section component**

`apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/sections/admin-dashboard-section.tsx`:
```typescript
'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useAdminDashboard } from '@/lib/hooks/dashboard/use-dashboard.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { Subjects, Actions } from '@darnozom/shared-types';
import {
  ROUTE_ORG_ACADEMICS_GROUPS,
  ROUTE_ORG_MY_SESSIONS,
  ROUTE_ORG_MY_TASKS,
  ROUTE_ORG_SHARIA_REVIEW,
  ROUTE_ORG_BILLING_RECEIPTS,
  ROUTE_ORG_BILLING_FAMILIES,
  ROUTE_ORG_PAYROLL,
  ROUTE_ORG_MY_CERTIFICATES,
} from '@/lib/data/constants/routes.constants';

function CountCard({ title, value, href }: { title: string; value: number | string; href: string }) {
  const t = useTranslations('AdminDashboard');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        <Link href={href} className="text-xs text-primary underline mt-1 block">
          {t('viewAll')}
        </Link>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardSection() {
  const t = useTranslations('AdminDashboard');
  const { data: counts, isLoading } = useAdminDashboard();
  const { data: user } = useAuthUser();

  // Permission check helper — read how existing screens use CASL; adapt accordingly.
  // Simplest approach: check if the user's roleName is in the admin roles list.
  // If your codebase has a useAbility() hook, use that instead.
  const canSeeBilling = true; // TODO: replace with real permission check after reading existing permission patterns

  if (isLoading || !counts) return <p className="p-4 text-muted-foreground">{t('loading')}</p>;

  const groupTotal = Object.values(counts.groupsByStatus).reduce((a, b) => a + b, 0);
  const todayTotal = Object.values(counts.todaySessions).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <CountCard title={t('groupsByStatus')} value={groupTotal} href={ROUTE_ORG_ACADEMICS_GROUPS} />
      <CountCard title={t('atRiskGroups')} value={counts.atRiskGroups} href={`${ROUTE_ORG_ACADEMICS_GROUPS}?atRisk=true`} />
      <CountCard title={t('todaySessions')} value={todayTotal} href={ROUTE_ORG_MY_SESSIONS} />
      <CountCard title={t('openTasks')} value={counts.openTasks} href={ROUTE_ORG_MY_TASKS} />
      <CountCard title={t('overdueTasks')} value={counts.overdueTasks} href={`${ROUTE_ORG_MY_TASKS}?overdue=true`} />
      <CountCard title={t('contentAwaitingShariaReview')} value={counts.contentAwaitingShariaReview} href={ROUTE_ORG_SHARIA_REVIEW} />
      {canSeeBilling && (
        <>
          <CountCard title={t('receiptsAwaitingReview')} value={counts.receiptsAwaitingReview} href={ROUTE_ORG_BILLING_RECEIPTS} />
          <CountCard
            title={t('outstandingBalance')}
            value={counts.outstandingBalance.map((b) => `${b.amount} ${b.currency}`).join(' · ') || '0'}
            href={ROUTE_ORG_BILLING_FAMILIES}
          />
          <CountCard title={t('payStatementsAwaitingApproval')} value={counts.payStatementsAwaitingApproval} href={ROUTE_ORG_PAYROLL} />
        </>
      )}
      <CountCard title={t('certificatesAwaitingReview')} value={counts.certificatesAwaitingReview} href={ROUTE_ORG_MY_CERTIFICATES} />
    </div>
  );
}
```

**After writing:** read `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/sections/reports/reports-section.tsx` and replace the `canSeeBilling = true` stub with the actual permission check that matches how that file or its siblings gate financial content.

- [ ] **Step 3: Wire into reports-section**

Read `reports-section.tsx`. At the top of its JSX output, add `<AdminDashboardSection />` before existing content. Import the component.

- [ ] **Step 4: Run i18n check**

Run: `pnpm --filter client i18n:check-keys`
Expected: No missing keys reported.

- [ ] **Step 5: Run full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/app/[locale]/\(dashboard\)/organization-dashboard/__components/sections/admin-dashboard-section.tsx apps/client/src/app/[locale]/\(dashboard\)/organization-dashboard/__components/sections/reports/reports-section.tsx apps/client/messages/en.json apps/client/messages/ar.json
git commit -m "feat(sp10): admin dashboard count cards

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Teacher portal — hidden admin nav and session home

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.test.ts`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-sessions/page.tsx` (or create teacher home page at this route)
- Modify: `apps/client/messages/en.json` and `apps/client/messages/ar.json`

**Interfaces:**
- Consumes: `isNavItemVisible(item, user)` from existing `filter-nav.ts`; `Roles` from `@darnozom/shared-types`.
- Consumes: `useTeacherDashboard()` from Task 3.
- Produces: updated `isNavItemVisible` that hides non-`instructorOnly` items when user's only role is `INSTRUCTOR`.

- [ ] **Step 1: Read the current filter-nav implementation and tests**

Read `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.ts` fully.
Read `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/__components/filter-nav.test.ts` fully.

- [ ] **Step 2: Write the failing filter-nav test**

In `filter-nav.test.ts`, add:
```typescript
describe('instructor-only user', () => {
  const instructorUser = {
    roleName: Roles.INSTRUCTOR,
    additionalRoles: [] as string[],
  } as any;

  it('hides items with no instructorOnly flag when user is instructor-only', () => {
    const adminItem = { key: 'courses', titleKey: 'navMain.courses', url: '/org/courses' };
    expect(isNavItemVisible(adminItem, instructorUser)).toBe(false);
  });

  it('shows instructorOnly items for instructor-only user', () => {
    const teacherItem = { key: 'my-groups', titleKey: 'navMain.myGroups', url: '/org/my-groups', instructorOnly: true };
    expect(isNavItemVisible(teacherItem, instructorUser)).toBe(true);
  });

  it('shows all items for a user with INSTRUCTOR + COORDINATOR', () => {
    const dualUser = { roleName: Roles.INSTRUCTOR, additionalRoles: [Roles.COORDINATOR] } as any;
    const adminItem = { key: 'courses', titleKey: 'navMain.courses', url: '/org/courses' };
    expect(isNavItemVisible(adminItem, dualUser)).toBe(true);
  });
});
```

Run: `pnpm --filter client exec vitest run --no-file-parallelism src/app/[locale]/\(dashboard\)/organization-dashboard/__components/filter-nav.test.ts`
Expected: FAIL — new tests fail because the current `isNavItemVisible` does not implement the instructor-only guard.

- [ ] **Step 3: Update filter-nav to implement instructor-only guard**

In `filter-nav.ts`, add logic: if the user's only role is `INSTRUCTOR` (i.e., `roleName === Roles.INSTRUCTOR` and `additionalRoles` is empty or contains only `INSTRUCTOR`), then only show items where `item.instructorOnly === true`. Otherwise apply the existing `requiredRoles` check.

Exact implementation depends on the current function signature. After reading the file in Step 1, make the minimal change that satisfies the three new tests without breaking the existing tests.

- [ ] **Step 4: Run all filter-nav tests**

Run: `pnpm --filter client exec vitest run --no-file-parallelism src/app/[locale]/\(dashboard\)/organization-dashboard/__components/filter-nav.test.ts`
Expected: All tests pass (old + new).

- [ ] **Step 5: Add i18n keys for teacher home**

In `en.json`, add under `"TeacherDashboard"`:
```json
"TeacherDashboard": {
  "title": "My Upcoming Sessions",
  "empty": "No sessions in the next 7 days.",
  "loading": "Loading sessions…",
  "takeAttendance": "Take Attendance",
  "submitReport": "Submit Report",
  "enterFinalResults": "Enter Final Results"
}
```

Mirror in `ar.json`.

- [ ] **Step 6: Update my-sessions page to be the teacher home**

Read `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/my-sessions/page.tsx`.

If that page already shows a session list for the teacher, add an "upcoming (next 7 days)" section at the top using `useTeacherDashboard()` that renders each `ITeacherSession` as a row with the session name, time, and an action button that links to the existing session detail page. If the page does not exist yet, create it with this content.

The action button maps `actionLabel` to the link:
- `TAKE_ATTENDANCE` → `ROUTE_ORG_SESSION(session._id)`
- `SUBMIT_REPORT` → `ROUTE_ORG_SESSION(session._id)`
- `null` → no button

- [ ] **Step 7: Run i18n check**

Run: `pnpm --filter client i18n:check-keys`
Expected: No missing keys.

- [ ] **Step 8: Run full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/client/src/app/[locale]/\(dashboard\)/organization-dashboard/__components/filter-nav.ts apps/client/src/app/[locale]/\(dashboard\)/organization-dashboard/__components/filter-nav.test.ts apps/client/src/app/[locale]/\(dashboard\)/organization-dashboard/my-sessions/page.tsx apps/client/messages/en.json apps/client/messages/ar.json
git commit -m "feat(sp10): hide admin nav for instructor-only users; teacher session home

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Parent portal home and navigation

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/__components/parent-dashboard-view.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/__components/ParentSidebar.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/page.tsx`
- Modify: `apps/client/messages/en.json`
- Modify: `apps/client/messages/ar.json`

**Interfaces:**
- Consumes: `useParentDashboard()` from Task 3; `IParentChildCard`, `IGroupCard`, `IActionItem` types.
- Consumes: `ROUTE_PARENT_MY_CERTIFICATES`, `ROUTE_PARENT_PAYMENTS` from routes constants.
- Consumes: `ROUTE_PARENT_DASHBOARD` as the sessions/reports link base.

- [ ] **Step 1: Read the existing parent dashboard files**

Read `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/__components/parent-dashboard-view.tsx` fully.
Read `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/__components/ParentSidebar.tsx` fully.
Read `apps/client/src/app/[locale]/(dashboard)/parent-dashboard/page.tsx` fully.

- [ ] **Step 2: Add i18n keys**

In `en.json`, add under `"ParentDashboard"`:
```json
"ParentDashboard": {
  "title": "My Children",
  "loading": "Loading…",
  "empty": "No children linked to your account.",
  "nextSession": "Next Session",
  "noUpcomingSession": "No upcoming sessions",
  "latestEvaluation": "Latest Evaluation",
  "noEvaluation": "No evaluation yet",
  "actionItems": "Action Needed",
  "paymentDue": "Payment due",
  "certNameReview": "Certificate name to review",
  "receiptRejected": "Receipt rejected — resubmit",
  "sessionsAndReports": "Sessions & Reports",
  "certificates": "Certificates",
  "payments": "Payments"
}
```

Mirror in `ar.json`.

- [ ] **Step 3: Update parent-dashboard-view.tsx**

Replace (or augment, if there is existing content worth keeping) the view's body with a grid of child cards. Each card shows:
1. Child's name as the card title.
2. A list of group cards: group name + next session time formatted in `Intl.DateTimeFormat` using the user's browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). If `nextSession` is null, show `t('noUpcomingSession')`.
3. Latest evaluation: if not null, show scores as a comma-separated list. Otherwise `t('noEvaluation')`.
4. Action items: render each `IActionItem` as a badge: `PAYMENT_DUE` → amber, `CERT_NAME_REVIEW` → blue, `RECEIPT_REJECTED` → red.

Use `useParentDashboard()` as the data source. Show `t('loading')` while loading; `t('empty')` when `children` is empty.

The component remains a client component (`'use client'`).

- [ ] **Step 4: Update page.tsx to use the new view**

Read the current `page.tsx`. If it still calls `getRelatedStudentsProgress` and renders the old `ParentDashboardView`, replace that import/call with the new `ParentDashboardView` (which now uses `useParentDashboard` internally). Remove the old data-fetching call if it is no longer needed.

- [ ] **Step 5: Update ParentSidebar.tsx**

Read the file. Add two new nav entries if not already present:
1. **Sessions & Reports** — link to `/parent-dashboard/sessions` (or the closest existing route for parent session history; check routes constants first). Icon: `IconCalendarEvent`.
2. **Certificates** — link to `ROUTE_PARENT_MY_CERTIFICATES`. Icon: `IconCertificate`.

Import the required icons from `@tabler/icons-react` and the route constants. Place the new entries after the existing children / wallet entries in the sidebar nav list.

- [ ] **Step 6: Run i18n check**

Run: `pnpm --filter client i18n:check-keys`
Expected: No missing keys.

- [ ] **Step 7: Run full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/app/[locale]/\(dashboard\)/parent-dashboard/__components/parent-dashboard-view.tsx apps/client/src/app/[locale]/\(dashboard\)/parent-dashboard/__components/ParentSidebar.tsx apps/client/src/app/[locale]/\(dashboard\)/parent-dashboard/page.tsx apps/client/messages/en.json apps/client/messages/ar.json
git commit -m "feat(sp10): parent portal home with child cards and updated navigation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Sub-project verification

**Files:** No new files. Runs the full test suites.

- [ ] **Step 1: Run full shared-types suite**

Run: `pnpm --filter @darnozom/shared-types exec vitest run --no-file-parallelism`
Expected: All tests pass.

- [ ] **Step 2: Run full server suite**

Run: `cd apps/server && npx jest --runInBand --no-coverage`
Expected: All tests pass.

- [ ] **Step 3: Run full client suite**

Run: `pnpm --filter client exec vitest run --no-file-parallelism`
Expected: All tests pass.

- [ ] **Step 4: Run i18n check**

Run: `pnpm --filter client i18n:check-keys`
Expected: No missing keys.

- [ ] **Step 5: Commit verification tag**

```bash
git commit --allow-empty -m "chore(sp10): all suites green — sub-project complete

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
