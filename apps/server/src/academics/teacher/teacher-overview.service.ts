import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus, hasAnyRole, hasRole, PRESENCE_GRACE_MINUTES, PresenceRole, Roles, SessionStatus } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { PresenceSegment, totalSeconds } from '../domain/presence';
import { effectiveSessionStatus } from '../domain/session-rules';
import { PEDAGOGICAL_ORG_ROLES } from '../domain/session-scope';
import { computeTeacherStats, TeacherStats, TeacherStatsSession } from '../domain/teacher-stats';
import { Group } from '../group/entities/group.entity';
import { SessionPresence } from '../session/entities/session-presence.entity';
import { Session } from '../session/entities/session.entity';
import { SupervisionEvaluation } from '../supervision/entities/supervision-evaluation.entity';
import { TeacherOverviewPayload } from './dto/teacher.dto';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const SESSION_LIMIT = 1000;
const EVALUATION_LIMIT = 200;
const RECENT_SESSIONS = 20;
const RECENT_EVALUATIONS = 5;
const CRITERIA = ['commitment', 'teaching', 'pedagogy', 'contentAdherence', 'technicalQuality'] as const;
type Criterion = (typeof CRITERIA)[number];
const round2 = (value: number) => Math.round(value * 100) / 100;

export interface TeacherOverview {
  teacher: { id: string; name: string; email?: string; phone?: string; avatar?: string };
  groups: { id: string; name: string; status: string; activeStudents: number }[];
  stats: TeacherStats;
  evaluations: {
    count: number;
    averages: Record<Criterion, number> | null;
    recent: ({ id: string; sessionId: string; createdAt: Date } & Record<Criterion, number>)[];
  };
  recentSessions: {
    id: string;
    groupId: string;
    groupName?: string;
    sequence: number;
    startsAt: Date;
    status: SessionStatus;
    teacherAttendance: string | null;
    reportSubmitted: boolean;
    joinedAt: Date | null;
    joinedMinutes: number | null;
  }[];
}

type EvaluationLean = { _id: Types.ObjectId; sessionId: Types.ObjectId; createdAt: Date } & Record<Criterion, number>;

/** One teacher's work, attendance, reports and evaluations: the teacher themself, or pedagogical staff of the organization. */
@Injectable()
export class TeacherOverviewService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(SessionPresence.name) private readonly presenceModel: Model<SessionPresence>,
    @InjectModel(SupervisionEvaluation.name) private readonly evaluationModel: Model<SupervisionEvaluation>
  ) {}

  async overview(actor: AcademicsActor, payload: TeacherOverviewPayload, now: Date = new Date()): Promise<TeacherOverview> {
    if (actor._id !== payload.id && !hasAnyRole(actor, PEDAGOGICAL_ORG_ROLES)) throw new ForbiddenException(AcademicsErrors.TEACHER_ACCESS_DENIED);

    const organizationId = oid(actor.organizationId);
    const teacherId = oid(payload.id);
    const user = await this.userModel
      .findOne({ _id: teacherId, organizationId })
      .select('firstName lastName email phone avatar roleName additionalRoles')
      .lean<{ firstName?: string; lastName?: string; email?: string; phone?: string; avatar?: string; roleName?: Roles; additionalRoles?: Roles[] }>()
      .exec();
    if (!user || !hasRole({ roleName: user.roleName ?? '', additionalRoles: user.additionalRoles }, Roles.INSTRUCTOR)) {
      throw new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION);
    }

    const range = payload.from || payload.to ? { startsAt: { ...(payload.from ? { $gte: new Date(payload.from) } : {}), ...(payload.to ? { $lt: new Date(payload.to) } : {}) } } : {};
    const sessionFilter: FilterQuery<Session> = { organizationId, teacherId, ...range };

    const [groups, sessions, evaluations] = await Promise.all([
      this.groupModel
        .find(withNotDeletedFilter({ organizationId, teacherId }))
        .select('_id name status students')
        .lean<{ _id: Types.ObjectId; name: string; status: string; students?: { status?: GroupStudentStatus }[] }[]>()
        .exec(),
      this.sessionModel
        .find(sessionFilter)
        .select('_id groupId sequence startsAt endsAt status teacherAttendance report')
        .sort({ startsAt: -1 })
        .limit(SESSION_LIMIT)
        .lean<(TeacherStatsSession & { _id: Types.ObjectId; groupId: Types.ObjectId; sequence: number })[]>()
        .exec(),
      this.evaluationModel
        .find({ organizationId, teacherId })
        .select('_id sessionId createdAt commitment teaching pedagogy contentAdherence technicalQuality')
        .sort({ createdAt: -1 })
        .limit(EVALUATION_LIMIT)
        .lean<EvaluationLean[]>()
        .exec(),
    ]);

    const presence = await this.presenceModel
      .find({ organizationId, userId: teacherId, role: PresenceRole.TEACHER, sessionId: { $in: sessions.map((s) => s._id) } })
      .select('sessionId firstJoinedAt lastSeenAt segments')
      .lean<{ sessionId: Types.ObjectId; firstJoinedAt: Date; lastSeenAt: Date; segments: PresenceSegment[] }[]>()
      .exec();
    const presenceOf = new Map(presence.map((row) => [String(row.sessionId), row]));
    const groupName = new Map(groups.map((g) => [String(g._id), g.name]));

    return {
      teacher: {
        id: payload.id,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        ...(user.email ? { email: user.email } : {}),
        ...(user.phone ? { phone: user.phone } : {}),
        ...(user.avatar ? { avatar: user.avatar } : {}),
      },
      groups: groups.map((g) => ({
        id: String(g._id),
        name: g.name,
        status: g.status,
        activeStudents: (g.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).length,
      })),
      stats: computeTeacherStats(sessions, presence, now),
      evaluations: this.summarize(evaluations),
      recentSessions: sessions.slice(0, RECENT_SESSIONS).map((session) => {
        const joined = presenceOf.get(String(session._id));
        const cap = new Date(session.endsAt.getTime() + PRESENCE_GRACE_MINUTES * 60_000);
        return {
          id: String(session._id),
          groupId: String(session.groupId),
          ...(groupName.has(String(session.groupId)) ? { groupName: groupName.get(String(session.groupId)) } : {}),
          sequence: session.sequence,
          startsAt: session.startsAt,
          status: effectiveSessionStatus(session, now),
          teacherAttendance: session.teacherAttendance ?? null,
          reportSubmitted: !!session.report,
          joinedAt: joined?.firstJoinedAt ?? null,
          joinedMinutes: joined ? Math.round(totalSeconds(joined.segments, joined.lastSeenAt, cap) / 60) : null,
        };
      }),
    };
  }

  private summarize(rows: EvaluationLean[]): TeacherOverview['evaluations'] {
    if (rows.length === 0) return { count: 0, averages: null, recent: [] };
    const averages = Object.fromEntries(CRITERIA.map((key) => [key, round2(rows.reduce((sum, row) => sum + row[key], 0) / rows.length)])) as Record<Criterion, number>;
    const recent = rows.slice(0, RECENT_EVALUATIONS).map((row) => ({
      id: String(row._id),
      sessionId: String(row.sessionId),
      createdAt: row.createdAt,
      ...(Object.fromEntries(CRITERIA.map((key) => [key, row[key]])) as Record<Criterion, number>),
    }));
    return { count: rows.length, averages, recent };
  }
}
