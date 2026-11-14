import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { DateTime } from 'luxon';
import { ScheduleSlot, SessionStatus } from '@darnozom/shared-types';
import { generateSessions } from '../domain/session-generation';
import { Session } from './entities/session.entity';

interface ExistingSession {
  _id: Types.ObjectId;
  sequence: number;
  status: SessionStatus;
  startsAt: Date;
  attendance?: unknown[];
  report?: unknown;
}

export interface RegenerateInput {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  teacherId: Types.ObjectId | null;
  totalSessions?: number | null;
}

/** Slots per weekday are capped at 14 weekly, so this many extra candidates always covers "earlier today". */
const LOOKAHEAD_PADDING = 14;

/**
 * Re-plans a RUNNING group's upcoming sessions after its weekly schedule or time zone changed.
 *
 * Only sessions that have not happened and were never touched are replaced: SCHEDULED, starting in the
 * future, with no attendance and no report. Everything else (past, in-progress, completed, cancelled) is
 * kept untouched, and counts toward the group's `totalSessions`. The replacements fill the remaining count
 * starting from now, continuing the sequence numbers.
 */
@Injectable()
export class SessionScheduleService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectConnection() private readonly connection: Connection
  ) {}

  async regenerateUpcoming(
    group: RegenerateInput,
    next: { schedule: ScheduleSlot[]; timezone: string },
    now: Date = new Date()
  ): Promise<{ removed: number; created: number }> {
    if (!group.totalSessions || !group.teacherId) return { removed: 0, created: 0 };

    const existing = await this.sessionModel
      .find({ groupId: group._id })
      .select('_id sequence status startsAt attendance report')
      .lean<ExistingSession[]>()
      .exec();

    const replaceable = existing.filter(
      (s) => s.status === SessionStatus.SCHEDULED && s.startsAt > now && !(s.attendance?.length ?? 0) && !s.report
    );
    const replaceableIds = new Set(replaceable.map((s) => String(s._id)));
    const kept = existing.filter((s) => !replaceableIds.has(String(s._id)));

    const counted = kept.filter((s) => s.status !== SessionStatus.CANCELLED).length;
    const remaining = Math.max(0, group.totalSessions - counted);
    const lastSequence = kept.reduce((max, s) => Math.max(max, s.sequence), 0);

    // Walk forward from today's calendar date in the group's (new) time zone, keep only future slots.
    const localToday = DateTime.fromJSDate(now, { zone: next.timezone });
    const walkStart = new Date(Date.UTC(localToday.year, localToday.month - 1, localToday.day));
    const fresh = generateSessions(next.schedule, next.timezone, walkStart, remaining + LOOKAHEAD_PADDING)
      .filter((s) => s.startsAt > now)
      .slice(0, remaining);

    if (replaceable.length === 0 && fresh.length === 0) return { removed: 0, created: 0 };

    const dbSession = await this.connection.startSession();
    try {
      await dbSession.withTransaction(async () => {
        if (replaceable.length > 0) {
          await this.sessionModel
            .deleteMany({ _id: { $in: replaceable.map((s) => s._id) }, status: SessionStatus.SCHEDULED }, { session: dbSession })
            .exec();
        }
        if (fresh.length > 0) {
          await this.sessionModel.insertMany(
            fresh.map((item, index) => ({
              organizationId: group.organizationId,
              groupId: group._id,
              teacherId: group.teacherId,
              sequence: lastSequence + 1 + index,
              startsAt: item.startsAt,
              endsAt: item.endsAt,
              status: SessionStatus.SCHEDULED,
              attendance: [],
            })),
            { session: dbSession }
          );
        }
      });
    } finally {
      await dbSession.endSession();
    }
    return { removed: replaceable.length, created: fresh.length };
  }
}
