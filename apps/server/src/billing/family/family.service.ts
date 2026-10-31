import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { hasAnyRole, Roles } from '@darnozom/shared-types';
import { User } from '../../user/entities/user.entity';
import { BillingSubscription } from '../entities/subscription.entity';
import { familyIdOf } from '../domain/family';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

/** Staff who may read any family's finances. Content staff are deliberately absent. */
const FINANCE_READER_ROLES = [Roles.ACCOUNTANT, Roles.MANAGER, Roles.OWNER, Roles.ADMIN] as const;

interface FamilyActor {
  _id: string;
  roleName: Roles;
  additionalRoles?: readonly Roles[];
}

@Injectable()
export class FamilyService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>
  ) {}

  /** studentId → familyId, in one query. */
  async resolve(studentIds: string[]): Promise<Map<string, string>> {
    if (studentIds.length === 0) return new Map();
    const users = await this.userModel
      .find({ _id: { $in: studentIds.map(oid) } })
      .select('_id parentUserId')
      .lean<{ _id: Types.ObjectId; parentUserId?: Types.ObjectId | null }[]>()
      .exec();
    return new Map(users.map((user) => [String(user._id), familyIdOf(user)]));
  }

  /** Every student belonging to a family, including the family holder when they are a student. */
  async studentIdsOf(familyId: string): Promise<string[]> {
    const children = await this.userModel
      .find({ parentUserId: oid(familyId) })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    const ids = children.map((child) => String(child._id));
    return ids.length > 0 ? ids : [familyId];
  }

  /**
   * Finance staff read any family. A family holder reads their own. A child does **not** read the
   * family ledger: the parent owns it, and a child's own charges appear on it beside a sibling's.
   */
  async canActorReadFamily(actor: FamilyActor, familyId: string): Promise<boolean> {
    if (hasAnyRole(actor, FINANCE_READER_ROLES)) return true;
    return actor._id === familyId;
  }

  /**
   * A family isn't tied to one organization on the actor — a parent's own user record may carry no
   * organizationId at all. The organization that actually matters for billing is whichever one the
   * family's tuition belongs to, so it's derived from their most recent subscription instead.
   */
  async resolveOrganizationId(familyId: string): Promise<string | null> {
    const subscription = await this.subscriptionModel
      .findOne({ familyId: oid(familyId) })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ createdAt: -1 })
      .lean<{ organizationId: Types.ObjectId } | null>()
      .exec();
    return subscription ? String(subscription.organizationId) : null;
  }
}
