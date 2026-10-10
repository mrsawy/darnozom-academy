import { Model, Types } from 'mongoose';
import { AttendanceSummary, ContentProgressItem, Enrollment } from '../entities/enrollment.entity';
import type { EnrollmentAssignmentSubmissionSnapshot, EnrollmentQuizSubmissionSnapshot } from '../entities/enrollment-submission-snapshots.embed';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { fakerAR as faker } from '@faker-js/faker';
import { AccessType } from '../enum/accessType.enum';
import { AttendanceStatus } from '../../attendance/enum/attendance-status.enum';
import { Course } from '../../course/entities/course.entity';
import { CourseModuleEntity } from '../../course/entities/course-module.entity';
import { CourseContent, CourseContentDocument } from '../../course/entities/course-content.entity';
import { ContentType } from '../../course/enum/contentType.enum';
import { Quiz } from '../../course/entities/quiz.schema';
import { QuizQuestion } from '../../course/entities/quizSubmission.entity';
import { SubscriptionTypeDef } from '../../utils/types/Subscription.interface';
import { User } from '../../user/entities/user.entity';
import { SubscriptionStatus } from '../../utils/enums/subscriptionStatus.enum';
import { BillingCycle } from '../../utils/enums/billingCycle.enum';
import { Currency } from '@lms-organization/shared-types';
import { ENROLLMENT_CONFIG } from './enrollment.config';

const RECENT_ENROLL_WINDOW_MS = 110 * 86_400_000;
const ACTIVITY_WINDOW_MS = 90 * 86_400_000;
// ~6 months of weekly sessions → enough rows to demo the date range + pagination in attendance history.
const ATTENDANCE_HISTORY_WINDOW_MS = 180 * 86_400_000;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Past dates that fall on `dayOfWeek` within the window, computed the same way the attendance
 * derivation generates sessions (local midnight, by weekday) so seeded records line up with them.
 * Excludes today, whose session may not have ended yet.
 */
function pastWeekdayDates(dayOfWeek: string, windowMs: number): Date[] {
  const target = WEEKDAY_NAMES.indexOf(dayOfWeek);
  if (target === -1) return [];

  const dates: Date[] = [];
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  cur.setDate(cur.getDate() - 1);
  const start = Date.now() - windowMs;
  while (cur.getTime() >= start) {
    if (cur.getDay() === target) dates.push(new Date(cur));
    cur.setDate(cur.getDate() - 1);
  }
  return dates;
}

function recentEnrolledAt(): Date {
  return faker.date.between({
    from: new Date(Date.now() - RECENT_ENROLL_WINDOW_MS),
    to: new Date(),
  });
}

function activityDateRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(Date.now() - ACTIVITY_WINDOW_MS);
  return { from, to };
}

function studentDisplayName(student: User): string {
  const parts = [student.firstName, student.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : student.username;
}

export class EnrollmentSeeder {
  constructor(
    private readonly enrollmentModel: Model<Enrollment>,
    private readonly attendanceModel: Model<Attendance>,
    private readonly courseModel: Model<Course>,
    private readonly moduleModel: Model<CourseModuleEntity>,
    private readonly contentModel: Model<CourseContent>,
    private readonly userModel: Model<User>
  ) {}

  async seedEnrollment(
    student: User,
    courseId: Types.ObjectId,
    organizationId: Types.ObjectId,
    progressPercentage: number,
    subscription: SubscriptionTypeDef | undefined,
    accessType: AccessType,
    instructorId?: Types.ObjectId
  ) {
    const userId = student._id;
    try {
      const course = await this.courseModel.findById(courseId).lean();
      if (!course) throw new Error(`Course ${courseId.toString()} not found`);

      const courseTitle = (course as { name?: string }).name ?? '';

      const offlineSlots: { _id: Types.ObjectId; dayOfWeek?: string; studentsIds?: Types.ObjectId[]; deletedAt?: Date | null }[] =
        ((course as { attendanceSettings?: { offlineSchedule?: unknown[] } }).attendanceSettings?.offlineSchedule as {
          _id: Types.ObjectId;
          dayOfWeek?: string;
          studentsIds?: Types.ObjectId[];
          deletedAt?: Date | null;
        }[]) ?? [];
      const seedSlot = offlineSlots.find((s) => !s.deletedAt);

      // Add the student to the slot roster so the course (and its sessions) surface in attendance history.
      if (seedSlot) {
        await this.courseModel.updateOne(
          { _id: courseId, 'attendanceSettings.offlineSchedule._id': seedSlot._id },
          { $addToSet: { 'attendanceSettings.offlineSchedule.$.studentsIds': userId } }
        );
      }

      const courseWithModules = course as Course & { modulesIds?: Types.ObjectId[] };
      const modulesIds = courseWithModules.modulesIds ?? [];
      const allContents: Types.ObjectId[] = [];
      const moduleContentsMap = new Map<string, Types.ObjectId[]>();
      const moduleTitleByContentId = new Map<string, string>();

      const modules = await this.moduleModel
        .find({ _id: { $in: modulesIds } })
        .select('_id contentsIds title')
        .lean();

      for (const module of modules) {
        const mId = module._id.toString();
        const mTitle = (module as { title?: string }).title ?? 'Module';
        const contentsIds: Types.ObjectId[] = (module as { contentsIds?: Types.ObjectId[] }).contentsIds ?? [];
        moduleContentsMap.set(mId, contentsIds);
        for (const cid of contentsIds) {
          moduleTitleByContentId.set(cid.toString(), mTitle);
        }
        allContents.push(...contentsIds);
      }

      const totalContents = allContents.length;
      const baseEnrollmentData = buildBaseEnrollmentData(userId, courseId, organizationId, accessType, subscription);

      if (totalContents === 0) {
        const attendanceSummary = await this.seedAttendanceRecords(userId, courseId, organizationId, instructorId, seedSlot);
        const enrollment = await this.enrollmentModel.create({
          ...baseEnrollmentData,
          courseTitle,
          progressPercentage: 0,
          attendanceSummary,
        });
        await this.courseModel.updateOne({ _id: courseId }, { $inc: { 'stats.totalEnrollments': 1 } });
        await this.updateInstructorTotalStudents(course, instructorId);
        return enrollment;
      }

      const contentsToComplete = Math.round((progressPercentage / 100) * totalContents);
      const completedContentsIds = allContents.slice(0, contentsToComplete);

      const completedModules: Types.ObjectId[] = [];
      const submittedAssignments: Types.ObjectId[] = [];
      const submittedProjects: Types.ObjectId[] = [];
      const submittedQuizzes: Types.ObjectId[] = [];
      const attendedLiveSessions: Types.ObjectId[] = [];
      const contentTimeTracking: ContentProgressItem[] = [];
      let totalTimeSpentMinutes = 0;

      const completedContentDocs = await this.contentModel.find({ _id: { $in: completedContentsIds } }).lean();
      const contentDocMap = new Map(completedContentDocs.map((c) => [c._id.toString(), c]));

      const quizUpdates: { contentId: Types.ObjectId; submission: Record<string, unknown> }[] = [];
      const assignmentUpdates: { contentId: Types.ObjectId; submission: Record<string, unknown> }[] = [];
      const projectUpdates: { contentId: Types.ObjectId; submission: Record<string, unknown> }[] = [];
      const liveSessionUpdates: { contentId: Types.ObjectId; attendance: Record<string, unknown> }[] = [];

      const quizEnrollmentSnapshots: EnrollmentQuizSubmissionSnapshot[] = [];
      const assignmentEnrollmentSnapshots: EnrollmentAssignmentSubmissionSnapshot[] = [];

      const { from: actFrom, to: actTo } = activityDateRange();
      const name = studentDisplayName(student);

      for (const contentId of completedContentsIds) {
        const content = contentDocMap.get(contentId.toString()) as unknown as CourseContentDocument;
        if (!content) continue;

        const contentType = content.type;
        const firstAccessed = faker.date.between({ from: actFrom, to: actTo });
        const lastAccessed = faker.date.between({ from: firstAccessed, to: actTo });
        const timeSpent = faker.number.int({ min: 1, max: 120 });
        totalTimeSpentMinutes += timeSpent;

        contentTimeTracking.push({
          contentId,
          contentTitle: content.title ?? 'Untitled',
          contentType,
          timeSpentMinutes: timeSpent,
          firstAccessedAt: firstAccessed,
          lastAccessedAt: lastAccessed,
          completedAt: lastAccessed,
          videoLastPositionSeconds: contentType === ContentType.VIDEO ? faker.number.int({ min: 0, max: 3600 }) : 0,
          accessCount: faker.number.int({ min: 1, max: 10 }),
        } as ContentProgressItem);

        const moduleTitle = moduleTitleByContentId.get(contentId.toString()) ?? 'Module';

        switch (contentType) {
          case ContentType.QUIZ: {
            submittedQuizzes.push(contentId);
            const quizContent = content as Quiz;
            const quizQuestions = quizContent.questions ?? [];
            if (quizQuestions.length > 0) {
              const answers = quizQuestions.map((question: QuizQuestion, questionIndex: number) => {
                const isCorrect = faker.datatype.boolean({ probability: 0.7 });
                const selectedOption = isCorrect
                  ? question.correctOption
                  : faker.helpers.arrayElement([0, 1, 2, 3].filter((opt) => opt !== question.correctOption));
                return {
                  questionIndex,
                  questionText: question.questionText,
                  options: question.options,
                  correctOption: question.correctOption,
                  selectedOption,
                  isCorrect,
                };
              });
              const score = Math.round((answers.filter((a) => a.isCorrect).length / quizQuestions.length) * 100);
              const qc = content as Quiz & { maxAttempts?: number; quizStartDate?: Date; quizDurationInMinutes?: number };
              const submittedAt = faker.date.between({
                from: actFrom,
                to: actTo,
              });
              const attemptNumber = faker.number.int({ min: 1, max: qc.maxAttempts ?? 1 });
              const submission = {
                studentId: userId,
                organizationId,
                answers,
                score,
                attemptNumber,
                timeTakenInSeconds: faker.number.int({ min: 60, max: (qc.quizDurationInMinutes ?? 30) * 60 * 0.9 }),
                submittedAt,
                feedback: faker.datatype.boolean({ probability: 0.6 }) ? faker.lorem.paragraph() : undefined,
              };
              quizUpdates.push({ contentId, submission });
              quizEnrollmentSnapshots.push({
                contentId,
                contentTitle: content.title ?? 'Quiz',
                moduleTitle,
                courseTitle,
                studentId: userId,
                studentName: name,
                organizationId,
                answers,
                score,
                attemptNumber,
                timeTakenInSeconds: submission.timeTakenInSeconds,
                submittedAt,
                feedback: submission.feedback,
              });

              if (faker.datatype.boolean({ probability: 0.35 }) && (qc.maxAttempts ?? 1) > 1) {
                const retakeAt = faker.date.between({ from: submittedAt, to: actTo });
                const score2 = Math.max(0, Math.min(100, score + faker.number.int({ min: -15, max: 20 })));
                const submission2 = {
                  ...submission,
                  score: score2,
                  attemptNumber: attemptNumber + 1,
                  submittedAt: retakeAt,
                };
                quizUpdates.push({ contentId, submission: submission2 });
                quizEnrollmentSnapshots.push({
                  contentId,
                  contentTitle: content.title ?? 'Quiz',
                  moduleTitle,
                  courseTitle,
                  studentId: userId,
                  studentName: name,
                  organizationId,
                  answers,
                  score: score2,
                  attemptNumber: attemptNumber + 1,
                  timeTakenInSeconds: submission.timeTakenInSeconds,
                  submittedAt: retakeAt,
                });
              }
            }
            break;
          }
          case ContentType.PROJECT: {
            submittedProjects.push(contentId);
            const submission: Record<string, unknown> = {
              studentId: userId,
              fileUrl: `https://storage.example.com/submissions/${faker.string.alphanumeric(16)}.zip`,
              description: faker.lorem.sentence(),
            };
            if (faker.datatype.boolean()) submission.repositoryUrl = `https://github.com/${faker.internet.username()}/${faker.lorem.word()}`;
            if (faker.datatype.boolean()) submission.liveDemoUrl = faker.internet.url();
            if (faker.datatype.boolean()) {
              submission.score = faker.number.int({ min: 60, max: 100 });
              submission.feedback = faker.lorem.paragraph();
            }
            projectUpdates.push({ contentId, submission });
            break;
          }
          case ContentType.ASSIGNMENT: {
            submittedAssignments.push(contentId);
            const submittedAt = faker.date.between({ from: actFrom, to: actTo });
            const score = faker.number.int({ min: 55, max: 100 });
            const submission: Record<string, unknown> = {
              studentId: userId,
              studentName: name,
              content: faker.lorem.paragraphs(1),
              score,
              feedback: faker.datatype.boolean({ probability: 0.5 }) ? faker.lorem.sentence() : undefined,
              submittedAt,
            };
            if (faker.datatype.boolean({ probability: 0.4 })) {
              submission.fileKey = `private/courses/${courseId.toString()}/submissions/${faker.string.alphanumeric(12)}.pdf`;
              submission.mimeType = 'application/pdf';
              submission.fileSizeBytes = faker.number.int({ min: 20_000, max: 2_000_000 });
            }
            assignmentUpdates.push({ contentId, submission });
            assignmentEnrollmentSnapshots.push({
              contentId,
              contentTitle: content.title ?? 'Assignment',
              moduleTitle,
              courseTitle,
              studentId: userId,
              studentName: name,
              fileKey: submission.fileKey as string | undefined,
              fileSizeBytes: submission.fileSizeBytes as number | undefined,
              mimeType: submission.mimeType as string | undefined,
              content: submission.content as string,
              score,
              feedback: submission.feedback as string | undefined,
              submittedAt,
            });
            break;
          }
          case ContentType.LIVE_SESSION: {
            attendedLiveSessions.push(contentId);
            const lc = content as CourseContentDocument & { startDate?: Date; durationInMinutes?: number };
            const startDate = lc.startDate instanceof Date ? lc.startDate : new Date(lc.startDate ?? Date.now());
            const durationMinutes = lc.durationInMinutes ?? 60;
            const joinedAt = new Date(startDate.getTime() + faker.number.int({ min: 0, max: 10 }) * 60_000);
            const leftAt = faker.datatype.boolean()
              ? new Date(joinedAt.getTime() + faker.number.int({ min: 10, max: durationMinutes }) * 60_000)
              : undefined;
            liveSessionUpdates.push({
              contentId,
              attendance: {
                studentId: userId,
                joinedAt,
                leftAt,
                durationInMinutes: leftAt ? Math.round((leftAt.getTime() - joinedAt.getTime()) / 60_000) : undefined,
                wasPresent: faker.datatype.boolean({ probability: 0.8 }),
                notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
              },
            });
            break;
          }
        }
      }

      await Promise.all([
        ...quizUpdates.map(({ contentId, submission }) =>
          this.contentModel.updateOne({ _id: contentId, type: ContentType.QUIZ }, { $push: { quizSubmissions: submission } })
        ),
        ...assignmentUpdates.map(({ contentId, submission }) =>
          this.contentModel.updateOne({ _id: contentId, type: ContentType.ASSIGNMENT }, { $push: { submissions: submission } })
        ),
        ...projectUpdates.map(({ contentId, submission }) =>
          this.contentModel.updateOne({ _id: contentId, type: ContentType.PROJECT }, { $push: { submissions: submission } })
        ),
        ...liveSessionUpdates.map(({ contentId, attendance }) =>
          this.contentModel.updateOne({ _id: contentId, type: ContentType.LIVE_SESSION }, { $push: { attendance } })
        ),
      ]);

      for (const [mIdStr, contentsIds] of moduleContentsMap.entries()) {
        const completed = contentsIds.filter((id) => completedContentsIds.some((c) => c.toString() === id.toString()));
        if (completed.length === contentsIds.length && contentsIds.length > 0) {
          completedModules.push(new Types.ObjectId(mIdStr));
        }
      }

      const actualProgressPercentage = Math.round((completedContentsIds.length / totalContents) * 100);
      const completedCourses = completedModules.length === modulesIds.length && modulesIds.length > 0 ? [courseId] : [];

      let lastAccessedAt = baseEnrollmentData.enrolledAt;
      if (contentTimeTracking.length > 0) {
        lastAccessedAt = contentTimeTracking[0].lastAccessedAt;
        for (const row of contentTimeTracking) {
          lastAccessedAt = new Date(Math.max(row.lastAccessedAt.getTime(), lastAccessedAt.getTime()));
        }
      }

      const attendanceSummary = await this.seedAttendanceRecords(userId, courseId, organizationId, instructorId, seedSlot);

      const enrollment = await this.enrollmentModel.create({
        ...baseEnrollmentData,
        courseTitle,
        lastAccessedAt,
        progressPercentage: actualProgressPercentage,
        timeSpentMinutes: contentTimeTracking.length > 0 ? totalTimeSpentMinutes : faker.number.int({ min: 10, max: 500 }),
        attendanceSummary,
        progress: {
          completedModules,
          completedContents: completedContentsIds,
          completedCourses,
          submittedAssignments,
          submittedProjects,
          submittedQuizzes,
          attendedLiveSessions,
          assignmentSubmissions: assignmentEnrollmentSnapshots,
          quizSubmissions: quizEnrollmentSnapshots,
          contentTimeTracking,
        },
      });

      await this.courseModel.updateOne({ _id: courseId }, { $inc: { 'stats.totalEnrollments': 1 } });
      await this.updateInstructorTotalStudents(course, instructorId);

      return enrollment;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(`  ✗ Error in seedEnrollment for userId ${userId.toString()}, courseId ${courseId.toString()}:`, errorMessage);
      if (error && typeof error === 'object' && 'errors' in error) {
        // eslint-disable-next-line no-console
        console.error('  Validation errors:', JSON.stringify((error as { errors: unknown }).errors, null, 2));
      }
      throw error;
    }
  }

  private async seedAttendanceRecords(
    userId: Types.ObjectId,
    courseId: Types.ObjectId,
    organizationId: Types.ObjectId,
    instructorId?: Types.ObjectId,
    slot?: { _id: Types.ObjectId; dayOfWeek?: string }
  ): Promise<AttendanceSummary> {
    const emptySummary: AttendanceSummary = { totalClasses: 0, attended: 0, absent: 0, late: 0, excused: 0, percentage: 0 };
    if (!slot?.dayOfWeek) return emptySummary;

    // Past sessions on the slot's weekday (aligned to the derivation). Record most of them and
    // leave a few unrecorded so they appear as derived ABSENT in the student's history.
    const sessionDates = pastWeekdayDates(slot.dayOfWeek, ATTENDANCE_HISTORY_WINDOW_MS);
    if (sessionDates.length === 0) return emptySummary;

    const weights = [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED];
    const docs = sessionDates
      .filter(() => faker.datatype.boolean({ probability: 0.8 }))
      .map((date) => ({
        date,
        courseId,
        slotId: slot._id,
        studentId: userId,
        organizationId,
        status: faker.helpers.arrayElement(weights),
        notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : undefined,
        markedBy: instructorId ?? new Types.ObjectId(),
      }));

    if (docs.length > 0) await this.attendanceModel.insertMany(docs);

    let attended = 0;
    let late = 0;
    let excused = 0;
    for (const d of docs) {
      switch (d.status) {
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

    const totalClasses = sessionDates.length;
    const absent = totalClasses - docs.length; // unrecorded past sessions = derived absences
    const percentage = totalClasses > 0 ? Math.round(((attended + late) / totalClasses) * 1000) / 10 : 0;
    return { totalClasses, attended, absent, late, excused, percentage };
  }

  async seedEnrollmentsForStudents(students: User[], courses: Course[], organizationId: Types.ObjectId, instructors?: User[]) {
    // eslint-disable-next-line no-console
    console.log(`  Starting enrollment seeding: ${students.length} students, ${courses.length} courses`);

    if (students.length === 0 || courses.length === 0) {
      // eslint-disable-next-line no-console
      console.log('  ✗ No students or courses available, skipping enrollments...');
      return;
    }

    let enrollmentConfigIndex = 0;

    for (const student of students) {
      const existingEnrollments = await this.enrollmentModel.find({ userId: student._id, organizationId }).select('courseId').lean();

      const enrolledCourseIds = new Set(existingEnrollments.map((e) => e.courseId.toString()));
      const availableCourses = courses.filter((course) => !enrolledCourseIds.has(course._id.toString()));

      if (availableCourses.length === 0) continue;

      const cap = Math.min(availableCourses.length, 10);
      const enrollmentCount = faker.number.int({ min: Math.min(2, cap), max: cap });
      const shuffledCourses = [...availableCourses].toSorted(() => 0.5 - Math.random());

      for (let k = 0; k < enrollmentCount; k++) {
        const course = shuffledCourses[k];
        if (!course) break;

        const progressConfig = ENROLLMENT_CONFIG.enrollments[enrollmentConfigIndex % ENROLLMENT_CONFIG.enrollments.length];
        let subscription: SubscriptionTypeDef | undefined;
        let accessType: AccessType = AccessType.FREE;

        if (course.isPaid && course.pricing) {
          const preferredCycles = [BillingCycle.ONE_TIME, BillingCycle.MONTHLY, BillingCycle.YEARLY, BillingCycle.MONTHLY] as const;
          let billingCycle = faker.helpers.arrayElement(preferredCycles);
          let pricingDetails = course.pricing[billingCycle];
          if (!pricingDetails) {
            billingCycle = BillingCycle.ONE_TIME;
            pricingDetails = course.pricing[BillingCycle.ONE_TIME] ?? course.pricing[BillingCycle.MONTHLY] ?? course.pricing[BillingCycle.YEARLY];
          }

          if (pricingDetails) {
            const amount = pricingDetails.originalPrice ?? 0;
            const currency = pricingDetails.originalCurrency ?? Currency.EGP;

            if (faker.number.int({ min: 1, max: 100 }) <= 14) {
              accessType = AccessType.BY_ORGANIZATION;
              subscription = undefined;
            } else if (billingCycle === BillingCycle.ONE_TIME) {
              subscription = buildSubscription(student, amount, currency, BillingCycle.ONE_TIME);
              accessType = AccessType.PAID_ONCE;
            } else {
              subscription = buildSubscription(student, amount, currency, billingCycle);
              accessType = AccessType.SUBSCRIPTION;
            }
          }
        } else {
          accessType = AccessType.FREE;
          subscription = undefined;
        }

        try {
          const existingEnrollment = await this.enrollmentModel.findOne({ userId: student._id, courseId: course._id });
          if (existingEnrollment) {
            enrollmentConfigIndex++;
            continue;
          }

          const courseInstructorId = (course as { instructorId?: Types.ObjectId }).instructorId;
          const instructorId =
            courseInstructorId ?? (instructors && instructors.length > 0 ? faker.helpers.arrayElement(instructors)._id : undefined);

          // eslint-disable-next-line no-console
          console.log(`  Creating enrollment for student ${student.username} in course ${course.name}`);

          await this.seedEnrollment(student, course._id, organizationId, progressConfig.progressPercentage, subscription, accessType, instructorId);

          enrollmentConfigIndex++;
        } catch (error: unknown) {
          const errorObj = error as { code?: number; message?: string };
          if (errorObj.code === 11_000 || errorObj.message?.includes('duplicate key')) {
            // eslint-disable-next-line no-console
            console.log(`  Duplicate enrollment for student ${student.username} in course ${course.name}, skipping...`);
          } else {
            // eslint-disable-next-line no-console
            console.error(`  ✗ ERROR seeding enrollment for student ${student.username} in course ${course.name}:`, errorObj.message);
          }
          enrollmentConfigIndex++;
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log('  Enrollment seeding complete');
  }

  private async updateInstructorTotalStudents(course: Course, preferredInstructorId?: Types.ObjectId) {
    const instructorIds: Types.ObjectId[] = [];
    const courseInstructorId = (course as { instructorId?: Types.ObjectId }).instructorId;
    if (courseInstructorId) instructorIds.push(courseInstructorId);
    const coInstructors = (course as { coInstructorsIds?: Types.ObjectId[] }).coInstructorsIds ?? [];
    instructorIds.push(...coInstructors);

    if (instructorIds.length === 0 && preferredInstructorId) {
      instructorIds.push(preferredInstructorId);
    }

    if (instructorIds.length === 0) return;

    const bulkOps: Parameters<typeof this.userModel.bulkWrite>[0] = [];

    for (const instructorId of instructorIds) {
      const instructorCourses = await this.courseModel
        .find({ $or: [{ instructorId }, { coInstructorsIds: instructorId }] })
        .select('_id')
        .lean();
      const courseIds = instructorCourses.map((c) => c._id);

      if (courseIds.length === 0) continue;

      const uniqueStudents = await this.enrollmentModel.distinct('userId', { courseId: { $in: courseIds } });
      bulkOps.push({
        updateOne: {
          filter: { _id: instructorId },
          update: { $set: { totalStudents: uniqueStudents.length } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await this.userModel.bulkWrite(bulkOps);
    }
  }
}

function buildBaseEnrollmentData(
  userId: Types.ObjectId,
  courseId: Types.ObjectId,
  organizationId: Types.ObjectId,
  accessType: AccessType,
  subscription?: SubscriptionTypeDef
) {
  const enrolledAt = recentEnrolledAt();
  return {
    userId,
    courseId,
    organizationId,
    enrolledAt,
    accessType,
    ...(subscription ? { subscription } : {}),
    timeSpentMinutes: 0,
    lastAccessedAt: enrolledAt,
    progress: {
      completedModules: [],
      completedContents: [],
      completedCourses: [],
      submittedAssignments: [],
      submittedProjects: [],
      submittedQuizzes: [],
      attendedLiveSessions: [],
      assignmentSubmissions: [],
      quizSubmissions: [],
      contentTimeTracking: [],
    },
  };
}

function buildSubscription(student: User, amount: number, currency: Currency, billingCycle: BillingCycle): SubscriptionTypeDef {
  return {
    status: SubscriptionStatus.ACTIVE,
    starts_at: new Date(),
    next_billing: new Date(),
    reminder_days: 10,
    reminder_date: new Date(),
    ends_at: new Date(),
    resumed_at: new Date(),
    billing: {
      email: student.email,
      last_name: student.lastName,
      first_name: student.firstName,
      phone_number: student.phone,
      amount,
      currency,
      billingCycle,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
