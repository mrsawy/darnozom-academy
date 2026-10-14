import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, GroupPaymentStatus, GroupStatus, GroupStudentStatus, Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from '../common/actor';
import { escapeRegex } from '../common/escape-regex';
import { Group } from './entities/group.entity';
import { GroupStateService } from './group-state.service';
import { GroupLean, GroupView } from './group.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const CANDIDATE_LIMIT = 20;

@Injectable()
export class GroupStudentsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly state: GroupStateService
  ) {}

  private hasStudent(group: GroupLean, studentId: string) {
    return group.students.some((s) => String(s.studentId) === studentId);
  }

  async studentCandidates(actor: AcademicsActor, id: string, q?: string) {
    const group = await this.state.loadInOrg(actor, id);
    const filter: FilterQuery<User> = {
      organizationId: oid(actor.organizationId),
      roleName: Roles.STUDENT,
      deletedAt: null,
      _id: { $nin: group.students.map((s) => s.studentId) },
    };
    const text = q?.trim();
    if (text) {
      const pattern = new RegExp(escapeRegex(text), 'i');
      filter.$or = [{ firstName: pattern }, { lastName: pattern }, { username: pattern }, { email: pattern }];
    }
    return this.userModel.find(filter).select('_id firstName lastName username email').limit(CANDIDATE_LIMIT).lean().exec();
  }

  async addStudent(actor: AcademicsActor, id: string, studentId: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const student = await this.userModel
      .findOne({ _id: oid(studentId), organizationId: oid(actor.organizationId), roleName: Roles.STUDENT, deletedAt: null })
      .select('_id')
      .lean()
      .exec();
    if (!student) throw new BadRequestException(AcademicsErrors.STUDENT_NOT_FOUND_IN_ORGANIZATION);
    if (this.hasStudent(group, studentId)) throw new ConflictException(AcademicsErrors.STUDENT_ALREADY_IN_GROUP);

    // One conditional update so concurrent adds can never exceed maxStudents or duplicate a student.
    const result = await this.groupModel
      .updateOne(
        {
          _id: group._id,
          status: { $ne: GroupStatus.CANCELLED },
          deletedAt: null,
          'students.studentId': { $ne: oid(studentId) },
          $expr: {
            $lt: [{ $size: { $filter: { input: '$students', cond: { $ne: ['$$this.status', GroupStudentStatus.WITHDRAWN] } } } }, '$maxStudents'],
          },
        },
        {
          $push: {
            students: {
              studentId: oid(studentId),
              paymentStatus: GroupPaymentStatus.UNPAID,
              whatsappAdded: false,
              status: GroupStudentStatus.ACTIVE,
              addedAt: new Date(),
              addedBy: oid(actor._id),
            },
          },
        }
      )
      .exec();

    if (result.modifiedCount === 0) {
      const current = await this.groupModel.findOne({ _id: group._id }).lean<GroupLean>().exec();
      if (!current) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
      if (current.status === GroupStatus.CANCELLED) throw new ConflictException(AcademicsErrors.GROUP_CANCELLED);
      if (this.hasStudent(current, studentId)) throw new ConflictException(AcademicsErrors.STUDENT_ALREADY_IN_GROUP);
      throw new ConflictException(AcademicsErrors.GROUP_FULL);
    }
    return this.state.syncReadiness(group._id);
  }

  async removeStudent(actor: AcademicsActor, id: string, studentId: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const entry = group.students.find((s) => String(s.studentId) === studentId);
    if (!entry || entry.status === GroupStudentStatus.WITHDRAWN) throw new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP);
    // A running group keeps the entry (as WITHDRAWN) so attendance history still points at a student.
    await (group.status === GroupStatus.RUNNING
      ? this.markWithdrawn(group._id, studentId)
      : this.groupModel.updateOne({ _id: group._id }, { $pull: { students: { studentId: oid(studentId) } } }).exec());
    return this.state.syncReadiness(group._id);
  }

  /** Sets the student's entry to WITHDRAWN (kept for history). Used when removing from a running group and by follow-up decisions. */
  async markWithdrawn(groupId: Types.ObjectId, studentId: string): Promise<void> {
    await this.groupModel
      .updateOne(
        { _id: groupId, 'students.studentId': oid(studentId) },
        { $set: { 'students.$.status': GroupStudentStatus.WITHDRAWN, 'students.$.withdrawnAt': new Date() } }
      )
      .exec();
  }

  async setWhatsapp(actor: AcademicsActor, id: string, studentId: string, whatsappAdded: boolean): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const result = await this.groupModel
      .updateOne({ _id: group._id, 'students.studentId': oid(studentId) }, { $set: { 'students.$.whatsappAdded': whatsappAdded } })
      .exec();
    if (result.matchedCount === 0) throw new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP);
    return this.state.syncReadiness(group._id);
  }
}
