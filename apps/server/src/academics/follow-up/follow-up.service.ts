import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, FollowUpDecision } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Group } from '../group/entities/group.entity';
import { GroupStudentsService } from '../group/group-students.service';
import { FollowUpLean } from '../session/session.types';
import { FollowUpDto } from './dto/follow-up.dto';
import { FollowUp } from './entities/follow-up.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class FollowUpService {
  constructor(
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUp>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly groupStudents: GroupStudentsService
  ) {}

  async list(actor: AcademicsActor, groupId: string): Promise<{ rows: FollowUpLean[]; people: Record<string, string> }> {
    const organizationId = oid(actor.organizationId);
    const group = await this.groupModel
      .findOne(withNotDeletedFilter({ _id: oid(groupId), organizationId }))
      .select('_id')
      .lean()
      .exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const rows = await this.followUpModel
      .find({ groupId: oid(groupId), organizationId })
      .lean<FollowUpLean[]>()
      .exec();
    const users =
      rows.length > 0
        ? await this.userModel
            .find({ _id: { $in: rows.map((r) => r.studentId) } })
            .select('_id firstName lastName')
            .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
            .exec()
        : [];
    const people = Object.fromEntries(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
    return { rows, people };
  }

  /** Records the parent's feedback and the continue/withdraw decision; WITHDRAW marks the student WITHDRAWN in the group (R9: not reversible here). */
  async update(actor: AcademicsActor, id: string, dto: FollowUpDto): Promise<FollowUpLean> {
    const query = { _id: oid(id), organizationId: oid(actor.organizationId) };
    const row = await this.followUpModel.findOne(query).lean<FollowUpLean>().exec();
    if (!row) throw new NotFoundException(AcademicsErrors.FOLLOW_UP_NOT_FOUND);

    const $set: Record<string, unknown> = { recordedBy: oid(actor._id), recordedAt: new Date() };
    if (dto.parentFeedback !== undefined) $set.parentFeedback = dto.parentFeedback.trim();
    if (dto.decision !== undefined) $set.decision = dto.decision;
    await this.followUpModel.updateOne({ _id: row._id }, { $set }).exec();

    if (dto.decision === FollowUpDecision.WITHDRAW) await this.groupStudents.markWithdrawn(row.groupId, String(row.studentId));
    const updated = await this.followUpModel.findOne(query).lean<FollowUpLean>().exec();
    return updated ?? row;
  }
}
