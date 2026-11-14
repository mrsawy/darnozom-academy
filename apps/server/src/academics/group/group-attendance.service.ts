import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus } from '@darnozom/shared-types';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from '../common/actor';
import { AttendanceMatrix, buildAttendanceMatrix, MatrixSessionInput } from '../domain/attendance-matrix';
import { resolveGroupScope } from '../domain/group-scope';
import { Session } from '../session/entities/session.entity';
import { Group } from './entities/group.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

/** Read-only attendance grid of one group (students x sessions) for staff and the group's own teacher. */
@Injectable()
export class GroupAttendanceService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  async matrix(actor: AcademicsActor, groupId: string, now: Date = new Date()): Promise<AttendanceMatrix> {
    const scope = resolveGroupScope(actor);
    if (scope.kind !== 'ORG' && scope.kind !== 'TEACHER') throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);

    const group = await this.groupModel
      .findOne(
        withNotDeletedFilter({
          _id: oid(groupId),
          organizationId: oid(actor.organizationId),
          ...(scope.kind === 'TEACHER' ? { teacherId: oid(scope.teacherId) } : {}),
        })
      )
      .select('name students')
      .lean<{ students?: { studentId: Types.ObjectId; status?: GroupStudentStatus }[] }>()
      .exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);

    const studentIds = (group.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).map((s) => s.studentId);
    const [sessions, users] = await Promise.all([
      this.sessionModel
        .find({ groupId: oid(groupId), organizationId: oid(actor.organizationId) })
        .select('_id sequence startsAt endsAt status teacherAttendance attendance')
        .lean<MatrixSessionInput[]>()
        .exec(),
      this.userModel
        .find({ _id: { $in: studentIds } })
        .select('_id firstName lastName')
        .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
        .exec(),
    ]);
    const names = new Map(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
    const students = studentIds.map((studentId) => ({ id: String(studentId), name: names.get(String(studentId)) ?? String(studentId) }));
    return buildAttendanceMatrix(sessions, students, now);
  }
}
