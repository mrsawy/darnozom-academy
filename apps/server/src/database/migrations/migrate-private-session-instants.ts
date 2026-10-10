/**
 * One-off migration: convert legacy private-session slot/booking wall-clock fields
 * (`{ date, startTime, endTime }`) into absolute UTC instants (`{ startsAt, endsAt, timezone }`).
 *
 * Existing rows have no explicit authoring timezone recorded, so every legacy row is
 * assumed to have been authored in `DEFAULT_SESSION_TZ` (defaults to "Africa/Cairo" —
 * see `session-time.util.ts`). Set the `DEFAULT_SESSION_TZ` env var before running if the
 * organization's true authoring zone differs — this cannot be recovered after the fact.
 *
 * Always dry-run first to inspect match counts before writing:
 *   pnpm --filter server migrate:private-session-instants -- --dry-run
 *   pnpm --filter server migrate:private-session-instants
 *   pnpm --filter server migrate:private-session-instants -- --prod
 *   pnpm --filter server migrate:private-session-instants -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { PrivateSession, PrivateSessionSchema } from '../../private-session/entities/private-session.entity';
import { SessionBooking, SessionBookingSchema } from '../../private-session/entities/session-booking.entity';
import { buildSlotInstants, DEFAULT_SESSION_TIMEZONE } from '../../private-session/utils/session-time.util';
import { hasArgFlag, resolveMigrationMongoUri } from './migration-mongo.util';

const DRY_RUN = hasArgFlag('--dry-run');
const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([
      { name: PrivateSession.name, schema: PrivateSessionSchema },
      { name: SessionBooking.name, schema: SessionBookingSchema },
    ]),
  ],
})
class MigrationModule {}

function toDateString(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

async function migrateSlots(privateSessionModel: Model<PrivateSession>) {
  // Coarse pre-filter to avoid loading fully-migrated sessions; each slot is still
  // re-checked individually below since the array-field $exists match is imprecise.
  const sessions = await privateSessionModel.find({
    'availableSlots.0': { $exists: true },
    'availableSlots.startsAt': { $exists: false },
  });

  let matchedSlots = 0;
  let modifiedSessions = 0;

  for (const session of sessions) {
    let changed = false;
    for (const slot of session.availableSlots) {
      if (slot.startsAt && slot.endsAt) continue;
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- this migration exists to read these legacy fields
      if (!slot.date || !slot.startTime || !slot.endTime) continue;

      matchedSlots++;
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- this migration exists to read these legacy fields
      const instants = buildSlotInstants(toDateString(slot.date), slot.startTime, slot.endTime, DEFAULT_SESSION_TIMEZONE);
      slot.startsAt = instants.startsAt;
      slot.endsAt = instants.endsAt;
      slot.timezone = instants.timezone;
      changed = true;
    }
    if (changed) {
      modifiedSessions++;
      if (!DRY_RUN) await session.save();
    }
  }

  return { matchedSlots, modifiedSessions, totalSessionsScanned: sessions.length };
}

async function migrateBookings(bookingModel: Model<SessionBooking>) {
  const bookings = await bookingModel.find({
    startsAt: { $exists: false },
    scheduledDate: { $exists: true },
  });

  let modified = 0;
  for (const booking of bookings) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- this migration exists to read these legacy fields
    if (!booking.scheduledDate || !booking.startTime || !booking.endTime) continue;

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- this migration exists to read these legacy fields
    const instants = buildSlotInstants(toDateString(booking.scheduledDate), booking.startTime, booking.endTime, DEFAULT_SESSION_TIMEZONE);
    booking.startsAt = instants.startsAt;
    booking.endsAt = instants.endsAt;
    booking.timezone = instants.timezone;
    modified++;
    if (!DRY_RUN) await booking.save();
  }

  return { matched: bookings.length, modified };
}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:private-session-instants] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const privateSessionModel = app.get<Model<PrivateSession>>(getModelToken(PrivateSession.name));
  const bookingModel = app.get<Model<SessionBooking>>(getModelToken(SessionBooking.name));

  const slotResult = await migrateSlots(privateSessionModel);
  const bookingResult = await migrateBookings(bookingModel);

  // eslint-disable-next-line no-console
  console.log(
    `[migrate:private-session-instants] ${DRY_RUN ? '(dry-run, no writes) ' : ''}assumedZone=${DEFAULT_SESSION_TIMEZONE}\n` +
      `  slots: sessionsScanned=${slotResult.totalSessionsScanned} slotsConverted=${slotResult.matchedSlots} sessionsModified=${slotResult.modifiedSessions}\n` +
      `  bookings: matched=${bookingResult.matched} converted=${bookingResult.modified}`
  );

  await app.close();
}

void bootstrap();
