import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { effectiveSessionStatus } from '../domain/session-rules';
import { FollowUp } from '../follow-up/entities/follow-up.entity';
import { Group } from '../group/entities/group.entity';
import { Session } from './entities/session.entity';
import { SessionStateService } from './session-state.service';
import { SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class SessionCompletionService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUp>,
    private readonly state: SessionStateService
  ) {}

  /** Runs after a session became COMPLETED (report submitted) or CANCELLED. */
  async onClosed(session: SessionLean, closedAs: SessionStatus.COMPLETED | SessionStatus.CANCELLED): Promise<void> {
    if (closedAs === SessionStatus.COMPLETED && session.sequence === 1) await this.createFollowUps(session);
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

  /** The BullMQ job: persists the derived REPORT_PENDING status. */
  async sweepOverdue(now: Date): Promise<number> {
    const result = await this.sessionModel
      .updateMany({ status: SessionStatus.SCHEDULED, endsAt: { $lte: now } }, { $set: { status: SessionStatus.REPORT_PENDING } })
      .exec();
    return result.modifiedCount;
  }
}
