import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SubscriptionTypeDef } from 'src/utils/types/Subscription.interface';
import { APPROVED_STATUSES, escapeRegex } from 'src/utils/approval.utils';
import { CourseService } from 'src/course/services/course/course.service';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Enrollment } from '../entities/enrollment.entity';
import mongoose, { Connection, Model, PaginateModel } from 'mongoose';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/services/user.service';
import { InstructorService } from 'src/user/services/instructor.service';
import { AccessType } from '../enum/accessType.enum';
import { WalletService } from 'src/wallet/wallet.service';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import {
  Currency,
  CourseMessages,
  EnrollmentErrors,
  PaymentMethod,
  PaymentPurpose,
  Roles,
  NotificationType,
  NotificationTextKey,
} from '@darnozom/shared-types';
import { PaginateOptionsWithSearch } from 'src/utils/types/PaginateOptionsWithSearch';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { Organization } from 'src/organization/entities/organization.entity';
import { CurrencyService } from 'src/currency/currency.service';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Course } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { SubmittedAnswer } from 'src/course/entities/quizSubmission.entity';
import { EnrollmentLeanForCertificate } from '../types';
import type { EnrollmentAssignmentSubmissionSnapshot, EnrollmentQuizSubmissionSnapshot } from '../entities/enrollment-submission-snapshots.embed';
import { NotificationService } from 'src/notification/notification.service';
import { ReviewService } from 'src/review/service/review.service';
import { QueryService } from 'src/database/query';
import { Subscription, SubscriptionDocument } from 'src/subscription/entities/subscription.entity';
import { Plan } from 'src/plan/entities/plan.entity';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly courseService: CourseService,
    private readonly reviewService: ReviewService,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private readonly queryService: QueryService,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: PaginateModel<Enrollment>,
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContent>,
    @InjectModel('CourseModule')
    private readonly courseModuleModel: Model<CourseModuleEntity>,
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly currencyService: CurrencyService,
    private readonly instructorService: InstructorService
  ) {}

  async delete(filters: mongoose.RootFilterQuery<Enrollment>, deletedById?: string | mongoose.Types.ObjectId | null) {
    const result = await this.enrollmentModel.updateOne(withNotDeletedFilter(filters as mongoose.FilterQuery<Enrollment>), {
      $set: buildSoftDeleteSet(deletedById),
    });
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  async updateAttendanceSummary(
    enrollmentId: string,
    summary: {
      totalClasses: number;
      attended: number;
      absent: number;
      late: number;
      excused: number;
      percentage: number;
    }
  ) {
    return this.enrollmentModel.findByIdAndUpdate(
      enrollmentId,
      {
        $set: {
          attendanceSummary: summary,
        },
      },
      { new: true }
    );
  }

  /**
   * Full quiz attempt snapshot on the enrollment (student history), including content / module / course titles.
   * Use the same transaction as pushing to `CourseContent.quizSubmissions`.
   */
  async recordQuizSubmissionSnapshot(
    enrollmentId: string,
    userId: string,
    contentId: string,
    submission: {
      studentId: mongoose.Types.ObjectId;
      studentName?: string;
      organizationId: mongoose.Types.ObjectId;
      score: number;
      submittedAt: Date;
      attemptNumber: number;
      timeTakenInSeconds?: number;
      feedback: string;
      answers: SubmittedAnswer[];
      integrityEvents?: { type: string; at: string; detail?: string }[];
    },
    session?: mongoose.ClientSession
  ): Promise<void> {
    const titles = await this.resolveContentHierarchyTitles(contentId, session);
    const enrollment = await this.enrollmentModel.findOne(
      {
        _id: new mongoose.Types.ObjectId(enrollmentId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      null,
      session ? { session } : {}
    );
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.assertContentMatchesEnrollment(titles.courseId, enrollment);
    this.ensureProgressSubmissionArrays(enrollment);
    const quizContentOid = new mongoose.Types.ObjectId(contentId);
    if (!Array.isArray(enrollment.progress.submittedQuizzes)) {
      enrollment.progress.submittedQuizzes = [];
    }
    const hasQuizId = enrollment.progress.submittedQuizzes.some((id) => id.toString() === contentId);
    if (!hasQuizId) {
      enrollment.progress.submittedQuizzes.push(quizContentOid);
    }
    const snapshot: EnrollmentQuizSubmissionSnapshot = {
      contentId: quizContentOid,
      contentTitle: titles.contentTitle,
      moduleTitle: titles.moduleTitle,
      courseTitle: titles.courseTitle,
      ...submission,
    };
    enrollment.progress.quizSubmissions.push(snapshot);
    await enrollment.save(session ? { session } : {});
  }

  /**
   * Assignment submission snapshot on the enrollment (+ titles). Same transaction as content `submissions` push.
   */
  async recordAssignmentSubmissionSnapshot(
    enrollmentId: string,
    userId: string,
    contentId: string,
    submission: {
      studentId: mongoose.Types.ObjectId;
      studentName: string;
      fileKey?: string;
      fileSizeBytes?: number;
      mimeType?: string;
      content?: string;
      submittedAt: Date;
      score?: number;
      feedback?: string;
    },
    session?: mongoose.ClientSession
  ): Promise<void> {
    const titles = await this.resolveContentHierarchyTitles(contentId, session);
    const enrollment = await this.enrollmentModel.findOne(
      {
        _id: new mongoose.Types.ObjectId(enrollmentId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      null,
      session ? { session } : {}
    );
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.assertContentMatchesEnrollment(titles.courseId, enrollment);
    this.ensureProgressSubmissionArrays(enrollment);
    const assignmentContentOid = new mongoose.Types.ObjectId(contentId);
    if (!Array.isArray(enrollment.progress.submittedAssignments)) {
      enrollment.progress.submittedAssignments = [];
    }
    const hasAssignmentId = enrollment.progress.submittedAssignments.some((id) => id.toString() === contentId);
    if (!hasAssignmentId) {
      enrollment.progress.submittedAssignments.push(assignmentContentOid);
    }
    const snapshot: EnrollmentAssignmentSubmissionSnapshot = {
      contentId: assignmentContentOid,
      contentTitle: titles.contentTitle,
      moduleTitle: titles.moduleTitle,
      courseTitle: titles.courseTitle,
      ...submission,
    };
    enrollment.progress.assignmentSubmissions.push(snapshot);
    await enrollment.save(session ? { session } : {});
  }

  private async resolveContentHierarchyTitles(
    contentId: string,
    session?: mongoose.ClientSession
  ): Promise<{ contentTitle: string; moduleTitle: string; courseTitle: string; courseId?: mongoose.Types.ObjectId }> {
    const contentQuery = this.courseContentModel.findById(contentId).select('title moduleId courseId');
    if (session) void contentQuery.session(session);
    const content = await contentQuery.lean<{
      title?: string;
      moduleId?: mongoose.Types.ObjectId;
      courseId?: mongoose.Types.ObjectId;
    } | null>();
    if (!content) throw new NotFoundException('Content not found');

    const modQuery = this.courseModuleModel.findById(content.moduleId).select('title');
    const crsQuery = this.courseModel.findById(content.courseId).select('name');
    if (session) {
      void modQuery.session(session);
      void crsQuery.session(session);
    }
    const [mod, crs] = await Promise.all([modQuery.lean<{ title?: string } | null>(), crsQuery.lean<{ name?: string } | null>()]);
    return {
      contentTitle: content.title ?? '',
      moduleTitle: mod?.title ?? '',
      courseTitle: crs?.name ?? '',
      courseId: content.courseId,
    };
  }

  /**
   * Guards against submitting to content that belongs to a different course than
   * the enrollment. A student holding any of their own enrollmentIds must not be
   * able to submit to (or snapshot) content in courses they are not enrolled in.
   */
  private assertContentMatchesEnrollment(contentCourseId: mongoose.Types.ObjectId | undefined, enrollment: Enrollment): void {
    if (contentCourseId && enrollment.courseId && contentCourseId.toString() !== enrollment.courseId.toString()) {
      throw new ForbiddenException('This content does not belong to the enrolled course');
    }
  }

  private ensureProgressSubmissionArrays(enrollment: Enrollment): void {
    if (!enrollment.progress) {
      enrollment.progress = {
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
      } as Enrollment['progress'];
    }
    if (!Array.isArray(enrollment.progress.quizSubmissions)) {
      enrollment.progress.quizSubmissions = [];
    }
    if (!Array.isArray(enrollment.progress.assignmentSubmissions)) {
      enrollment.progress.assignmentSubmissions = [];
    }
    if (!Array.isArray(enrollment.progress.submittedQuizzes)) {
      enrollment.progress.submittedQuizzes = [];
    }
    if (!Array.isArray(enrollment.progress.submittedAssignments)) {
      enrollment.progress.submittedAssignments = [];
    }
  }

  private isEnrollmentExpired(enrollment: Enrollment): boolean {
    const endsAt = enrollment.subscription?.ends_at;
    if (!endsAt) return false;
    return new Date(endsAt) < new Date();
  }

  /**
   * If the enrollment's subscription end date has passed and the status is still ACTIVE,
   * persist the status change to EXPIRED and return true. Otherwise return false.
   */
  async checkAndExpireEnrollment(enrollment: Enrollment): Promise<boolean> {
    if (!this.isEnrollmentExpired(enrollment)) return false;
    if (enrollment.subscription?.status === SubscriptionStatus.ACTIVE) {
      await this.enrollmentModel.updateOne({ _id: enrollment._id }, { $set: { 'subscription.status': SubscriptionStatus.EXPIRED } });
      enrollment.subscription.status = SubscriptionStatus.EXPIRED;
    }
    return true;
  }

  async getChildrenEnrollmentStatus(childIds: string[], courseId: string) {
    const enrollments = await this.enrollmentModel.find({
      courseId: new mongoose.Types.ObjectId(courseId),
      userId: { $in: childIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    // Batch-expire stale active enrollments in a single updateMany
    const now = new Date();
    const expiredIds = enrollments
      .filter((e) => e.subscription?.ends_at && new Date(e.subscription.ends_at) < now && e.subscription.status === SubscriptionStatus.ACTIVE)
      .map((e) => e._id);

    if (expiredIds.length > 0) {
      await this.enrollmentModel.updateMany({ _id: { $in: expiredIds } }, { $set: { 'subscription.status': SubscriptionStatus.EXPIRED } });
      // Reflect status change in local objects so the map below is accurate
      for (const enrollment of enrollments) {
        if (expiredIds.some((id: mongoose.Types.ObjectId) => id.toString() === enrollment._id?.toString())) {
          enrollment.subscription.status = SubscriptionStatus.EXPIRED;
        }
      }
    }

    const statusMap: Record<string, { enrolled: boolean; expired: boolean; enrollmentId?: string }> = {};
    for (const childId of childIds) {
      const enrollment = enrollments.find((e) => e.userId.toString() === childId);
      if (enrollment) {
        const isExpired =
          enrollment.subscription?.status === SubscriptionStatus.EXPIRED ||
          (enrollment.subscription?.ends_at && new Date(enrollment.subscription.ends_at) < now);
        statusMap[childId] = { enrolled: true, expired: !!isExpired, enrollmentId: enrollment._id?.toString() };
      } else {
        statusMap[childId] = { enrolled: false, expired: false };
      }
    }
    return statusMap;
  }

  async getEnrollmentByCourse(userId: string, courseId: string) {
    const enrollment = await this.enrollmentModel.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (enrollment) await this.checkAndExpireEnrollment(enrollment);
    return enrollment;
  }

  async getSingleEnrollmentWithoutCheck(userId: string, courseId: string) {
    return this.enrollmentModel.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async enrollUserToCourse(
    userId: string,
    courseId: string,
    accessType: AccessType = AccessType.SUBSCRIPTION,
    subscription?: SubscriptionTypeDef,
    session?: mongoose.ClientSession
  ) {
    const course = await this.courseService.findOneById(courseId);

    if (!APPROVED_STATUSES.includes(course.approvalStatus)) {
      throw new BadRequestException('Cannot enroll in a course that has not been approved');
    }

    const [createdEnrollment] = await this.enrollmentModel.create(
      [
        {
          userId: new mongoose.Types.ObjectId(userId),
          courseId: new mongoose.Types.ObjectId(courseId),
          courseTitle: (course as unknown as { name?: string }).name ?? '',
          organizationId: course.organizationId,
          accessType,
          subscription,
        },
      ],
      session ? { session } : {}
    );

    await this.courseModel.updateOne(
      { _id: new mongoose.Types.ObjectId(courseId) },
      { $inc: { 'stats.totalEnrollments': 1 } },
      session ? { session } : {}
    );

    await this.organizationModel.updateOne({ _id: course.organizationId }, { $inc: { 'stats.totalEnrollments': 1 } }, session ? { session } : {});

    if (course.instructorId) {
      void this.instructorService.update({ _id: new mongoose.Types.ObjectId(course.instructorId) }, { $inc: { totalStudents: 1 } });
    }
    if (course.coInstructorsIds) {
      for (const coInstructorId of course.coInstructorsIds) {
        void this.instructorService.update({ _id: new mongoose.Types.ObjectId(coInstructorId) }, { $inc: { totalStudents: 1 } });
      }
    }
    return createdEnrollment;
  }

  async getUserEnrollments(userId: string, options: PaginateOptionsWithSearch) {
    const result = await this.enrollmentModel.paginate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        ...options,
        populate: {
          path: 'course',
          populate: [{ path: 'categories' }, { path: 'instructor', select: 'firstName lastName email phone' }],
        },
      }
    );

    await Promise.all(result.docs.map((doc) => this.checkAndExpireEnrollment(doc)));

    const courseIds = [
      ...new Set(
        result.docs
          .map((doc) => {
            const c = (doc as unknown as { course?: { _id?: mongoose.Types.ObjectId } }).course;
            return c?._id ? c._id.toString() : undefined;
          })
          .filter(Boolean)
      ),
    ];
    const reviewsByCourseId = await this.reviewService.findUserCourseReviews(userId, courseIds.filter(Boolean) as string[]);
    for (const doc of result.docs) {
      const courseVal = doc.get('course') as
        (mongoose.Document & { _id?: mongoose.Types.ObjectId }) | { _id?: mongoose.Types.ObjectId } | null | undefined;
      if (!courseVal || !courseVal._id) continue;

      const review = reviewsByCourseId.get(courseVal._id.toString()) ?? null;
      // Populated Course is a Mongoose subdocument: arbitrary fields like userReview are stripped
      // from JSON unless merged into a plain object and set back on the enrollment doc.
      const plain =
        courseVal instanceof mongoose.Document
          ? (courseVal.toObject({ virtuals: true }) as Record<string, unknown>)
          : ({ ...courseVal } as Record<string, unknown>);
      plain.userReview = review;
      doc.set('course', plain);
    }

    return result;
  }

  async getOrganizationEnrollments(organizationId: string, options: PaginateOptionsWithSearch) {
    const { courseIds, search: _search, ...paginateOptions } = options;

    const query: Record<string, unknown> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    if (courseIds && courseIds.length > 0) {
      query.courseId = { $in: courseIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const result = await this.enrollmentModel.paginate(query, {
      ...paginateOptions,
      sort: paginateOptions.sort ?? { enrolledAt: -1 },
      populate: [
        {
          path: 'course',
          populate: {
            path: 'categories',
          },
        },
        {
          path: 'user',
        },
      ],
    });
    await Promise.all(result.docs.map((doc) => this.checkAndExpireEnrollment(doc)));

    const allowStudentProgress = await this.organizationHasStudentProgressTracking(organizationId);
    if (!allowStudentProgress) {
      const redactedDocs = result.docs.map((doc) => this.redactEnrollmentProgressForOrganizationList(doc));
      // Redacted rows are plain objects (toObject), not Mongoose Documents; RPC serialization matches either shape.
      return { ...result, docs: redactedDocs } as unknown as typeof result;
    }

    return result;
  }

  async getCourseEnrollments(courseId: string, organizationId: string, options: PaginateOptionsWithSearch) {
    const { search, ...paginateOptions } = options;

    const query: Record<string, unknown> = {
      courseId: new mongoose.Types.ObjectId(courseId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    if (search) {
      const escapedSearch = escapeRegex(search.trim());
      const matchingUserIds = await this.userModel
        .find({
          $or: [
            { firstName: { $regex: escapedSearch, $options: 'i' } },
            { lastName: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } },
          ],
        })
        .distinct('_id');
      query.userId = { $in: matchingUserIds };
    }

    return this.enrollmentModel.paginate(query, {
      ...paginateOptions,
      populate: [{ path: 'user', select: 'firstName lastName email avatar' }],
    });
  }

  async updateUserSubscription(userId: string, courseId: string, subscription: Partial<SubscriptionTypeDef>) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const enrollment = await this.enrollmentModel.findOne({ userId, courseId });
      const course = await this.courseService.findOneById(courseId);
      if (!enrollment) throw new NotFoundException('Enrollment not found');
      if (enrollment.accessType !== AccessType.SUBSCRIPTION) {
        throw new BadRequestException('This enrollment is not a subscription type');
      }
      enrollment.subscription = { ...enrollment.subscription, ...subscription };
      const billingCycle = enrollment.subscription.billing.billingCycle;

      if (course.isPaid) {
        const pricingDetails = billingCycle === BillingCycle.MONTHLY ? course.pricing.MONTHLY : course.pricing.YEARLY;
        if (!pricingDetails?.priceUSD) throw new BadRequestException('Course price not available for renewal');

        const basePrice = pricingDetails.priceUSD;
        const discountedPrice = this.applyCoursePricingDiscount(basePrice, pricingDetails);

        await this.walletService.debit({
          userId,
          purpose: PaymentPurpose.COURSE_PURCHASE,
          paymentMethod: PaymentMethod.WALLET,
          transactionDto: {
            amount: discountedPrice,
            currency: Currency.USD,
            description: `Subscription renewal for course ${course.name}`,
          },
          session,
        });

        const populatedCourse = await course.populate<{ organization: Organization }>('organization');
        const taxPercentage = await this.getOrgPlanTaxPercentage(populatedCourse.organization._id.toString());
        const taxAmount = +(discountedPrice * (taxPercentage / 100)).toFixed(2);
        const netAmount = +(discountedPrice - taxAmount).toFixed(2);

        await this.walletService.credit({
          userId: populatedCourse.organization.superAdminId.toString(),
          transactionDto: {
            amount: netAmount,
            currency: Currency.USD,
            description: `Subscription renewal revenue for course ${course.name} (after ${taxPercentage}% platform tax)`,
            metadata: {
              fees: String(taxAmount),
              netAmount: String(netAmount),
              taxPercentage: String(taxPercentage),
              grossAmount: String(discountedPrice),
            },
          },
          session,
        });
      }

      await enrollment.save({ session });
      await session.commitTransaction();
      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /** Applies active discount to a base price. Mirrors the server-side logic in getCoursePrice(). */
  private applyCoursePricingDiscount(
    basePrice: number,
    pricing: { discountPercentage?: number; discountStartDate?: Date; discountEndDate?: Date }
  ): number {
    if (!pricing.discountPercentage || pricing.discountPercentage <= 0) return basePrice;
    const now = new Date();
    if (pricing.discountStartDate && now < new Date(pricing.discountStartDate)) return basePrice;
    if (pricing.discountEndDate && now > new Date(pricing.discountEndDate)) return basePrice;
    return +(basePrice * (1 - pricing.discountPercentage / 100)).toFixed(2);
  }

  async getSingleEnrollment(enrollmentId: string, userId: string) {
    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  /**
   * Get certificate info for a completed enrollment. Returns issued flag, date, and optional display names.
   */
  async getCertificate(
    enrollmentId: string,
    userId: string
  ): Promise<{
    issued: boolean;
    issuedAt?: Date;
    certificateUrl?: string;
    studentName?: string;
    courseName?: string;
  }> {
    const enrollment = (await this.enrollmentModel
      .findOne({
        _id: new mongoose.Types.ObjectId(enrollmentId),
        userId: new mongoose.Types.ObjectId(userId),
      })
      .populate('user', 'firstName lastName')
      .populate('course', 'name')
      .lean()) as EnrollmentLeanForCertificate | null;
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    const cert = enrollment.certificate ?? { issued: false };
    const user = enrollment.user ?? null;
    const course = enrollment.course ?? null;
    return {
      issued: cert.issued ?? false,
      issuedAt: cert.issuedAt,
      certificateUrl: cert.certificateUrl,
      studentName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : undefined,
      courseName: course?.name,
    };
  }

  async getDetailedEnrolledCourse(enrollmentId: string, userId: string) {
    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.checkAndExpireEnrollment(enrollment);
    if (this.isEnrollmentExpired(enrollment)) {
      throw new ForbiddenException(EnrollmentErrors.ENROLLMENT_EXPIRED);
    }
    const course = await this.courseService.getCourseWithOrderedModulesAndContents(enrollment.courseId.toString(), undefined, true);
    await this.reviewService.attachUserReviewsToCourseTree(userId, course as unknown as Record<string, unknown>);
    return { data: { course, enrollment }, message: 'Course Retrieved' };
  }

  async toggleContentComplete(enrollmentId: string, userId: string, contentId: string, completed: boolean, session?: mongoose.ClientSession) {
    const enrollment = await this.enrollmentModel.findOne(
      {
        _id: new mongoose.Types.ObjectId(enrollmentId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      null,
      session ? { session } : {}
    );
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    const course = await this.courseService.getCourseWithOrderedModulesAndContents(enrollment.courseId.toString(), session, true);
    if (!course) throw new NotFoundException('Course not found');
    // Find the module that contains this content
    let targetModule: (CourseModuleEntity & { _id: mongoose.Types.ObjectId }) | null = null;
    let allContentIds: string[] = [];
    for (const module of course.modules) {
      const moduleContentIds = module.contents.map((content) => (content as CourseContent)._id.toString());
      if (moduleContentIds.includes(contentId)) {
        targetModule = module as unknown as CourseModuleEntity & { _id: mongoose.Types.ObjectId };
        allContentIds = moduleContentIds;
        break;
      }
    }
    if (!targetModule) {
      throw new NotFoundException('Content not found in any module');
    }
    if (!enrollment.progress) {
      enrollment.progress = {
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
      };
    }
    // Toggle content completion
    const contentIndex = enrollment.progress.completedContents.findIndex((id) => id.toString() === contentId);
    if (completed) {
      // Add content if not already completed
      if (contentIndex === -1) {
        enrollment.progress.completedContents.push(new mongoose.Types.ObjectId(contentId));
      }
      // Set completedAt in contentTimeTracking if present
      this.setContentCompletedAt(enrollment, contentId, new Date());
    } else {
      // Remove content if it exists
      if (contentIndex !== -1) {
        enrollment.progress.completedContents.splice(contentIndex, 1);
      }
      this.setContentCompletedAt(enrollment, contentId, null);
    }
    // Calculate module completion
    const completedContentsInModule = allContentIds.filter((id) =>
      enrollment.progress.completedContents.some((completedId) => completedId.toString() === id)
    );
    const moduleId = targetModule._id.toString();
    const moduleIndex = enrollment.progress.completedModules.findIndex((id) => id.toString() === moduleId);
    // If all contents in module are completed, mark module as complete
    if (completedContentsInModule.length === allContentIds.length && allContentIds.length > 0) {
      if (moduleIndex === -1) {
        enrollment.progress.completedModules.push(new mongoose.Types.ObjectId(moduleId));
      }
    } else {
      // If not all contents are completed, remove module from completed
      if (moduleIndex !== -1) {
        enrollment.progress.completedModules.splice(moduleIndex, 1);
      }
    }
    // Calculate course completion
    const allModuleIds = course.modules.map((module) => (module as unknown as CourseModuleEntity & { _id: mongoose.Types.ObjectId })._id.toString());
    const completedModulesInCourse = allModuleIds.filter((id) =>
      enrollment.progress.completedModules.some((completedId) => completedId.toString() === id)
    );
    const courseId = enrollment.courseId.toString();
    const courseIndex = enrollment.progress.completedCourses.findIndex((id) => id.toString() === courseId);
    // If all modules in course are completed, mark course as complete
    if (completedModulesInCourse.length === allModuleIds.length && allModuleIds.length > 0) {
      if (courseIndex === -1) {
        enrollment.progress.completedCourses.push(new mongoose.Types.ObjectId(courseId));
        const now = new Date();
        enrollment.completedAt = now;
        // Issue certificate when course is completed
        if (!enrollment.certificate?.issued) {
          enrollment.certificate = {
            issued: true,
            issuedAt: now,
            certificateUrl: '',
          };
          const courseName = (course as unknown as { name?: string }).name ?? 'Course';
          void this.notificationService.create({
            userId: enrollment.userId.toString(),
            titleKey: NotificationTextKey.COURSE_COMPLETED_TITLE,
            bodyKey: NotificationTextKey.COURSE_COMPLETED_BODY,
            params: { courseName },
            type: NotificationType.COURSE_COMPLETED,
            relatedId: courseId,
            relatedModel: 'Course',
          });
        }
      }
    } else {
      // If not all modules are completed, remove course from completed
      if (courseIndex !== -1) {
        enrollment.progress.completedCourses.splice(courseIndex, 1);
        // Clear completedAt timestamp when course is uncompleted
        // enrollment.completedAt = undefined;
      }
    }
    // Calculate progress percentage
    const allContents = course.modules.flatMap((module) => module.contents);
    enrollment.progressPercentage = Math.min(
      Math.round(allContents.length > 0 ? (enrollment.progress.completedContents.length / allContents.length) * 100 : 0),
      100
    );

    await enrollment.save(session ? { session } : {});

    return {
      message: CourseMessages.CONTENT_COMPLETION_TOGGLED_SUCCESSFULLY,
      isCourseCompleted: courseIndex !== -1 || (completedModulesInCourse.length === allModuleIds.length && allModuleIds.length > 0),
      completedModules: enrollment.progress.completedModules,
      completedContents: enrollment.progress.completedContents,
    };
  }

  async updateEnrollmentByOrg(filters: mongoose.RootFilterQuery<Enrollment>, enrollmentData: Partial<Enrollment>) {
    const update: Record<string, unknown> = {};
    // If subscription is being updated, merge nested fields instead of replacing
    if (enrollmentData.subscription) {
      for (const key in enrollmentData.subscription) {
        if (Object.prototype.hasOwnProperty.call(enrollmentData.subscription, key)) {
          update[`subscription.${key}`] = enrollmentData.subscription[key as keyof typeof enrollmentData.subscription];
        }
      }
    }
    // Include other top-level fields
    for (const key in enrollmentData) {
      if (key !== 'subscription' && Object.prototype.hasOwnProperty.call(enrollmentData, key)) {
        update[key] = enrollmentData[key as keyof Enrollment];
      }
    }
    const enrollment = await this.enrollmentModel.findOneAndUpdate(filters, { $set: update }, { new: true });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  private setContentCompletedAt(enrollment: Enrollment, contentId: string, completedAt: Date | null): void {
    const tracking = enrollment.progress?.contentTimeTracking || [];
    const item = tracking.find((t) => t.contentId && t.contentId.toString() === contentId);
    if (item) item.completedAt = completedAt;
  }

  calculateEndDate(billingCycle: BillingCycle): string | undefined {
    const now = new Date();
    switch (billingCycle) {
      case BillingCycle.MONTHLY: {
        now.setMonth(now.getMonth() + 1);
        break;
      }
      case BillingCycle.YEARLY: {
        now.setFullYear(now.getFullYear() + 1);
        break;
      }
      case BillingCycle.ONE_TIME: {
        return;
      }
    }
    return now.toISOString();
  }

  async enrollWithWallet(userId: string, courseId: string, billingCycle: BillingCycle = BillingCycle.ONE_TIME) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const user = await this.userService.findOne(userId);
      const userBalance = await this.walletService.getBalance(user.walletId.toString());
      const walletCurrency = await this.walletService.getWalletCurrency(user.walletId.toString());

      const { price, course } = await this.courseService.getCoursePrice({
        courseId: courseId,
        billingCycle,
        currency: walletCurrency,
      });

      // Wallet payment is instant success — promote GUEST to STUDENT atomically with the transaction.

      if (user.roleName === Roles.GUEST && userBalance.balance > price) {
        await this.userService.promoteGuestToStudent(userId, session);
      }

      let accessType: AccessType = AccessType.SUBSCRIPTION;
      if (!course.isPaid) {
        accessType = AccessType.FREE;
      }
      if (billingCycle === BillingCycle.ONE_TIME) {
        accessType = AccessType.PAID_ONCE;
      }

      const subscription: SubscriptionTypeDef = {
        status: SubscriptionStatus.ACTIVE,
        starts_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ends_at: this.calculateEndDate(billingCycle),
        billing: {
          amount: price,
          currency: walletCurrency,
          billingCycle: billingCycle,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          phone_number: user.phone,
        },
      };

      if (course.isPaid && price > 0) {
        // 1. Debit student first — fails fast if balance is insufficient.
        // When walletCurrency === course.originalCurrency the wallet service uses the exact
        // stored figure; otherwise it converts through USD internally.
        await this.walletService.debit({
          userId: user._id.toString(),
          purpose: PaymentPurpose.COURSE_PURCHASE,
          paymentMethod: PaymentMethod.WALLET,
          transactionDto: {
            amount: price,
            currency: walletCurrency,
            description: `Enrollment in course ${course.name}`,
          },
          session,
        });

        // 2. Credit org with net amount (price minus platform tax).
        // Amounts stay in walletCurrency; the wallet service converts to each wallet's own
        // currency internally, so no explicit USD conversion is needed here.
        const populatedCourse = await course.populate<{
          organization: Organization;
        }>('organization');

        const taxPercentage = await this.getOrgPlanTaxPercentage(populatedCourse.organization._id.toString());
        const taxAmount = +(price * (taxPercentage / 100)).toFixed(2);
        const netAmount = +(price - taxAmount).toFixed(2);

        await this.walletService.credit({
          userId: populatedCourse.organization.superAdminId.toString(),
          transactionDto: {
            amount: netAmount,
            currency: walletCurrency,
            description: `Enrollment revenue for course ${course.name} (after ${taxPercentage}% platform tax)`,
            metadata: {
              fees: String(taxAmount),
              netAmount: String(netAmount),
              taxPercentage: String(taxPercentage),
              grossAmount: String(price),
            },
          },
          session,
        });
      }

      // 3. Create enrollment only after all payment operations succeed
      const enrollment = await this.enrollUserToCourse(user._id.toString(), courseId, accessType, subscription, session);

      await session.commitTransaction();
      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async enrollChildWithParentWallet(parentId: string, childId: string, courseId: string, billingCycle: BillingCycle = BillingCycle.ONE_TIME) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const [parent, child] = await Promise.all([this.userService.findOne(parentId), this.userService.findOne(childId)]);

      const walletCurrency = await this.walletService.getWalletCurrency(parent.walletId.toString());
      const { price, course } = await this.courseService.getCoursePrice({
        courseId,
        billingCycle,
        currency: walletCurrency,
      });

      let accessType: AccessType = AccessType.SUBSCRIPTION;
      if (!course.isPaid) {
        accessType = AccessType.FREE;
      }
      if (billingCycle === BillingCycle.ONE_TIME) {
        accessType = AccessType.PAID_ONCE;
      }

      const subscription: SubscriptionTypeDef = {
        status: SubscriptionStatus.ACTIVE,
        starts_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ends_at: this.calculateEndDate(billingCycle),
        billing: {
          amount: price,
          currency: walletCurrency,
          billingCycle,
          email: parent.email,
          first_name: parent.firstName,
          last_name: parent.lastName,
          phone_number: parent.phone,
        },
      };

      if (course.isPaid && price > 0) {
        await this.walletService.debit({
          userId: parent._id.toString(),
          purpose: PaymentPurpose.COURSE_PURCHASE,
          paymentMethod: PaymentMethod.WALLET,
          transactionDto: {
            amount: price,
            currency: walletCurrency,
            description: `Parent enrollment for child ${child.username} in course ${course.name}`,
          },
          session,
        });

        const populatedCourse = await course.populate<{ organization: Organization }>('organization');
        const taxPercentage = await this.getOrgPlanTaxPercentage(populatedCourse.organization._id.toString());
        const taxAmount = +(price * (taxPercentage / 100)).toFixed(2);
        const netAmount = +(price - taxAmount).toFixed(2);

        await this.walletService.credit({
          userId: populatedCourse.organization.superAdminId.toString(),
          transactionDto: {
            amount: netAmount,
            currency: walletCurrency,
            description: `Enrollment revenue for course ${course.name} (parent-paid, after ${taxPercentage}% platform tax)`,
            metadata: {
              fees: String(taxAmount),
              netAmount: String(netAmount),
              taxPercentage: String(taxPercentage),
              grossAmount: String(price),
              parentId,
            },
          },
          session,
        });
      }

      const enrollment = await this.enrollUserToCourse(child._id.toString(), courseId, accessType, subscription, session);

      await session.commitTransaction();
      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Throws ForbiddenException if the enrollment is a SUBSCRIPTION type and its subscription
   * has expired (by date or by status). Also persists the EXPIRED status if it was still ACTIVE.
   * Safe to call from a guard — returns silently if the enrollment is not found (let the handler throw).
   */
  async assertEnrollmentIsActive(enrollmentId: string, userId: string): Promise<void> {
    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!enrollment) return; // missing enrollment — let the handler throw NotFoundException
    if (enrollment.accessType !== AccessType.SUBSCRIPTION) return; // FREE / PAID_ONCE never expires

    // Persist expiry status if needed (awaited — not fire-and-forget)
    const isExpired = await this.checkAndExpireEnrollment(enrollment);
    if (isExpired) {
      throw new ForbiddenException(EnrollmentErrors.ENROLLMENT_EXPIRED);
    }
  }

  /**
   * Asserts the user holds an active (non-expired) enrollment for the given
   * course. Used to gate direct-by-id content reads so an authenticated user
   * cannot fetch content from a course they never enrolled in (paywall bypass).
   * Returns the enrollment for callers that need it.
   */
  async assertActiveEnrollmentForCourse(courseId: string, userId: string): Promise<Enrollment> {
    if (!courseId || !userId || !mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ForbiddenException('You are not enrolled in this course');
    }
    const enrollment = await this.enrollmentModel.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }
    await this.assertEnrollmentIsActive(String(enrollment._id), userId);
    return enrollment;
  }

  /**
   * Renews an enrollment with wallet payment — debits student, credits org (after tax),
   * then updates the subscription period. Mirrors the initial enrollWithWallet flow.
   */
  async renewEnrollmentWithWallet(userId: string, enrollmentId: string, billingCycle: BillingCycle) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const enrollment = await this.enrollmentModel.findOne({
        _id: new mongoose.Types.ObjectId(enrollmentId),
        userId: new mongoose.Types.ObjectId(userId),
      });
      if (!enrollment) throw new NotFoundException('Enrollment not found');

      if (enrollment.accessType !== AccessType.SUBSCRIPTION) {
        throw new BadRequestException('Only subscription-type enrollments can be renewed');
      }

      // Enrollment must be expired to be renewed (prevent premature extension)
      const isExpired = this.isEnrollmentExpired(enrollment) || enrollment.subscription?.status === SubscriptionStatus.EXPIRED;
      if (!isExpired) {
        throw new BadRequestException('Enrollment is still active and cannot be renewed yet');
      }

      const user = await this.userService.findOne(userId);
      const walletCurrency = await this.walletService.getWalletCurrency(user.walletId.toString());

      const { price, course } = await this.courseService.getCoursePrice({
        courseId: enrollment.courseId.toString(),
        billingCycle,
        currency: walletCurrency,
      });

      if (course.isPaid && price > 0) {
        await this.walletService.debit({
          userId,
          purpose: PaymentPurpose.COURSE_PURCHASE,
          paymentMethod: PaymentMethod.WALLET,
          transactionDto: {
            amount: price,
            currency: walletCurrency,
            description: `Enrollment renewal for course ${course.name}`,
          },
          session,
        });

        const populatedCourse = await course.populate<{ organization: Organization }>('organization');
        const taxPercentage = await this.getOrgPlanTaxPercentage(populatedCourse.organization._id.toString());
        const taxAmount = +(price * (taxPercentage / 100)).toFixed(2);
        const netAmount = +(price - taxAmount).toFixed(2);

        await this.walletService.credit({
          userId: populatedCourse.organization.superAdminId.toString(),
          transactionDto: {
            amount: netAmount,
            currency: walletCurrency,
            description: `Enrollment renewal revenue for course ${course.name} (after ${taxPercentage}% platform tax)`,
            metadata: {
              fees: String(taxAmount),
              netAmount: String(netAmount),
              taxPercentage: String(taxPercentage),
              grossAmount: String(price),
            },
          },
          session,
        });
      }

      this.applyRenewalToEnrollment(enrollment, billingCycle, price, walletCurrency, user);

      await enrollment.save({ session });
      await session.commitTransaction();
      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Renews an enrollment after an external (non-wallet) payment has been confirmed.
   * Only updates the subscription period — does NOT handle payment.
   * Called from payment webhooks once a successful transaction is verified.
   */
  async renewEnrollmentAfterPayment(userId: string, enrollmentId: string, billingCycle: BillingCycle, paidAmount: number, currency: string) {
    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (enrollment.accessType !== AccessType.SUBSCRIPTION) {
      throw new BadRequestException('Only subscription-type enrollments can be renewed');
    }

    const user = await this.userService.findOne(userId);
    this.applyRenewalToEnrollment(enrollment, billingCycle, paidAmount, currency, user);

    await enrollment.save();
    return enrollment;
  }

  private applyRenewalToEnrollment(
    enrollment: Enrollment,
    billingCycle: BillingCycle,
    price: number,
    currency: string,
    user: { email: string; firstName: string; lastName: string; phone?: string }
  ): void {
    enrollment.subscription = {
      ...enrollment.subscription,
      status: SubscriptionStatus.ACTIVE,
      starts_at: new Date().toISOString(),
      ends_at: this.calculateEndDate(billingCycle),
      updatedAt: new Date().toISOString(),
      billing: {
        amount: price,
        currency,
        billingCycle,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        phone_number: user.phone,
      },
    };
  }

  /**
   * Active org subscription with populated plan, most recent by `startsAt`
   * (same selection as SubscriptionService.findActiveByOrganization).
   */
  private async findActiveOrgSubscription(organizationId: string): Promise<SubscriptionDocument | null> {
    const docs = await this.queryService.find<SubscriptionDocument>(
      Subscription.name,
      {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
      {
        limit: 1,
        sort: { startsAt: -1 },
        populate: 'plan',
      }
    );
    return docs[0] ?? null;
  }

  async getOrgPlanTaxPercentage(organizationId: string): Promise<number> {
    try {
      const subscription = await this.findActiveOrgSubscription(organizationId);
      if (!subscription) {
        this.logger.warn(`No active subscription found for org ${organizationId}; applying 0% tax`);
        return 0;
      }
      const plan = (subscription as unknown as { plan: Plan }).plan;
      if (!plan) {
        this.logger.warn(`Subscription for org ${organizationId} has no populated plan; applying 0% tax`);
        return 0;
      }
      return plan.taxPercentage ?? 0;
    } catch (error) {
      this.logger.error(`Failed to retrieve plan tax for org ${organizationId}: ${(error as Error).message}`, (error as Error).stack);
      return 0;
    }
  }

  /** True when the org has an active plan with `features.trackingStudentProgress`. */
  private async organizationHasStudentProgressTracking(organizationId: string): Promise<boolean> {
    try {
      const subscription = await this.findActiveOrgSubscription(organizationId);
      if (!subscription) return false;
      const plan = (subscription as unknown as { plan: Plan | null | undefined }).plan;
      return plan?.features?.trackingStudentProgress === true;
    } catch (error) {
      this.logger.error(`Failed to resolve student progress feature for org ${organizationId}: ${(error as Error).message}`, (error as Error).stack);
      return false;
    }
  }

  /** Strip progress fields from list payloads when the org plan does not include student progress tracking. */
  private redactEnrollmentProgressForOrganizationList(doc: Enrollment): Record<string, unknown> {
    const plain = doc.toObject({ virtuals: true }) as Record<string, unknown>;
    return {
      ...plain,
      progressPercentage: 0,
      timeSpentMinutes: 0,
      lastAccessedAt: undefined,
      progress: {
        completedModules: [],
        completedContents: [],
        quizScores: [],
        contentTimeTracking: [],
      },
    };
  }
}
