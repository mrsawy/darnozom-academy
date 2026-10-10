import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';

export type AiSubscriberType = 'user' | 'organization';

const AiBillingInfoSchema = new MongooseSchema(
  {
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    billingCycle: { type: String, enum: Object.values(BillingCycle), required: true },
  },
  { _id: false }
);

const AiUsageSchema = new MongooseSchema(
  {
    /** Messages sent today (resets daily). */
    dailyMessagesUsed: { type: Number, default: 0 },
    /** The UTC date of the last daily reset. Used by the guard to detect when a new day starts. */
    lastDailyReset: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

export type AiSubscriptionDocument = AiSubscription & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class AiSubscription extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /** Future-proof field: set to 'user' for all current subscriptions. */
  @Prop({ type: String, enum: ['user', 'organization'], default: 'user', required: true })
  subscriberType: AiSubscriberType;

  /** Reserved for future org-level AI subscriptions. */
  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AiPlan', required: true, index: true })
  aiPlanId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ type: String, enum: Object.values(BillingCycle), required: true })
  billingCycle: BillingCycle;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, default: null })
  endsAt: Date | null;

  @Prop({ type: Date, default: null })
  nextBillingAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: String, default: null })
  transactionId: string | null;

  @Prop({ type: AiBillingInfoSchema, default: null })
  billing: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    amount: number;
    currency: string;
    billingCycle: BillingCycle;
  } | null;

  @Prop({
    type: AiUsageSchema,
    default: () => ({
      dailyMessagesUsed: 0,
      lastDailyReset: new Date(),
    }),
  })
  usage: {
    dailyMessagesUsed: number;
    lastDailyReset: Date;
  };
}

export const AiSubscriptionSchema = SchemaFactory.createForClass(AiSubscription);

AiSubscriptionSchema.index({ subscriberType: 1, userId: 1, status: 1 });
AiSubscriptionSchema.index({ userId: 1, status: 1 });

AiSubscriptionSchema.plugin(mongoosePaginate);

AiSubscriptionSchema.virtual('aiPlan', {
  ref: 'AiPlan',
  localField: 'aiPlanId',
  foreignField: '_id',
  justOne: true,
});

AiSubscriptionSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

AiSubscriptionSchema.set('toJSON', { virtuals: true });
AiSubscriptionSchema.set('toObject', { virtuals: true });
