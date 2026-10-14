import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BillingSubscriptionStatus, Currency, SubscriptionType } from '@darnozom/shared-types';

@Schema({ _id: false })
export class SubscriptionItem {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;
}
export const SubscriptionItemSchema = SchemaFactory.createForClass(SubscriptionItem);

/** A family's tuition arrangement for one or more children in one or more groups. */
@Schema({ timestamps: true, collection: 'billingsubscriptions' })
export class BillingSubscription extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  /** The parent user, or the student themselves when no parent is linked. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  familyId: Types.ObjectId;

  /** Exactly one item, except FAMILY, which has two or more siblings. */
  @Prop({ type: [SubscriptionItemSchema], required: true })
  items: SubscriptionItem[];

  @Prop({ type: String, enum: Object.values(SubscriptionType), required: true })
  type: SubscriptionType;

  /** Integer minor units (plan decision D1). 0 is a full scholarship. */
  @Prop({ type: Number, required: true, min: 0 })
  amountMinor: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  @Prop({ type: String, enum: Object.values(BillingSubscriptionStatus), default: BillingSubscriptionStatus.ACTIVE })
  status: BillingSubscriptionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  note?: string;

  @Prop({ type: Date, required: false, default: null })
  endedAt: Date | null;
}

export const BillingSubscriptionSchema = SchemaFactory.createForClass(BillingSubscription);
// A student in a group may have only one live arrangement. The index, not a read-then-write check,
// is what makes that true when two accountants save at once.
BillingSubscriptionSchema.index(
  { 'items.studentId': 1, 'items.groupId': 1 },
  {
    unique: true,
    partialFilterExpression: { status: BillingSubscriptionStatus.ACTIVE },
    name: 'one_active_subscription_per_student_group',
  }
);
BillingSubscriptionSchema.index({ organizationId: 1, familyId: 1, status: 1 }, { name: 'subscriptions_by_family' });
BillingSubscriptionSchema.index({ organizationId: 1, type: 1, status: 1 }, { name: 'subscriptions_by_type' });
