# Attendance Redesign & Enrollment Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace date-only, explicit-absent attendance with slot-keyed, derived-absence attendance; fix the student-search bug in `enrollment.getCourseEnrollments`; split the 670-line enrollment data table.

**Architecture:** Server adds `slotId` to `Attendance`, removes `ABSENT` enum value, introduces `AttendanceDerivationService` to compute expected sessions from `course.offlineSchedule.timeSlots`, and rewrites the report aggregation to derive absent counts. Client gets a new slot-aware marking flow and updated types/hooks. Enrollment data table is split into focused sub-components following ORGAN-PATTERN.

**Tech Stack:** NestJS, MongoDB/Mongoose, mongoose-paginate-v2, Next.js App Router server actions, TanStack Query (`useMutation` / `useQuery`), next-intl, shadcn/ui atoms.

---

## File Map

### Server — created
- `apps/server/src/attendance/attendance.errors.ts` — error message constants
- `apps/server/src/attendance/attendance-derivation.service.ts` — expand recurring slots into session list

### Server — modified
- `apps/server/src/attendance/enum/attendance-status.enum.ts` — remove `ABSENT`
- `apps/server/src/attendance/entities/attendance.entity.ts` — add `slotId`, update unique index
- `apps/server/src/attendance/dto/mark-attendance.dto.ts` — add `slotId`
- `apps/server/src/attendance/dto/bulk-mark-attendance.dto.ts` — add `slotId`
- `apps/server/src/attendance/attendance.service.ts` — rewrite core methods
- `apps/server/src/attendance/attendance.controller.message.ts` — new patterns, updated handlers
- `apps/server/src/attendance/attendance.module.ts` — register User model + DerivationService
- `apps/server/src/course/entities/course.entity.ts` — add `deletedAt` to TimeSlot
- `apps/server/src/enrollment/services/enrollment.service.ts` — fix getCourseEnrollments search
- `apps/server/src/enrollment/seeds/enrollment.seeder.ts` — remove ABSENT, add slotId
- `apps/server/src/course/seeds/course.seeder.ts` — seed offlineSchedule with student rosters

### Client — created
- `apps/client/src/lib/actions/attendance/getAttendanceBySession.action.ts`
- `apps/client/src/lib/actions/attendance/clearAttendance.action.ts`
- `apps/client/src/lib/hooks/attendance/use-course-slots.hook.ts`
- `apps/client/src/lib/hooks/attendance/use-session-roster.hook.ts`
- `apps/client/src/lib/hooks/attendance/use-bulk-mark-attendance.hook.ts`
- `apps/client/src/lib/hooks/attendance/use-clear-attendance.hook.ts`
- `apps/client/src/lib/hooks/attendance/use-attendance-report.hook.ts`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/mark-status-buttons.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-mode-toggle.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-picker.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-session-panel/slot-session-panel.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-session-panel/slot-session-panel.schema.ts`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/attendance-mark.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/report/report-summary-cards.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/report/report-student-row.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-data-table/enrollment-data-table.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-data-table/enrollment-data-table.schema.ts`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-row-actions.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-progress-dialog/enrollment-progress-dialog.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-progress-dialog/enrollment-progress-dialog.skeleton.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-subscription-dialog/enrollment-subscription-dialog.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-subscription-dialog/enrollment-subscription-dialog.skeleton.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/add-enrollment-dialog/add-enrollment-dialog.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/add-enrollment-dialog/add-enrollment-dialog.schema.ts`

### Client — modified
- `apps/client/src/lib/types/attendance/attendance.types.ts` — add `slotId`, remove ABSENT, add new interfaces
- `apps/client/src/lib/types/course/course.interface.ts` — add `deletedAt` to TimeSlot
- `apps/client/src/lib/actions/attendance/bulkMarkAttendance.action.ts` — add `slotId`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/page.tsx` — swap `AttendanceDashboard` → `AttendanceMark`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/AttendanceReport.tsx` — update for new data shape
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-data-table.tsx` — replaced by new folder (delete after split)

---

## Task 1: Server — Error constants + update AttendanceStatus enum

**Files:**
- Create: `apps/server/src/attendance/attendance.errors.ts`
- Modify: `apps/server/src/attendance/enum/attendance-status.enum.ts`

- [ ] **Step 1: Create attendance.errors.ts**

```typescript
// apps/server/src/attendance/attendance.errors.ts
export const AttendanceErrors = {
  SLOT_REQUIRED: 'Slot ID is required',
  SLOT_NOT_FOUND: 'Slot does not exist on this course or has been deleted',
  STUDENT_NOT_IN_SLOT_ROSTER: 'Student is not assigned to this slot',
  ABSENT_STATUS_NOT_ALLOWED: 'ABSENT status cannot be set manually; absence is derived automatically',
} as const;
```

- [ ] **Step 2: Remove ABSENT from AttendanceStatus enum**

Replace the full content of `apps/server/src/attendance/enum/attendance-status.enum.ts`:

```typescript
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}
```

---

## Task 2: Server — Add slotId to Attendance entity + DTOs

**Files:**
- Modify: `apps/server/src/attendance/entities/attendance.entity.ts`
- Modify: `apps/server/src/attendance/dto/mark-attendance.dto.ts`
- Modify: `apps/server/src/attendance/dto/bulk-mark-attendance.dto.ts`

- [ ] **Step 1: Update Attendance entity**

Replace the full content of `apps/server/src/attendance/entities/attendance.entity.ts`:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { AttendanceStatus } from '../enum/attendance-status.enum';

@Schema({ timestamps: true })
export class Attendance extends Document<Types.ObjectId> {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  slotId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Organization' })
  organizationId: Types.ObjectId;

  @Prop({ type: String, enum: AttendanceStatus, required: true })
  status: AttendanceStatus;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  markedBy: Types.ObjectId;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ courseId: 1, slotId: 1, date: 1 });
AttendanceSchema.index({ studentId: 1, courseId: 1 });
AttendanceSchema.index({ organizationId: 1, date: 1 });
AttendanceSchema.index({ studentId: 1, courseId: 1, slotId: 1, date: 1 }, { unique: true });

AttendanceSchema.plugin(mongoosePaginate);
```

- [ ] **Step 2: Update MarkAttendanceDto**

Replace the full content of `apps/server/src/attendance/dto/mark-attendance.dto.ts`:

```typescript
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '../enum/attendance-status.enum';

export class MarkAttendanceDto {
  @IsNotEmpty()
  date: Date;

  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsNotEmpty()
  @IsMongoId()
  slotId: string;

  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

- [ ] **Step 3: Update BulkMarkAttendanceDto**

Replace the full content of `apps/server/src/attendance/dto/bulk-mark-attendance.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsMongoId, IsNotEmpty, ValidateNested, IsEnum, IsOptional } from 'class-validator';
import { AttendanceStatus } from '../enum/attendance-status.enum';

export class StudentStatusDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  notes?: string;
}

export class BulkMarkAttendanceDto {
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsNotEmpty()
  @IsMongoId()
  slotId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentStatusDto)
  students: StudentStatusDto[];
}
```

---

## Task 3: Server — Add deletedAt to Course TimeSlot

**Files:**
- Modify: `apps/server/src/course/entities/course.entity.ts`

- [ ] **Step 1: Add `deletedAt` to TimeSlot interface** (around line 45–58)

Find the `TimeSlot` interface and add `deletedAt`:

```typescript
export interface TimeSlot {
  /** Present when `offlineSchedule` is stored as a subdocument array. */
  _id?: Types.ObjectId;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  moduleId?: Types.ObjectId;
  moduleName?: string;
  instructorsIds?: Types.ObjectId[];
  coInstructorsIds?: Types.ObjectId[];
  studentsIds?: Types.ObjectId[];
  /** Soft-delete: set to a date when the slot is removed. Null means active. */
  deletedAt?: Date | null;
}
```

- [ ] **Step 2: Add `deletedAt` to TimeSlotSchemaPlain** (around line 108–120)

Find `TimeSlotSchemaPlain` and add the field:

```typescript
const TimeSlotSchemaPlain = new mongoose.Schema(
  {
    startTime: { type: String, required: true, validate: timeSlotTimeValidator },
    endTime: { type: String, required: true, validate: timeSlotTimeValidator },
    dayOfWeek: { type: String, required: true },
    moduleId: { type: Types.ObjectId, required: false, ref: 'CourseModule' },
    moduleName: { type: String, required: false },
    instructorsIds: { type: [Types.ObjectId], required: false, ref: 'User' },
    coInstructorsIds: { type: [Types.ObjectId], required: false, ref: 'User' },
    studentsIds: { type: [Types.ObjectId], required: false, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { _id: true }
);
```

- [ ] **Step 3: Add `deletedAt` to client TimeSlot interface**

In `apps/client/src/lib/types/course/course.interface.ts`, find the `TimeSlot` interface and add:

```typescript
export interface TimeSlot {
  _id?: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  moduleId?: string;
  moduleName?: string;
  instructorsIds?: string[];
  coInstructorsIds?: string[];
  studentsIds?: string[];
  deletedAt?: string | null;
}
```

---

## Task 4: Server — Create AttendanceDerivationService

**Files:**
- Create: `apps/server/src/attendance/attendance-derivation.service.ts`
- Modify: `apps/server/src/attendance/attendance.module.ts`

- [ ] **Step 1: Create AttendanceDerivationService**

```typescript
// apps/server/src/attendance/attendance-derivation.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseService } from '../course/services/course.service';
import { TimeSlot } from '../course/entities/course.entity';
import { Types } from 'mongoose';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface ExpectedSession {
  slotId: string;
  date: Date;
  startsAt: Date;
  endsAt: Date;
  studentIds: string[];
}

@Injectable()
export class AttendanceDerivationService {
  constructor(private readonly courseService: CourseService) {}

  async getExpectedSessions(courseId: string, range: { from: Date; to: Date }): Promise<ExpectedSession[]> {
    const course = await this.courseService.findOneById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const slots: TimeSlot[] = course.attendanceSettings?.offlineSchedule ?? [];
    const activeSlots = slots.filter(
      (s) => !s.deletedAt && s._id && (s.studentsIds ?? []).length > 0
    );

    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);

    const sessions: ExpectedSession[] = [];
    const cur = new Date(from);

    while (cur <= to) {
      const dayLabel = WEEKDAY_NAMES[cur.getDay()];
      for (const slot of activeSlots) {
        if ((slot.dayOfWeek ?? '').trim() !== dayLabel) continue;

        const dayStart = new Date(cur);
        dayStart.setHours(0, 0, 0, 0);
        const startsAt = this.parseTimeOnDate(dayStart, slot.startTime);
        const endsAt = this.parseTimeOnDate(dayStart, slot.endTime);
        if (endsAt.getTime() <= startsAt.getTime()) {
          endsAt.setDate(endsAt.getDate() + 1);
        }

        sessions.push({
          slotId: (slot._id as Types.ObjectId).toHexString(),
          date: new Date(dayStart),
          startsAt,
          endsAt,
          studentIds: (slot.studentsIds ?? []).map((id) => id.toString()),
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    return sessions;
  }

  async getSessionRoster(
    courseId: string,
    slotId: string,
    date: Date,
  ): Promise<{ studentIds: string[]; startsAt: Date; endsAt: Date } | null> {
    const course = await this.courseService.findOneById(courseId);
    if (!course) return null;

    const slots: TimeSlot[] = course.attendanceSettings?.offlineSchedule ?? [];
    const slot = slots.find((s) => s._id?.toString() === slotId && !s.deletedAt);
    if (!slot) return null;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const startsAt = this.parseTimeOnDate(dayStart, slot.startTime);
    const endsAt = this.parseTimeOnDate(dayStart, slot.endTime);
    if (endsAt.getTime() <= startsAt.getTime()) endsAt.setDate(endsAt.getDate() + 1);

    return {
      studentIds: (slot.studentsIds ?? []).map((id) => id.toString()),
      startsAt,
      endsAt,
    };
  }

  private parseTimeOnDate(date: Date, time: string): Date {
    const trimmed = time.trim().toLowerCase();
    const parts = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(trimmed);
    if (!parts) throw new Error(`Invalid time format: ${time}`);

    let hours = Number.parseInt(parts[1], 10);
    const minutes = Number.parseInt(parts[2], 10);
    const meridiem = parts[3].toLowerCase();

    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}
```

- [ ] **Step 2: Register DerivationService in AttendanceModule**

Replace the full content of `apps/server/src/attendance/attendance.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from './entities/attendance.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceDerivationService } from './attendance-derivation.service';
import { AttendanceMessageController } from './attendance.controller.message';
import { CourseModule } from '../course/course.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { UserModule } from '../user/user.module';
import { AttendanceController } from './attendance.controller.http';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CourseModule,
    EnrollmentModule,
    UserModule,
    AuthModule,
    RoleModule,
  ],
  controllers: [AttendanceController, AttendanceMessageController],
  providers: [AttendanceService, AttendanceDerivationService],
  exports: [AttendanceService, AttendanceDerivationService],
})
export class AttendanceModule {}
```

---

## Task 5: Server — Rewrite AttendanceService

**Files:**
- Modify: `apps/server/src/attendance/attendance.service.ts`

- [ ] **Step 1: Replace full file content**

```typescript
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel, Types, Model } from 'mongoose';
import { Attendance } from './entities/attendance.entity';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { BulkMarkAttendanceDto } from './dto/bulk-mark-attendance.dto';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { AttendanceStatus } from './enum/attendance-status.enum';
import { AttendanceErrors } from './attendance.errors';
import { AttendanceDerivationService, ExpectedSession } from './attendance-derivation.service';
import { EnrollmentService } from '../enrollment/services/enrollment.service';
import { CourseService } from '../course/services/course.service';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { StudentMarkByQrDto } from './dto/student-mark-by-qr.dto';
import { QueryService } from 'src/database/query';
import { Course, TimeSlot } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { AccessType } from 'src/enrollment/enum/accessType.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { EnrollmentErrors } from '@lms-organization/shared-types';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface BulkAttendanceResult {
  studentId: string;
  status: string;
  data?: Attendance;
  message?: string;
}

export interface StudentReportRow {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  expectedSessions: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface AttendanceReportResult {
  summary: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalLate: number;
    totalExcused: number;
    totalAbsent: number;
  };
  students: StudentReportRow[];
}

export interface SessionRosterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  status: AttendanceStatus | null;
  notes?: string;
  derivedAbsent: boolean;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: PaginateModel<Attendance>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly enrollmentService: EnrollmentService,
    private readonly courseService: CourseService,
    private readonly derivationService: AttendanceDerivationService,
    private readonly queryService: QueryService
  ) {}

  async markAttendance(dto: MarkAttendanceDto, markedBy: string): Promise<Attendance> {
    const course = await this.courseService.findOneById(dto.courseId);
    if (!course) throw new NotFoundException('Course not found');

    const schedule: TimeSlot[] = course.attendanceSettings?.offlineSchedule ?? [];
    const slot = schedule.find((s) => s._id?.toString() === dto.slotId && !s.deletedAt);
    if (!slot) throw new NotFoundException(AttendanceErrors.SLOT_NOT_FOUND);

    const assignedStudents = (slot.studentsIds ?? []).map((id) => id.toString());
    if (!assignedStudents.includes(dto.studentId)) {
      throw new BadRequestException(AttendanceErrors.STUDENT_NOT_IN_SLOT_ROSTER);
    }

    const enrollment = await this.enrollmentService.getSingleEnrollmentWithoutCheck(dto.studentId, dto.courseId);
    if (!enrollment) throw new BadRequestException('Student is not enrolled in this course');

    const startOfDay = new Date(dto.date);
    startOfDay.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceModel.findOne({
      courseId: new Types.ObjectId(dto.courseId),
      slotId: new Types.ObjectId(dto.slotId),
      studentId: new Types.ObjectId(dto.studentId),
      date: startOfDay,
    });

    if (attendance) {
      attendance.status = dto.status;
      if (dto.notes !== undefined) attendance.notes = dto.notes;
      attendance.markedBy = new Types.ObjectId(markedBy);
      await attendance.save();
    } else {
      attendance = await this.attendanceModel.create({
        date: startOfDay,
        courseId: new Types.ObjectId(dto.courseId),
        slotId: new Types.ObjectId(dto.slotId),
        studentId: new Types.ObjectId(dto.studentId),
        organizationId: course.organizationId,
        status: dto.status,
        notes: dto.notes,
        markedBy: new Types.ObjectId(markedBy),
      });
    }

    await this.updateEnrollmentAttendanceSummary(enrollment, dto.studentId, dto.courseId);
    return attendance;
  }

  async bulkMarkAttendance(dto: BulkMarkAttendanceDto, markedBy: string): Promise<BulkAttendanceResult[]> {
    const settled = await Promise.allSettled(
      dto.students.map((s) =>
        this.markAttendance(
          { date: dto.date, courseId: dto.courseId, slotId: dto.slotId, studentId: s.studentId, status: s.status, notes: s.notes },
          markedBy
        )
      )
    );

    return settled.map((result, i) => {
      const studentId = dto.students[i].studentId;
      if (result.status === 'fulfilled') {
        return { studentId, status: 'success', data: result.value };
      }
      const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
      return { studentId, status: 'error', message: errorMessage };
    });
  }

  async clearAttendance(dto: { courseId: string; slotId: string; studentId: string; date: Date }): Promise<void> {
    const startOfDay = new Date(dto.date);
    startOfDay.setHours(0, 0, 0, 0);

    await this.attendanceModel.deleteOne({
      courseId: new Types.ObjectId(dto.courseId),
      slotId: new Types.ObjectId(dto.slotId),
      studentId: new Types.ObjectId(dto.studentId),
      date: startOfDay,
    });

    const enrollment = await this.enrollmentService.getSingleEnrollmentWithoutCheck(dto.studentId, dto.courseId);
    if (enrollment) await this.updateEnrollmentAttendanceSummary(enrollment, dto.studentId, dto.courseId);
  }

  async getAttendanceBySession(
    courseId: string,
    slotId: string,
    date: Date,
  ): Promise<SessionRosterEntry[]> {
    const roster = await this.derivationService.getSessionRoster(courseId, slotId, date);
    if (!roster) return [];

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();
    const isPast = roster.endsAt.getTime() < now.getTime();

    const rows = await this.attendanceModel.find({
      courseId: new Types.ObjectId(courseId),
      slotId: new Types.ObjectId(slotId),
      date: startOfDay,
    });

    const rowMap = new Map<string, Attendance>();
    for (const row of rows) {
      rowMap.set(row.studentId.toString(), row);
    }

    const users = await this.userModel
      .find({ _id: { $in: roster.studentIds.map((id) => new Types.ObjectId(id)) } })
      .select('firstName lastName email avatar')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return roster.studentIds.map((studentId) => {
      const user = userMap.get(studentId);
      const row = rowMap.get(studentId);
      return {
        studentId,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        email: user?.email ?? '',
        avatar: (user as { avatar?: string })?.avatar,
        status: row ? row.status : null,
        notes: row?.notes,
        derivedAbsent: isPast && !row,
      };
    });
  }

  async getStudentAttendance(studentId: string, courseId: string) {
    const results = await this.attendanceModel.find({
      studentId: new Types.ObjectId(studentId),
      courseId: new Types.ObjectId(courseId),
    });
    return results.toSorted((a, b) => b.date.getTime() - a.date.getTime());
  }

  async generateReport(dto: AttendanceReportDto): Promise<AttendanceReportResult> {
    if (!dto.courseId) throw new BadRequestException('courseId is required');

    const from = dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 90 * 86_400_000);
    const to = dto.endDate ? new Date(dto.endDate) : new Date();
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const allSessions = await this.derivationService.getExpectedSessions(dto.courseId, { from, to });
    const now = new Date();
    const pastSessions = allSessions.filter((s) => s.endsAt.getTime() < now.getTime());

    if (pastSessions.length === 0) {
      return {
        summary: { totalStudents: 0, totalSessions: 0, totalPresent: 0, totalLate: 0, totalExcused: 0, totalAbsent: 0 },
        students: [],
      };
    }

    const slotIds = [...new Set(pastSessions.map((s) => s.slotId))];
    const rows = await this.attendanceModel.find({
      courseId: new Types.ObjectId(dto.courseId),
      slotId: { $in: slotIds.map((id) => new Types.ObjectId(id)) },
      date: { $gte: from, $lte: to },
    });

    const rowMap = new Map<string, AttendanceStatus>();
    for (const row of rows) {
      const dateKey = row.date.toISOString().split('T')[0];
      rowMap.set(`${row.studentId.toString()}:${row.slotId.toString()}:${dateKey}`, row.status);
    }

    type Stats = { present: number; late: number; excused: number; expected: number };
    const studentStats = new Map<string, Stats>();

    for (const session of pastSessions) {
      const dateKey = session.date.toISOString().split('T')[0];
      for (const studentId of session.studentIds) {
        if (!studentStats.has(studentId)) {
          studentStats.set(studentId, { present: 0, late: 0, excused: 0, expected: 0 });
        }
        const s = studentStats.get(studentId)!;
        s.expected += 1;
        const key = `${studentId}:${session.slotId}:${dateKey}`;
        const status = rowMap.get(key);
        if (status === AttendanceStatus.PRESENT) s.present += 1;
        else if (status === AttendanceStatus.LATE) s.late += 1;
        else if (status === AttendanceStatus.EXCUSED) s.excused += 1;
      }
    }

    const studentIds = [...studentStats.keys()];
    const users = await this.userModel
      .find({ _id: { $in: studentIds.map((id) => new Types.ObjectId(id)) } })
      .select('firstName lastName email avatar')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const students: StudentReportRow[] = studentIds
      .map((studentId) => {
        const s = studentStats.get(studentId)!;
        const user = userMap.get(studentId);
        const absent = Math.max(0, s.expected - s.present - s.late - s.excused);
        const denom = s.expected - s.excused;
        const rate = denom > 0 ? Math.round(((s.present + s.late) / denom) * 10_000) / 100 : 0;
        return {
          studentId,
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          email: user?.email ?? '',
          avatar: (user as { avatar?: string })?.avatar,
          expectedSessions: s.expected,
          presentCount: s.present,
          lateCount: s.late,
          excusedCount: s.excused,
          absentCount: absent,
          attendanceRate: rate,
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    return {
      summary: {
        totalStudents: students.length,
        totalSessions: pastSessions.length,
        totalPresent: students.reduce((sum, s) => sum + s.presentCount, 0),
        totalLate: students.reduce((sum, s) => sum + s.lateCount, 0),
        totalExcused: students.reduce((sum, s) => sum + s.excusedCount, 0),
        totalAbsent: students.reduce((sum, s) => sum + s.absentCount, 0),
      },
      students,
    };
  }

  private async updateEnrollmentAttendanceSummary(enrollment: Enrollment, studentId: string, courseId: string) {
    const rows = await this.attendanceModel.find({
      studentId: new Types.ObjectId(studentId),
      courseId: new Types.ObjectId(courseId),
    });

    let attended = 0, late = 0, excused = 0;
    for (const row of rows) {
      if (row.status === AttendanceStatus.PRESENT) attended++;
      else if (row.status === AttendanceStatus.LATE) late++;
      else if (row.status === AttendanceStatus.EXCUSED) excused++;
    }

    const allSessions = await this.derivationService.getExpectedSessions(courseId, {
      from: new Date('2020-01-01'),
      to: new Date(),
    });
    const now = new Date();
    const studentExpected = allSessions.filter(
      (s) => s.endsAt.getTime() < now.getTime() && s.studentIds.includes(studentId)
    ).length;

    const totalClasses = studentExpected;
    const absent = Math.max(0, totalClasses - attended - late - excused);
    const percentage = totalClasses > 0 ? Math.round(((attended + late) / totalClasses) * 1000) / 10 : 0;

    const enrollmentId = enrollment._id instanceof Types.ObjectId ? enrollment._id.toString() : String(enrollment._id);
    await this.enrollmentService.updateAttendanceSummary(enrollmentId, { totalClasses, attended, absent, late, excused, percentage });
  }

  async studentMarkByQr(dto: StudentMarkByQrDto, userId: Types.ObjectId | string) {
    const filter: Record<string, unknown> = { courseId: dto.courseId, userId, deletedAt: null };
    if (dto.enrollmentId) filter['_id'] = dto.enrollmentId;

    const enrollment = await this.queryService.findOneOrThrow<Enrollment & { course: Course }>(
      Enrollment.name,
      filter,
      EnrollmentErrors.ENROLLMENT_NOT_FOUND,
      { populate: [{ path: 'course', select: 'name attendanceSettings organizationId' }] }
    );

    if (enrollment.accessType === AccessType.SUBSCRIPTION) {
      const expired = await this.enrollmentService.checkAndExpireEnrollment(enrollment);
      if (expired || enrollment.subscription?.status === SubscriptionStatus.EXPIRED) {
        throw new ForbiddenException(EnrollmentErrors.ENROLLMENT_EXPIRED);
      }
    }

    if (!enrollment.course?.attendanceSettings) {
      throw new BadRequestException('Attendance settings not configured for this course');
    }

    const schedule: TimeSlot[] = enrollment.course.attendanceSettings.offlineSchedule ?? [];
    const now = new Date();
    const activeSlot = this.findActiveOfflineSlotForUser(schedule, userId, now);

    if (!activeSlot) {
      throw new BadRequestException('You can only mark attendance during your assigned offline session window for today');
    }

    const studentId = enrollment.userId instanceof Types.ObjectId ? enrollment.userId.toHexString() : String(enrollment.userId);
    const slotId = (activeSlot._id as Types.ObjectId).toHexString();

    return this.markAttendance(
      { date: now, courseId: dto.courseId, slotId, studentId, status: AttendanceStatus.PRESENT, notes: 'QR self check-in' },
      studentId
    );
  }

  private parseTimeOnDate(date: Date, time: string): Date {
    const trimmed = time.trim().toLowerCase();
    const parts = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(trimmed);
    if (!parts) throw new BadRequestException('Invalid session time format in course attendance settings');

    let hours = Number.parseInt(parts[1], 10);
    const minutes = Number.parseInt(parts[2], 10);
    const meridiem = parts[3].toLowerCase();

    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private findActiveOfflineSlotForUser(slots: TimeSlot[], userId: Types.ObjectId | string, now: Date): TimeSlot | null {
    const uid = userId instanceof Types.ObjectId ? userId.toHexString() : String(userId);
    const todayLabel = WEEKDAY_NAMES[now.getDay()];

    for (const slot of slots) {
      if (slot.deletedAt) continue;
      const assigned = slot.studentsIds ?? [];
      if (assigned.length > 0 && !assigned.some((id) => id.toString() === uid)) continue;
      if ((slot.dayOfWeek ?? '').trim() !== todayLabel) continue;

      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const slotStart = this.parseTimeOnDate(dayStart, slot.startTime);
      const slotEnd = this.parseTimeOnDate(dayStart, slot.endTime);
      if (slotEnd.getTime() <= slotStart.getTime()) slotEnd.setDate(slotEnd.getDate() + 1);
      if (now.getTime() >= slotStart.getTime() && now.getTime() <= slotEnd.getTime()) return slot;
    }

    return null;
  }
}
```

---

## Task 6: Server — Update NATS message controller

**Files:**
- Modify: `apps/server/src/attendance/attendance.controller.message.ts`

- [ ] **Step 1: Replace full file content**

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Ctx } from '@nestjs/microservices';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { BulkMarkAttendanceDto } from './dto/bulk-mark-attendance.dto';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { StudentMarkByQrDto } from './dto/student-mark-by-qr.dto';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { AuthGuard } from '../auth/guards/auth.guard';
import { IUserContext } from '../utils/types/IUserContext.interface';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RateLimit } from 'src/rate-limiter/rate-limiter.decorator';

@ApplyRpcErrorHandling
@Controller()
export class AttendanceMessageController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.markAttendance')
  markAttendance(@Payload() data: { dto: MarkAttendanceDto }, @Ctx() context: IUserContext) {
    return this.attendanceService.markAttendance(data.dto, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.bulkMarkAttendance')
  bulkMarkAttendance(@Payload() data: { dto: BulkMarkAttendanceDto }, @Ctx() context: IUserContext) {
    return this.attendanceService.bulkMarkAttendance(data.dto, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.clearAttendance')
  clearAttendance(
    @Payload() data: { courseId: string; slotId: string; studentId: string; date: string },
    @Ctx() _context: IUserContext,
  ) {
    return this.attendanceService.clearAttendance({
      courseId: data.courseId,
      slotId: data.slotId,
      studentId: data.studentId,
      date: new Date(data.date),
    });
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.getByStudent')
  getByStudent(@Payload() data: { studentId: string; courseId: string }, @Ctx() _context: IUserContext) {
    return this.attendanceService.getStudentAttendance(data.studentId, data.courseId);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.getBySession')
  getBySession(
    @Payload() data: { courseId: string; slotId: string; date: string },
    @Ctx() _context: IUserContext,
  ) {
    return this.attendanceService.getAttendanceBySession(data.courseId, data.slotId, new Date(data.date));
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.generateReport')
  generateReport(@Payload() data: { dto: AttendanceReportDto }, @Ctx() _context: IUserContext) {
    return this.attendanceService.generateReport(data.dto);
  }

  @RateLimit({ ttlSeconds: 60, maxRequests: 3 })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.studentMarkByQr')
  studentMarkByQr(@Payload() data: { dto: StudentMarkByQrDto }, @Ctx() context: IUserContext) {
    return this.attendanceService.studentMarkByQr(
      convertObjectValuesToObjectId(data.dto),
      convertObjectValuesToObjectId(context.userPayload._id.toString()),
    );
  }
}
```

---

## Task 7: Server — Fix enrollment.getCourseEnrollments search

**Files:**
- Modify: `apps/server/src/enrollment/services/enrollment.service.ts`

The current `getCourseEnrollments` (around line 439) ignores the `search` field in `options`. The `getOrganizationEnrollments` also extracts but discards `_search`. Both need fixing.

- [ ] **Step 1: Fix getCourseEnrollments** (around line 439)

Find and replace the `getCourseEnrollments` method:

```typescript
async getCourseEnrollments(courseId: string, organizationId: string, options: PaginateOptionsWithSearch) {
  const { search, ...paginateOptions } = options;

  const query: Record<string, unknown> = {
    courseId: new mongoose.Types.ObjectId(courseId),
    organizationId: new mongoose.Types.ObjectId(organizationId),
  };

  if (search) {
    const matchingUserIds = await this.userModel
      .find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      })
      .distinct('_id');
    query['userId'] = { $in: matchingUserIds };
  }

  return this.enrollmentModel.paginate(query, {
    ...paginateOptions,
    populate: [{ path: 'user', select: 'firstName lastName email avatar' }],
  });
}
```

- [ ] **Step 2: Verify `userModel` is injected in EnrollmentService constructor**

Search for `@InjectModel(User.name)` in `enrollment.service.ts`. If not present, add it to the constructor:
Find the constructor and add:
```typescript
@InjectModel(User.name) private readonly userModel: Model<User>,
```
Also add at top of file:
```typescript
import { User } from 'src/user/entities/user.entity';
import { Model } from 'mongoose';
```
And in `EnrollmentModule`, verify `MongooseModule.forFeature` includes `{ name: User.name, schema: UserSchema }`. If not, add it.

---

## Task 8: Server — Update seeds

**Files:**
- Modify: `apps/server/src/enrollment/seeds/enrollment.seeder.ts`
- Modify: `apps/server/src/course/seeds/course.seeder.ts`

- [ ] **Step 1: Remove ABSENT from enrollment.seeder.ts — update `seedAttendanceRecords`**

Find `seedAttendanceRecords` (around line 385). The method currently seeds ABSENT rows and returns an `AttendanceSummary`. Update it:

```typescript
private async seedAttendanceRecords(
  userId: Types.ObjectId,
  courseId: Types.ObjectId,
  organizationId: Types.ObjectId,
  instructorId?: Types.ObjectId,
  slotId?: Types.ObjectId,
): Promise<AttendanceSummary> {
  if (!slotId) {
    return { totalClasses: 0, attended: 0, absent: 0, late: 0, excused: 0, percentage: 0 };
  }

  const attendanceCount = faker.number.int({ min: 4, max: 10 });
  const weights = [
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.LATE,
    AttendanceStatus.EXCUSED,
  ];

  const attendanceDocs = Array.from({ length: attendanceCount }, (_, i) => ({
    date: faker.date.between({
      from: new Date(Date.now() - ACTIVITY_WINDOW_MS),
      to: new Date(),
    }),
    courseId,
    slotId,
    studentId: userId,
    organizationId,
    status: faker.helpers.arrayElement(weights),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    markedBy: instructorId ?? new Types.ObjectId(),
  }));

  // Deduplicate by date to avoid unique index violation (one row per student+slot+date)
  const seen = new Set<string>();
  const unique = attendanceDocs.filter((d) => {
    const key = d.date.toISOString().split('T')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    d.date = new Date(key); // normalize to midnight
    return true;
  });

  if (unique.length > 0) await this.attendanceModel.insertMany(unique);

  let attended = 0, absent = 0, late = 0, excused = 0;
  for (const d of unique) {
    if (d.status === AttendanceStatus.PRESENT) attended++;
    else if (d.status === AttendanceStatus.LATE) late++;
    else if (d.status === AttendanceStatus.EXCUSED) excused++;
  }
  const totalClasses = unique.length;
  return {
    totalClasses,
    attended,
    absent,
    late,
    excused,
    percentage: totalClasses > 0 ? Math.round((attended / totalClasses) * 1000) / 10 : 0,
  };
}
```

- [ ] **Step 2: Update `seedEnrollment` to pass slotId**

In `seedEnrollment`, the two calls to `seedAttendanceRecords` (lines ~94 and ~346) need a `slotId`. The slot must come from the course. Update both calls to pass the slot:

At the top of `seedEnrollment`, after loading the course, extract the first active slot with a `studentsIds` entry for this student (or any slot):

```typescript
// After: const course = await this.courseModel.findById(courseId).lean();
const offlineSlots: Array<{ _id: Types.ObjectId; studentsIds?: Types.ObjectId[]; deletedAt?: Date | null }> =
  (course as { attendanceSettings?: { offlineSchedule?: unknown[] } }).attendanceSettings?.offlineSchedule ?? [];
const activeSlot = offlineSlots.find((s) => !s.deletedAt);
const seedSlotId = activeSlot?._id;
```

Then update both `seedAttendanceRecords` calls to pass `seedSlotId`:

```typescript
const attendanceSummary = await this.seedAttendanceRecords(userId, courseId, organizationId, instructorId, seedSlotId);
```

- [ ] **Step 3: Update `course.seeder.ts` to seed offlineSchedule for offline courses**

In `CourseSeeder.seedCourse`, after building `courseData`, add an offline schedule with student-assigned slots for 30% of courses. Add this before `await this.courseModel.create(...)`:

```typescript
// Seed offline schedule for ~30% of courses so attendance derivation has data
const shouldSeedOffline = faker.datatype.boolean({ probability: 0.3 });
const attendanceSettings = shouldSeedOffline
  ? {
      requireAttendance: true,
      offlineSchedule: [
        {
          startTime: '09:00 am',
          endTime: '10:30 am',
          dayOfWeek: faker.helpers.arrayElement(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']),
          instructorsIds: [instructorId],
          studentsIds: [], // populated after enrollment seeding via a post-seed step
        },
      ],
    }
  : { requireAttendance: false, offlineSchedule: [] };

const courseData = {
  // ...existing courseData fields...
  attendanceSettings,
};
```

> **Note:** Because `studentsIds` on slots are populated after enrollment is complete, the actual wiring is done in `seed.ts`. Add a post-enrollment step in `seed.ts` after `enrollmentSeeder.seedEnrollmentsForStudents` to wire slot rosters:

In `apps/server/src/database/seeds/seed.ts`, after `2h. Enrollments`, add:

```typescript
// ── 2h-post. Wire offline slot rosters ──────────────────────
log(`  Wiring offline slot rosters for ${organizationConfig.name}...`);
for (const course of courses) {
  const courseDoc = await courseModel.findById(course._id).lean() as Course;
  const slots = courseDoc.attendanceSettings?.offlineSchedule ?? [];
  if (slots.length === 0 || !courseDoc.attendanceSettings?.requireAttendance) continue;

  const enrollments = await enrollmentModel.find({ courseId: course._id, organizationId: org._id }).select('userId').lean();
  const studentIds = enrollments.map((e) => e.userId);

  await courseModel.findByIdAndUpdate(course._id, {
    'attendanceSettings.offlineSchedule': slots.map((slot) => ({
      ...slot,
      studentsIds: studentIds,
    })),
  });
}
```

---

## Task 9: Client — Update types + actions

**Files:**
- Modify: `apps/client/src/lib/types/attendance/attendance.types.ts`
- Modify: `apps/client/src/lib/actions/attendance/bulkMarkAttendance.action.ts`
- Create: `apps/client/src/lib/actions/attendance/getAttendanceBySession.action.ts`
- Create: `apps/client/src/lib/actions/attendance/clearAttendance.action.ts`

- [ ] **Step 1: Update attendance.types.ts**

```typescript
// apps/client/src/lib/types/attendance/attendance.types.ts
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export interface Attendance {
  _id: string;
  date: string;
  courseId: string;
  slotId: string;
  studentId: string | { _id: string; firstName: string; lastName: string; email: string; avatar?: string };
  organizationId: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRosterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  status: AttendanceStatus | null;
  notes?: string;
  derivedAbsent: boolean;
}

export interface MarkAttendanceInput {
  date: Date;
  courseId: string;
  slotId: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface GetAttendanceBySessionInput {
  courseId: string;
  slotId: string;
  date: string;
}

export interface GetStudentAttendanceInput {
  studentId: string;
  courseId: string;
}

export interface ClearAttendanceInput {
  courseId: string;
  slotId: string;
  studentId: string;
  date: string;
}

export interface StudentReportRow {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  expectedSessions: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface AttendanceReportData {
  summary: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalLate: number;
    totalExcused: number;
    totalAbsent: number;
  };
  students: StudentReportRow[];
}
```

- [ ] **Step 2: Update bulkMarkAttendance.action.ts**

```typescript
'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import { AttendanceStatus } from '@/lib/types/attendance/attendance.types';

export interface BulkAttendanceDto {
  courseId: string;
  slotId: string;
  date: Date;
  attendanceRecords: {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export async function bulkMarkAttendance(dto: BulkAttendanceDto): Promise<unknown | NatsErr> {
  return createAuthorizedNatsRequest('attendance.bulkMarkAttendance', {
    dto: {
      courseId: dto.courseId,
      slotId: dto.slotId,
      date: dto.date,
      students: dto.attendanceRecords,
    },
  });
}
```

- [ ] **Step 3: Create getAttendanceBySession.action.ts**

```typescript
'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import { SessionRosterEntry } from '@/lib/types/attendance/attendance.types';

export async function getAttendanceBySession(data: {
  courseId: string;
  slotId: string;
  date: string;
}): Promise<SessionRosterEntry[] | NatsErr> {
  return createAuthorizedNatsRequest<SessionRosterEntry[]>('attendance.getBySession', {
    courseId: data.courseId,
    slotId: data.slotId,
    date: data.date,
  });
}
```

- [ ] **Step 4: Create clearAttendance.action.ts**

```typescript
'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';

export async function clearAttendance(data: {
  courseId: string;
  slotId: string;
  studentId: string;
  date: string;
}): Promise<void | NatsErr> {
  return createAuthorizedNatsRequest('attendance.clearAttendance', data);
}
```

---

## Task 10: Client — Create attendance hooks

**Files:**
- Create: `apps/client/src/lib/hooks/attendance/use-course-slots.hook.ts`
- Create: `apps/client/src/lib/hooks/attendance/use-session-roster.hook.ts`
- Create: `apps/client/src/lib/hooks/attendance/use-bulk-mark-attendance.hook.ts`
- Create: `apps/client/src/lib/hooks/attendance/use-clear-attendance.hook.ts`
- Create: `apps/client/src/lib/hooks/attendance/use-attendance-report.hook.ts`

- [ ] **Step 1: use-course-slots.hook.ts**

```typescript
'use client';

import { useMemo } from 'react';
import type { ICourse, TimeSlot } from '@/lib/types/course/course.interface';

export function useCourseSlots(course: ICourse | undefined): TimeSlot[] {
  return useMemo(() => {
    if (!course?.attendanceSettings?.offlineSchedule) return [];
    return course.attendanceSettings.offlineSchedule.filter((s) => !s.deletedAt);
  }, [course]);
}
```

- [ ] **Step 2: use-session-roster.hook.ts**

```typescript
'use client';

import { useQuery } from '@/lib/utils';
import { getAttendanceBySession } from '@/lib/actions/attendance/getAttendanceBySession.action';
import { SessionRosterEntry } from '@/lib/types/attendance/attendance.types';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useSessionRoster(courseId: string, slotId: string, date: Date | null) {
  const t = useTranslations('AttendanceMark');

  return useQuery<SessionRosterEntry[]>({
    queryKey: ['sessionRoster', courseId, slotId, date?.toISOString() ?? ''],
    queryFn: async () => {
      if (!courseId || !slotId || !date) return [];
      const result = await getAttendanceBySession({
        courseId,
        slotId,
        date: date.toISOString(),
      });
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
      return result as SessionRosterEntry[];
    },
    enabled: !!courseId && !!slotId && !!date,
    onError: (error: Error) => {
      toast.error(error.message || t('failedToLoadRoster'));
    },
  });
}
```

- [ ] **Step 3: use-bulk-mark-attendance.hook.ts**

```typescript
'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import { bulkMarkAttendance, BulkAttendanceDto } from '@/lib/actions/attendance/bulkMarkAttendance.action';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useBulkMarkAttendance(courseId: string, slotId: string, date: Date | null) {
  const t = useTranslations('AttendanceMark');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: BulkAttendanceDto) => {
      const result = await bulkMarkAttendance(dto);
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
      return result;
    },
    onSuccess: () => {
      toast.success(t('attendanceSaved'));
      void queryClient.invalidateQueries({
        queryKey: ['sessionRoster', courseId, slotId, date?.toISOString() ?? ''],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failedToSave'));
    },
  });
}
```

- [ ] **Step 4: use-clear-attendance.hook.ts**

```typescript
'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import { clearAttendance } from '@/lib/actions/attendance/clearAttendance.action';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useClearAttendance(courseId: string, slotId: string, date: Date | null) {
  const t = useTranslations('AttendanceMark');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      if (!date) throw new Error('No date selected');
      const result = await clearAttendance({ courseId, slotId, studentId, date: date.toISOString() });
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['sessionRoster', courseId, slotId, date?.toISOString() ?? ''],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failedToClear'));
    },
  });
}
```

- [ ] **Step 5: use-attendance-report.hook.ts**

```typescript
'use client';

import { useState } from 'react';
import { useMutation } from '@/lib/utils';
import { generateAttendanceReport } from '@/lib/actions/attendance/generateReport.action';
import { AttendanceReportData } from '@/lib/types/attendance/attendance.types';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export function useAttendanceReport() {
  const t = useTranslations('AttendanceReport');
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null);

  const mutation = useMutation({
    mutationFn: async (params: { courseId: string; startDate?: Date; endDate?: Date }) => {
      const result = await generateAttendanceReport({
        courseId: params.courseId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
      return result as AttendanceReportData;
    },
    onSuccess: (data) => {
      setReportData(data);
      toast.success(t('reportGenerated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failedToGenerate'));
    },
  });

  return { reportData, ...mutation };
}
```

---

## Task 11: Client — Mark UI components

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/mark-status-buttons.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-mode-toggle.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-picker.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-session-panel/slot-session-panel.schema.ts`
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-session-panel/slot-session-panel.tsx`

- [ ] **Step 1: Create mark-status-buttons.tsx**

```tsx
'use client';

import { Button } from '@/components/atoms/button';
import { AttendanceStatus } from '@/lib/types/attendance/attendance.types';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface MarkStatusButtonsProps {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus | null) => void;
  disabled?: boolean;
}

export function MarkStatusButtons({ value, onChange, disabled }: MarkStatusButtonsProps) {
  const t = useTranslations('AttendanceMark');

  const options: { status: AttendanceStatus; label: string; activeClass: string }[] = [
    { status: AttendanceStatus.PRESENT, label: t('present'), activeClass: 'bg-green-600 text-white hover:bg-green-700' },
    { status: AttendanceStatus.LATE, label: t('late'), activeClass: 'bg-yellow-500 text-white hover:bg-yellow-600' },
    { status: AttendanceStatus.EXCUSED, label: t('excused'), activeClass: 'bg-blue-500 text-white hover:bg-blue-600' },
  ];

  return (
    <div className="flex gap-1">
      {options.map(({ status, label, activeClass }) => (
        <Button
          key={status}
          size="sm"
          variant="outline"
          disabled={disabled}
          className={cn('h-7 px-2 text-xs', value === status && activeClass)}
          onClick={() => onChange(value === status ? null : status)}>
          {label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create slot-mode-toggle.tsx**

```tsx
'use client';

import { useTranslations } from 'next-intl';

type SlotMode = 'single' | 'all';

interface SlotModeToggleProps {
  value: SlotMode;
  onChange: (mode: SlotMode) => void;
}

export function SlotModeToggle({ value, onChange }: SlotModeToggleProps) {
  const t = useTranslations('AttendanceMark');

  return (
    <div className="flex gap-2">
      {(['single', 'all'] as SlotMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            value === mode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}>
          {mode === 'single' ? t('singleSlot') : t('allSlots')}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create slot-picker.tsx**

```tsx
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { TimeSlot } from '@/lib/types/course/course.interface';
import { useTranslations } from 'next-intl';

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedDate: Date | null;
  value: string;
  onChange: (slotId: string) => void;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SlotPicker({ slots, selectedDate, value, onChange }: SlotPickerProps) {
  const t = useTranslations('AttendanceMark');

  const dayLabel = selectedDate ? WEEKDAY_NAMES[selectedDate.getDay()] : null;
  const matchingSlots = dayLabel ? slots.filter((s) => s.dayOfWeek === dayLabel) : slots;

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{t('selectSlot')}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('selectSlotPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {matchingSlots.length === 0 && (
            <SelectItem value="__none" disabled>
              {t('noSlotsForDate')}
            </SelectItem>
          )}
          {matchingSlots.map((slot) => (
            <SelectItem
              key={slot._id ?? `${slot.dayOfWeek}-${slot.startTime}`}
              value={slot._id ?? ''}
              disabled={!slot._id || (slot.studentsIds ?? []).length === 0}>
              {slot.startTime} – {slot.endTime}
              {(slot.studentsIds ?? []).length === 0 ? ` (${t('noRoster')})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 4: Create slot-session-panel.schema.ts**

```typescript
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/slot-session-panel/slot-session-panel.schema.ts
import { AttendanceStatus, SessionRosterEntry } from '@/lib/types/attendance/attendance.types';
import { TimeSlot } from '@/lib/types/course/course.interface';

export interface SlotOverride {
  status: AttendanceStatus | null;
  notes: string;
}

export type OverridesMap = Record<string, SlotOverride>;

export interface SlotSessionPanelProps {
  courseId: string;
  slot: TimeSlot;
  date: Date;
  roster: SessionRosterEntry[];
  isLoading: boolean;
  overrides: OverridesMap;
  onOverrideChange: (studentId: string, override: Partial<SlotOverride>) => void;
  onSave: () => void;
  isSaving: boolean;
}
```

- [ ] **Step 5: Create slot-session-panel.tsx**

```tsx
'use client';

import Image from 'next/image';
import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AttendanceStatus, SessionRosterEntry } from '@/lib/types/attendance/attendance.types';
import { MarkStatusButtons } from '../mark-status-buttons';
import { SlotSessionPanelProps, OverridesMap } from './slot-session-panel.schema';
import { cn } from '@/lib/utils';

export function SlotSessionPanel({
  slot,
  roster,
  isLoading,
  overrides,
  onOverrideChange,
  onSave,
  isSaving,
}: SlotSessionPanelProps) {
  const t = useTranslations('AttendanceMark');

  const getEffectiveStatus = (entry: SessionRosterEntry): AttendanceStatus | null => {
    const ov = overrides[entry.studentId];
    if (ov && ov.status !== undefined) return ov.status;
    return entry.status;
  };

  const handleMarkAll = useCallback(() => {
    for (const entry of roster) {
      if (!entry.derivedAbsent || entry.status) {
        onOverrideChange(entry.studentId, { status: AttendanceStatus.PRESENT });
      }
    }
    for (const entry of roster.filter((e) => !e.derivedAbsent)) {
      onOverrideChange(entry.studentId, { status: AttendanceStatus.PRESENT });
    }
  }, [roster, onOverrideChange]);

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <span className="font-semibold">{slot.startTime} – {slot.endTime}</span>
          <span className="text-muted-foreground ml-2 text-sm">({roster.length} {t('students')})</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={isSaving || isLoading}>
            {t('markAllPresent')}
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving || isLoading}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('saveChanges')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : roster.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">{t('noRosterForSlot')}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('student')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('notes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map((entry) => {
              const effectiveStatus = getEffectiveStatus(entry);
              const isPast = entry.derivedAbsent;

              return (
                <TableRow key={entry.studentId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {entry.avatar ? (
                        <Image src={entry.avatar} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                      ) : null}
                      <span className="font-medium">{entry.firstName} {entry.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{entry.email}</TableCell>
                  <TableCell>
                    {entry.status === null && isPast ? (
                      <span className="text-muted-foreground rounded border px-2 py-0.5 text-xs">{t('absentAuto')}</span>
                    ) : (
                      <MarkStatusButtons
                        value={effectiveStatus}
                        onChange={(status) => onOverrideChange(entry.studentId, { status })}
                        disabled={isSaving}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-7 text-xs"
                      placeholder={t('notesPlaceholder')}
                      value={overrides[entry.studentId]?.notes ?? entry.notes ?? ''}
                      onChange={(e) => onOverrideChange(entry.studentId, { notes: e.target.value })}
                      disabled={isSaving || (entry.status === null && isPast)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

---

## Task 12: Client — attendance-mark.tsx container + update page.tsx

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/mark/attendance-mark.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/page.tsx`

- [ ] **Step 1: Create attendance-mark.tsx**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { ICourse } from '@/lib/types/course/course.interface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { Calendar } from '@/components/atoms/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Button } from '@/components/atoms/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { useCourseSlots } from '@/lib/hooks/attendance/use-course-slots.hook';
import { useSessionRoster } from '@/lib/hooks/attendance/use-session-roster.hook';
import { useBulkMarkAttendance } from '@/lib/hooks/attendance/use-bulk-mark-attendance.hook';
import { SlotModeToggle } from './slot-mode-toggle';
import { SlotPicker } from './slot-picker';
import { SlotSessionPanel } from './slot-session-panel/slot-session-panel';
import { OverridesMap } from './slot-session-panel/slot-session-panel.schema';
import { AttendanceStatus } from '@/lib/types/attendance/attendance.types';

interface AttendanceMarkProps {
  courses: ICourse[];
}

type SlotMode = 'single' | 'all';

export function AttendanceMark({ courses }: AttendanceMarkProps) {
  const t = useTranslations('AttendanceMark');
  const locale = useLocale();
  const dateFnsLocale = locale === 'ar' ? ar : enUS;

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [slotMode, setSlotMode] = useState<SlotMode>('single');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [overridesMap, setOverridesMap] = useState<Record<string, OverridesMap>>({});

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);
  const slots = useCourseSlots(selectedCourse);

  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayLabel = WEEKDAY_NAMES[date.getDay()];
  const slotsForDay = slots.filter((s) => s.dayOfWeek === dayLabel && (s.studentsIds ?? []).length > 0);
  const displaySlots = slotMode === 'single'
    ? (selectedSlotId ? slots.filter((s) => s._id === selectedSlotId) : [])
    : slotsForDay;

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedSlotId('');
    setOverridesMap({});
  };

  const handleDateChange = (d: Date | undefined) => {
    if (!d) return;
    setDate(d);
    setSelectedSlotId('');
    setOverridesMap({});
  };

  const handleOverrideChange = (slotId: string, studentId: string, override: Partial<{ status: AttendanceStatus | null; notes: string }>) => {
    setOverridesMap((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [studentId]: { ...(prev[slotId]?.[studentId] ?? { status: null, notes: '' }), ...override },
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="w-[280px] space-y-1">
          <span className="text-sm font-medium">{t('selectCourse')}</span>
          <Select value={selectedCourseId} onValueChange={handleCourseChange}>
            <SelectTrigger><SelectValue placeholder={t('selectCoursePlaceholder')} /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">{t('date')}</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-[160px] justify-start text-left font-normal')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, 'PPP', { locale: dateFnsLocale })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={handleDateChange} />
            </PopoverContent>
          </Popover>
        </div>

        {selectedCourseId && (
          <div className="space-y-1">
            <span className="text-sm font-medium">{t('mode')}</span>
            <SlotModeToggle value={slotMode} onChange={setSlotMode} />
          </div>
        )}

        {selectedCourseId && slotMode === 'single' && (
          <SlotPicker slots={slots} selectedDate={date} value={selectedSlotId} onChange={setSelectedSlotId} />
        )}
      </div>

      {selectedCourseId && slotsForDay.length === 0 && (
        <p className="text-muted-foreground text-sm">{t('noSlotsForDay')}</p>
      )}

      {displaySlots.map((slot) => (
        <SlotPanelWrapper
          key={slot._id}
          courseId={selectedCourseId}
          slot={slot}
          date={date}
          overrides={overridesMap[slot._id ?? ''] ?? {}}
          onOverrideChange={(studentId, override) => handleOverrideChange(slot._id ?? '', studentId, override)}
        />
      ))}
    </div>
  );
}

function SlotPanelWrapper({
  courseId, slot, date, overrides, onOverrideChange,
}: {
  courseId: string;
  slot: import('@/lib/types/course/course.interface').TimeSlot;
  date: Date;
  overrides: OverridesMap;
  onOverrideChange: (studentId: string, override: Partial<{ status: AttendanceStatus | null; notes: string }>) => void;
}) {
  const { data: roster = [], isLoading } = useSessionRoster(courseId, slot._id ?? '', date);
  const bulkMark = useBulkMarkAttendance(courseId, slot._id ?? '', date);

  const handleSave = () => {
    const records = roster
      .filter((entry) => {
        const ov = overrides[entry.studentId];
        return ov?.status != null;
      })
      .map((entry) => ({
        studentId: entry.studentId,
        status: (overrides[entry.studentId]?.status ?? entry.status)!,
        notes: overrides[entry.studentId]?.notes ?? entry.notes,
      }));

    if (records.length === 0) return;

    bulkMark.mutate({
      courseId,
      slotId: slot._id ?? '',
      date,
      attendanceRecords: records,
    });
  };

  return (
    <SlotSessionPanel
      courseId={courseId}
      slot={slot}
      date={date}
      roster={roster}
      isLoading={isLoading}
      overrides={overrides}
      onOverrideChange={onOverrideChange}
      onSave={handleSave}
      isSaving={bulkMark.isPending}
    />
  );
}
```

- [ ] **Step 2: Update page.tsx to use AttendanceMark**

In `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/page.tsx`:

Replace:
```tsx
import { AttendanceDashboard } from './_components/AttendanceDashboard';
```
With:
```tsx
import { AttendanceMark } from './_components/mark/attendance-mark';
```

Replace:
```tsx
<AttendanceDashboard courses={courses} />
```
With:
```tsx
<AttendanceMark courses={courses} />
```

---

## Task 13: Client — Update AttendanceReport

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/attendance/_components/AttendanceReport.tsx`

- [ ] **Step 1: Update ReportData type and summary cards**

In `AttendanceReport.tsx`, update the `ReportData` interface to match the new server shape:

```typescript
interface ReportData {
  summary: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalLate: number;
    totalExcused: number;
    totalAbsent: number;
  };
  students: {
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    expectedSessions: number;
    presentCount: number;
    lateCount: number;
    excusedCount: number;
    absentCount: number;
    attendanceRate: number;
  }[];
}
```

- [ ] **Step 2: Update summary cards section (around line 208–247)**

Replace the 5 summary cards with 6, swapping `totalRecords` for `totalSessions` and adding `totalAbsent`:

```tsx
{reportData.students && reportData.students.length > 0 ? (
  <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-6">
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{reportData.summary.totalStudents}</div>
        <p className="text-muted-foreground text-xs">{t('totalStudents')}</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{reportData.summary.totalSessions}</div>
        <p className="text-muted-foreground text-xs">{t('totalSessions')}</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold text-green-600">{reportData.summary.totalPresent}</div>
        <p className="text-muted-foreground text-xs">{t('present')}</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold text-red-600">{reportData.summary.totalAbsent}</div>
        <p className="text-muted-foreground text-xs">{t('absent')}</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold text-yellow-600">{reportData.summary.totalLate}</div>
        <p className="text-muted-foreground text-xs">{t('late')}</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold text-blue-600">{reportData.summary.totalExcused}</div>
        <p className="text-muted-foreground text-xs">{t('excused')}</p>
      </CardContent>
    </Card>
  </div>
) : null}
```

- [ ] **Step 3: Update table column header and student row**

In the `<TableHeader>`, replace `{t('totalClasses')}` with `{t('expectedSessions')}`.

In `<TableBody>`, for each student row replace `student.totalClasses` with `student.expectedSessions` and add tooltip to absent badge:

```tsx
<TableCell>
  <Badge variant="destructive" title={t('absentDerived')}>
    {student.absentCount}
  </Badge>
</TableCell>
```

---

## Task 14: Client — Split enrollment-data-table + fix add-enrollment-dialog

**Files:**
- Create: the 8 new files listed in the file map above
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/page.tsx` (import new table)
- Delete: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-data-table.tsx` (after splitting)
- Delete: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/add-enrollment-dialog.tsx` (after moving to folder)

- [ ] **Step 1: Create enrollment-progress-dialog.tsx**

Extract the progress dialog currently inlined in `enrollment-data-table.tsx`. Read lines 80–250 of `enrollment-data-table.tsx` to find the dialog JSX and extract it into:

```tsx
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-progress-dialog/enrollment-progress-dialog.tsx
'use client';

import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
// ... import everything the dialog needs ...

interface EnrollmentProgressDialogProps {
  enrollment: IEnrollment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollmentProgressDialog({ enrollment, open, onOpenChange }: EnrollmentProgressDialogProps) {
  // Move dialog JSX from enrollment-data-table.tsx here
}
```

> **Important:** Do not write placeholder code here. Open `enrollment-data-table.tsx` and read the full progress dialog JSX, then paste it into this file with any needed import adjustments.

- [ ] **Step 2: Create enrollment-progress-dialog.skeleton.tsx**

```tsx
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-progress-dialog/enrollment-progress-dialog.skeleton.tsx
'use client';

import { Skeleton } from '@/components/atoms/skeleton';

export function EnrollmentProgressDialogSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
```

- [ ] **Step 3: Create enrollment-subscription-dialog.tsx**

Same pattern as Step 1 — extract the subscription dialog JSX from `enrollment-data-table.tsx`:

```tsx
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-subscription-dialog/enrollment-subscription-dialog.tsx
'use client';

// Read the full subscription dialog JSX from enrollment-data-table.tsx and move it here
```

- [ ] **Step 4: Create enrollment-subscription-dialog.skeleton.tsx**

```tsx
'use client';

import { Skeleton } from '@/components/atoms/skeleton';

export function EnrollmentSubscriptionDialogSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

- [ ] **Step 5: Create enrollment-row-actions.tsx**

Extract the `DropdownMenu` row action from `enrollment-data-table.tsx`:

```tsx
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-row-actions.tsx
'use client';

import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/atoms/dropdown-menu';
import { Button } from '@/components/atoms/button';
import { IconDotsVertical } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface EnrollmentRowActionsProps {
  enrollment: IEnrollment;
  onViewProgress: (enrollment: IEnrollment) => void;
  onViewSubscription: (enrollment: IEnrollment) => void;
}

export function EnrollmentRowActions({ enrollment, onViewProgress, onViewSubscription }: EnrollmentRowActionsProps) {
  const t = useTranslations('EnrollmentTable');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <IconDotsVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewProgress(enrollment)}>
          {t('viewProgress')}
        </DropdownMenuItem>
        {enrollment.subscription && (
          <DropdownMenuItem onClick={() => onViewSubscription(enrollment)}>
            {t('viewSubscription')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 6: Create add-enrollment-dialog folder (ORGAN-PATTERN)**

Move `add-enrollment-dialog.tsx` content to the new folder structure. Read the existing `add-enrollment-dialog.tsx` (182 lines) and split it:

**`add-enrollment-dialog/add-enrollment-dialog.schema.ts`** — extract the Yup/zod schema + types from the dialog:

```typescript
// Extract validation schema and form types here
// (Read the current add-enrollment-dialog.tsx to find the schema)
```

**`add-enrollment-dialog/add-enrollment-dialog.tsx`** — the dialog component without the inline schema:
```tsx
// Move the component here, importing schema from the .schema.ts file
```

- [ ] **Step 7: Create enrollment-data-table/enrollment-data-table.tsx**

Create the slim table shell (~200 lines) that imports the extracted components:

```tsx
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-data-table/enrollment-data-table.tsx
'use client';

import { useState } from 'react';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
// ... import extracted components ...
import { EnrollmentProgressDialog } from '../enrollment-progress-dialog/enrollment-progress-dialog';
import { EnrollmentSubscriptionDialog } from '../enrollment-subscription-dialog/enrollment-subscription-dialog';
import { EnrollmentRowActions } from '../enrollment-row-actions';
import { AddEnrollmentDialog } from '../add-enrollment-dialog/add-enrollment-dialog';
import { useEnrollmentsByOrganization } from '@/lib/hooks/enrollment/enrollments.hook';
// ... rest of imports ...

export function EnrollmentDataTable() {
  const [progressEnrollment, setProgressEnrollment] = useState<IEnrollment | null>(null);
  const [subscriptionEnrollment, setSubscriptionEnrollment] = useState<IEnrollment | null>(null);
  // ... column defs and table state ...
}
```

- [ ] **Step 8: Create enrollment-data-table/enrollment-data-table.schema.ts**

```typescript
// Column def types and helper types for the table
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { ColumnDef } from '@tanstack/react-table';

export type EnrollmentColumnDef = ColumnDef<IEnrollment>;
```

- [ ] **Step 9: Update enrollment page.tsx import**

In `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/page.tsx`, update the import:

```tsx
// old: import EnrollmentDataTable from './__components/enrollment-data-table';
// new:
import { EnrollmentDataTable } from './__components/enrollment-data-table/enrollment-data-table';
```

- [ ] **Step 10: Delete old flat files**

After verifying the new components render correctly, delete:
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/enrollment-data-table.tsx`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/enrollments/__components/add-enrollment-dialog.tsx`

---

## Self-Review Checklist

Run these before calling the plan complete:

- [ ] `pnpm nx build server` — no TypeScript errors
- [ ] `pnpm nx build client` — no TypeScript errors
- [ ] Reseed: `pnpm nx run server:seed` (or equivalent command from package.json)
- [ ] Manual smoke: create a course with offline schedule → assign 2 students → mark one present → verify report shows 1 absent (derived)
- [ ] Manual smoke: search in offline-slot picker — type a student name — verify filtered results
- [ ] Manual smoke: enrollment table — all three dialogs open; `add-enrollment-dialog` renders and submits
