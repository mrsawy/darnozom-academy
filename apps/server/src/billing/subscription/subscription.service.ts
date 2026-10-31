import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingErrors, BillingSubscriptionStatus, SubscriptionType } from '@darnozom/shared-types';
import { Cohort } from '../../academics/cohort/entities/cohort.entity';
import { Group } from '../../academics/group/entities/group.entity';
import { BillingActor, BillingSubscriptionLean } from '../billing.types';
import { initialCharges } from '../domain/charge-schedule';
import { isValidAmountMinor } from '../domain/money';
import { CreateSubscriptionPayload } from '../dto/billing.dto';
import { BillingSubscription } from '../entities/subscription.entity';
import { FamilyService } from '../family/family.service';
import { LedgerService } from '../ledger/ledger.service';

const oid = (id: string | Types.ObjectId) =>
  Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId);
const DUPLICATE_KEY = 11_000;

export interface GroupForBilling {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  cohortId?: Types.ObjectId | string | null;
  students: { studentId: Types.ObjectId | string }[];
}

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(BillingSubscription.name)
    private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly families: FamilyService,
    private readonly ledger: LedgerService
  ) {}

  async create(actor: BillingActor, dto: CreateSubscriptionPayload): Promise<BillingSubscriptionLean> {
    if (!isValidAmountMinor(dto.amountMinor)) {
      throw new BadRequestException(BillingErrors.AMOUNT_INVALID);
    }

    const expectedItems = dto.type === SubscriptionType.FAMILY ? 'many' : 'one';
    if (expectedItems === 'one' && dto.items.length !== 1) {
      throw new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID);
    }
    if (expectedItems === 'many' && dto.items.length < 2) {
      throw new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS);
    }

    const groups = await this.groupModel
      .find({
        _id: { $in: dto.items.map((item) => oid(item.groupId)) },
        organizationId: oid(actor.organizationId),
      })
      .lean<GroupForBilling[]>()
      .exec();
    const byId = new Map(groups.map((group) => [String(group._id), group]));
    if (dto.items.some((item) => !byId.has(item.groupId))) {
      throw new NotFoundException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID);
    }
    for (const item of dto.items) {
      const group = byId.get(item.groupId)!;
      // An accountant cannot subscribe a student who is not in the group — the charge would have
      // no lesson behind it.
      if (!group.students.some((student) => String(student.studentId) === item.studentId)) {
        throw new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID);
      }
    }

    const familyByStudent = await this.families.resolve(dto.items.map((item) => item.studentId));
    const familyIds = new Set(dto.items.map((item) => familyByStudent.get(item.studentId) ?? item.studentId));
    // One family per subscription: a shared charge across two families could never be settled.
    if (familyIds.size !== 1) {
      throw new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS);
    }
    const familyId = [...familyIds][0];

    let subscription: BillingSubscriptionLean;
    try {
      subscription = (await this.subscriptionModel.create({
        organizationId: oid(actor.organizationId),
        familyId: oid(familyId),
        items: dto.items.map((item) => ({
          studentId: oid(item.studentId),
          groupId: oid(item.groupId),
        })),
        type: dto.type,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
        status: BillingSubscriptionStatus.ACTIVE,
        createdBy: oid(actor._id),
        note: dto.note,
      })) as unknown as BillingSubscriptionLean;
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictException(BillingErrors.SUBSCRIPTION_ALREADY_ACTIVE);
      }
      throw error;
    }

    const startDates = await this.startDatesFor(groups);
    await this.ledger.postCharges({
      organizationId: actor.organizationId,
      familyId,
      currency: dto.currency,
      createdBy: actor._id,
      subscriptionId: String(subscription._id),
      charges: initialCharges({
        subscriptionId: String(subscription._id),
        type: dto.type,
        amountMinor: dto.amountMinor,
        items: dto.items.map((item) => ({
          studentId: item.studentId,
          groupId: item.groupId,
          startDate: startDates.get(item.groupId) ?? new Date(),
        })),
      }),
    });

    return subscription;
  }

  async findForGroup(actor: BillingActor, groupId: string): Promise<BillingSubscriptionLean[]> {
    return (
      this.subscriptionModel
        .find({
          organizationId: oid(actor.organizationId),
          'items.groupId': oid(groupId),
        })
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ createdAt: -1 })
        .lean<BillingSubscriptionLean[]>()
        .exec()
    );
  }

  /** A family isn't tied to one organization -- their subscriptions already carry their own. */
  async findForFamily(actor: BillingActor, familyId: string): Promise<BillingSubscriptionLean[]> {
    return (
      this.subscriptionModel
        .find({
          familyId: oid(familyId),
        })
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ createdAt: -1 })
        .lean<BillingSubscriptionLean[]>()
        .exec()
    );
  }

  async end(actor: BillingActor, id: string): Promise<BillingSubscriptionLean> {
    const subscription = await this.subscriptionModel
      .findOne({ _id: oid(id), organizationId: oid(actor.organizationId) })
      .lean<BillingSubscriptionLean>()
      .exec();
    if (!subscription) {
      throw new NotFoundException(BillingErrors.SUBSCRIPTION_NOT_FOUND);
    }

    await this.subscriptionModel
      .updateOne(
        {
          _id: oid(id),
          organizationId: oid(actor.organizationId),
          status: BillingSubscriptionStatus.ACTIVE,
        },
        {
          $set: {
            status: BillingSubscriptionStatus.ENDED,
            endedAt: new Date(),
          },
        }
      )
      .exec();

    return {
      ...subscription,
      status: BillingSubscriptionStatus.ENDED,
      endedAt: new Date(),
    };
  }

  private async startDatesFor(groups: GroupForBilling[]): Promise<Map<string, Date>> {
    const cohortIds = groups.map((g) => g.cohortId).filter((id): id is Types.ObjectId | string => id != null);
    if (cohortIds.length === 0) return new Map();
    const cohorts = await this.cohortModel
      .find({ _id: { $in: cohortIds.map(oid) } })
      .lean<{ _id: Types.ObjectId | string; startDate: Date }[]>()
      .exec();
    const cohortMap = new Map(cohorts.map((c) => [String(c._id), c.startDate]));
    const result = new Map<string, Date>();
    for (const group of groups) {
      if (group.cohortId && cohortMap.has(String(group.cohortId))) {
        result.set(String(group._id), cohortMap.get(String(group.cohortId))!);
      }
    }
    return result;
  }
}
