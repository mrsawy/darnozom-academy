import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MeetingProvider, PrivateSessionErrors } from '@darnozom/shared-types';
import { SessionBookingService } from './session-booking.service';
import { BookingStatus } from '../enums/booking-status.enum';
import { RescheduleStatus } from '../enums/reschedule-status.enum';

/**
 * Focused unit tests for reschedule hardening: the requested new time must resolve to a
 * real, future, available slot of the same session, and capacity is re-checked on approval.
 * Dependencies are hand-mocked — see session-booking.service.refund.spec.ts for rationale.
 */
describe('SessionBookingService reschedule hardening', () => {
  const bookingId = new Types.ObjectId().toString();
  const sessionId = new Types.ObjectId().toString();
  const studentId = new Types.ObjectId().toString();
  const instructorId = new Types.ObjectId().toString();
  const organizationId = new Types.ObjectId();

  const futureSlotId = new Types.ObjectId();
  const pastSlotId = new Types.ObjectId();
  const futureStartsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const futureEndsAt = new Date(futureStartsAt.getTime() + 60 * 60 * 1000);
  const pastStartsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pastEndsAt = new Date(pastStartsAt.getTime() + 60 * 60 * 1000);

  function makeSession(overrides: Record<string, unknown> = {}) {
    const base = {
      _id: new Types.ObjectId(sessionId),
      availableSlots: [
        {
          _id: futureSlotId,
          startsAt: futureStartsAt,
          endsAt: futureEndsAt,
          timezone: 'Africa/Cairo',
          provider: MeetingProvider.EXTERNAL_URL,
          meetingUrl: 'https://meet.example.com/new',
          maxBookings: 1,
        },
        {
          _id: pastSlotId,
          startsAt: pastStartsAt,
          endsAt: pastEndsAt,
          timezone: 'Africa/Cairo',
          provider: MeetingProvider.EXTERNAL_URL,
          maxBookings: 1,
        },
      ],
    };
    return { ...base, ...overrides };
  }

  interface MockRescheduleRequest {
    requestedBy: Types.ObjectId;
    requestedByRole: string;
    newSlotId: Types.ObjectId;
    newStartsAt: Date;
    newEndsAt: Date;
    newTimezone: string;
    reason: string;
    status: RescheduleStatus;
    respondedAt?: Date;
    rejectionReason?: string;
  }

  function makeBooking(overrides: Record<string, unknown> = {}) {
    const base = {
      _id: new Types.ObjectId(bookingId),
      sessionId: new Types.ObjectId(sessionId),
      studentId: new Types.ObjectId(studentId),
      parentId: undefined as Types.ObjectId | undefined,
      instructorId: new Types.ObjectId(instructorId),
      organizationId,
      status: BookingStatus.CONFIRMED,
      startsAt: undefined as Date | undefined,
      endsAt: undefined as Date | undefined,
      timezone: 'Africa/Cairo',
      provider: MeetingProvider.EXTERNAL_URL,
      meetingLink: 'https://meet.example.com/old',
      agoraChannelName: undefined as string | undefined,
      rescheduleRequest: undefined as MockRescheduleRequest | undefined,
      // eslint-disable-next-line unicorn/no-useless-undefined -- required by jest's mockResolvedValue<void> signature
      save: jest.fn().mockResolvedValue(undefined),
    };
    return { ...base, ...overrides } as typeof base;
  }

  function makeService(booking: ReturnType<typeof makeBooking>, session = makeSession(), capacityCount = 0) {
    const bookingModel = {
      findById: jest.fn().mockResolvedValue(booking),
      countDocuments: jest
        .fn()
        .mockReturnValue(Object.assign(Promise.resolve(capacityCount), { session: jest.fn().mockResolvedValue(capacityCount) })),
    };
    const privateSessionService = { findById: jest.fn().mockResolvedValue(session) };

    const service = new SessionBookingService(
      bookingModel as never,
      {} as never,
      {} as never,
      privateSessionService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    return { service, bookingModel, privateSessionService };
  }

  function pendingBooking(overrides: Record<string, unknown> = {}) {
    return makeBooking({
      rescheduleRequest: {
        requestedBy: new Types.ObjectId(studentId),
        requestedByRole: 'student',
        newSlotId: futureSlotId,
        newStartsAt: futureStartsAt,
        newEndsAt: futureEndsAt,
        newTimezone: 'Africa/Cairo',
        reason: 'schedule conflict',
        status: RescheduleStatus.PENDING,
      },
      ...overrides,
    });
  }

  describe('requestReschedule', () => {
    it('rejects a non-participant', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);
      const outsiderId = new Types.ObjectId().toString();

      await expect(
        service.requestReschedule({ bookingId, newSlotId: futureSlotId.toString(), reason: 'conflict' }, outsiderId, 'student')
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a non-confirmed booking', async () => {
      const booking = makeBooking({ status: BookingStatus.COMPLETED });
      const { service } = makeService(booking);

      await expect(
        service.requestReschedule({ bookingId, newSlotId: futureSlotId.toString(), reason: 'conflict' }, studentId, 'student')
      ).rejects.toThrow(PrivateSessionErrors.BOOKING_NOT_CONFIRMED);
    });

    it('rejects a duplicate pending request', async () => {
      const booking = pendingBooking();
      const { service } = makeService(booking);

      await expect(
        service.requestReschedule({ bookingId, newSlotId: futureSlotId.toString(), reason: 'again' }, studentId, 'student')
      ).rejects.toThrow(PrivateSessionErrors.RESCHEDULE_ALREADY_PENDING);
    });

    it('rejects a slot id that does not belong to the session', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);

      await expect(
        service.requestReschedule({ bookingId, newSlotId: new Types.ObjectId().toString(), reason: 'conflict' }, studentId, 'student')
      ).rejects.toThrow(PrivateSessionErrors.RESCHEDULE_SLOT_UNAVAILABLE);
    });

    it('rejects a real slot that is already in the past', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);

      await expect(
        service.requestReschedule({ bookingId, newSlotId: pastSlotId.toString(), reason: 'conflict' }, studentId, 'student')
      ).rejects.toThrow(PrivateSessionErrors.RESCHEDULE_SLOT_UNAVAILABLE);
    });

    it('rejects a real future slot that is already at capacity', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking, makeSession(), 1);

      await expect(
        service.requestReschedule({ bookingId, newSlotId: futureSlotId.toString(), reason: 'conflict' }, studentId, 'student')
      ).rejects.toThrow(PrivateSessionErrors.SLOT_CAPACITY_FULL);
    });

    it('records a pending reschedule request resolved to the real slot instants', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);

      const result = await service.requestReschedule(
        { bookingId, newSlotId: futureSlotId.toString(), reason: 'schedule conflict' },
        studentId,
        'student'
      );

      expect(booking.rescheduleRequest).toMatchObject({
        newSlotId: futureSlotId,
        newStartsAt: futureStartsAt,
        newEndsAt: futureEndsAt,
        newTimezone: 'Africa/Cairo',
        status: RescheduleStatus.PENDING,
      });
      expect(booking.save).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });

  describe('respondToReschedule', () => {
    it('throws when no pending reschedule request exists', async () => {
      const booking = makeBooking();
      const { service } = makeService(booking);

      await expect(service.respondToReschedule({ bookingId, action: RescheduleStatus.APPROVED }, instructorId)).rejects.toThrow(BadRequestException);
    });

    it('rejects the requester responding to their own request', async () => {
      const booking = pendingBooking();
      const { service } = makeService(booking);

      await expect(service.respondToReschedule({ bookingId, action: RescheduleStatus.APPROVED }, studentId)).rejects.toThrow(
        PrivateSessionErrors.CANNOT_RESPOND_OWN_REQUEST
      );
    });

    it('records rejection without moving the booking time', async () => {
      const booking = pendingBooking();
      const { service } = makeService(booking);

      const result = await service.respondToReschedule(
        { bookingId, action: RescheduleStatus.REJECTED, rejectionReason: 'not available' },
        instructorId
      );

      expect(booking.rescheduleRequest!.status).toBe(RescheduleStatus.REJECTED);
      expect(booking.rescheduleRequest!.rejectionReason).toBe('not available');
      expect(booking.startsAt).toBeUndefined();
      expect(result.message).toBeDefined();
    });

    it('approves and moves the booking to the new slot instants and provider', async () => {
      const booking = pendingBooking();
      const { service } = makeService(booking);

      const result = await service.respondToReschedule({ bookingId, action: RescheduleStatus.APPROVED }, instructorId);

      expect(booking.startsAt).toBe(futureStartsAt);
      expect(booking.endsAt).toBe(futureEndsAt);
      expect(booking.timezone).toBe('Africa/Cairo');
      expect(booking.meetingLink).toBe('https://meet.example.com/new');
      expect(booking.rescheduleRequest!.status).toBe(RescheduleStatus.APPROVED);
      expect(result.message).toBeDefined();
    });

    it('re-checks capacity on approval and rejects if the slot filled up while pending', async () => {
      const booking = pendingBooking();
      const { service } = makeService(booking, makeSession(), 1);

      await expect(service.respondToReschedule({ bookingId, action: RescheduleStatus.APPROVED }, instructorId)).rejects.toThrow(
        PrivateSessionErrors.SLOT_CAPACITY_FULL
      );
    });

    it('rejects approval if the slot was removed from the session while pending', async () => {
      const booking = pendingBooking();
      const { service } = makeService(booking, makeSession({ availableSlots: [] }));

      await expect(service.respondToReschedule({ bookingId, action: RescheduleStatus.APPROVED }, instructorId)).rejects.toThrow(
        PrivateSessionErrors.RESCHEDULE_SLOT_UNAVAILABLE
      );
    });
  });
});
