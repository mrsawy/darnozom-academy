import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { WalletService } from 'src/wallet/wallet.service';
import { EnrollmentService } from 'src/enrollment/services/enrollment.service';
import { CourseService } from 'src/course/services/course/course.service';
import { UserService } from 'src/user/services/user.service';
import { ProcessedWebhook, PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';
import { PrivateSessionErrors } from '@darnozom/shared-types';
import { AccessType } from 'src/enrollment/enum/accessType.enum';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { SubscriptionTypeDef } from 'src/utils/types/Subscription.interface';
import { Organization } from 'src/organization/entities/organization.entity';
import { PaymobWebhookTransaction } from '../types/transaction.interface';
import { PaymobWebhookMetadata } from '../types/paymob-webhook-metadata.interface';
import { SessionBookingService } from 'src/private-session/services/session-booking.service';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class PaymobWebhookService {
  private readonly logger = new Logger(PaymobWebhookService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly walletService: WalletService,
    private readonly enrollmentService: EnrollmentService,
    private readonly courseService: CourseService,
    private readonly userService: UserService,
    private readonly sessionBookingService: SessionBookingService,
    private readonly transactionService: TransactionService
  ) {}

  /**
   * Handle a successful Paymob course purchase webhook.
   *
   * Money arrives externally (card / Paymob wallet) so we do NOT debit the
   * student's or parent's LMS wallet.  We only credit the org (net of tax)
   * and create the enrollment – all inside a single Mongo session so the two
   * operations stay atomic.
   */
  async handleCoursePurchase(result: ProcessedWebhook, metadata: PaymobWebhookMetadata, rawBody: PaymobWebhookTransaction) {
    const { courseId, billingCycle, parentId, childId, userId } = metadata;
    const enrolleeUserId = childId ?? userId!;

    const accessType = billingCycle === BillingCycle.ONE_TIME ? AccessType.PAID_ONCE : AccessType.SUBSCRIPTION;
    const subscription = this.buildSubscription(billingCycle!, result, rawBody);

    const course = await this.courseService.findOneById(courseId!);
    const populated = await course.populate<{ organization: Organization }>('organization');
    const orgSuperAdminId = populated.organization.superAdminId.toString();
    const orgId = populated.organization._id.toString();

    const taxPercentage = await this.enrollmentService.getOrgPlanTaxPercentage(orgId);
    const taxAmount = +(result.amount * (taxPercentage / 100)).toFixed(2);
    const netAmount = +(result.amount - taxAmount).toFixed(2);

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      await this.walletService.credit({
        transactionDto: {
          amount: netAmount,
          currency: result.currency,
          reference: result.transactionId,
          description: `Course purchase revenue (after ${taxPercentage}% tax)${parentId ? ' – parent-initiated' : ''}`,
          metadata: {
            paymentProvider: PaymentProvider.PAYMOB,
            paymentTransactionId: result.transactionId,
            paymentStatus: String(result.status),
            fees: String(taxAmount),
            netAmount: String(netAmount),
            taxPercentage: String(taxPercentage),
            grossAmount: String(result.amount),
            ...this.stringifyMetadata(result.metadata),
          },
        },
        userId: orgSuperAdminId,
        session,
      });

      // Promote GUEST → STUDENT on confirmed payment success (idempotent for non-GUEST users).
      await this.userService.promoteGuestToStudent(enrolleeUserId, session);

      const enrollment = await this.enrollmentService.enrollUserToCourse(enrolleeUserId, courseId!, accessType, subscription, session);

      await session.commitTransaction();
      this.logger.log(`Enrolled user=${enrolleeUserId} to course=${courseId} via Paymob txn=${result.transactionId}`);
      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Handle a successful Paymob course renewal webhook.
   * Payment was already processed externally — just update the subscription period.
   */
  async handleEnrollmentRenewal(result: ProcessedWebhook, metadata: { userId: string; enrollmentId: string; billingCycle: BillingCycle }) {
    const { userId, enrollmentId, billingCycle } = metadata;
    const enrollment = await this.enrollmentService.renewEnrollmentAfterPayment(userId, enrollmentId, billingCycle, result.amount, result.currency);
    this.logger.log(`Enrollment renewal: enrollmentId=${enrollmentId} userId=${userId} txn=${result.transactionId}`);
    return enrollment;
  }

  /**
   * Handle a successful Paymob wallet top-up webhook.
   * Credits the user's LMS wallet with the paid amount.
   */
  async handleWalletCredit(result: ProcessedWebhook, userId: string) {
    this.logger.log(`Wallet top-up for user=${userId} via Paymob txn=${result.transactionId}`);
    return this.walletService.credit({
      transactionDto: {
        amount: result.amount,
        currency: result.currency,
        reference: result.transactionId,
        description: 'Wallet top-up via Paymob',
        metadata: {
          paymentProvider: PaymentProvider.PAYMOB,
          paymentTransactionId: result.transactionId,
          paymentStatus: result.status,
          ...result.metadata,
        },
      },
      userId,
      fromUserId: userId,
    });
  }

  /**
   * Handle a successful private session purchase webhook.
   * Creates the booking (deferred until payment) and credits org net of plan tax.
   */
  async handlePrivateSessionPurchase(result: ProcessedWebhook, metadata: PaymobWebhookMetadata) {
    const { sessionId, slotId, studentId, organizationId, parentId, payerUserId, notes, bookingId } = metadata;

    if (bookingId) {
      this.logger.warn(`Private session webhook used legacy bookingId=${bookingId} — migrate to sessionId+slotId; txn=${result.transactionId}`);
      return { received: true, success: false };
    }

    if (!sessionId || !slotId || !studentId || !organizationId) {
      this.logger.warn(
        `Private session webhook missing fields sessionId=${sessionId} slotId=${slotId} studentId=${studentId} org=${organizationId} txn=${result.transactionId}`
      );
      return { received: true, success: false };
    }

    const refundReference = `private-session-slot-full-refund-${result.transactionId}`;

    try {
      const booking = await this.sessionBookingService.createConfirmedBookingFromPaymobPayment({
        transactionId: result.transactionId,
        amount: result.amount,
        currency: result.currency,
        sessionId: String(sessionId),
        slotId: String(slotId),
        studentId: String(studentId),
        organizationId: String(organizationId),
        parentId: parentId ? String(parentId) : undefined,
        payerUserId: payerUserId ? String(payerUserId) : undefined,
        notes: notes ? String(notes) : undefined,
      });

      this.logger.log(`Private session booking=${String(booking._id)} created via Paymob txn=${result.transactionId}`);
      return { received: true, success: true, booking };
    } catch (error) {
      if (error instanceof BadRequestException && this.isBadRequestWithKey(error, PrivateSessionErrors.SLOT_CAPACITY_FULL)) {
        const existing = await this.transactionService.findByReference(refundReference);
        if (existing) {
          this.logger.warn(`Duplicate webhook: slot-full wallet refund already applied for txn=${result.transactionId}`);
          return { received: true, success: true, refundedDueToFullSlot: true, duplicate: true };
        }

        const payerId = payerUserId ? String(payerUserId) : parentId ? String(parentId) : String(studentId);

        await this.walletService.credit({
          transactionDto: {
            amount: result.amount,
            currency: result.currency,
            reference: refundReference,
            description: 'Refund: private session slot was full after card payment — credited to your LMS wallet',
            metadata: {
              paymentProvider: PaymentProvider.PAYMOB,
              originalTransactionId: result.transactionId,
              reason: 'SLOT_FULL_AFTER_PAYMENT',
            },
          },
          userId: payerId,
          fromUserId: payerId,
        });

        this.logger.warn(
          `Slot full after Paymob payment: credited LMS wallet refund user=${payerId} txn=${result.transactionId} amount=${result.amount} ${result.currency}`
        );
        return { received: true, success: true, refundedDueToFullSlot: true };
      }
      throw error;
    }
  }

  private isBadRequestWithKey(error: BadRequestException, key: string): boolean {
    const response = error.getResponse();
    if (typeof response === 'string') return response === key;
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const msg = (response as { message: string | string[] }).message;
      return Array.isArray(msg) ? msg[0] === key : msg === key;
    }
    return false;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildSubscription(billingCycle: BillingCycle, result: ProcessedWebhook, rawBody: PaymobWebhookTransaction): SubscriptionTypeDef {
    const billingData = rawBody.obj?.payment_key_claims?.billing_data ?? rawBody.obj?.billing_data;
    return {
      status: SubscriptionStatus.ACTIVE,
      starts_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ends_at: this.enrollmentService.calculateEndDate(billingCycle),
      billing: {
        email: billingData?.email ?? '',
        last_name: billingData?.last_name ?? '',
        first_name: billingData?.first_name ?? '',
        phone_number: billingData?.phone_number,
        amount: result.amount,
        currency: rawBody.obj?.currency ?? 'USD',
        billingCycle,
      },
    };
  }

  /** Converts all metadata values to strings (safe for transaction metadata storage). */
  private stringifyMetadata(metadata: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(Object.entries(metadata ?? {}).map(([k, v]) => [k, v == null ? '' : String(v)]));
  }
}
