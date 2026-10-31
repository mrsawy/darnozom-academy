import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency, FamilyPaymentState, PaymentMethodFieldType } from '@darnozom/shared-types';

@Schema({ _id: false })
export class FamilyPaymentMethodSnapshotField {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, enum: Object.values(PaymentMethodFieldType), required: true })
  type: PaymentMethodFieldType;

  @Prop({ type: String, default: '' })
  value: string;
}

@Schema({ _id: false })
export class FamilyPaymentMethodSnapshot {
  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: [FamilyPaymentMethodSnapshotField], default: [] })
  fields: FamilyPaymentMethodSnapshotField[];
}

/** A parent's attempt to pay, from intent to confirmed money. */
@Schema({ timestamps: true })
export class FamilyPayment extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  familyId: Types.ObjectId;

  /** A registry key, not an enum: a new method is a new provider (plan decision in §4 of the spec). */
  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  @Prop({ type: String, enum: Object.values(FamilyPaymentState), required: true })
  status: FamilyPaymentState;

  /** The S3 key of the uploaded receipt (plan decision D2). */
  @Prop({ type: String, required: false, default: null })
  receiptFileKey: string | null;

  @Prop({ type: String, required: false, default: null })
  gatewayPaymentId: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  payerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  reviewedAt: Date | null;

  @Prop({ type: String, required: false, default: null })
  rejectReason: string | null;

  @Prop({ type: Types.ObjectId, ref: 'PaymentMethodConfig', required: false, default: null })
  paymentMethodConfigId: Types.ObjectId | null;

  /** The subscription this payment was raised against, so approval settles that subscription's own charges. */
  @Prop({ type: Types.ObjectId, ref: 'BillingSubscription', required: false, default: null })
  subscriptionId: Types.ObjectId | null;

  /** The manual-transfer method's fields as they were when the family paid — never re-read from the live config. */
  @Prop({ type: FamilyPaymentMethodSnapshot, required: false, default: null })
  methodSnapshot: FamilyPaymentMethodSnapshot | null;
}

export const FamilyPaymentSchema = SchemaFactory.createForClass(FamilyPayment);
FamilyPaymentSchema.index({ organizationId: 1, status: 1, createdAt: 1 }, { name: 'payments_review_queue' });
FamilyPaymentSchema.index({ familyId: 1, createdAt: -1 }, { name: 'payments_by_family' });
// One payment per gateway reference, so a webhook delivered twice cannot become two payments.
FamilyPaymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } }, name: 'payment_gateway_unique' }
);
