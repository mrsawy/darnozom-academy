import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AttendanceSource, AttendanceStatus, MeetingProvider, PresenceRole, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { checkJoinWindow, PRESENCE_STALE_SECONDS, PresenceSegment, statusFromJoin } from '../domain/presence';
import { Group } from '../group/entities/group.entity';
import { Session } from './entities/session.entity';
import { SessionPresence } from './entities/session-presence.entity';
import { SessionStateService } from './session-state.service';
import { AgoraService, AgoraTokenResult } from 'src/agora/agora.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface JoinResult {
  provider: MeetingProvider;
  meetingLink?: string;
  /** Present when the group meets inside the platform; a repeat join returns a fresh token. */
  agora?: AgoraTokenResult;
}

/** Joining through the platform is what records attendance: the first join derives PRESENT/LATE, manual marks always win. */
@Injectable()
export class SessionPresenceService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(SessionPresence.name) private readonly presenceModel: Model<SessionPresence>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly state: SessionStateService,
    private readonly agora: AgoraService
  ) {}

  async join(actor: AcademicsActor, sessionId: string, now: Date = new Date()): Promise<JoinResult> {
    const session = await this.state.loadInOrg(actor, sessionId);

    const isTeacher = String(session.teacherId) === actor._id;
    const isStudent = !isTeacher && (await this.state.activeStudentIds(session.groupId)).includes(actor._id);
    if (!isTeacher && !isStudent) throw new ForbiddenException(AcademicsErrors.NOT_SESSION_PARTICIPANT);

    const windowError = checkJoinWindow(session, now);
    if (windowError) throw new ConflictException(windowError);

    const userId = oid(actor._id);
    const existing = await this.presenceModel
      .findOne({ sessionId: session._id, userId })
      .lean<{ firstJoinedAt?: Date; lastSeenAt?: Date; segments?: PresenceSegment[] }>()
      .exec();

    if (existing) {
      const segments = existing.segments ?? [];
      const hasOpenSegment = segments.length > 0 && !segments.at(-1)?.leftAt;
      const lastSeen = existing.lastSeenAt ?? now;
      // The tab went away without a leave: close the old segment at the last heartbeat so the gap is not counted.
      const wentAway = hasOpenSegment && now.getTime() - lastSeen.getTime() > PRESENCE_STALE_SECONDS * 1000;
      if (wentAway) {
        await this.presenceModel
          .updateOne({ sessionId: session._id, userId }, { $set: { 'segments.$[open].leftAt': lastSeen } }, { arrayFilters: [{ 'open.leftAt': null }] })
          .exec();
      }
      await this.presenceModel
        .updateOne({ sessionId: session._id, userId }, { $set: { lastSeenAt: now }, ...(hasOpenSegment && !wentAway ? {} : { $push: { segments: { joinedAt: now } } }) })
        .exec();
    } else {
      try {
        await this.presenceModel
          .updateOne(
            { sessionId: session._id, userId },
            {
              $setOnInsert: {
                organizationId: oid(actor.organizationId),
                groupId: session.groupId,
                role: isTeacher ? PresenceRole.TEACHER : PresenceRole.STUDENT,
                firstJoinedAt: now,
              },
              $set: { lastSeenAt: now },
              $push: { segments: { joinedAt: now } },
            },
            { upsert: true }
          )
          .exec();
      } catch (error) {
        // Two first joins at once (two devices): the other one created the record; this join is already covered by it.
        if ((error as { code?: number }).code !== 11_000) throw error;
      }
    }
    // Idempotent (it only matches where nothing is recorded yet), so it also repairs a first attempt that failed midway.
    // The status always comes from the FIRST join, so a later rejoin can never turn PRESENT into LATE.
    await this.applyAutoAttendance(session, userId, isTeacher, statusFromJoin(session.startsAt, existing?.firstJoinedAt ?? now), now);

    return this.meetingFor(session.groupId, session._id, actor._id);
  }

  /**
   * Called by the sweep after sessions flip to REPORT_PENDING. Students with no row become ABSENT (AUTO),
   * but only for sessions someone actually joined through the platform: a session run elsewhere is left to the teacher.
   * Each session is handled once (autoAbsentAppliedAt); the teacher's manual marks replace AUTO rows afterwards.
   */
  async markNoShows(now: Date): Promise<number> {
    const sessions = await this.sessionModel
      .find({ status: SessionStatus.REPORT_PENDING, endsAt: { $lte: now }, autoAbsentAppliedAt: null })
      .select('_id groupId attendance')
      .lean<{ _id: Types.ObjectId; groupId: Types.ObjectId; attendance?: { studentId: Types.ObjectId }[] }[]>()
      .exec();

    let handled = 0;
    for (const session of sessions) {
      const presence = await this.presenceModel.find({ sessionId: session._id }).select('userId role').lean<{ userId: Types.ObjectId; role: PresenceRole }[]>().exec();
      const joined = new Set(presence.map((row) => String(row.userId)));
      const marked = new Set((session.attendance ?? []).map((row) => String(row.studentId)));
      // Only when a STUDENT joined (a teacher alone says nothing about the students), and never someone who has a presence record.
      const studentJoined = presence.some((row) => row.role === PresenceRole.STUDENT);
      const missing = studentJoined ? (await this.state.activeStudentIds(session.groupId)).filter((studentId) => !marked.has(studentId) && !joined.has(studentId)) : [];

      const update: Record<string, unknown> = { $set: { autoAbsentAppliedAt: now } };
      if (missing.length > 0) {
        update.$push = {
          attendance: {
            $each: missing.map((studentId) => ({
              studentId: oid(studentId),
              status: AttendanceStatus.ABSENT,
              markedBy: oid(studentId),
              markedAt: now,
              source: AttendanceSource.AUTO,
            })),
          },
        };
      }
      const result = await this.sessionModel
        // A manual mark that landed since the read makes this match nothing; the session is then retried by the next sweep.
        .updateOne(
          {
            _id: session._id,
            status: SessionStatus.REPORT_PENDING,
            autoAbsentAppliedAt: null,
            ...(missing.length > 0 ? { 'attendance.studentId': { $nin: missing.map((studentId) => oid(studentId)) } } : {}),
          },
          update
        )
        .exec();
      handled += result.modifiedCount ?? 0;
    }
    return handled;
  }

  async heartbeat(actor: AcademicsActor, sessionId: string, now: Date = new Date()): Promise<void> {
    await this.presenceModel.updateOne({ sessionId: oid(sessionId), userId: oid(actor._id), organizationId: oid(actor.organizationId) }, { $set: { lastSeenAt: now } }).exec();
  }

  async leave(actor: AcademicsActor, sessionId: string, now: Date = new Date()): Promise<void> {
    await this.presenceModel
      .updateOne(
        { sessionId: oid(sessionId), userId: oid(actor._id), organizationId: oid(actor.organizationId) },
        { $set: { lastSeenAt: now, 'segments.$[open].leftAt': now } },
        { arrayFilters: [{ 'open.leftAt': null }] }
      )
      .exec();
  }

  /** Writes only where nothing was recorded yet, and only while attendance is still open (before the report). */
  private async applyAutoAttendance(
    session: { _id: Types.ObjectId },
    userId: Types.ObjectId,
    isTeacher: boolean,
    status: AttendanceStatus,
    now: Date
  ): Promise<void> {
    const open = { _id: session._id, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } };
    if (isTeacher) {
      await this.sessionModel.updateOne({ ...open, teacherAttendance: null }, { $set: { teacherAttendance: status } }).exec();
      return;
    }
    await this.sessionModel
      .updateOne(
        { ...open, 'attendance.studentId': { $ne: userId } },
        { $push: { attendance: { studentId: userId, status, markedBy: userId, markedAt: now, source: AttendanceSource.AUTO } } }
      )
      .exec();
  }

  private async meetingFor(groupId: Types.ObjectId, sessionId: Types.ObjectId, userId: string): Promise<JoinResult> {
    const group = await this.groupModel
      .findOne({ _id: groupId })
      .select('meetingLink meetingProvider')
      .lean<{ meetingLink?: string; meetingProvider?: MeetingProvider }>()
      .exec();
    if (group?.meetingProvider === MeetingProvider.AGORA) {
      return { provider: MeetingProvider.AGORA, agora: this.agora.issueGroupSessionToken(userId, String(sessionId)) };
    }
    return { provider: MeetingProvider.EXTERNAL_URL, ...(group?.meetingLink ? { meetingLink: group.meetingLink } : {}) };
  }
}
