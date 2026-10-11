import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel, Types, Model } from 'mongoose';
import { Attendance } from '../entities/attendance.entity';
import { MarkAttendanceDto } from '../dto/mark-attendance.dto';
import { BulkMarkAttendanceDto } from '../dto/bulk-mark-attendance.dto';
import { AttendanceReportDto } from '../dto/attendance-report.dto';
import { AttendanceStatus } from '../enum/attendance-status.enum';
import { AttendanceErrors } from '../attendance.errors';
import { AttendanceDerivationService } from './attendance-derivation.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { CourseService } from '../../course/services/course/course.service';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { StudentMarkByQrDto } from '../dto/student-mark-by-qr.dto';
import { QueryService } from 'src/database/query';
import { Course, TimeSlot } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { AccessType } from 'src/enrollment/enum/accessType.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { EnrollmentErrors, StudentCourseHistory, StudentScheduledCourse } from '@darnozom/shared-types';
import { escapeRegex } from 'src/utils/approval.utils';
import {
  BulkAttendanceResult,
  StudentReportRow,
  AttendanceReportResult,
  SessionRosterEntry,
  SessionRosterQuery,
  PaginatedSessionRoster,
} from '../types/attendance.types';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const ROSTER_DEFAULT_LIMIT = 15;
const ROSTER_MAX_LIMIT = 100;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: PaginateModel<Attendance>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
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

  async getAttendanceBySession(courseId: string, slotId: string, date: Date, query: SessionRosterQuery = {}): Promise<PaginatedSessionRoster> {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const limit = Math.min(ROSTER_MAX_LIMIT, Math.max(1, Math.trunc(query.limit ?? ROSTER_DEFAULT_LIMIT)));

    const roster = await this.derivationService.getSessionRoster(courseId, slotId, date);
    if (!roster) return { items: [], total: 0, page, limit, totalPages: 0 };

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();
    const isPast = roster.endsAt.getTime() < now.getTime();

    // Scope the searchable user set to this slot's roster.
    const rosterObjectIds = roster.studentIds.map((id) => new Types.ObjectId(id));
    const userFilter: Record<string, unknown> = { _id: { $in: rosterObjectIds } };

    const search = query.search?.trim();
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      const or: Record<string, unknown>[] = [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }];
      if (Types.ObjectId.isValid(search)) or.push({ _id: new Types.ObjectId(search) });
      userFilter.$and = [{ _id: { $in: rosterObjectIds } }, { $or: or }];
      delete userFilter._id;
    }

    const total = await this.userModel.countDocuments(userFilter);
    const totalPages = Math.ceil(total / limit);

    const users = await this.userModel
      .find(userFilter)
      .select('firstName lastName email phone avatar')
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ firstName: 1, lastName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const pageStudentIds = users.map((u) => u._id);
    const rows = await this.attendanceModel.find({
      courseId: new Types.ObjectId(courseId),
      slotId: new Types.ObjectId(slotId),
      date: startOfDay,
      studentId: { $in: pageStudentIds },
    });

    const rowMap = new Map<string, Attendance>();
    for (const row of rows) {
      rowMap.set(row.studentId.toString(), row);
    }

    const items: SessionRosterEntry[] = users.map((user) => {
      const studentId = user._id.toString();
      const row = rowMap.get(studentId);
      return {
        studentId,
        firstName: (user as { firstName?: string }).firstName ?? '',
        lastName: (user as { lastName?: string }).lastName ?? '',
        email: (user as { email?: string }).email ?? '',
        phone: (user as { phone?: string }).phone,
        avatar: (user as { avatar?: string }).avatar,
        status: row ? row.status : null,
        notes: row?.notes,
        derivedAbsent: isPast && !row,
      };
    });

    return { items, total, page, limit, totalPages };
  }

  async getStudentAttendance(studentId: string, courseId: string) {
    const results = await this.attendanceModel.find({
      studentId: new Types.ObjectId(studentId),
      courseId: new Types.ObjectId(courseId),
    });
    return results.toSorted((a, b) => b.date.getTime() - a.date.getTime());
  }

  /** Courses the student appears in via at least one active offline-schedule slot roster. */
  async getStudentScheduledCourses(studentId: string): Promise<StudentScheduledCourse[]> {
    const studentObjectId = new Types.ObjectId(studentId);
    const courses = await this.courseModel
      .find({ 'attendanceSettings.offlineSchedule': { $elemMatch: { studentsIds: studentObjectId, deletedAt: null } } })
      .select('name _id')
      .lean();

    return courses.map((c) => ({ courseId: c._id.toString(), name: (c as { name?: string }).name ?? '' }));
  }

  /**
   * A student's per-session attendance for one course within a [from, to] window (max one year).
   * Lists past sessions only (status recorded, or ABSENT when the session passed with no record).
   * Sessions are paginated; the summary spans all past sessions in the window.
   */
  async getStudentCourseHistory(
    studentId: string,
    courseId: string,
    query: { from: string; to: string; page?: number; limit?: number }
  ): Promise<StudentCourseHistory> {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const limit = Math.min(ROSTER_MAX_LIMIT, Math.max(1, Math.trunc(query.limit ?? ROSTER_DEFAULT_LIMIT)));

    // Inputs are validated at the DTO layer (required, valid dates, from ≤ to, ≤ 1 year).
    // Here we only normalize them into inclusive day bounds for the query.
    const from = new Date(query.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(query.to);
    to.setHours(23, 59, 59, 999);

    const now = new Date();
    // Derivation is bounded to the requested window (was 2020 → now), so it never iterates years of dates.
    const allSessions = await this.derivationService.getExpectedSessions(courseId, { from, to });
    const pastSessions = allSessions
      .filter((s) => s.endsAt.getTime() < now.getTime() && s.studentIds.includes(studentId))
      .toSorted((a, b) => b.date.getTime() - a.date.getTime());

    const course = await this.courseService.findOneById(courseId);
    const slots: TimeSlot[] = course?.attendanceSettings?.offlineSchedule ?? [];
    const slotMap = new Map(slots.filter((s) => s._id).map((s) => [s._id!.toString(), s]));

    // Bound the attendance query to the window (was an unbounded all-time scan per student/course).
    const rows = await this.attendanceModel.find({
      studentId: new Types.ObjectId(studentId),
      courseId: new Types.ObjectId(courseId),
      date: { $gte: from, $lte: to },
    });
    const rowMap = new Map<string, Attendance>();
    for (const row of rows) {
      rowMap.set(`${row.slotId.toString()}:${row.date.toISOString().split('T')[0]}`, row);
    }

    const sessionRows = pastSessions.map((session) => {
      const dateKey = session.date.toISOString().split('T')[0];
      const row = rowMap.get(`${session.slotId}:${dateKey}`);
      const slot = slotMap.get(session.slotId);
      return {
        date: session.date.toISOString(),
        slotId: session.slotId,
        dayOfWeek: slot?.dayOfWeek ?? WEEKDAY_NAMES[session.date.getDay()],
        startTime: slot?.startTime ?? '',
        endTime: slot?.endTime ?? '',
        status: row ? row.status : AttendanceStatus.ABSENT,
        notes: row?.notes,
      };
    });

    let present = 0,
      late = 0,
      excused = 0,
      absent = 0;
    for (const r of sessionRows) {
      switch (r.status) {
        case AttendanceStatus.PRESENT: {
          present += 1;
          break;
        }
        case AttendanceStatus.LATE: {
          late += 1;
          break;
        }
        case AttendanceStatus.EXCUSED: {
          excused += 1;
          break;
        }
        default: {
          absent += 1;
        }
      }
    }
    const total = sessionRows.length;
    const denom = total - excused;
    const attendanceRate = denom > 0 ? Math.round(((present + late) / denom) * 10_000) / 100 : 0;

    const start = (page - 1) * limit;
    return {
      courseId,
      summary: { total, present, late, excused, absent, attendanceRate },
      items: sessionRows.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    interface Stats {
      present: number;
      late: number;
      excused: number;
      expected: number;
    }
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
        switch (status) {
          case AttendanceStatus.PRESENT: {
            s.present += 1;
            break;
          }
          case AttendanceStatus.LATE: {
            s.late += 1;
            break;
          }
          case AttendanceStatus.EXCUSED: {
            {
              s.excused += 1;
              // No default
            }
            break;
          }
        }
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
          firstName: (user as { firstName?: string })?.firstName ?? '',
          lastName: (user as { lastName?: string })?.lastName ?? '',
          email: (user as { email?: string })?.email ?? '',
          avatar: (user as { avatar?: string })?.avatar,
          expectedSessions: s.expected,
          presentCount: s.present,
          lateCount: s.late,
          excusedCount: s.excused,
          absentCount: absent,
          attendanceRate: rate,
        };
      })
      .toSorted((a, b) => b.attendanceRate - a.attendanceRate);

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

    let attended = 0,
      late = 0,
      excused = 0;
    for (const row of rows) {
      switch (row.status) {
        case AttendanceStatus.PRESENT: {
          attended++;
          break;
        }
        case AttendanceStatus.LATE: {
          late++;
          break;
        }
        case AttendanceStatus.EXCUSED: {
          {
            excused++;
            // No default
          }
          break;
        }
      }
    }

    const allSessions = await this.derivationService.getExpectedSessions(courseId, {
      from: new Date('2020-01-01'),
      to: new Date(),
    });
    const now = new Date();
    const studentExpected = allSessions.filter((s) => s.endsAt.getTime() < now.getTime() && s.studentIds.includes(studentId)).length;

    const totalClasses = studentExpected;
    const absent = Math.max(0, totalClasses - attended - late - excused);
    const percentage = totalClasses > 0 ? Math.round(((attended + late) / totalClasses) * 1000) / 10 : 0;

    const enrollmentId = enrollment._id instanceof Types.ObjectId ? enrollment._id.toString() : String(enrollment._id);
    await this.enrollmentService.updateAttendanceSummary(enrollmentId, { totalClasses, attended, absent, late, excused, percentage });
  }

  async studentMarkByQr(dto: StudentMarkByQrDto, userId: Types.ObjectId | string) {
    const filter: Record<string, unknown> = { courseId: dto.courseId, userId, deletedAt: null };
    if (dto.enrollmentId) filter._id = dto.enrollmentId;

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
    const slotId = activeSlot._id!.toHexString();

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

export {
  type BulkAttendanceResult,
  type AttendanceReportResult,
  type StudentReportRow,
  type SessionRosterQuery,
  type SessionRosterEntry,
  type PaginatedSessionRoster,
} from '../types/attendance.types';
