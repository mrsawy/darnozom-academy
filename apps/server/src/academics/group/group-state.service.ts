import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, GroupPaymentStatus, GroupStatus, READINESS_LOST_REASON } from '@darnozom/shared-types';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { shouldRevertToForming } from '../domain/group-status';
import { computeReadiness } from '../domain/readiness';
import { Group } from './entities/group.entity';
import { Cohort } from '../cohort/entities/cohort.entity';
import { GroupLean, GroupView } from './group.types';
import { TaskClosingService } from '../task/task-closing.service';
import { FamilyPaymentStatusService } from 'src/billing/status/family-payment-status.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class GroupStateService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly paymentStatus: FamilyPaymentStatusService,
    private readonly taskClosing: TaskClosingService
  ) {}

  /**
   * Replaces the group's stored `students[].paymentStatus` with the value derived from the ledger,
   * so `computeReadiness` stays a pure function reading a field while the field itself is now a
   * fact about money rather than something a person toggled (plan decision D4).
   */
  async withDerivedPaymentStatus(group: GroupLean): Promise<GroupLean> {
    if (group.students.length === 0) return group;
    const cohort = await this.cohortModel.findOne({ _id: group.cohortId }).lean<{ startDate: Date } | null>().exec();
    const statuses = await this.paymentStatus.forGroup(
      group._id,
      group.students.map((student) => String(student.studentId)),
      cohort?.startDate ?? null
    );
    return {
      ...group,
      students: group.students.map((student) => ({
        ...student,
        paymentStatus: (statuses.get(String(student.studentId)) ?? student.paymentStatus) as unknown as GroupPaymentStatus,
      })),
    };
  }

  async toView(group: GroupLean): Promise<GroupView> {
    const derived = await this.withDerivedPaymentStatus(group);
    return { ...derived, readiness: computeReadiness(derived) };
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
    const derived = await this.withDerivedPaymentStatus(group);
    const readiness = computeReadiness(derived);
    // The single point sub-project 1 calls after every readiness-affecting write, so no caller
    // needs to know pre-start tasks exist.
    await this.taskClosing.closeDoneItems(derived, new Date());
    if (!shouldRevertToForming(derived.status, readiness.ready)) return { ...derived, readiness };

    await this.groupModel
      .updateOne(
        { _id: derived._id, status: GroupStatus.READY_TO_START },
        {
          $set: { status: GroupStatus.FORMING },
          $push: {
            statusHistory: { from: GroupStatus.READY_TO_START, to: GroupStatus.FORMING, by: null, at: new Date(), reason: READINESS_LOST_REASON },
          },
        }
      )
      .exec();
    return { ...derived, status: GroupStatus.FORMING, readiness };
  }
}
