import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus, MeetingProvider, PRESENCE_GRACE_MINUTES, PresenceRole } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { ParentService } from 'src/user/services/parent.service';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { PresenceSegment, totalSeconds } from '../domain/presence';
import { effectiveSessionStatus, redactSession, SessionAudience, statusFilterFor } from '../domain/session-rules';
import { resolveSessionScope } from '../domain/session-scope';
import { Group } from '../group/entities/group.entity';
import { FindSessionsPayload } from './dto/session.dto';
import { Session } from './entities/session.entity';
import { SessionPresence } from './entities/session-presence.entity';
import { SessionDetailView, SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const LIST_LIMIT = 500;

interface ResolvedScope {
  filter: FilterQuery<Session>;
  audience: SessionAudience;
  visibleStudentIds: string[] | null;
}

@Injectable()
export class SessionQueryService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(SessionPresence.name) private readonly presenceModel: Model<SessionPresence>,
    private readonly parentService: ParentService
  ) {}

  private async groupIdsOf(studentIds: string[]): Promise<Types.ObjectId[]> {
    const groups = await this.groupModel
      .find(withNotDeletedFilter({ 'students.studentId': { $in: studentIds.map((id) => oid(id)) } }))
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    return groups.map((group) => group._id);
  }

  /** Null means the actor may not read any session. */
  private async resolveScope(actor: AcademicsActor, childId?: string): Promise<ResolvedScope | null> {
    const scope = resolveSessionScope(actor);
    switch (scope.kind) {
      case 'ORG': {
        return { filter: { organizationId: oid(actor.organizationId) }, audience: scope.audience, visibleStudentIds: null };
      }
      case 'TEACHER': {
        return { filter: { teacherId: oid(scope.teacherId) }, audience: 'STAFF', visibleStudentIds: null };
      }
      case 'PARENT': {
        let childIds: string[];
        if (childId) {
          await this.parentService.validateParentChildLink(oid(scope.parentId), oid(childId));
          childIds = [childId];
        } else {
          const parent = await this.userModel
            .findOne({ _id: oid(scope.parentId) })
            .select('childUsersIds')
            .lean<{ childUsersIds?: Types.ObjectId[] }>()
            .exec();
          childIds = (parent?.childUsersIds ?? []).map(String);
        }
        return { filter: { groupId: { $in: await this.groupIdsOf(childIds) } }, audience: 'FAMILY', visibleStudentIds: childIds };
      }
      case 'STUDENT': {
        return { filter: { groupId: { $in: await this.groupIdsOf([scope.studentId]) } }, audience: 'FAMILY', visibleStudentIds: [scope.studentId] };
      }
      default: {
        return null;
      }
    }
  }

  /** The session's own teacher always gets the full view of it; everyone else gets their scope's redaction. */
  private present(session: SessionLean, resolved: ResolvedScope, actorId: string, now: Date, groupName?: string): SessionView {
    const own = String(session.teacherId) === actorId;
    const redacted = redactSession(session, own ? 'STAFF' : resolved.audience, own ? null : resolved.visibleStudentIds);
    return { ...redacted, status: effectiveSessionStatus(session, now), ...(groupName ? { groupName } : {}) };
  }

  private async peopleNames(ids: string[]): Promise<Record<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return {};
    const users = await this.userModel
      .find({ _id: { $in: unique.map((id) => oid(id)) } })
      .select('_id firstName lastName')
      .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
      .exec();
    return Object.fromEntries(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
  }

  async findAll(actor: AcademicsActor, query: FindSessionsPayload): Promise<SessionView[]> {
    const now = new Date();
    const resolved = await this.resolveScope(actor, query.childId);
    if (!resolved) return [];

    const requested: FilterQuery<Session> = {};
    if (query.groupId) requested.groupId = oid(query.groupId);
    if (query.teacherId) requested.teacherId = oid(query.teacherId);
    if (query.from || query.to) {
      requested.startsAt = { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lt: new Date(query.to) } : {}) };
    }
    const statusFilter = query.status ? statusFilterFor(query.status, now) : {};

    // The scope goes last so it always overrides the requested filters.
    const sessions = await this.sessionModel
      .find({ $and: [requested, statusFilter, resolved.filter] })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ startsAt: 1 })
      .limit(LIST_LIMIT)
      .lean<SessionLean[]>()
      .exec();

    const groupIds = [...new Set(sessions.map((s) => String(s.groupId)))];
    const groups =
      groupIds.length > 0
        ? await this.groupModel
            .find({ _id: { $in: groupIds.map((id) => oid(id)) } })
            .select('_id name')
            .lean<{ _id: Types.ObjectId; name: string }[]>()
            .exec()
        : [];
    const names = new Map(groups.map((g) => [String(g._id), g.name]));
    return sessions.map((session) => this.present(session, resolved, actor._id, now, names.get(String(session.groupId))));
  }

  /** Who joined through the platform and for how long. Staff and the session's own teacher only; never families or accountants. */
  private async presenceFor(session: SessionLean, own: boolean, resolved: ResolvedScope): Promise<SessionDetailView['presence']> {
    if (!own && resolved.audience !== 'STAFF') return [];
    const rows = await this.presenceModel
      .find({ sessionId: session._id })
      .lean<{ userId: Types.ObjectId; role: PresenceRole; firstJoinedAt: Date; lastSeenAt: Date; segments: PresenceSegment[] }[]>()
      .exec();
    const cap = new Date(session.endsAt.getTime() + PRESENCE_GRACE_MINUTES * 60_000);
    const visible = own ? null : resolved.visibleStudentIds;
    return rows
      .filter((row) => !visible || row.role === PresenceRole.TEACHER || visible.includes(String(row.userId)))
      .map((row) => ({
        userId: String(row.userId),
        role: row.role,
        firstJoinedAt: row.firstJoinedAt,
        totalSeconds: totalSeconds(row.segments, row.lastSeenAt, cap),
      }));
  }

  async findOne(actor: AcademicsActor, id: string): Promise<SessionDetailView> {
    const now = new Date();
    const resolved = await this.resolveScope(actor);
    if (!resolved) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    const session = await this.sessionModel
      .findOne({ $and: [{ _id: oid(id) }, resolved.filter] })
      .lean<SessionLean>()
      .exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);

    const group = await this.groupModel
      .findOne({ _id: session.groupId })
      .select('name students meetingProvider')
      .lean<{ name: string; meetingProvider?: MeetingProvider; students?: { studentId: Types.ObjectId; status?: GroupStudentStatus }[] }>()
      .exec();
    const view = this.present(session, resolved, actor._id, now, group?.name);
    const own = String(session.teacherId) === actor._id;
    const visibleIds = String(session.teacherId) === actor._id ? null : resolved.visibleStudentIds;
    const active = (group?.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).map((s) => String(s.studentId));
    const roster = visibleIds ? active.filter((studentId) => visibleIds.includes(studentId)) : active;
    const people = await this.peopleNames([
      ...roster,
      String(session.teacherId),
      ...view.attendance.map((a) => String(a.studentId)),
      ...(view.report?.evaluations ?? []).map((e) => String(e.studentId)),
    ]);
    const presence = await this.presenceFor(session, own, resolved);
    return { ...view, roster, people, presence, ...(group?.meetingProvider ? { meetingProvider: group.meetingProvider } : {}) };
  }
}
