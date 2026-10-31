import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingErrors, BillingSubscriptionStatus, FamilyPaymentState } from '@darnozom/shared-types';
import { Organization } from 'src/organization/entities/organization.entity';
import { FileService } from 'src/file/file.service';
import { NotificationService } from 'src/notification/notification.service';
import { isValidAmountMinor } from '../domain/money';
import { BillingActor } from '../billing.types';
import { InitiatePaymentPayload } from '../dto/billing.dto';
import { FamilyPayment } from '../entities/payment.entity';
import { BillingSubscription } from '../entities/subscription.entity';
import { FamilyService } from '../family/family.service';
import { LedgerService } from '../ledger/ledger.service';
import { FamilyPaymentMethodRegistry } from './payment-method.registry';
import { InitiateResult } from './payment-method.interface';

const oid = (id: string | Types.ObjectId) =>
  Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId);

@Injectable()
export class FamilyPaymentService {
  constructor(
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>,
    @InjectModel(Organization.name) private readonly orgModel: Model<Organization>,
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    private readonly registry: FamilyPaymentMethodRegistry,
    private readonly ledger: LedgerService,
    private readonly families: FamilyService,
    private readonly files: FileService,
    private readonly notifications: NotificationService
  ) {}

  /**
   * A parent's own user record may carry no organizationId at all -- they aren't tied to one
   * organization, they pay based on whichever organization their family's subscriptions belong to.
   * For these two parent-only actions actor._id is the family id, so it's resolved from there.
   */
  private async organizationIdFor(actor: BillingActor): Promise<string | null> {
    if (actor.organizationId) return actor.organizationId;
    return this.families.resolveOrganizationId(actor._id);
  }

  async listMethods(actor: BillingActor): Promise<{ key: string }[]> {
    const organizationId = await this.organizationIdFor(actor);
    if (!organizationId) return [];
    const org = await this.orgModel
      .findOne({ _id: oid(organizationId) })
      .lean<Organization | null>()
      .exec();
    return this.registry.listEnabled(org ?? {}).map(({ key }) => ({ key }));
  }

  /** Every method registered in code, for the settings admin to choose which to enable. */
  listAllMethods(): { key: string }[] {
    return this.registry.listAll().map(({ key }) => ({ key }));
  }

  async initiate(actor: BillingActor, dto: InitiatePaymentPayload): Promise<InitiateResult> {
    if (!isValidAmountMinor(dto.amountMinor) || dto.amountMinor <= 0) {
      throw new BadRequestException(BillingErrors.AMOUNT_INVALID);
    }
    const organizationId = await this.organizationIdFor(actor);
    if (!organizationId) {
      throw new BadRequestException(BillingErrors.PAYMENT_METHOD_DISABLED);
    }
    const org = await this.orgModel
      .findOne({ _id: oid(organizationId) })
      .lean<Organization | null>()
      .exec();
    const enabled = this.registry.listEnabled(org ?? {});
    if (!enabled.some((method) => method.key === dto.method)) {
      throw new BadRequestException(BillingErrors.PAYMENT_METHOD_DISABLED);
    }

    return this.registry.get(dto.method).initiate({
      organizationId,
      familyId: actor._id,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      payerId: actor._id,
      meta: dto.meta,
    });
  }

  async attachReceipt(actor: BillingActor, paymentId: string, fileKey: string): Promise<void> {
    const trimmed = fileKey?.trim();
    if (!trimmed) {
      throw new BadRequestException(BillingErrors.RECEIPT_REQUIRED);
    }

    const payment = await this.paymentModel
      .findOne({ _id: oid(paymentId) })
      .lean<FamilyPayment | null>()
      .exec();
    if (!payment) {
      throw new NotFoundException(BillingErrors.PAYMENT_NOT_FOUND);
    }

    const canRead = await this.families.canActorReadFamily(actor, String(payment.familyId));
    if (!canRead) {
      throw new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY);
    }

    const reviewable = [FamilyPaymentState.AWAITING_RECEIPT, FamilyPaymentState.PENDING_REVIEW, FamilyPaymentState.REJECTED];
    if (!reviewable.includes(payment.status)) {
      throw new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE);
    }

    const wasRejected = payment.status === FamilyPaymentState.REJECTED;
    await this.paymentModel
      .updateOne(
        { _id: payment._id },
        {
          $set: {
            receiptFileKey: trimmed,
            status: FamilyPaymentState.PENDING_REVIEW,
            ...(wasRejected ? { rejectReason: null } : {}),
          },
        }
      )
      .exec();
  }

  async reviewQueue(actor: BillingActor, filter?: { status?: FamilyPaymentState; groupId?: string }): Promise<FamilyPayment[]> {
    const query: Record<string, unknown> = {
      organizationId: oid(actor.organizationId),
      status: filter?.status ?? FamilyPaymentState.PENDING_REVIEW,
    };

    if (filter?.groupId) {
      const familyIds = await this.familyIdsForGroup(actor.organizationId, filter.groupId);
      if (familyIds.length === 0) return [];
      query.familyId = { $in: familyIds };
    }

    return (
      this.paymentModel
        .find(query)
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ createdAt: 1 })
        .lean()
        .exec() as unknown as Promise<FamilyPayment[]>
    );
  }

  /** Families with an active subscription covering this group — the scope a group-level review queue should see. */
  private async familyIdsForGroup(organizationId: string, groupId: string): Promise<Types.ObjectId[]> {
    const subscriptions = await this.subscriptionModel
      .find({
        organizationId: oid(organizationId),
        status: BillingSubscriptionStatus.ACTIVE,
        'items.groupId': oid(groupId),
      })
      .lean<{ familyId: Types.ObjectId }[]>()
      .exec();
    return [...new Set(subscriptions.map((s) => String(s.familyId)))].map(oid);
  }

  /** A family's own payment history, newest first — a parent reads their own, finance staff read any. */
  async listForFamily(actor: BillingActor, familyId?: string): Promise<FamilyPayment[]> {
    const targetFamilyId = familyId ?? actor._id;
    const canRead = await this.families.canActorReadFamily(actor, targetFamilyId);
    if (!canRead) {
      throw new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY);
    }
    return (
      this.paymentModel
        .find({ familyId: oid(targetFamilyId) })
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ createdAt: -1 })
        .lean()
        .exec() as unknown as Promise<FamilyPayment[]>
    );
  }

  /**
   * The claim-then-post order is the whole safety property: the status guard decides which caller
   * owns this payment, and only that caller writes money. Posting first and claiming after would
   * let two accountants both credit the family.
   */
  async approve(actor: BillingActor, paymentId: string): Promise<void> {
    const payment = await this.load(actor, paymentId);
    if (payment.status !== FamilyPaymentState.PENDING_REVIEW) {
      throw new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE);
    }

    const claim = await this.paymentModel
      .updateOne(
        { _id: payment._id, status: FamilyPaymentState.PENDING_REVIEW },
        { $set: { status: FamilyPaymentState.CONFIRMED, reviewedBy: oid(actor._id), reviewedAt: new Date() } }
      )
      .exec();
    if (claim.modifiedCount === 0) throw new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE);

    await this.ledger.postPaymentAndAllocate({
      organizationId: String(payment.organizationId),
      familyId: String(payment.familyId),
      paymentId: String(payment._id),
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      createdBy: actor._id,
    });

    await this.notifications.create({
      userId: String(payment.familyId),
      titleKey: 'billingPaymentApprovedTitle',
      bodyKey: 'billingPaymentApprovedBody',
      data: { paymentId: String(payment._id) },
    });
  }

  async reject(actor: BillingActor, paymentId: string, reason: string): Promise<void> {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException(BillingErrors.REJECT_REASON_REQUIRED);
    }

    const payment = await this.load(actor, paymentId);
    if (payment.status !== FamilyPaymentState.PENDING_REVIEW) {
      throw new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE);
    }

    const claim = await this.paymentModel
      .updateOne(
        { _id: payment._id, status: FamilyPaymentState.PENDING_REVIEW },
        {
          $set: {
            status: FamilyPaymentState.REJECTED,
            rejectReason: trimmedReason,
            reviewedBy: oid(actor._id),
            reviewedAt: new Date(),
          },
        }
      )
      .exec();
    if (claim.modifiedCount === 0) throw new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE);

    await this.notifications.create({
      userId: String(payment.familyId),
      titleKey: 'billingPaymentRejectedTitle',
      bodyKey: 'billingPaymentRejectedBody',
      params: { reason: trimmedReason },
      data: { paymentId: String(payment._id) },
    });
  }

  private async load(actor: BillingActor, paymentId: string): Promise<FamilyPayment> {
    const payment = await this.paymentModel
      .findOne({ _id: oid(paymentId), organizationId: oid(actor.organizationId) })
      .lean<FamilyPayment | null>()
      .exec();
    if (!payment) throw new NotFoundException(BillingErrors.PAYMENT_NOT_FOUND);
    return payment;
  }
}
