import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { PaginateModel, PaginateOptions, Types, Connection } from 'mongoose';
import {
  BillingCycle,
  Currency,
  MeetingProvider,
  PaymentMethod,
  PaymentPurpose,
  PaymentProvider,
  PrivateSessionErrors,
  PrivateSessionSuccessMessages,
} from '@darnozom/shared-types';
import { SessionBooking } from '../entities/session-booking.entity';
import { PrivateSession, IAvailableSlot } from '../entities/private-session.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { RescheduleStatus } from '../enums/reschedule-status.enum';
import { RefundRequestStatus } from '../enums/refund-status.enum';
import { BookSessionDto } from '../dto/book-session.dto';
import { RescheduleRequestDto } from '../dto/reschedule-request.dto';
import { RespondRescheduleDto } from '../dto/respond-reschedule.dto';
import { RefundRequestDto } from '../dto/refund-request.dto';
import { RespondRefundDto } from '../dto/respond-refund.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { UserService } from 'src/user/services/user.service';
import { PaymentOrchestratorService } from 'src/payment/services/payment-orchestrator.service';
import { Organization } from 'src/organization/entities/organization.entity';
import { PrivateSessionService } from './private-session.service';
import { EnrollmentService } from 'src/enrollment/services/enrollment.service';
import { CurrencyService } from 'src/currency/currency.service';
import { buildSlotInstants, DEFAULT_SESSION_TIMEZONE, SlotInstants } from '../utils/session-time.util';

/**
 * Resolve a slot's absolute instants. Prefers the stored `startsAt/endsAt`;
 * falls back to computing from legacy wall-clock fields for un-migrated rows.
 */
function resolveSlotInstants(slot: IAvailableSlot): SlotInstants {
  if (slot.startsAt && slot.endsAt) {
    return { startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt), timezone: slot.timezone ?? DEFAULT_SESSION_TIMEZONE };
  }
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional fallback for pre-migration rows
  const dateStr = new Date(slot.date!).toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional fallback for pre-migration rows
  return buildSlotInstants(dateStr, slot.startTime!, slot.endTime!, slot.timezone);
}

@Injectable()
export class SessionBookingService {
  private readonly logger = new Logger(SessionBookingService.name);

  constructor(
    @InjectModel(SessionBooking.name)
    private readonly bookingModel: PaginateModel<SessionBooking>,
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @InjectConnection() private readonly connection: Connection,
    private readonly privateSessionService: PrivateSessionService,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    private readonly paymentOrchestratorService: PaymentOrchestratorService,
    private readonly enrollmentService: EnrollmentService,
    private readonly currencyService: CurrencyService
  ) {}

  async bookSession(dto: BookSessionDto, userId: string, organizationId: string) {
    const session = await this.privateSessionService.findActiveById(dto.sessionId);

    if (session.instructorId.toString() === userId) {
      throw new BadRequestException(PrivateSessionErrors.CANNOT_BOOK_OWN_SESSION);
    }

    // Resolve the chosen slot by its subdocument _id
    const slot = session.availableSlots.find((s) => s._id!.toString() === dto.slotId);
    if (!slot) {
      throw new BadRequestException(PrivateSessionErrors.INVALID_SLOT);
    }

    const studentId = dto.childId ?? userId;
    const parentId = dto.childId ? userId : undefined;

    const { startsAt } = resolveSlotInstants(slot);
    // Pre-checks (fast fail for UX). Capacity is re-checked inside the wallet
    // transaction / the Paymob webhook to prevent oversell under concurrency.
    await this.assertStudentSlotNotBooked(dto.sessionId, startsAt, studentId);
    await this.assertSlotHasCapacity(dto.sessionId, startsAt, slot.maxBookings);

    if (dto.paymentMethod === PaymentMethod.WALLET) {
      return this.bookWithWallet(session, slot, dto, studentId, organizationId, parentId);
    }

    return this.bookWithExternalProvider(session, slot, dto, userId, studentId, organizationId, parentId);
  }

  private async bookWithWallet(
    session: PrivateSession,
    slot: IAvailableSlot,
    dto: BookSessionDto,
    studentId: string,
    organizationId: string,
    parentId?: string
  ) {
    const mongoSession = await this.connection.startSession();
    mongoSession.startTransaction();

    try {
      const { startsAt, endsAt, timezone } = resolveSlotInstants(slot);
      // Re-check capacity inside the transaction to prevent oversell under
      // concurrent wallet bookings.
      await this.assertSlotHasCapacity(session._id.toString(), startsAt, slot.maxBookings, mongoSession);

      const payingUserId = parentId ?? studentId;
      const walletCurrency = await this.walletService.getWalletCurrency((await this.userService.findOne(payingUserId)).walletId.toString());

      const priceInWalletCurrency = this.convertSessionPrice(session, walletCurrency);

      const taxPercentage = await this.enrollmentService.getOrgPlanTaxPercentage(organizationId);
      const taxAmount = +(priceInWalletCurrency * (taxPercentage / 100)).toFixed(2);
      const netToOrg = +(priceInWalletCurrency - taxAmount).toFixed(2);

      await this.walletService.debit({
        userId: payingUserId,
        purpose: PaymentPurpose.PRIVATE_SESSION_PURCHASE,
        paymentMethod: PaymentMethod.WALLET,
        transactionDto: {
          amount: priceInWalletCurrency,
          currency: walletCurrency,
          description: `Private session: ${session.title}`,
        },
        session: mongoSession,
      });

      const org = await this.organizationModel.findById(organizationId);
      if (org) {
        await this.walletService.credit({
          userId: org.superAdminId.toString(),
          transactionDto: {
            amount: netToOrg,
            currency: walletCurrency,
            description: `Private session revenue (after ${taxPercentage}% plan tax): ${session.title}`,
            metadata: {
              fees: String(taxAmount),
              taxPercentage: String(taxPercentage),
              grossAmount: String(priceInWalletCurrency),
              netAmount: String(netToOrg),
            },
          },
          session: mongoSession,
        });
      }

      const bookingId = new Types.ObjectId();
      const slotProvider = slot.provider ?? MeetingProvider.EXTERNAL_URL;
      const agoraChannelName = slotProvider === MeetingProvider.AGORA ? `pvt-${bookingId.toString()}` : undefined;

      const booking = await this.bookingModel.create(
        [
          {
            _id: bookingId,
            sessionId: new Types.ObjectId(session._id.toString()),
            studentId: new Types.ObjectId(studentId),
            parentId: parentId ? new Types.ObjectId(parentId) : undefined,
            instructorId: session.instructorId,
            organizationId: new Types.ObjectId(organizationId),
            startsAt,
            endsAt,
            timezone,
            status: BookingStatus.CONFIRMED,
            paymentMethod: dto.paymentMethod,
            paymentDetails: {
              paidAmount: priceInWalletCurrency,
              currency: walletCurrency,
              paidAt: new Date(),
              netAmount: netToOrg,
            },
            provider: slotProvider,
            meetingLink: slotProvider === MeetingProvider.EXTERNAL_URL ? slot.meetingUrl : undefined,
            agoraChannelName,
            notes: dto.notes,
          },
        ],
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();

      return {
        message: PrivateSessionSuccessMessages.BOOKING_CONFIRMED,
        booking: booking[0],
      };
    } catch (error) {
      await mongoSession.abortTransaction();
      throw error;
    } finally {
      await mongoSession.endSession();
    }
  }

  private async bookWithExternalProvider(
    session: PrivateSession,
    slot: IAvailableSlot,
    dto: BookSessionDto,
    payingUserId: string,
    studentId: string,
    organizationId: string,
    parentId?: string
  ) {
    if (!dto.provider) {
      throw new BadRequestException(PrivateSessionErrors.PAYMENT_PROVIDER_REQUIRED);
    }

    const currency = dto.currency ?? session.pricing.currency;
    const amount = this.convertSessionPrice(session, currency);

    const user = await this.userService.findOne(payingUserId);

    const notesTrimmed = dto.notes && dto.notes.length > 0 ? dto.notes.slice(0, 500) : undefined;

    try {
      const paymentResponse = await this.paymentOrchestratorService.createPaymentUrl({
        provider: dto.provider,
        amount,
        currency: currency,
        user,
        purpose: PaymentPurpose.PRIVATE_SESSION_PURCHASE,
        method: dto.paymentMethod,
        billingCycle: BillingCycle.ONE_TIME,
        metadata: {
          sessionId: session._id.toString(),
          slotId: dto.slotId,
          studentId,
          organizationId,
          payerUserId: payingUserId,
          ...(parentId ? { parentId } : {}),
          ...(notesTrimmed ? { notes: notesTrimmed } : {}),
        },
      });

      return {
        message: PrivateSessionSuccessMessages.BOOKING_CREATED,
        paymentUrl: paymentResponse.paymentUrl,
      };
    } catch {
      throw new BadRequestException(PrivateSessionErrors.PAYMENT_CHECKOUT_FAILED ?? 'privateSessionPaymentCheckoutFailed');
    }
  }

  /**
   * Called from Paymob webhook after successful payment. Creates the booking only now (no orphan PENDING rows).
   * Credits org net of plan tax (same idea as course purchase).
   */
  async createConfirmedBookingFromPaymobPayment(args: {
    transactionId: string;
    amount: number;
    currency: Currency;
    sessionId: string;
    slotId: string;
    studentId: string;
    organizationId: string;
    parentId?: string;
    payerUserId?: string;
    notes?: string;
  }): Promise<SessionBooking> {
    const existing = await this.bookingModel.findOne({
      'paymentDetails.transactionId': args.transactionId,
    });
    if (existing) {
      return existing;
    }

    const session = await this.privateSessionService.findActiveById(args.sessionId);
    const slot = session.availableSlots.find((s) => s._id!.toString() === args.slotId);
    if (!slot) {
      throw new NotFoundException(PrivateSessionErrors.INVALID_SLOT);
    }

    const mongoSession = await this.connection.startSession();
    mongoSession.startTransaction();

    try {
      const { startsAt, endsAt, timezone } = resolveSlotInstants(slot);

      const confirmedCount = await this.countConfirmedForSlot(args.sessionId, startsAt, mongoSession);
      if (confirmedCount >= (slot.maxBookings ?? 1)) {
        this.logger.error(`Paymob txn=${args.transactionId}: slot full after payment — session=${args.sessionId} slot=${args.slotId}`);
        throw new BadRequestException(PrivateSessionErrors.SLOT_CAPACITY_FULL);
      }

      const taxPercentage = await this.enrollmentService.getOrgPlanTaxPercentage(args.organizationId);
      const taxAmount = +(args.amount * (taxPercentage / 100)).toFixed(2);
      const netAmount = +(args.amount - taxAmount).toFixed(2);

      const org = await this.organizationModel.findById(args.organizationId).session(mongoSession);
      if (!org) {
        throw new NotFoundException(PrivateSessionErrors.SESSION_NOT_FOUND);
      }

      await this.walletService.credit({
        transactionDto: {
          amount: netAmount,
          currency: args.currency,
          reference: args.transactionId,
          description: `Private session revenue (after ${taxPercentage}% plan tax)`,
          metadata: {
            paymentProvider: PaymentProvider.PAYMOB,
            paymentTransactionId: args.transactionId,
            fees: String(taxAmount),
            taxPercentage: String(taxPercentage),
            grossAmount: String(args.amount),
            netAmount: String(netAmount),
          },
        },
        userId: org.superAdminId.toString(),
        session: mongoSession,
      });

      await this.userService.promoteGuestToStudent(args.studentId, mongoSession);

      const bookingId = new Types.ObjectId();
      const slotProvider = slot.provider ?? MeetingProvider.EXTERNAL_URL;
      const agoraChannelName = slotProvider === MeetingProvider.AGORA ? `pvt-${bookingId.toString()}` : undefined;

      const bookingArr = await this.bookingModel.create(
        [
          {
            _id: bookingId,
            sessionId: new Types.ObjectId(args.sessionId),
            studentId: new Types.ObjectId(args.studentId),
            parentId: args.parentId ? new Types.ObjectId(args.parentId) : undefined,
            instructorId: session.instructorId,
            organizationId: new Types.ObjectId(args.organizationId),
            startsAt,
            endsAt,
            timezone,
            status: BookingStatus.CONFIRMED,
            paymentMethod: PaymentMethod.DIRECT,
            paymentDetails: {
              paidAmount: args.amount,
              currency: args.currency,
              paidAt: new Date(),
              transactionId: args.transactionId,
              netAmount,
            },
            provider: slotProvider,
            meetingLink: slotProvider === MeetingProvider.EXTERNAL_URL ? slot.meetingUrl : undefined,
            agoraChannelName,
            notes: args.notes ?? '',
          },
        ],
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
      return bookingArr[0];
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      await mongoSession.endSession();
    }
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<{ message: string }> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException(PrivateSessionErrors.BOOKING_NOT_FOUND);

    const isParticipant =
      booking.studentId.toString() === userId || booking.instructorId.toString() === userId || booking.parentId?.toString() === userId;

    if (!isParticipant) throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);

    const isStudentOrParent = booking.studentId.toString() === userId || booking.parentId?.toString() === userId;
    if (isStudentOrParent && booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException(PrivateSessionErrors.STUDENT_CANNOT_CANCEL_CONFIRMED);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(PrivateSessionErrors.BOOKING_ALREADY_CANCELLED);
    }
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(PrivateSessionErrors.BOOKING_ALREADY_COMPLETED);
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = reason ?? '';
    booking.cancelledBy = new Types.ObjectId(userId);
    booking.cancelledAt = new Date();

    await booking.save();
    return { message: PrivateSessionSuccessMessages.BOOKING_CANCELLED };
  }

  /**
   * Resolve the DTO's requested new time to a real, future `PrivateSession.availableSlots`
   * entry of the same session. Prefers `newSlotId`; falls back to matching legacy
   * date/time fields against the session's slots for clients not yet on the slot picker
   * (design Phase 3). Never trusts freeform date/time as-is — it must match a real slot.
   */
  private resolveRescheduleSlot(session: PrivateSession, dto: RescheduleRequestDto, fallbackTimezone: string): IAvailableSlot {
    const now = new Date();

    if (dto.newSlotId) {
      const slot = session.availableSlots.find((s) => s._id!.toString() === dto.newSlotId);
      if (slot && resolveSlotInstants(slot).startsAt > now) return slot;
      throw new BadRequestException(PrivateSessionErrors.RESCHEDULE_SLOT_UNAVAILABLE);
    }

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional fallback for clients not yet on the slot picker (Phase 3)
    if (dto.newScheduledDate && dto.newStartTime && dto.newEndTime) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- see above
      const dateStr = dto.newScheduledDate.toISOString().slice(0, 10);
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- see above
      const requested = buildSlotInstants(dateStr, dto.newStartTime, dto.newEndTime, fallbackTimezone);
      const match = session.availableSlots.find((s) => {
        const instants = resolveSlotInstants(s);
        return instants.startsAt.getTime() === requested.startsAt.getTime() && instants.endsAt.getTime() === requested.endsAt.getTime();
      });
      if (match && resolveSlotInstants(match).startsAt > now) return match;
    }

    throw new BadRequestException(PrivateSessionErrors.RESCHEDULE_SLOT_UNAVAILABLE);
  }

  async requestReschedule(dto: RescheduleRequestDto, userId: string, userRole: string) {
    const booking = await this.bookingModel.findById(dto.bookingId);
    if (!booking) throw new NotFoundException(PrivateSessionErrors.BOOKING_NOT_FOUND);

    const isParticipant =
      booking.studentId.toString() === userId || booking.instructorId.toString() === userId || booking.parentId?.toString() === userId;

    if (!isParticipant) throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(PrivateSessionErrors.BOOKING_NOT_CONFIRMED);
    }

    if (booking.rescheduleRequest && booking.rescheduleRequest.status === RescheduleStatus.PENDING) {
      throw new BadRequestException(PrivateSessionErrors.RESCHEDULE_ALREADY_PENDING);
    }

    const session = await this.privateSessionService.findById(booking.sessionId.toString());
    const slot = this.resolveRescheduleSlot(session, dto, booking.timezone);
    const instants = resolveSlotInstants(slot);

    // Fast fail for UX; re-checked again at approval time to guard concurrency.
    await this.assertSlotHasCapacity(booking.sessionId.toString(), instants.startsAt, slot.maxBookings);

    booking.rescheduleRequest = {
      requestedBy: new Types.ObjectId(userId),
      requestedByRole: userRole,
      newSlotId: slot._id!,
      newStartsAt: instants.startsAt,
      newEndsAt: instants.endsAt,
      newTimezone: instants.timezone,
      reason: dto.reason,
      status: RescheduleStatus.PENDING,
    };

    await booking.save();
    return { message: PrivateSessionSuccessMessages.RESCHEDULE_REQUESTED, booking };
  }

  async respondToReschedule(dto: RespondRescheduleDto, userId: string) {
    const booking = await this.bookingModel.findById(dto.bookingId);
    if (!booking) throw new NotFoundException(PrivateSessionErrors.BOOKING_NOT_FOUND);

    if (!booking.rescheduleRequest || booking.rescheduleRequest.status !== RescheduleStatus.PENDING) {
      throw new BadRequestException(PrivateSessionErrors.RESCHEDULE_NOT_FOUND);
    }

    if (booking.rescheduleRequest.requestedBy.toString() === userId) {
      throw new BadRequestException(PrivateSessionErrors.CANNOT_RESPOND_OWN_REQUEST);
    }

    const isParticipant =
      booking.studentId.toString() === userId || booking.instructorId.toString() === userId || booking.parentId?.toString() === userId;

    if (!isParticipant) throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);

    booking.rescheduleRequest.status = dto.action;
    booking.rescheduleRequest.respondedAt = new Date();

    if (dto.action === RescheduleStatus.APPROVED) {
      const { newSlotId, newStartsAt, newEndsAt, newTimezone } = booking.rescheduleRequest;

      // Re-check the slot still exists and has capacity at approval time — the request
      // may have sat pending long enough for the slot to fill or be removed.
      const session = await this.privateSessionService.findById(booking.sessionId.toString());
      const slot = session.availableSlots.find((s) => s._id!.toString() === newSlotId.toString());
      if (!slot || resolveSlotInstants(slot).startsAt <= new Date()) {
        throw new BadRequestException(PrivateSessionErrors.RESCHEDULE_SLOT_UNAVAILABLE);
      }
      await this.assertSlotHasCapacity(booking.sessionId.toString(), newStartsAt, slot.maxBookings);

      booking.startsAt = newStartsAt;
      booking.endsAt = newEndsAt;
      booking.timezone = newTimezone;

      const slotProvider = slot.provider ?? MeetingProvider.EXTERNAL_URL;
      booking.provider = slotProvider;
      booking.meetingLink = slotProvider === MeetingProvider.EXTERNAL_URL ? slot.meetingUrl : undefined;
      if (slotProvider === MeetingProvider.AGORA && !booking.agoraChannelName) {
        booking.agoraChannelName = `pvt-${booking._id.toString()}`;
      }

      await booking.save();
      return { message: PrivateSessionSuccessMessages.RESCHEDULE_APPROVED, booking };
    }

    booking.rescheduleRequest.rejectionReason = dto.rejectionReason;
    await booking.save();
    return { message: PrivateSessionSuccessMessages.RESCHEDULE_REJECTED, booking };
  }

  /**
   * Student/parent requests a cancel-and-refund. No self-refund and no automatic
   * window — the instructor must approve every request (design §3.2).
   */
  async requestRefund(dto: RefundRequestDto, userId: string) {
    const booking = await this.bookingModel.findById(dto.bookingId);
    if (!booking) throw new NotFoundException(PrivateSessionErrors.BOOKING_NOT_FOUND);

    const isPayer = booking.studentId.toString() === userId || booking.parentId?.toString() === userId;
    if (!isPayer) throw new ForbiddenException(PrivateSessionErrors.ONLY_STUDENT_CAN_REQUEST_REFUND);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(PrivateSessionErrors.REFUND_NOT_ALLOWED);
    }

    if (booking.refundRequest && booking.refundRequest.status === RefundRequestStatus.PENDING) {
      throw new BadRequestException(PrivateSessionErrors.REFUND_ALREADY_PENDING);
    }

    booking.refundRequest = {
      requestedBy: new Types.ObjectId(userId),
      reason: dto.reason,
      status: RefundRequestStatus.PENDING,
    };

    await booking.save();
    return { message: PrivateSessionSuccessMessages.REFUND_REQUESTED, booking };
  }

  /** Instructor approves or rejects a pending refund request. */
  async respondToRefund(dto: RespondRefundDto, userId: string) {
    const booking = await this.bookingModel.findById(dto.bookingId);
    if (!booking) throw new NotFoundException(PrivateSessionErrors.BOOKING_NOT_FOUND);

    if (!booking.refundRequest || booking.refundRequest.status !== RefundRequestStatus.PENDING) {
      throw new BadRequestException(PrivateSessionErrors.REFUND_REQUEST_NOT_FOUND);
    }

    if (booking.instructorId.toString() !== userId) {
      throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);
    }
    if (booking.refundRequest.requestedBy.toString() === userId) {
      throw new BadRequestException(PrivateSessionErrors.CANNOT_RESPOND_OWN_REFUND);
    }

    if (dto.action === RefundRequestStatus.REJECTED) {
      booking.refundRequest.status = RefundRequestStatus.REJECTED;
      booking.refundRequest.respondedAt = new Date();
      booking.refundRequest.rejectionReason = dto.rejectionReason;
      await booking.save();
      return { message: PrivateSessionSuccessMessages.REFUND_REJECTED, booking };
    }

    return this.approveRefund(booking);
  }

  /**
   * Reverses exactly the wallet credited at sale (traceable via `paymentDetails.netAmount`)
   * and credits the payer back the full amount they paid. The plan-tax portion is not
   * separately reversed — it is absorbed as a cost of the refund (see design §7 risk).
   */
  private async approveRefund(booking: SessionBooking) {
    if (!booking.paymentDetails) {
      throw new BadRequestException(PrivateSessionErrors.REFUND_NOT_ALLOWED);
    }

    const mongoSession = await this.connection.startSession();
    mongoSession.startTransaction();

    try {
      const { paidAmount, currency, netAmount } = booking.paymentDetails;

      const org = await this.organizationModel.findById(booking.organizationId).session(mongoSession);
      if (!org) throw new NotFoundException(PrivateSessionErrors.SESSION_NOT_FOUND);

      await this.walletService.debit({
        userId: org.superAdminId.toString(),
        purpose: PaymentPurpose.PRIVATE_SESSION_PURCHASE,
        paymentMethod: booking.paymentMethod,
        transactionDto: {
          amount: netAmount ?? paidAmount,
          currency,
          description: `Refund reversal: private session booking ${booking._id.toString()}`,
        },
        session: mongoSession,
      });

      const payingUserId = (booking.parentId ?? booking.studentId).toString();
      await this.walletService.credit({
        userId: payingUserId,
        transactionDto: {
          amount: paidAmount,
          currency,
          description: `Refund: private session booking ${booking._id.toString()}`,
        },
        session: mongoSession,
      });

      booking.status = BookingStatus.REFUNDED;
      booking.cancellationReason = booking.refundRequest.reason;
      booking.cancelledBy = booking.refundRequest.requestedBy;
      booking.cancelledAt = new Date();
      booking.refundRequest.status = RefundRequestStatus.APPROVED;
      booking.refundRequest.respondedAt = new Date();
      booking.refundRequest.refundedAmount = paidAmount;
      booking.refundRequest.refundedCurrency = currency;

      await booking.save({ session: mongoSession });
      await mongoSession.commitTransaction();

      return { message: PrivateSessionSuccessMessages.REFUND_APPROVED, booking };
    } catch (error) {
      await mongoSession.abortTransaction();
      throw error;
    } finally {
      await mongoSession.endSession();
    }
  }

  async getBookingsForStudent(studentId: string, organizationId: string, options: PaginateOptions = {}) {
    return this.bookingModel.paginate(
      {
        $or: [{ studentId: new Types.ObjectId(studentId) }, { parentId: new Types.ObjectId(studentId) }],
        organizationId: new Types.ObjectId(organizationId),
      },
      {
        ...options,
        populate: [
          { path: 'session', select: 'title duration sessionType location thumbnailKey' },
          { path: 'instructor', select: 'firstName lastName email profile' },
        ],
        sort: options.sort ?? { startsAt: -1 },
      }
    );
  }

  async getBookingsForInstructor(instructorId: string, organizationId: string, options: PaginateOptions = {}) {
    return this.bookingModel.paginate(
      {
        instructorId: new Types.ObjectId(instructorId),
        organizationId: new Types.ObjectId(organizationId),
      },
      {
        ...options,
        populate: [
          { path: 'session', select: 'title duration sessionType location' },
          { path: 'student', select: 'firstName lastName email profile' },
          { path: 'parent', select: 'firstName lastName email' },
        ],
        sort: options.sort ?? { startsAt: 1 },
      }
    );
  }

  async markAsCompleted(bookingId: string, instructorId: string): Promise<{ message: string }> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException(PrivateSessionErrors.BOOKING_NOT_FOUND);
    if (booking.instructorId.toString() !== instructorId) {
      throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(PrivateSessionErrors.BOOKING_NOT_CONFIRMED);
    }

    booking.status = BookingStatus.COMPLETED;
    await booking.save();
    return { message: PrivateSessionSuccessMessages.BOOKING_COMPLETED };
  }

  async markAsNoShow(bookingId: string, instructorId: string): Promise<{ message: string }> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException(PrivateSessionErrors.BOOKING_NOT_FOUND);
    if (booking.instructorId.toString() !== instructorId) {
      throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);
    }

    booking.status = BookingStatus.NO_SHOW;
    await booking.save();
    return { message: PrivateSessionSuccessMessages.NO_SHOW_MARKED };
  }

  /** Filter matching every booking for one slot instant of a session. */
  private slotBookingFilter(sessionId: string, startsAt: Date) {
    return { sessionId: new Types.ObjectId(sessionId), startsAt };
  }

  /** Count confirmed (capacity-consuming) bookings for a slot instant. */
  private async countConfirmedForSlot(sessionId: string, startsAt: Date, mongoSession?: mongoose.ClientSession): Promise<number> {
    const query = this.bookingModel.countDocuments({
      ...this.slotBookingFilter(sessionId, startsAt),
      status: BookingStatus.CONFIRMED,
    });
    return mongoSession ? query.session(mongoSession) : query;
  }

  private async assertSlotHasCapacity(sessionId: string, startsAt: Date, maxBookings?: number, mongoSession?: mongoose.ClientSession) {
    const count = await this.countConfirmedForSlot(sessionId, startsAt, mongoSession);
    if (count >= (maxBookings ?? 1)) {
      throw new BadRequestException(PrivateSessionErrors.SLOT_CAPACITY_FULL);
    }
  }

  private async assertStudentSlotNotBooked(sessionId: string, startsAt: Date, studentId: string, mongoSession?: mongoose.ClientSession) {
    const query = this.bookingModel.findOne({
      ...this.slotBookingFilter(sessionId, startsAt),
      studentId: new Types.ObjectId(studentId),
      status: { $nin: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
    });
    const existing = mongoSession ? await query.session(mongoSession) : await query;
    if (existing) throw new BadRequestException(PrivateSessionErrors.SLOT_ALREADY_BOOKED);
  }

  async getSlotAvailability(sessionId: string) {
    const session = await this.privateSessionService.findActiveById(sessionId);

    const now = new Date();

    const slotsWithInstants = session.availableSlots
      .map((slot) => ({ slot, instants: resolveSlotInstants(slot) }))
      .filter(({ instants }) => instants.startsAt >= now);

    return Promise.all(
      slotsWithInstants.map(async ({ slot, instants }) => {
        const currentBookings = await this.countConfirmedForSlot(sessionId, instants.startsAt);
        const maxBookings = slot.maxBookings ?? 1;

        return {
          slotId: slot._id!.toString(),
          startsAt: instants.startsAt,
          endsAt: instants.endsAt,
          timezone: instants.timezone,
          maxBookings,
          currentBookings,
          isAvailable: currentBookings < maxBookings,
        };
      })
    );
  }

  private convertSessionPrice(session: PrivateSession, targetCurrency: Currency): number {
    if (session.pricing.currency === targetCurrency) return session.pricing.price;
    // Convert through USD using live rates so the student is charged the true
    // equivalent in the target currency (not the raw USD number).
    const usd = session.pricing.priceUSD ?? this.currencyService.convertToUSD(session.pricing.price, session.pricing.currency);
    return +this.currencyService.convertFromUSD(usd, targetCurrency).toFixed(2);
  }
}
