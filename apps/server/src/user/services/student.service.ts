import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, PaginateModel } from 'mongoose';
import { AccessType, CalendarAppointmentType, CourseContentType } from '@lms-organization/shared-types';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Course, AttendanceSettings } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { Assignment } from 'src/course/entities/assignment.schema';
import { CourseContent, CourseContentDocument } from 'src/course/entities/course-content.entity';
import { LiveSession } from 'src/course/entities/liveSession.schema';
import { Project } from 'src/course/entities/project.schema';
import { Quiz } from 'src/course/entities/quiz.schema';
import { isContentServableToStudent } from 'src/course/utils/content-access.util';
import { NOT_DELETED_CONTENT_FILTER } from 'src/course/utils/not-deleted-content.filter';
import { lookupNotDeleted, NOT_DELETED_FILTER } from 'src/utils/soft-delete';
import { SessionBooking } from 'src/private-session/entities/session-booking.entity';
import { PrivateSession } from 'src/private-session/entities/private-session.entity';
import { BookingStatus } from 'src/private-session/enums/booking-status.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';

export interface CalendarAppointment {
  type: CalendarAppointmentType;
  title: string;
  courseId: mongoose.Types.ObjectId | string;
  courseName: string;
  /** Enrollment used by clients to open My Learning / content routes. */
  enrollmentId?: mongoose.Types.ObjectId | string;
  /** Parent module for course content items; optional for attendance rows tied to a module. */
  moduleId?: mongoose.Types.ObjectId;
  moduleName?: string;
  contentId?: mongoose.Types.ObjectId;
  date: Date;
  endDate?: Date;
  meta?: Record<string, unknown>;
}

const RELEVANT_CONTENT_TYPES = new Set([
  CourseContentType.ASSIGNMENT,
  CourseContentType.QUIZ,
  CourseContentType.LIVE_SESSION,
  CourseContentType.PROJECT,
]);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: PaginateModel<Enrollment>,
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>,
    @InjectModel(CourseModuleEntity.name)
    private readonly courseModuleModel: PaginateModel<CourseModuleEntity>,
    @InjectModel(SessionBooking.name)
    private readonly sessionBookingModel: Model<SessionBooking>,
    @InjectModel(PrivateSession.name)
    private readonly privateSessionModel: Model<PrivateSession>
  ) {}

  async getCalendar(
    studentId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId | undefined,
    fromDate?: string,
    toDate?: string
  ): Promise<CalendarAppointment[]> {
    const { start, end } = this.resolveTimeFrame(fromDate, toDate);

    const enrolledCoursesWithContent = await this.aggregateEnrolledCoursesWithContent(studentId, organizationId);

    if (enrolledCoursesWithContent.length === 0) {
      return [];
    }

    const contentAppointments = await this.buildContentAppointments(enrolledCoursesWithContent, start, end);
    const scheduleAppointments = this.getScheduleAppointments(studentId, enrolledCoursesWithContent as CourseWithSchedule[], start, end);
    const privateSessionAppointments = await this.getPrivateSessionAppointments(studentId, organizationId, start, end);

    const appointments = [...contentAppointments, ...scheduleAppointments, ...privateSessionAppointments];
    appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return appointments;
  }

  private resolveTimeFrame(fromDate?: string, toDate?: string) {
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      // Date-only / midnight UTC instants → include the full UTC calendar day.
      // Clients that already send an end-of-day instant are left unchanged.
      if (end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0 && end.getUTCMilliseconds() === 0) {
        end.setUTCHours(23, 59, 59, 999);
      }
      return { start, end };
    }

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return { start, end };
  }

  /**
   * Enrollment filter for calendar: active FREE/PAID_ONCE, or SUBSCRIPTION that is not
   * expired by status / ends_at. Matches `EnrollmentService.assertEnrollmentIsActive`
   * so calendar deep-links never point at enrollments that 403 on open.
   */
  private buildActiveEnrollmentMatch(
    studentId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId | undefined,
    now: Date = new Date()
  ): mongoose.FilterQuery<Enrollment> {
    return {
      userId: studentId,
      ...(organizationId ? { organizationId } : {}),
      ...NOT_DELETED_FILTER,
      $nor: [
        {
          accessType: AccessType.SUBSCRIPTION,
          $or: [{ 'subscription.status': SubscriptionStatus.EXPIRED }, { 'subscription.ends_at': { $lt: now } }],
        },
      ],
    };
  }

  /**
   * One aggregation: enrollments → courses → `course_contents`.
   * Skips an extra round-trip (previously: enrollments, then courses, then a second course aggregate).
   * Content join matches `courseId` as ObjectId or string (legacy/mixed data).
   */
  private async aggregateEnrolledCoursesWithContent(
    studentId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId | undefined
  ): Promise<CourseWithContents[]> {
    const coursesCollection = this.courseModel.collection.collectionName;
    const matchStage = this.buildActiveEnrollmentMatch(studentId, organizationId);

    return this.enrollmentModel.aggregate([
      { $match: matchStage },
      lookupNotDeleted(coursesCollection, 'courseId', '_course'),
      { $unwind: { path: '$_course', preserveNullAndEmptyArrays: false } },
      // Keep enrollment id on the course doc for calendar deep-links.
      { $addFields: { '_course.enrollmentId': '$_id' } },
      { $replaceRoot: { newRoot: '$_course' } },
      // Deduplicate by course _id (same behavior as distinct courses from `find({ _id: { $in } })`).
      { $group: { _id: '$_id', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $lookup: {
          from: 'course_contents',
          let: { courseOid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$courseId' }, { $toString: '$$courseOid' }],
                },
                ...NOT_DELETED_CONTENT_FILTER,
              },
            },
          ],
          as: 'contents',
        },
      },
      { $project: { _id: 1, name: 1, attendanceSettings: 1, contents: 1, enrollmentId: 1 } },
    ]);
  }

  /**
   * Maps joined course content docs to calendar rows (no DB — pure CPU).
   * Uses raw `course_contents` shapes from aggregation (discriminator fields preserved).
   */
  private async buildContentAppointments(coursesWithContent: CourseWithContents[], start: Date, end: Date): Promise<CalendarAppointment[]> {
    const moduleIdStrings = new Set<string>();
    for (const course of coursesWithContent) {
      for (const doc of course.contents as unknown as CourseContentDocument[]) {
        if (!RELEVANT_CONTENT_TYPES.has(doc.type)) continue;
        if (!isContentServableToStudent(doc)) continue;
        if (doc.moduleId) {
          moduleIdStrings.add(String(doc.moduleId));
        }
      }
    }

    const moduleTitleById = new Map<string, string>();
    if (moduleIdStrings.size > 0) {
      const moduleObjectIds = [...moduleIdStrings].map((id) => new mongoose.Types.ObjectId(id));
      const modules = await this.courseModuleModel
        .find({ _id: { $in: moduleObjectIds } })
        .select('title')
        .lean();
      for (const m of modules) {
        moduleTitleById.set(m._id.toString(), m.title);
      }
    }

    const appointments: CalendarAppointment[] = [];

    for (const course of coursesWithContent) {
      for (const doc of course.contents as unknown as CourseContentDocument[]) {
        if (!RELEVANT_CONTENT_TYPES.has(doc.type)) continue;
        if (!isContentServableToStudent(doc)) continue;

        let date: Date | undefined;
        let endDate: Date | undefined;
        let appointmentType: CalendarAppointmentType;
        let meta: Record<string, unknown> = {};

        const moduleId = doc.moduleId as mongoose.Types.ObjectId | undefined;
        const moduleName = moduleId ? moduleTitleById.get(moduleId.toString()) : undefined;

        switch (doc.type) {
          case CourseContentType.ASSIGNMENT: {
            const d = doc as CourseContent & Assignment;
            date = d.dueDate ? new Date(d.dueDate) : undefined;
            appointmentType = CalendarAppointmentType.ASSIGNMENT;
            meta = {
              maxPoints: d.maxPoints,
              contentType: d.type,
              ...(d.description ? { description: d.description } : {}),
            };
            break;
          }

          case CourseContentType.PROJECT: {
            const d = doc as unknown as CourseContent & Project;
            date = d.dueDate ? new Date(d.dueDate) : undefined;
            appointmentType = CalendarAppointmentType.PROJECT;
            meta = {
              maxPoints: d.maxPoints,
              isGroupProject: d.isGroupProject,
              contentType: d.type,
              ...(d.description ? { description: d.description } : {}),
            };
            break;
          }

          case CourseContentType.QUIZ: {
            const d = doc as CourseContent & Quiz;
            date = d.quizStartDate ? new Date(d.quizStartDate) : d.quizEndDate ? new Date(d.quizEndDate) : undefined;
            endDate = d.quizEndDate ? new Date(d.quizEndDate) : undefined;
            appointmentType = CalendarAppointmentType.QUIZ;
            meta = {
              quizDurationInMinutes: d.quizDurationInMinutes,
              maxAttempts: d.maxAttempts,
              contentType: d.type,
              ...(d.description ? { description: d.description } : {}),
            };
            break;
          }

          case CourseContentType.LIVE_SESSION: {
            const d = doc as unknown as CourseContent & LiveSession;
            date = d.startDate ? new Date(d.startDate) : undefined;
            endDate = d.endDate ? new Date(d.endDate) : undefined;
            appointmentType = CalendarAppointmentType.LIVE_SESSION;
            meta = {
              platform: d.platform,
              meetingUrl: d.meetingUrl,
              contentType: d.type,
              provider: (d as unknown as { provider?: string }).provider ?? 'EXTERNAL_URL',
              agoraChannelName: (d as unknown as { agoraChannelName?: string }).agoraChannelName,
              ...(d.description ? { description: d.description } : {}),
            };
            break;
          }

          default: {
            continue;
          }
        }

        if (!date || date < start || date > end) {
          continue;
        }

        appointments.push({
          type: appointmentType,
          title: doc.title ?? '',
          courseId: course._id,
          courseName: course.name,
          ...(course.enrollmentId ? { enrollmentId: course.enrollmentId } : {}),
          ...(moduleId ? { moduleId, ...(moduleName ? { moduleName } : {}) } : {}),
          contentId: doc._id,
          date,
          endDate,
          meta: {
            ...meta,
            ...(course.enrollmentId ? { enrollmentId: course.enrollmentId.toString() } : {}),
            contentId: doc._id.toString(),
          },
        });
      }
    }

    return appointments;
  }

  /** Normalize user ids for comparison (ObjectId vs string from aggregation / JSON). */
  private normalizeUserIdForCompare(v: unknown): string {
    return (v instanceof mongoose.Types.ObjectId ? v.toHexString() : String(v)).toLowerCase();
  }

  private sameUserId(a: unknown, b: unknown): boolean {
    return this.normalizeUserIdForCompare(a) === this.normalizeUserIdForCompare(b);
  }

  /**
   * Expands the weekly `offlineSchedule` time slots from each course's
   * attendanceSettings into concrete calendar dates within the requested range.
   *
   * When a slot has no `studentsIds` (or an empty list), every enrolled student sees it.
   * When `studentsIds` is non-empty, only those users see the slot.
   */
  private getScheduleAppointments(studentId: mongoose.Types.ObjectId, courses: CourseWithSchedule[], start: Date, end: Date): CalendarAppointment[] {
    const appointments: CalendarAppointment[] = [];

    for (const course of courses) {
      if (!course.attendanceSettings?.requireAttendance) continue;

      const schedule = course.attendanceSettings.offlineSchedule ?? [];

      for (const slot of schedule) {
        if (slot.deletedAt) continue;

        const assignedStudentIds = slot.studentsIds ?? [];
        if (assignedStudentIds.length > 0 && !assignedStudentIds.some((id) => this.sameUserId(id, studentId))) {
          continue;
        }

        const occurrences = this.expandWeeklySlot(slot.dayOfWeek, slot.startTime, slot.endTime, start, end);

        for (const { slotStart, slotEnd } of occurrences) {
          const slotId = slot._id;
          appointments.push({
            type: CalendarAppointmentType.ATTENDANCE,
            title: `${course.name} - ${slot.dayOfWeek}`,
            courseId: course._id,
            courseName: course.name,
            ...(course.enrollmentId ? { enrollmentId: course.enrollmentId } : {}),
            ...(slot.moduleId
              ? {
                  moduleId: slot.moduleId,
                  ...(slot.moduleName ? { moduleName: slot.moduleName } : {}),
                }
              : {}),
            date: slotStart,
            endDate: slotEnd,
            meta: {
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              ...(slotId ? { slotId: slotId.toString() } : {}),
              ...(course.enrollmentId ? { enrollmentId: course.enrollmentId.toString() } : {}),
            },
          });
        }
      }
    }

    return appointments;
  }

  private expandWeeklySlot(
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    rangeStart: Date,
    rangeEnd: Date
  ): { slotStart: Date; slotEnd: Date }[] {
    const dayIndex = DAY_NAMES.indexOf(dayOfWeek);
    if (dayIndex === -1) return [];

    const results: { slotStart: Date; slotEnd: Date }[] = [];

    // Walk UTC calendar days so expansion does not depend on the server process timezone.
    const cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()));

    const currentDay = cursor.getUTCDay();
    const daysUntilTarget = (dayIndex - currentDay + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + daysUntilTarget);

    while (cursor <= rangeEnd) {
      const slotStart = this.parseTimeOnDate(cursor, startTime);
      const slotEnd = this.parseTimeOnDate(cursor, endTime);

      if (slotStart >= rangeStart && slotStart <= rangeEnd) {
        results.push({ slotStart, slotEnd });
      }

      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return results;
  }

  private async getPrivateSessionAppointments(
    studentId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId | undefined,
    start: Date,
    end: Date
  ): Promise<CalendarAppointment[]> {
    const query: mongoose.FilterQuery<SessionBooking> = {
      $or: [{ studentId }, { parentId: studentId }],
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      startsAt: { $gte: start, $lte: end },
    };
    if (organizationId) query.organizationId = organizationId;

    const bookings = await this.sessionBookingModel
      .find(query)
      .populate({ path: 'session', model: this.privateSessionModel, select: 'title duration sessionType' })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ startsAt: 1 });

    return bookings.map((b) => {
      const sessionDoc = b.get('session') as { title?: string } | null;
      const title = sessionDoc?.title ?? 'Private Session';

      return {
        type: CalendarAppointmentType.PRIVATE_SESSION,
        title,
        courseId: b._id.toString(),
        courseName: title,
        date: b.startsAt,
        endDate: b.endsAt,
        meta: {
          bookingId: b._id.toString(),
          sessionId: b.sessionId.toString(),
          instructorId: b.instructorId.toString(),
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          timezone: b.timezone,
          status: b.status,
          provider: b.provider ?? 'EXTERNAL_URL',
          agoraChannelName: b.agoraChannelName,
        },
      };
    });
  }

  /** Parses "02:00 pm" / "11:30 am" style time onto a UTC calendar date. */
  private parseTimeOnDate(date: Date, time: string): Date {
    const trimmed = time.trim().toLowerCase();
    const parts = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(trimmed);
    if (!parts) {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    let hours = Number.parseInt(parts[1], 10);
    const minutes = Number.parseInt(parts[2], 10);
    const meridiem = parts[3].toLowerCase();

    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes, 0, 0));
  }
}

interface CourseWithSchedule {
  _id: mongoose.Types.ObjectId;
  name: string;
  enrollmentId?: mongoose.Types.ObjectId;
  attendanceSettings?: AttendanceSettings;
}

/** Row from `aggregateEnrolledCoursesWithContent` (course + joined raw discriminator docs). */
interface CourseWithContents extends CourseWithSchedule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw aggregation shapes vary by content type
  contents: any[];
}
