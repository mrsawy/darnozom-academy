import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { effectiveSessionStatus } from '../domain/session-rules';
import { Group } from '../group/entities/group.entity';
import { Session } from './entities/session.entity';
import { SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class SessionStateService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  async loadInOrg(actor: AcademicsActor, id: string): Promise<SessionLean> {
    const session = await this.sessionModel
      .findOne({ _id: oid(id), organizationId: oid(actor.organizationId) })
      .lean<SessionLean>()
      .exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    return session;
  }

  /** Students who count for attendance and evaluations: everyone not WITHDRAWN (legacy entries have no status). */
  async activeStudentIds(groupId: Types.ObjectId): Promise<string[]> {
    const group = await this.groupModel
      .findOne({ _id: groupId })
      .select('students')
      .lean<{ students?: { studentId: Types.ObjectId; status?: GroupStudentStatus }[] }>()
      .exec();
    return (group?.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).map((s) => String(s.studentId));
  }

  toView(session: SessionLean, now: Date = new Date()): SessionView {
    return { ...session, status: effectiveSessionStatus(session, now) };
  }

  async reload(id: Types.ObjectId, now: Date = new Date()): Promise<SessionView> {
    const session = await this.sessionModel.findOne({ _id: id }).lean<SessionLean>().exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    return this.toView(session, now);
  }
}
