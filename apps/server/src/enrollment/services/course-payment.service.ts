import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Currency, EnrollmentErrors, Roles } from '@darnozom/shared-types';
import { CourseService } from 'src/course/services/course/course.service';
import { PaymentMethodConfig } from 'src/billing/entities/payment-method-config.entity';
import { FileService } from 'src/file/file.service';
import { NotificationService } from 'src/notification/notification.service';
import { UserService } from 'src/user/services/user.service';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { SubscriptionTypeDef } from 'src/utils/types/Subscription.interface';
import { AccessType } from '../enum/accessType.enum';
import { CoursePaymentStatus, EnrollmentStatus } from '../enum/enrollmentStatus.enum';
import { CoursePayment } from '../entities/course-payment.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { SubmitCoursePaymentPayload } from '../dto/course-payment.dto';
import { EnrollmentService } from './enrollment.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const DUPLICATE_KEY = 11_000;

export interface CoursePaymentOptions {
  methods: { _id: string; key: string; label: string; fields: { key: string; label: string; type: string; value: string; order: number }[] }[];
  prices: Partial<Record<BillingCycle, { amount: number; currency: string }>>;
}

@Injectable()
export class CoursePaymentService {
  constructor(
    @InjectModel(CoursePayment.name) private readonly paymentModel: Model<CoursePayment>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(PaymentMethodConfig.name) private readonly configModel: Model<PaymentMethodConfig>,
    @InjectConnection() private readonly connection: Connection,
    private readonly courseService: CourseService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userService: UserService,
    private readonly fileService: FileService,
    private readonly notifications: NotificationService
  ) {}

  /** Price for a billing cycle in the course's own currency (what the student is told to transfer). */
  private async priceFor(courseId: string, billingCycle: BillingCycle) {
    const course = await this.courseService.assertStandalone(courseId);
    if (!course.isPaid) throw new BadRequestException(EnrollmentErrors.COURSE_IS_FREE);
    const currency = (course.pricing?.[billingCycle]?.originalCurrency ?? Currency.DEFAULT) as Currency;
    const { price } = await this.courseService.getCoursePrice({ courseId, billingCycle, currency });
    return { course, amount: price, currency };
  }

  /** What a student sees on the buy dialog: the org's enabled transfer methods + the course price per billing cycle. */
  async getOptions(courseId: string): Promise<CoursePaymentOptions> {
    const course = await this.courseService.assertStandalone(courseId);
    const configs = await this.configModel
      .find({ organizationId: course.organizationId, enabled: true })
      .lean<{ _id: Types.ObjectId; key: string; label: string; fields: CoursePaymentOptions['methods'][number]['fields'] }[]>()
      .exec();

    const prices: CoursePaymentOptions['prices'] = {};
    if (course.isPaid) {
      for (const cycle of Object.values(BillingCycle)) {
        if (!course.pricing?.[cycle]) continue;
        try {
          const { amount, currency } = await this.priceFor(courseId, cycle);
          prices[cycle] = { amount, currency };
        } catch {
          // cycle not purchasable — skip it
        }
      }
    }

    return {
      methods: configs.map((c) => ({ _id: String(c._id), key: c.key, label: c.label, fields: [...c.fields].sort((a, b) => a.order - b.order) })),
      prices,
    };
  }

  /**
   * Creates (or, after a rejection, re-submits) a pending enrollment + its payment.
   * No content access is granted until the organization approves.
   */
  async submit(userId: string, roleName: Roles, payload: SubmitCoursePaymentPayload) {
    if (![Roles.STUDENT, Roles.GUEST].includes(roleName)) throw new BadRequestException(EnrollmentErrors.MUST_BE_STUDENT_TO_ENROLL);
    const receiptFileKey = payload.receiptFileKey?.trim();
    if (!receiptFileKey) throw new BadRequestException(EnrollmentErrors.COURSE_PAYMENT_RECEIPT_REQUIRED);

    const { course, amount, currency } = await this.priceFor(payload.courseId, payload.billingCycle);

    const config = await this.configModel
      .findOne({ _id: oid(payload.paymentMethodConfigId), organizationId: course.organizationId, enabled: true })
      .lean<{ _id: Types.ObjectId; key: string; label: string }>()
      .exec();
    if (!config) throw new BadRequestException(EnrollmentErrors.COURSE_PAYMENT_METHOD_UNAVAILABLE);

    const existing = await this.enrollmentModel.findOne({ userId: oid(userId), courseId: oid(payload.courseId) });
    if (existing && existing.status !== EnrollmentStatus.PENDING_PAYMENT) {
      throw new ConflictException(EnrollmentErrors.ALREADY_ENROLLED);
    }

    const fields = {
      paymentMethodConfigId: config._id,
      methodSnapshot: { label: config.label, key: config.key },
      billingCycle: payload.billingCycle,
      amount,
      currency,
      receiptFileKey,
      status: CoursePaymentStatus.PENDING_REVIEW,
      rejectReason: null,
    };

    if (existing) {
      // Re-submission against the same pending enrollment (typically after a rejection).
      const payment = await this.paymentModel.findOneAndUpdate(
        { enrollmentId: existing._id, status: { $in: [CoursePaymentStatus.REJECTED, CoursePaymentStatus.PENDING_REVIEW] } },
        { $set: fields },
        { new: true }
      );
      if (!payment) throw new ConflictException(EnrollmentErrors.COURSE_PAYMENT_NOT_REVIEWABLE);
      return payment;
    }

    const now = new Date().toISOString();
    const user = await this.userService.findOne(userId);
    const subscription: SubscriptionTypeDef = {
      status: SubscriptionStatus.SUSPENDED,
      starts_at: now,
      createdAt: now,
      updatedAt: now,
      billing: {
        amount,
        currency,
        billingCycle: payload.billingCycle,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        phone_number: user.phone,
      },
    };

    let enrollment: Enrollment;
    try {
      enrollment = await this.enrollmentModel.create({
        userId: oid(userId),
        courseId: oid(payload.courseId),
        courseTitle: course.name,
        organizationId: course.organizationId,
        accessType: payload.billingCycle === BillingCycle.ONE_TIME ? AccessType.PAID_ONCE : AccessType.SUBSCRIPTION,
        subscription,
        status: EnrollmentStatus.PENDING_PAYMENT,
      });
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) throw new ConflictException(EnrollmentErrors.ALREADY_ENROLLED);
      throw error;
    }

    return this.paymentModel.create({
      organizationId: course.organizationId,
      userId: oid(userId),
      courseId: oid(payload.courseId),
      enrollmentId: enrollment._id,
      ...fields,
    });
  }

  /** The student's own course payments (to show "Under review" / rejection reason). */
  async listMine(userId: string) {
    return this.paymentModel
      .find({ userId: oid(userId) })
      .sort({ createdAt: -1 })
      .populate('course', 'name thumbnailKey')
      .lean()
      .exec();
  }

  async listForOrg(organizationId: string, filter?: { status?: CoursePaymentStatus; courseId?: string }) {
    const query: Record<string, unknown> = { organizationId: oid(organizationId) };
    if (filter?.status) query.status = filter.status;
    if (filter?.courseId) query.courseId = oid(filter.courseId);

    const rows = await this.paymentModel
      .find(query)
      .sort({ createdAt: 1 })
      .populate('user', 'firstName lastName email phone')
      .populate('course', 'name')
      .lean<(CoursePayment & { receiptUrl?: string })[]>()
      .exec();

    await Promise.all(
      rows.map(async (row) => {
        row.receiptUrl = await this.fileService.getFileUrl(row.receiptFileKey).catch(() => undefined);
      })
    );
    return rows;
  }

  private async load(organizationId: string, paymentId: string) {
    const payment = await this.paymentModel.findOne({ _id: oid(paymentId), organizationId: oid(organizationId) });
    if (!payment) throw new NotFoundException(EnrollmentErrors.COURSE_PAYMENT_NOT_FOUND);
    return payment;
  }

  /** Claim-then-activate: the status guard decides which reviewer owns the payment. */
  async approve(reviewerId: string, organizationId: string, paymentId: string) {
    const payment = await this.load(organizationId, paymentId);
    const claim = await this.paymentModel.updateOne(
      { _id: payment._id, status: CoursePaymentStatus.PENDING_REVIEW },
      { $set: { status: CoursePaymentStatus.APPROVED, reviewedBy: oid(reviewerId), reviewedAt: new Date() } }
    );
    if (claim.modifiedCount === 0) throw new ConflictException(EnrollmentErrors.COURSE_PAYMENT_NOT_REVIEWABLE);

    const course = await this.courseService.findOneById(String(payment.courseId));
    const now = new Date();
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const user = await this.userService.findOne(String(payment.userId));
      if (user.roleName === Roles.GUEST) await this.userService.promoteGuestToStudent(String(payment.userId), session);

      const endsAt = this.enrollmentService.calculateEndDate(payment.billingCycle);
      const activated = await this.enrollmentModel.updateOne(
        { _id: payment.enrollmentId, status: EnrollmentStatus.PENDING_PAYMENT },
        {
          $set: {
            status: EnrollmentStatus.ACTIVE,
            enrolledAt: now,
            'subscription.status': SubscriptionStatus.ACTIVE,
            'subscription.starts_at': now.toISOString(),
            'subscription.updatedAt': now.toISOString(),
            ...(endsAt ? { 'subscription.ends_at': endsAt } : {}),
          },
        },
        { session }
      );
      if (activated.modifiedCount > 0) await this.enrollmentService.incrementEnrollmentStats(course, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      // Release the claim so another reviewer can retry.
      await this.paymentModel.updateOne({ _id: payment._id }, { $set: { status: CoursePaymentStatus.PENDING_REVIEW, reviewedBy: null, reviewedAt: null } });
      throw error;
    } finally {
      await session.endSession();
    }

    await this.notifications.create({
      userId: String(payment.userId),
      titleKey: 'coursePaymentApprovedTitle',
      bodyKey: 'coursePaymentApprovedBody',
      params: { course: course.name },
      data: { courseId: String(payment.courseId) },
      relatedId: String(payment.enrollmentId),
      relatedModel: 'Enrollment',
    });
  }

  /** The enrollment stays PENDING_PAYMENT so the student can re-upload against the same payment. */
  async reject(reviewerId: string, organizationId: string, paymentId: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed) throw new BadRequestException(EnrollmentErrors.COURSE_PAYMENT_REJECT_REASON_REQUIRED);

    const payment = await this.load(organizationId, paymentId);
    const claim = await this.paymentModel.updateOne(
      { _id: payment._id, status: CoursePaymentStatus.PENDING_REVIEW },
      { $set: { status: CoursePaymentStatus.REJECTED, rejectReason: trimmed, reviewedBy: oid(reviewerId), reviewedAt: new Date() } }
    );
    if (claim.modifiedCount === 0) throw new ConflictException(EnrollmentErrors.COURSE_PAYMENT_NOT_REVIEWABLE);

    await this.notifications.create({
      userId: String(payment.userId),
      titleKey: 'coursePaymentRejectedTitle',
      bodyKey: 'coursePaymentRejectedBody',
      params: { reason: trimmed },
      data: { courseId: String(payment.courseId) },
      relatedId: String(payment.enrollmentId),
      relatedModel: 'Enrollment',
    });
  }
}
