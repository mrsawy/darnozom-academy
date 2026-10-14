import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingErrors, Currency, LedgerEntryType } from '@darnozom/shared-types';
import { Allocation } from '../entities/allocation.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { LedgerBalance, LedgerEntryLean } from '../billing.types';
import { allocateFifo, OpenCharge } from '../domain/allocation';
import { PlannedCharge } from '../domain/charge-schedule';
import { isValidAmountMinor } from '../domain/money';
import { BILLING_LEDGER_CHANGED_EVENT, BillingLedgerChangedPayload } from '../events/billing.events';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const DUPLICATE_KEY = 11_000;

export interface PostChargesInput {
  organizationId: string;
  familyId: string;
  currency: Currency;
  createdBy?: string | null;
  subscriptionId?: string | null;
  sessionId?: string | null;
  charges: PlannedCharge[];
}

/**
 * The family statement. **This service never updates or deletes an entry.** A correction is a new
 * ADJUSTMENT row. Keep it that way: an editable ledger is not a record.
 */
@Injectable()
export class LedgerService {
  constructor(
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name) private readonly allocationModel: Model<Allocation>,
    private readonly events: EventEmitter2
  ) {}

  async postCharges(input: PostChargesInput): Promise<LedgerEntryLean[]> {
    if (input.charges.length === 0) return [];
    for (const charge of input.charges) {
      if (!isValidAmountMinor(charge.amountMinor)) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);
    }

    const written: LedgerEntryLean[] = [];
    for (const charge of input.charges) {
      try {
        const entry = await this.entryModel.create({
          organizationId: oid(input.organizationId),
          familyId: oid(input.familyId),
          studentId: charge.studentId ? oid(charge.studentId) : null,
          groupId: charge.groupId ? oid(charge.groupId) : null,
          subscriptionId: input.subscriptionId ? oid(input.subscriptionId) : null,
          sessionId: input.sessionId ? oid(input.sessionId) : null,
          paymentId: null,
          type: LedgerEntryType.CHARGE,
          amountMinor: charge.amountMinor,
          direction: 1,
          currency: input.currency,
          dueAt: charge.dueAt,
          description: charge.descriptionKey,
          createdBy: input.createdBy ? oid(input.createdBy) : null,
          idempotencyKey: charge.idempotencyKey,
        });
        written.push(entry as unknown as LedgerEntryLean);
      } catch (error) {
        // A key collision means a job already posted this charge. Skipping is the whole point of
        // the key, so one repeated charge must not abort the charges beside it.
        if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      }
    }

    this.announce(input.organizationId, input.familyId, written);
    return written;
  }

  async postPaymentAndAllocate(input: {
    organizationId: string;
    familyId: string;
    paymentId: string;
    amountMinor: number;
    currency: Currency;
    createdBy: string;
  }): Promise<{ entry: LedgerEntryLean; allocated: number; unallocatedMinor: number }> {
    if (!isValidAmountMinor(input.amountMinor)) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);

    // Keyed on the payment: a webhook delivered twice writes one row, not two.
    const entry = (await this.entryModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      studentId: null,
      groupId: null,
      subscriptionId: null,
      sessionId: null,
      paymentId: oid(input.paymentId),
      type: LedgerEntryType.PAYMENT,
      amountMinor: input.amountMinor,
      direction: 1,
      currency: input.currency,
      dueAt: null,
      description: 'billing.entry.payment',
      createdBy: oid(input.createdBy),
      idempotencyKey: `payment:${input.paymentId}`,
    })) as unknown as LedgerEntryLean;

    const open = await this.openCharges(input.familyId);
    const plan = allocateFifo(input.amountMinor, input.currency, open);

    if (plan.allocations.length > 0) {
      await this.allocationModel.insertMany(
        plan.allocations.map((allocation) => ({
          organizationId: oid(input.organizationId),
          paymentLedgerEntryId: entry._id,
          chargeLedgerEntryId: oid(allocation.chargeLedgerEntryId),
          amountMinor: allocation.amountMinor,
        }))
      );
    }

    const touched = await this.groupIdsOfCharges(plan.allocations.map((allocation) => allocation.chargeLedgerEntryId));
    this.events.emit(BILLING_LEDGER_CHANGED_EVENT, {
      organizationId: input.organizationId,
      familyId: input.familyId,
      groupIds: touched,
    } satisfies BillingLedgerChangedPayload);

    return { entry, allocated: plan.allocations.length, unallocatedMinor: plan.unallocatedMinor };
  }

  async postAdjustment(input: {
    organizationId: string;
    familyId: string;
    amountMinor: number;
    direction: 1 | -1;
    currency: Currency;
    reason: string;
    createdBy: string;
    studentId?: string | null;
    groupId?: string | null;
  }): Promise<LedgerEntryLean> {
    const reason = input.reason?.trim();
    if (!reason) throw new BadRequestException(BillingErrors.ADJUSTMENT_REASON_REQUIRED);
    if (!isValidAmountMinor(input.amountMinor)) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);
    if (input.direction !== 1 && input.direction !== -1) throw new BadRequestException(BillingErrors.AMOUNT_INVALID);

    const entry = (await this.entryModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      studentId: input.studentId ? oid(input.studentId) : null,
      groupId: input.groupId ? oid(input.groupId) : null,
      subscriptionId: null,
      sessionId: null,
      paymentId: null,
      type: LedgerEntryType.ADJUSTMENT,
      amountMinor: input.amountMinor,
      direction: input.direction,
      currency: input.currency,
      dueAt: null,
      // The accountant's own words, not a key: a correction has to say why.
      description: reason,
      createdBy: oid(input.createdBy),
      idempotencyKey: null,
    })) as unknown as LedgerEntryLean;

    this.announce(input.organizationId, input.familyId, [entry]);
    return entry;
  }

  /** Every charge with something still outstanding, with what is already allocated to each. */
  async openCharges(familyId: string): Promise<OpenCharge[]> {
    const charges = await this.entryModel
      .find({ familyId: oid(familyId), type: LedgerEntryType.CHARGE })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ dueAt: 1, createdAt: 1 })
      .lean<{ _id: Types.ObjectId; currency: Currency; dueAt: Date | null; createdAt: Date; amountMinor: number }[]>()
      .exec();
    if (charges.length === 0) return [];

    const allocated = await this.allocationModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { chargeLedgerEntryId: { $in: charges.map((charge) => charge._id) } } },
      { $group: { _id: '$chargeLedgerEntryId', total: { $sum: '$amountMinor' } } },
    ]);
    const byCharge = new Map(allocated.map((row) => [String(row._id), row.total]));

    return charges.map((charge) => ({
      chargeLedgerEntryId: String(charge._id),
      currency: charge.currency,
      dueAt: charge.dueAt,
      createdAt: charge.createdAt,
      amountMinor: charge.amountMinor,
      alreadyAllocatedMinor: byCharge.get(String(charge._id)) ?? 0,
    }));
  }

  /** One position per currency. Never summed across currencies — there is no exchange rate here. */
  async balances(familyId: string): Promise<LedgerBalance[]> {
    const rows = await this.entryModel.aggregate<{
      _id: { currency: Currency; type: LedgerEntryType };
      total: number;
    }>([
      { $match: { familyId: oid(familyId) } },
      {
        $group: {
          _id: { currency: '$currency', type: '$type' },
          total: { $sum: { $multiply: ['$amountMinor', '$direction'] } },
        },
      },
    ]);

    const byCurrency = new Map<Currency, LedgerBalance>();
    for (const row of rows) {
      const current =
        byCurrency.get(row._id.currency) ?? ({ currency: row._id.currency, chargedMinor: 0, paidMinor: 0, balanceMinor: 0 } satisfies LedgerBalance);
      if (row._id.type === LedgerEntryType.CHARGE) current.chargedMinor += row.total;
      else if (row._id.type === LedgerEntryType.PAYMENT) current.paidMinor += row.total;
      // An ADJUSTMENT moves the balance without pretending to be a charge or a payment.
      else current.chargedMinor += row.total;
      byCurrency.set(row._id.currency, current);
    }

    return [...byCurrency.values()].map((balance) => ({
      ...balance,
      balanceMinor: balance.chargedMinor - balance.paidMinor,
    }));
  }

  async statement(familyId: string): Promise<LedgerEntryLean[]> {
    return (
      this.entryModel
        .find({ familyId: oid(familyId) })
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ createdAt: -1 })
        .lean<LedgerEntryLean[]>()
        .exec()
    );
  }

  private async groupIdsOfCharges(chargeIds: string[]): Promise<string[]> {
    if (chargeIds.length === 0) return [];
    const rows = await this.entryModel
      .find({ _id: { $in: chargeIds.map(oid) } })
      .select('groupId')
      .lean<{ groupId: Types.ObjectId | null }[]>()
      .exec();
    return [
      ...new Set(
        rows
          .map((row) => row.groupId)
          .filter((id): id is Types.ObjectId => id != null)
          .map(String)
      ),
    ];
  }

  private announce(organizationId: string, familyId: string, entries: LedgerEntryLean[]): void {
    if (entries.length === 0) return;
    const groupIds = [
      ...new Set(
        entries
          .map((entry) => entry.groupId)
          .filter((id) => id != null)
          .map(String)
      ),
    ];
    this.events.emit(BILLING_LEDGER_CHANGED_EVENT, {
      organizationId,
      familyId,
      groupIds,
    } satisfies BillingLedgerChangedPayload);
  }
}
