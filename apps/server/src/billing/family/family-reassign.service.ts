import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { BillingErrors, Roles } from '@darnozom/shared-types';
import { User } from '../../user/entities/user.entity';
import { BillingSubscription } from '../entities/subscription.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { FamilyPayment } from '../entities/payment.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface ReassignResult {
  /** Student ids whose billing was re-keyed to the parent. */
  reassigned: string[];
  /** Student ids that had no billing data under their own id (nothing to do). */
  skipped: string[];
}

/**
 * Re-keys billing data recorded under a child's own id as the familyId to the parent's id.
 *
 * The service resolves the parent's children itself, so it can be called at creation time AND
 * retroactively for parents whose children already had billing data before the parent account
 * existed.
 */
@Injectable()
export class FamilyReassignService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>
  ) {}

  /**
   * Retroactive reassign triggered by a staff actor. Verifies that the parent's children have
   * billing data belonging to the actor's organization before touching anything — a staff member
   * from org A cannot reassign a parent whose data lives in org B.
   */
  async reassignForParentAsActor(actorOrganizationId: string, parentId: string): Promise<ReassignResult> {
    const parent = await this.userModel
      .findOne({ _id: oid(parentId), roleName: Roles.PARENT })
      .select('childUsersIds')
      .lean<{ _id: Types.ObjectId; childUsersIds?: Types.ObjectId[] }>()
      .exec();

    if (!parent) throw new NotFoundException(BillingErrors.NOT_YOUR_FAMILY);

    const childIds = (parent.childUsersIds ?? []).map(String);
    if (childIds.length === 0) return { reassigned: [], skipped: [] };

    // Tenant check: at least one child must have a subscription in the caller's org. A parent user
    // carries no organizationId of their own, so we scope through their children's billing data.
    const orgId = oid(actorOrganizationId);
    const tenantHit = await this.subscriptionModel
      .countDocuments({ organizationId: orgId, 'items.studentId': { $in: childIds.map(oid) } })
      .exec();
    if (tenantHit === 0) throw new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY);

    return this.doReassign(parentId, childIds);
  }

  /**
   * Self-heal for a parent reading their own billing: any rows still keyed to one of their
   * children (created before the parent account existed) are moved to the parent. Idempotent, and a
   * no-op for anyone who is not a parent reading their own family.
   */
  async healOwnFamily(actor: { _id: string; roleName: Roles }, familyId?: string): Promise<void> {
    if (actor.roleName !== Roles.PARENT) return;
    if (familyId && familyId !== actor._id) return;
    await this.reassignForParent(actor._id);
  }

  /**
   * Internal reassign called inside a trusted server transaction (e.g. createParentForStudent).
   * No actor check — the caller is server code, not a user request.
   */
  async reassignForParent(parentId: string, session?: ClientSession): Promise<ReassignResult> {
    const parent = await this.userModel
      .findOne({ _id: oid(parentId), roleName: Roles.PARENT })
      .select('childUsersIds')
      .lean<{ _id: Types.ObjectId; childUsersIds?: Types.ObjectId[] }>()
      .exec();

    const childIds = (parent?.childUsersIds ?? []).map(String);
    if (childIds.length === 0) return { reassigned: [], skipped: [] };

    return this.doReassign(parentId, childIds, session);
  }

  private async doReassign(parentId: string, childIds: string[], session?: ClientSession): Promise<ReassignResult> {
    const to = oid(parentId);
    const opts = session ? { session } : {};

    const reassigned: string[] = [];
    const skipped: string[] = [];

    await Promise.all(
      childIds.map(async (childId) => {
        const from = oid(childId);
        const [subs, entries, payments] = await Promise.all([
          this.subscriptionModel.countDocuments({ familyId: from }).session(session ?? null).exec(),
          this.entryModel.countDocuments({ familyId: from }).session(session ?? null).exec(),
          this.paymentModel.countDocuments({ familyId: from }).session(session ?? null).exec(),
        ]);

        if (subs === 0 && entries === 0 && payments === 0) {
          skipped.push(childId);
          return;
        }

        await Promise.all([
          this.subscriptionModel.updateMany({ familyId: from }, { $set: { familyId: to } }, opts).exec(),
          this.entryModel.updateMany({ familyId: from }, { $set: { familyId: to } }, opts).exec(),
          this.paymentModel.updateMany({ familyId: from }, { $set: { familyId: to } }, opts).exec(),
        ]);

        reassigned.push(childId);
      })
    );

    return { reassigned, skipped };
  }
}
