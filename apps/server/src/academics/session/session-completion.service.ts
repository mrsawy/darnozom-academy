import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AcademicsErrors, GroupStatus, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { effectiveSessionStatus } from '../domain/session-rules';
import { FollowUp } from '../follow-up/entities/follow-up.entity';
import { Group } from '../group/entities/group.entity';
import { Session } from './entities/session.entity';
import { SessionStateService } from './session-state.service';
import { SessionLean, SessionView } from './session.types';
import { SESSION_COMPLETED_EVENT } from '../events/session.events';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class SessionCompletionService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUp>,
    private readonly state: SessionStateService,
    private readonly events: EventEmitter2
  ) {}

  /** Runs after a session became COMPLETED (report submitted) or CANCELLED. */
  async onClosed(session: SessionLean, closedAs: SessionStatus.COMPLETED | SessionStatus.CANCELLED): Promise<void> {
    if (closedAs === SessionStatus.COMPLETED && session.sequence === 1) await this.createFollowUps(session);
    if (closedAs === SessionStatus.COMPLETED) {
      this.events.emit(SESSION_COMPLETED_EVENT, {
        sessionId: String(session._id),
        groupId: String(session.groupId),
        organizationId: String(session.organizationId),
      });
    }
    await this.completeGroupIfDone(session.groupId);
  }

  /** One row per ACTIVE student; $setOnInsert keeps an already-recorded follow-up untouched. */
  private async createFollowUps(session: SessionLean): Promise<void> {
    const studentIds = await this.state.activeStudentIds(session.groupId);
    if (studentIds.length === 0) return;
    await this.followUpModel.bulkWrite(
      studentIds.map((studentId) => ({
        updateOne: {
          filter: { groupId: session.groupId, studentId: oid(studentId) },
          update: {
            $setOnInsert: { organizationId: session.organizationId, groupId: session.groupId, sessionId: session._id, studentId: oid(studentId) },
          },
          upsert: true,
        },
      }))
    );
  }

  private async completeGroupIfDone(groupId: Types.ObjectId): Promise<void> {
    const open = await this.sessionModel.countDocuments({ groupId, status: { $nin: [SessionStatus.COMPLETED, SessionStatus.CANCELLED] } }).exec();
    if (open > 0) return;
    await this.groupModel
      .updateOne(
        { _id: groupId, status: GroupStatus.RUNNING },
        {
          $set: { status: GroupStatus.COMPLETED },
          $push: { statusHistory: { from: GroupStatus.RUNNING, to: GroupStatus.COMPLETED, by: null, at: new Date() } },
        }
      )
      .exec();
  }

  /** SCHEDULED → CANCELLED, only while the session has not ended; a cancelled session is not replaced. */
  async cancel(actor: AcademicsActor, id: string, reason: string, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    const trimmed = reason?.trim();
    if (!trimmed) throw new BadRequestException(AcademicsErrors.CANCEL_REASON_REQUIRED);
    if (effectiveSessionStatus(session, now) !== SessionStatus.SCHEDULED) throw new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED);

    const result = await this.sessionModel
      .updateOne(
        { _id: session._id, status: SessionStatus.SCHEDULED },
        { $set: { status: SessionStatus.CANCELLED, cancelReason: trimmed, cancelledBy: oid(actor._id) } }
      )
      .exec();
    if (result.modifiedCount === 0) throw new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED);
    await this.onClosed({ ...session, status: SessionStatus.CANCELLED }, SessionStatus.CANCELLED);
    return this.state.reload(session._id, now);
  }

  /** Delete a SCHEDULED session entirely (e.g. manual removal). */
  async delete(actor: AcademicsActor, id: string): Promise<{ message: string }> {
    const session = await this.state.loadInOrg(actor, id);
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED);
    }
    await this.sessionModel.deleteOne({ _id: session._id }).exec();
    await this.completeGroupIfDone(session.groupId);
    return { message: 'Session deleted successfully' };
  }

  /** Reschedule a SCHEDULED session with new startsAt and endsAt. */
  async reschedule(actor: AcademicsActor, id: string, startsAtStr: string, endsAtStr: string): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED);
    }
    const startsAt = new Date(startsAtStr);
    const endsAt = new Date(endsAtStr);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Invalid session start or end time');
    }
    await this.sessionModel.updateOne({ _id: session._id }, { $set: { startsAt, endsAt } }).exec();
    return this.state.reload(session._id);
  }

  /** Manually add a new session to a group. */
  async create(actor: AcademicsActor, data: { groupId: string; startsAt: string; endsAt: string; teacherId?: string }): Promise<SessionView> {
    const group = await this.groupModel.findOne({ _id: oid(data.groupId), organizationId: oid(actor.organizationId) }).lean<Group>().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    if (group.status !== GroupStatus.RUNNING && group.status !== GroupStatus.READY_TO_START) {
      throw new ConflictException('Group must be ready or running to add sessions');
    }
    const teacherId = data.teacherId ? oid(data.teacherId) : group.teacherId;
    if (!teacherId) throw new BadRequestException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE);

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Invalid session start or end time');
    }

    // Determine sequence: next max sequence for this group
    const maxSeqDoc = await this.sessionModel
      .findOne({ groupId: group._id })
      .sort({ sequence: -1 })
      .select('sequence')
      .lean<{ sequence?: number }>()
      .exec();
    const sequence = (maxSeqDoc?.sequence ?? 0) + 1;

    const created = await this.sessionModel.create({
      organizationId: group.organizationId,
      groupId: group._id,
      teacherId,
      sequence,
      startsAt,
      endsAt,
      status: SessionStatus.SCHEDULED,
      attendance: [],
      report: null,
    });
    return this.state.toView(created.toObject() as unknown as SessionLean);
  }

  /** The BullMQ job: persists the derived REPORT_PENDING status. */
  async sweepOverdue(now: Date): Promise<number> {
    const result = await this.sessionModel
      .updateMany({ status: SessionStatus.SCHEDULED, endsAt: { $lte: now } }, { $set: { status: SessionStatus.REPORT_PENDING } })
      .exec();
    return result.modifiedCount;
  }
}
