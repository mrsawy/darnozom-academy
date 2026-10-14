import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { Group } from '../group/entities/group.entity';
import { Session } from '../session/entities/session.entity';
import { SupervisionEvaluation } from './entities/supervision-evaluation.entity';
import { SupervisionEvaluationLean, SupervisionEvaluationView } from './supervision.types';
import { areScoresValid, canEvaluate, isHeldSession, isWithinEditWindow } from './supervision-rules';
import { FindEvaluationsPayload, SupervisionScoresDto } from './dto/supervision.dto';
import { resolveEvaluationScope } from './supervision-scope';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const DUPLICATE_KEY = 11_000;

interface SessionForEvaluation {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sequence: number;
  startsAt: Date;
  status: SessionStatus;
}

interface GroupForEvaluation {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  supervisorId: Types.ObjectId | null;
}

@Injectable()
export class SupervisionService {
  constructor(
    @InjectModel(SupervisionEvaluation.name) private readonly evaluationModel: Model<SupervisionEvaluation>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  async create(actor: AcademicsActor, sessionId: string, dto: SupervisionScoresDto): Promise<SupervisionEvaluationLean> {
    const session = await this.sessionModel
      .findOne({ _id: oid(sessionId), organizationId: oid(actor.organizationId) })
      .lean<SessionForEvaluation | null>()
      .exec();
    if (!session) throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);

    const group = await this.groupModel.findOne({ _id: session.groupId }).lean<GroupForEvaluation | null>().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);

    if (!canEvaluate(actor, group)) throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);
    if (!isHeldSession(session.status)) throw new ConflictException(AcademicsErrors.SESSION_NOT_HELD);
    if (!areScoresValid(dto as unknown as Record<string, unknown>)) {
      throw new BadRequestException(AcademicsErrors.EVALUATION_INVALID);
    }

    try {
      const created = await this.evaluationModel.create({
        organizationId: session.organizationId,
        sessionId: session._id,
        groupId: session.groupId,
        teacherId: session.teacherId,
        // Whoever holds the seat now, not whoever held it when the session ran (plan decision D3).
        supervisorId: oid(actor._id),
        commitment: dto.commitment,
        teaching: dto.teaching,
        pedagogy: dto.pedagogy,
        contentAdherence: dto.contentAdherence,
        technicalQuality: dto.technicalQuality,
        notes: dto.notes ?? {},
      });
      return created as unknown as SupervisionEvaluationLean;
    } catch (error) {
      // The unique index, not a read-then-write check, is what makes "one evaluation each" true.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictException(AcademicsErrors.EVALUATION_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  /**
   * The author revises their own evaluation inside the edit window. Nobody else may, not even a
   * manager: an evaluation is one named person's judgment, and a second hand editing it silently
   * would make the record a lie.
   */
  async update(actor: AcademicsActor, id: string, dto: SupervisionScoresDto, now: Date = new Date()): Promise<SupervisionEvaluationLean> {
    const evaluation = await this.evaluationModel
      .findOne({ _id: oid(id), organizationId: oid(actor.organizationId) })
      .lean<SupervisionEvaluationLean | null>()
      .exec();
    if (!evaluation) throw new NotFoundException(AcademicsErrors.EVALUATION_NOT_FOUND);

    if (String(evaluation.supervisorId) !== actor._id) throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);
    if (!isWithinEditWindow(evaluation.createdAt, now)) {
      throw new ConflictException(AcademicsErrors.EVALUATION_EDIT_WINDOW_CLOSED);
    }
    if (!areScoresValid(dto as unknown as Record<string, unknown>)) {
      throw new BadRequestException(AcademicsErrors.EVALUATION_INVALID);
    }

    // Only the scores and the notes. The session, group, teacher and author are fixed for ever.
    const set = {
      commitment: dto.commitment,
      teaching: dto.teaching,
      pedagogy: dto.pedagogy,
      contentAdherence: dto.contentAdherence,
      technicalQuality: dto.technicalQuality,
      notes: dto.notes ?? {},
    };
    await this.evaluationModel.updateOne({ _id: evaluation._id }, { $set: set }).exec();
    return { ...evaluation, ...set };
  }

  /** Every evaluation the caller is allowed to see, newest first, with the names a list needs. */
  async findAll(actor: AcademicsActor, query: FindEvaluationsPayload): Promise<SupervisionEvaluationView[]> {
    const scope = resolveEvaluationScope(actor);
    if (scope.kind === 'NONE') throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);

    const filter: FilterQuery<SupervisionEvaluation> = { organizationId: oid(actor.organizationId) };
    if (query.groupId) filter.groupId = oid(query.groupId);
    // A teacher's own id wins over whatever they asked for, so the filter cannot be widened.
    if (scope.kind === 'OWN_TEACHING') filter.teacherId = oid(scope.teacherId);
    else if (query.teacherId) filter.teacherId = oid(query.teacherId);

    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      };
    }

    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    const rows = await this.evaluationModel.find(filter).sort({ createdAt: -1 }).lean<SupervisionEvaluationLean[]>().exec();
    return this.decorate(rows);
  }

  /** The evaluations of one session, for the read-only panel beside the report. */
  async findForSession(actor: AcademicsActor, sessionId: string): Promise<SupervisionEvaluationView[]> {
    const scope = resolveEvaluationScope(actor);
    if (scope.kind === 'NONE') throw new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR);

    const filter: FilterQuery<SupervisionEvaluation> = {
      organizationId: oid(actor.organizationId),
      sessionId: oid(sessionId),
    };
    if (scope.kind === 'OWN_TEACHING') filter.teacherId = oid(scope.teacherId);

    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    const rows = await this.evaluationModel.find(filter).sort({ createdAt: -1 }).lean<SupervisionEvaluationLean[]>().exec();
    return this.decorate(rows);
  }

  private async decorate(rows: SupervisionEvaluationLean[]): Promise<SupervisionEvaluationView[]> {
    if (rows.length === 0) return [];

    const groups = await this.groupModel
      .find({ _id: { $in: rows.map((row) => row.groupId) } })
      .select('_id name')
      .lean<{ _id: Types.ObjectId; name: string }[]>()
      .exec();
    const sessions = await this.sessionModel
      .find({ _id: { $in: rows.map((row) => row.sessionId) } })
      .select('_id sequence startsAt')
      .lean<{ _id: Types.ObjectId; sequence: number; startsAt: Date }[]>()
      .exec();

    const names = new Map(groups.map((group) => [String(group._id), group.name]));
    const bySession = new Map(sessions.map((session) => [String(session._id), session]));

    return rows.map((row) => {
      const session = bySession.get(String(row.sessionId));
      return {
        ...row,
        groupName: names.get(String(row.groupId)) ?? '',
        sessionSequence: session?.sequence ?? 0,
        sessionStartsAt: session?.startsAt ?? row.createdAt,
      };
    });
  }
}
