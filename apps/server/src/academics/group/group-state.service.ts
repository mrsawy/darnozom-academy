import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, READINESS_LOST_REASON } from '@darnozom/shared-types';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { shouldRevertToForming } from '../domain/group-status';
import { computeReadiness } from '../domain/readiness';
import { Group } from './entities/group.entity';
import { GroupLean, GroupView } from './group.types';
import { TaskClosingService } from '../task/task-closing.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class GroupStateService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly taskClosing: TaskClosingService
  ) {}

  toView(group: GroupLean): GroupView {
    return { ...group, readiness: computeReadiness(group) };
  }

  async loadInOrg(actor: AcademicsActor, id: string): Promise<GroupLean> {
    const group = await this.groupModel
      .findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) }))
      .lean<GroupLean>()
      .exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    return group;
  }

  async loadForWrite(actor: AcademicsActor, id: string): Promise<GroupLean> {
    const group = await this.loadInOrg(actor, id);
    if (group.status === GroupStatus.CANCELLED) throw new ConflictException(AcademicsErrors.GROUP_CANCELLED);
    if (group.status === GroupStatus.COMPLETED) throw new ConflictException(AcademicsErrors.GROUP_COMPLETED);
    return group;
  }

  /** Call after every write that can affect readiness. */
  async syncReadiness(groupId: string | Types.ObjectId): Promise<GroupView> {
    const group = await this.groupModel
      .findOne({ _id: oid(groupId) })
      .lean<GroupLean>()
      .exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const readiness = computeReadiness(group);
    // The single point sub-project 1 calls after every readiness-affecting write, so no caller
    // needs to know pre-start tasks exist.
    await this.taskClosing.closeDoneItems(group, new Date());
    if (!shouldRevertToForming(group.status, readiness.ready)) return { ...group, readiness };

    await this.groupModel
      .updateOne(
        { _id: group._id, status: GroupStatus.READY_TO_START },
        {
          $set: { status: GroupStatus.FORMING },
          $push: {
            statusHistory: { from: GroupStatus.READY_TO_START, to: GroupStatus.FORMING, by: null, at: new Date(), reason: READINESS_LOST_REASON },
          },
        }
      )
      .exec();
    return { ...group, status: GroupStatus.FORMING, readiness };
  }
}
