import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import mongoose from 'mongoose';
import { CurrencyService } from '../../../src/currency/currency.service';
import { Organization } from '../../../src/organization/entities/organization.entity';
import { PrivateSession } from '../../../src/private-session/entities/private-session.entity';
import { SessionBooking } from '../../../src/private-session/entities/session-booking.entity';
import { PrivateSessionService } from '../../../src/private-session/services/private-session.service';
import { BookingStatus } from '../../../src/private-session/enums/booking-status.enum';
import { PrivateSessionErrors } from '@lms-organization/shared-types';

describe('PrivateSessionService.delete (soft delete)', () => {
  const sessionId = new mongoose.Types.ObjectId();
  const instructorId = new mongoose.Types.ObjectId();
  const otherInstructorId = new mongoose.Types.ObjectId();

  const findById = jest.fn();
  const findByIdAndUpdate = jest.fn().mockResolvedValue({});
  const exists = jest.fn().mockResolvedValue(null);
  const updateMany = jest.fn().mockResolvedValue({ acknowledged: true });

  const privateSessionModel = {
    findById,
    findByIdAndUpdate,
  };
  const sessionBookingModel = {
    exists,
    updateMany,
  };

  let service: PrivateSessionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    findByIdAndUpdate.mockResolvedValue({});
    exists.mockResolvedValue(null);
    updateMany.mockResolvedValue({ acknowledged: true });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PrivateSessionService,
        { provide: getModelToken(PrivateSession.name), useValue: privateSessionModel },
        { provide: getModelToken(SessionBooking.name), useValue: sessionBookingModel },
        { provide: getModelToken(Organization.name), useValue: {} },
        { provide: CurrencyService, useValue: { convertToUSD: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(PrivateSessionService);
  });

  it('soft-deletes with deletedAt + deletedById and does not set status DELETED', async () => {
    findById.mockResolvedValue({
      _id: sessionId,
      instructorId,
    });

    const before = Date.now();
    await service.delete(sessionId.toString(), instructorId.toString(), instructorId.toString());
    const after = Date.now();

    expect(exists).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        status: { $in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
        startsAt: expect.objectContaining({ $gt: expect.any(Date) }),
      })
    );

    expect(findByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [, update] = findByIdAndUpdate.mock.calls[0] as [
      string,
      { $set: { isActive: boolean; deletedAt: Date; deletedById: mongoose.Types.ObjectId | null; status?: string } },
    ];

    expect(update.$set.isActive).toBe(false);
    expect(update.$set.deletedById?.toString()).toBe(instructorId.toString());
    expect(update.$set.deletedAt).toBeInstanceOf(Date);
    expect(update.$set.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(update.$set.deletedAt.getTime()).toBeLessThanOrEqual(after);
    expect(update.$set.status).toBeUndefined();

    expect(updateMany).toHaveBeenCalledWith(
      {
        sessionId,
        status: { $in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      },
      expect.objectContaining({
        status: BookingStatus.CANCELLED,
      })
    );
  });

  it('blocks delete when the session has future pending/confirmed bookings', async () => {
    findById.mockResolvedValue({
      _id: sessionId,
      instructorId,
    });
    exists.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    await expect(service.delete(sessionId.toString(), instructorId.toString())).rejects.toMatchObject({
      response: { message: PrivateSessionErrors.HAS_UPCOMING_BOOKINGS },
    });
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the session is missing', async () => {
    findById.mockResolvedValue(null);
    await expect(service.delete(sessionId.toString(), instructorId.toString())).rejects.toBeInstanceOf(NotFoundException);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the actor is not the instructor', async () => {
    findById.mockResolvedValue({
      _id: sessionId,
      instructorId,
    });
    await expect(service.delete(sessionId.toString(), otherInstructorId.toString())).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
