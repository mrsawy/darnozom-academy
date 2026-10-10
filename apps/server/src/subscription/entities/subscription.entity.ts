import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';

const BillingInfoSchema = new MongooseSchema(
  {
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    billingCycle: { type: String, enum: BillingCycle, required: true },
  },
  { _id: false }
);

/** Tracks how much of the plan's features this org has used (per subscription period checks). */
export const FeatureUsageSchema = new MongooseSchema(
  {
    usersUsed: { type: Number, default: 0 },
    coursesUsed: { type: Number, default: 0 },
    pagesUsed: { type: Number, default: 0 },
    parentUsersUsed: { type: Number, default: 0 },
    storageUsedGB: { type: Number, default: 0 },
    liveSessionsUsed: { type: Number, default: 0 },
    assignmentsUsed: { type: Number, default: 0 },
  },
  { _id: false }
);

export type SubscriptionDocument = Subscription & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class Subscription extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true, index: true })
  planId: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ type: String, enum: BillingCycle, required: true })
  billingCycle: BillingCycle;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date })
  endsAt: Date | null;

  @Prop({ type: Date })
  nextBillingAt: Date | null;

  @Prop({ type: String })
  transactionId: string | null;

  @Prop({ type: BillingInfoSchema })
  billing: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    amount: number;
    currency: string;
    billingCycle: BillingCycle;
  } | null;

  @Prop({ type: Number, default: 7 })
  reminderDays: number;

  @Prop({ type: Date })
  cancelledAt: Date | null;

  @Prop({ type: Date })
  suspendedAt: Date | null;

  /** Current usage of plan features for this org. Updated when users/courses/storage change. */
  @Prop({
    type: FeatureUsageSchema,
    default: () => ({
      usersUsed: 0,
      coursesUsed: 0,
      pagesUsed: 0,
      parentUsersUsed: 0,
      storageUsedGB: 0,
      liveSessionsUsed: 0,
      assignmentsUsed: 0,
    }),
  })
  usage: {
    usersUsed: number;
    coursesUsed: number;
    pagesUsed: number;
    parentUsersUsed: number;
    storageUsedGB: number;
    liveSessionsUsed: number;
    assignmentsUsed: number;
  };
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ organizationId: 1, status: 1 });
SubscriptionSchema.index({ organizationId: 1, status: 1, startsAt: -1 });

SubscriptionSchema.plugin(mongoosePaginate);

SubscriptionSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

SubscriptionSchema.virtual('plan', {
  ref: 'Plan',
  localField: 'planId',
  foreignField: '_id',
  justOne: true,
});

SubscriptionSchema.set('toJSON', { virtuals: true });
SubscriptionSchema.set('toObject', { virtuals: true });
