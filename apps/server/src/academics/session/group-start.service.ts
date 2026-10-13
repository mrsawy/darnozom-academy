import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, SessionStatus, TaskClosedReason } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { generateSessions } from '../domain/session-generation';
import { Group } from '../group/entities/group.entity';
import { GroupStateService } from '../group/group-state.service';
import { GroupView } from '../group/group.types';
import { TaskClosingService } from '../task/task-closing.service';
import { Session } from './entities/session.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class GroupStartService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectConnection() private readonly connection: Connection,
    private readonly state: GroupStateService,
    private readonly taskClosing: TaskClosingService
  ) {}

  /** READY_TO_START → RUNNING and every session created in one transaction. */
  async start(actor: AcademicsActor, groupId: string): Promise<GroupView> {
    const group = await this.state.loadInOrg(actor, groupId);
    if (group.status === GroupStatus.CANCELLED) throw new ConflictException(AcademicsErrors.GROUP_CANCELLED);
    if (group.status === GroupStatus.COMPLETED) throw new ConflictException(AcademicsErrors.GROUP_COMPLETED);
    if (group.status !== GroupStatus.READY_TO_START || !group.teacherId) throw new ConflictException(AcademicsErrors.GROUP_NOT_READY);
    if (!group.totalSessions) throw new ConflictException(AcademicsErrors.GROUP_TOTAL_SESSIONS_REQUIRED);

    const cohort = await this.cohortModel.findOne({ _id: group.cohortId }).select('startDate').lean<{ startDate: Date }>().exec();
    if (!cohort) throw new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND);

    const generated = generateSessions(group.schedule, group.timezone, cohort.startDate, group.totalSessions);
    const now = new Date();
    const dbSession = await this.connection.startSession();
    try {
      await dbSession.withTransaction(async () => {
        // Conditional update: a concurrent start matches nothing, so its sessions are never inserted.
        const started = await this.groupModel
          .updateOne(
            { _id: group._id, status: GroupStatus.READY_TO_START, deletedAt: null },
            {
              $set: { status: GroupStatus.RUNNING },
              $push: { statusHistory: { from: GroupStatus.READY_TO_START, to: GroupStatus.RUNNING, by: oid(actor._id), at: now } },
            },
            { session: dbSession }
          )
          .exec();
        if (started.modifiedCount === 0) throw new ConflictException(AcademicsErrors.GROUP_NOT_READY);
        await this.sessionModel.insertMany(
          generated.map((item) => ({
            organizationId: group.organizationId,
            groupId: group._id,
            teacherId: group.teacherId,
            sequence: item.sequence,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            status: SessionStatus.SCHEDULED,
            attendance: [],
          })),
          { session: dbSession }
        );
      });
    } finally {
      await dbSession.endSession();
    }
    await this.taskClosing.closeAll(group._id, TaskClosedReason.GROUP_STARTED, now);
    return this.state.syncReadiness(group._id);
  }
}
