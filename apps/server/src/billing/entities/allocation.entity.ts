import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * How much of one payment settled one charge. Sub-project 7's revenue share traces a payment back
 * to a group through these rows, which is why allocation is recorded rather than recomputed.
 */
@Schema({ timestamps: true })
export class Allocation extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LedgerEntry', required: true })
  paymentLedgerEntryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LedgerEntry', required: true })
  chargeLedgerEntryId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  amountMinor: number;
}

export const AllocationSchema = SchemaFactory.createForClass(Allocation);
AllocationSchema.index({ paymentLedgerEntryId: 1, chargeLedgerEntryId: 1 }, { unique: true, name: 'allocation_unique' });
AllocationSchema.index({ chargeLedgerEntryId: 1 }, { name: 'allocations_by_charge' });
