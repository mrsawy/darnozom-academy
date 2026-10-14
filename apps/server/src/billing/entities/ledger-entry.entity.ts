import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency, LedgerEntryType } from '@darnozom/shared-types';

/**
 * One line of a family's statement. **Append-only**: never updated, never deleted, by any code path.
 * A correction is a new ADJUSTMENT row carrying a reason. That is what makes the ledger a record
 * rather than a running total someone can quietly fix.
 */
@Schema({ timestamps: true })
export class LedgerEntry extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  studentId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: false, default: null })
  groupId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'BillingSubscription', required: false, default: null })
  subscriptionId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: false, default: null })
  sessionId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'FamilyPayment', required: false, default: null })
  paymentId: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(LedgerEntryType), required: true })
  type: LedgerEntryType;

  /** Integer minor units, always non-negative. */
  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  /** Only an ADJUSTMENT uses -1; a CHARGE and a PAYMENT get their direction from `type`. */
  @Prop({ type: Number, enum: [1, -1], default: 1 })
  direction: 1 | -1;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  /** When a charge falls due. Null on a payment or an adjustment. */
  @Prop({ type: Date, required: false, default: null })
  dueAt: Date | null;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  createdBy: Types.ObjectId | null;

  /**
   * Set on charges a job posts, so re-running the job writes nothing new. Unset on a charge an
   * accountant creates by hand, which may legitimately repeat.
   */
  @Prop({ type: String, required: false, default: null })
  idempotencyKey: string | null;
}

export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);
LedgerEntrySchema.index({ organizationId: 1, familyId: 1, createdAt: -1 }, { name: 'ledger_by_family' });
LedgerEntrySchema.index({ familyId: 1, type: 1, currency: 1, dueAt: 1 }, { name: 'ledger_open_charges' });
LedgerEntrySchema.index({ studentId: 1, groupId: 1, type: 1 }, { name: 'ledger_by_student_group' });
// The partial filter keeps the index out of the way of the many rows with no key at all.
LedgerEntrySchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } }, name: 'ledger_idempotency' }
);
