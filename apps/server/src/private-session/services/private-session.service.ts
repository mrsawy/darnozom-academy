import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateModel, PaginateOptions, Types } from 'mongoose';
import { EntityStatus, MeetingProvider, PrivateSessionErrors, PrivateSessionSuccessMessages } from '@darnozom/shared-types';
import { PrivateSession } from '../entities/private-session.entity';
import { SessionBooking } from '../entities/session-booking.entity';
import { CreatePrivateSessionDto, AvailableSlotDto } from '../dto/create-private-session.dto';
import { UpdatePrivateSessionDto } from '../dto/update-private-session.dto';
import { BookingStatus } from '../enums/booking-status.enum';
import { CurrencyService } from 'src/currency/currency.service';
import { Organization } from 'src/organization/entities/organization.entity';
import { assertOrgApproved } from 'src/utils/verification.utils';
import { buildSoftDeleteSet } from 'src/utils/soft-delete';
import { buildSlotInstants } from '../utils/session-time.util';

/**
 * Convert each incoming slot DTO into its stored shape: `{ startsAt, endsAt, timezone }`
 * plus the non-time fields. The DTO's wall-clock `date/startTime/endTime/timezone` are
 * authoring input only — they are not persisted (the entity's `date/startTime/endTime`
 * are legacy read-only fields kept for pre-migration rows).
 */
function withSlotInstants(slots: AvailableSlotDto[] | undefined) {
  return (slots ?? []).map(({ date, startTime, endTime, timezone, provider, maxBookings, ...rest }) => ({
    ...rest,
    ...buildSlotInstants(date, startTime, endTime, timezone),
    provider: provider ?? MeetingProvider.EXTERNAL_URL,
    maxBookings: maxBookings ?? 1,
  }));
}

@Injectable()
export class PrivateSessionService {
  constructor(
    @InjectModel(PrivateSession.name)
    private readonly privateSessionModel: PaginateModel<PrivateSession>,
    @InjectModel(SessionBooking.name)
    private readonly sessionBookingModel: PaginateModel<SessionBooking>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>,
    private readonly currencyService: CurrencyService
  ) {}

  async create(dto: CreatePrivateSessionDto, instructorId: string, organizationId: string): Promise<{ message: string; session: PrivateSession }> {
    const org = await this.organizationModel.findById(organizationId);
    assertOrgApproved(org);
    const priceUSD = this.currencyService.convertToUSD(dto.pricing.price, dto.pricing.currency);

    const session = await this.privateSessionModel.create({
      ...dto,
      availableSlots: withSlotInstants(dto.availableSlots),
      instructorId: new Types.ObjectId(instructorId),
      organizationId: new Types.ObjectId(organizationId),
      pricing: { ...dto.pricing, priceUSD },
    });

    return { message: PrivateSessionSuccessMessages.SESSION_CREATED, session };
  }

  async update(sessionId: string, dto: UpdatePrivateSessionDto, instructorId: string): Promise<{ message: string; session: PrivateSession }> {
    const existing = await this.privateSessionModel.findById(sessionId);
    if (!existing) throw new NotFoundException(PrivateSessionErrors.SESSION_NOT_FOUND);

    if (existing.instructorId.toString() !== instructorId) {
      throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);
    }

    const updateData: Partial<PrivateSession> = { ...(dto as Partial<PrivateSession>) };
    if (dto.pricing) {
      updateData.pricing = {
        ...dto.pricing,
        priceUSD: this.currencyService.convertToUSD(dto.pricing.price, dto.pricing.currency),
      };
    }
    if (dto.availableSlots) {
      updateData.availableSlots = withSlotInstants(dto.availableSlots);
    }

    const updated = await this.privateSessionModel.findByIdAndUpdate(sessionId, updateData, {
      new: true,
    });

    return { message: PrivateSessionSuccessMessages.SESSION_UPDATED, session: updated! };
  }

  async delete(sessionId: string, instructorId: string, deletedById?: string): Promise<{ message: string }> {
    const session = await this.privateSessionModel.findById(sessionId);
    if (!session) throw new NotFoundException(PrivateSessionErrors.SESSION_NOT_FOUND);

    if (session.instructorId.toString() !== instructorId) {
      throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);
    }

    const hasUpcomingBookings = await this.sessionBookingModel.exists({
      sessionId: new Types.ObjectId(sessionId),
      status: { $in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      startsAt: { $gt: new Date() },
    });
    if (hasUpcomingBookings) {
      throw new BadRequestException(PrivateSessionErrors.HAS_UPCOMING_BOOKINGS);
    }

    await this.privateSessionModel.findByIdAndUpdate(sessionId, {
      $set: {
        isActive: false,
        ...buildSoftDeleteSet(deletedById),
      },
    });

    // Cancel any remaining past pending/confirmed bookings for this session
    await this.sessionBookingModel.updateMany(
      {
        sessionId: new Types.ObjectId(sessionId),
        status: { $in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      },
      {
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Session deleted by instructor',
        cancelledAt: new Date(),
      }
    );

    return { message: PrivateSessionSuccessMessages.SESSION_DELETED };
  }

  async findById(sessionId: string): Promise<PrivateSession> {
    const session = await this.privateSessionModel
      .findById(sessionId)
      .populate('instructor', 'firstName lastName email profile')
      .populate('organization', 'name logoKey');

    if (!session) throw new NotFoundException(PrivateSessionErrors.SESSION_NOT_FOUND);
    return session;
  }

  async findByInstructor(instructorId: string, organizationId: string, options: PaginateOptions = {}) {
    return this.privateSessionModel.paginate(
      {
        instructorId: new Types.ObjectId(instructorId),
        organizationId: new Types.ObjectId(organizationId),
      },
      {
        ...options,
        sort: options.sort ?? { createdAt: -1 },
      }
    );
  }

  async findAvailableByInstructor(instructorId: string): Promise<PrivateSession[]> {
    return (
      this.privateSessionModel
        .find({
          instructorId: new Types.ObjectId(instructorId),
          isActive: true,
          status: EntityStatus.ACTIVE,
        })
        .populate('instructor', 'firstName lastName email profile')
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ createdAt: -1 })
    );
  }

  async getInstructorSessionsForOrg(organizationId: string, options: PaginateOptions = {}) {
    return this.privateSessionModel.paginate(
      {
        organizationId: new Types.ObjectId(organizationId),
      },
      {
        ...options,
        populate: { path: 'instructor', select: 'firstName lastName email profile' },
        sort: options.sort ?? { createdAt: -1 },
      }
    );
  }

  async validateOwnership(sessionId: string, instructorId: string): Promise<PrivateSession> {
    const session = await this.privateSessionModel.findById(sessionId);
    if (!session) throw new NotFoundException(PrivateSessionErrors.SESSION_NOT_FOUND);
    if (session.instructorId.toString() !== instructorId) {
      throw new ForbiddenException(PrivateSessionErrors.NOT_SESSION_PARTICIPANT);
    }
    return session;
  }

  async findActiveById(sessionId: string): Promise<PrivateSession> {
    const session = await this.privateSessionModel.findById(sessionId);
    if (!session) throw new NotFoundException(PrivateSessionErrors.SESSION_NOT_FOUND);
    if (!session.isActive || session.status !== EntityStatus.ACTIVE) {
      throw new BadRequestException(PrivateSessionErrors.SESSION_INACTIVE);
    }
    return session;
  }
}
