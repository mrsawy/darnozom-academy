import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { Group } from '../group/entities/group.entity';
import { Session } from '../session/entities/session.entity';
import { SupervisionEvaluation } from './entities/supervision-evaluation.entity';
import { SupervisionEvaluationLean } from './supervision.types';
import { areScoresValid, canEvaluate, isHeldSession } from './supervision-rules';
import { SupervisionScoresDto } from './dto/supervision.dto';

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
}
