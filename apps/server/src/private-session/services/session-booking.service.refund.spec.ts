import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Currency, PaymentMethod, PrivateSessionErrors } from '@lms-organization/shared-types';
import { SessionBookingService } from './session-booking.service';
import { BookingStatus } from '../enums/booking-status.enum';
import { RefundRequestStatus } from '../enums/refund-status.enum';

/**
 * Focused unit tests for the cancel-and-refund flow. The service has many
 * Mongoose/wallet dependencies with no existing test harness in this codebase,
 * so dependencies are hand-mocked here rather than pulled through Nest DI.
 */
describe('SessionBookingService refund flow', () => {
  const bookingId = new Types.ObjectId().toString();
  const studentId = new Types.ObjectId().toString();
  const instructorId = new Types.ObjectId().toString();
  const organizationId = new Types.ObjectId();
  const superAdminId = new Types.ObjectId();

  interface MockRefundRequest {
    requestedBy: Types.ObjectId;
    reason: string;
    status: RefundRequestStatus;
    respondedAt?: Date;
    rejectionReason?: string;
    refundedAmount?: number;
    refundedCurrency?: Currency;
  }

  function makeBooking(overrides: Record<string, unknown> = {}) {
    const base = {
      _id: new Types.ObjectId(bookingId),
      studentId: new Types.ObjectId(studentId),
      parentId: undefined as Types.ObjectId | undefined,
      instructorId: new Types.ObjectId(instructorId),
      organizationId,
      status: BookingStatus.CONFIRMED,
      paymentMethod: PaymentMethod.WALLET,
      paymentDetails: {
        paidAmount: 1000,
        currency: Currency.EGP,
        paidAt: new Date(),
        netAmount: 900,
      },
      refundRequest: undefined as MockRefundRequest | undefined,
      // eslint-disable-next-line unicorn/no-useless-undefined -- required by jest's mockResolvedValue<void> signature
      save: jest.fn().mockResolvedValue(undefined),
    };
    return { ...base, ...overrides } as typeof base;
  }

  function makeService(booking: ReturnType<typeof makeBooking>) {
    /* eslint-disable unicorn/no-useless-undefined -- required by jest's mockResolvedValue<void> signature */
    const mongoSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
    };

    const bookingModel = { findById: jest.fn().mockResolvedValue(booking) };
    const organizationModel = {
      findById: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue({ superAdminId }),
      }),
    };
    const connection = { startSession: jest.fn().mockResolvedValue(mongoSession) };
    const walletService = {
      debit: jest.fn().mockResolvedValue(undefined),
      credit: jest.fn().mockResolvedValue(undefined),
    };
    /* eslint-enable unicorn/no-useless-undefined */

    const service = new SessionBookingService(
      bookingModel as never,
      organizationModel as never,
      connection as never,
      {} as never,
      walletService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    return { service, bookingModel, organizationModel, walletService, mongoSession };
  }

  function pendingBooking() {
    return makeBooking({
      refundRequest: {
        requestedBy: new Types.ObjectId(studentId),
        reason: 'schedule conflict',
        status: RefundRequestStatus.PENDING,
      },
    });
  }

  describe('requestRefund', () => {
    it('rejects a non-payer', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);

      await expect(service.requestRefund({ bookingId, reason: 'changed my mind' }, instructorId)).rejects.toThrow(ForbiddenException);
    });

    it('rejects a non-confirmed booking', async () => {
      const booking = makeBooking({ status: BookingStatus.COMPLETED });
      const { service } = makeService(booking);

      await expect(service.requestRefund({ bookingId, reason: 'no longer needed' }, studentId)).rejects.toThrow(BadRequestException);
    });

    it('rejects a duplicate pending request', async () => {
      const booking = makeBooking({ refundRequest: { status: RefundRequestStatus.PENDING } });
      const { service } = makeService(booking);

      await expect(service.requestRefund({ bookingId, reason: 'again' }, studentId)).rejects.toThrow(PrivateSessionErrors.REFUND_ALREADY_PENDING);
    });

    it('records a pending refund request from the paying student', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);

      const result = await service.requestRefund({ bookingId, reason: 'schedule conflict' }, studentId);

      expect(booking.refundRequest).toMatchObject({ reason: 'schedule conflict', status: RefundRequestStatus.PENDING });
      expect(booking.save).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });

  describe('respondToRefund', () => {
    it('rejects a responder who is not the instructor', async () => {
      const booking = pendingBooking();
      const { service } = makeService(booking);

      await expect(service.respondToRefund({ bookingId, action: RefundRequestStatus.REJECTED }, studentId)).rejects.toThrow(ForbiddenException);
    });

    it('records rejection without moving money', async () => {
      const booking = pendingBooking();
      const { service, walletService } = makeService(booking);

      const result = await service.respondToRefund({ bookingId, action: RefundRequestStatus.REJECTED, rejectionReason: 'too late' }, instructorId);

      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(booking.refundRequest!.status).toBe(RefundRequestStatus.REJECTED);
      expect(booking.refundRequest!.rejectionReason).toBe('too late');
      expect(walletService.debit).not.toHaveBeenCalled();
      expect(walletService.credit).not.toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('reverses exactly the net amount credited at sale and refunds the full paid amount to the student', async () => {
      const booking = pendingBooking();
      const { service, walletService, mongoSession } = makeService(booking);

      await service.respondToRefund({ bookingId, action: RefundRequestStatus.APPROVED }, instructorId);

      expect(walletService.debit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: superAdminId.toString(),

          transactionDto: expect.objectContaining({ amount: 900, currency: Currency.EGP }),
        })
      );
      expect(walletService.credit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: studentId,

          transactionDto: expect.objectContaining({ amount: 1000, currency: Currency.EGP }),
        })
      );
      expect(booking.status).toBe(BookingStatus.REFUNDED);
      expect(booking.refundRequest!.status).toBe(RefundRequestStatus.APPROVED);
      expect(booking.refundRequest!.refundedAmount).toBe(1000);
      expect(mongoSession.commitTransaction).toHaveBeenCalled();
    });

    it('credits the parent wallet, not the student, when a parent paid', async () => {
      const parentId = new Types.ObjectId().toString();
      const booking = makeBooking({
        parentId: new Types.ObjectId(parentId),
        refundRequest: {
          requestedBy: new Types.ObjectId(parentId),
          reason: 'schedule conflict',
          status: RefundRequestStatus.PENDING,
        },
      });
      const { service, walletService } = makeService(booking);

      await service.respondToRefund({ bookingId, action: RefundRequestStatus.APPROVED }, instructorId);

      expect(walletService.credit).toHaveBeenCalledWith(expect.objectContaining({ userId: parentId }));
    });

    it('aborts the transaction and leaves the booking unchanged if the wallet debit fails', async () => {
      const booking = pendingBooking();
      const { service, walletService, mongoSession } = makeService(booking);
      walletService.debit.mockRejectedValueOnce(new Error('insufficient funds'));

      await expect(service.respondToRefund({ bookingId, action: RefundRequestStatus.APPROVED }, instructorId)).rejects.toThrow('insufficient funds');

      expect(mongoSession.abortTransaction).toHaveBeenCalled();
      expect(booking.status).toBe(BookingStatus.CONFIRMED);
    });

    it('throws when no refund request exists', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);

      await expect(service.respondToRefund({ bookingId, action: RefundRequestStatus.APPROVED }, instructorId)).rejects.toThrow(BadRequestException);
    });
  });
});
