import { Model, Types } from 'mongoose';
import { fakerAR as faker } from '@faker-js/faker';
import { PrivateSession } from '../entities/private-session.entity';
import { SessionBooking } from '../entities/session-booking.entity';
import { SessionType } from '../enums/session-type.enum';
import { BookingStatus } from '../enums/booking-status.enum';
import { Currency, EntityStatus, PaymentMethod } from '@darnozom/shared-types';
import { User } from '../../user/entities/user.entity';
import { buildSlotInstants, utcToWallTime, DEFAULT_SESSION_TIMEZONE } from '../utils/session-time.util';

const TIME_SLOTS = [
  { start: '09:00 am', end: '10:00 am' },
  { start: '10:00 am', end: '11:00 am' },
  { start: '11:00 am', end: '12:00 pm' },
  { start: '02:00 pm', end: '03:00 pm' },
  { start: '03:00 pm', end: '04:00 pm' },
  { start: '05:00 pm', end: '06:00 pm' },
];

const BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
  BookingStatus.COMPLETED,
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.CANCELLED,
];

function futureDate(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 86_400_000);
}

function pastDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 86_400_000);
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class PrivateSessionSeeder {
  constructor(
    private readonly privateSessionModel: Model<PrivateSession>,
    private readonly sessionBookingModel: Model<SessionBooking>
  ) {}

  async seedForOrganization(organizationId: Types.ObjectId, instructors: User[], students: User[]) {
    if (instructors.length === 0 || students.length === 0) return;

    for (const instructor of instructors) {
      const sessionCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < sessionCount; i++) {
        const sessionType = faker.helpers.arrayElement([SessionType.ONLINE, SessionType.OFFLINE]);
        const priceEGP = faker.number.int({ min: 500, max: 3000 });

        const slots = Array.from({ length: faker.number.int({ min: 3, max: 6 }) }, (_, idx) => {
          const slot = faker.helpers.arrayElement(TIME_SLOTS);
          const instants = buildSlotInstants(dateOnly(futureDate(idx + 1)), slot.start, slot.end, DEFAULT_SESSION_TIMEZONE);
          return {
            ...instants,
            meetingUrl: sessionType === SessionType.ONLINE ? `https://meet.example.com/${faker.string.alphanumeric(8)}` : undefined,
            maxBookings: 1,
          };
        });

        const session = await this.privateSessionModel.create({
          instructorId: instructor._id,
          organizationId,
          title: faker.lorem.words(4),
          description: faker.lorem.paragraph(),
          duration: 60,
          pricing: { price: priceEGP, currency: Currency.EGP, priceUSD: Math.round(priceEGP / 30) },
          availableSlots: slots,
          sessionType,
          isActive: true,
          status: EntityStatus.ACTIVE,
          ...(sessionType === SessionType.OFFLINE ? { location: faker.location.streetAddress() } : {}),
        });

        // Seed 1-2 bookings per session from random students
        const bookingCount = faker.number.int({ min: 1, max: Math.min(2, students.length) });
        const pickedStudents = faker.helpers.arrayElements(students, bookingCount);

        for (const [bIdx, student] of pickedStudents.entries()) {
          const slot = slots[bIdx] ?? slots[0];
          const status = faker.helpers.arrayElement(BOOKING_STATUSES);
          const scheduledDate = status === BookingStatus.COMPLETED ? pastDate(faker.number.int({ min: 1, max: 30 })) : futureDate(bIdx + 1);

          // Re-anchor the slot's time-of-day onto this booking's own scheduled date
          // (COMPLETED bookings are seeded in the past regardless of the slot's own date).
          const { time24: startTime24 } = utcToWallTime(slot.startsAt, slot.timezone);
          const { time24: endTime24 } = utcToWallTime(slot.endsAt, slot.timezone);
          const { startsAt, endsAt, timezone } = buildSlotInstants(dateOnly(scheduledDate), startTime24, endTime24, slot.timezone);

          await this.sessionBookingModel.create({
            sessionId: session._id,
            studentId: student._id,
            instructorId: instructor._id,
            organizationId,
            startsAt,
            endsAt,
            timezone,
            status,
            paymentMethod: PaymentMethod.WALLET,
            ...(status === BookingStatus.PENDING_PAYMENT
              ? {}
              : {
                  paymentDetails: {
                    paidAmount: priceEGP,
                    currency: Currency.EGP,
                    paidAt: new Date(scheduledDate.getTime() - 86_400_000),
                  },
                }),
            ...(sessionType === SessionType.ONLINE ? { meetingLink: `https://meet.example.com/${faker.string.alphanumeric(8)}` } : {}),
            ...(status === BookingStatus.CANCELLED
              ? { cancellationReason: faker.lorem.sentence(), cancelledBy: student._id, cancelledAt: new Date() }
              : {}),
          });
        }
      }
    }
  }
}
