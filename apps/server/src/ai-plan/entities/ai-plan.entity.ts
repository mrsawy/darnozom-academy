import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { AiPlanTier, BillingCycle, Currency } from '@lms-organization/shared-types';

const AiPlanPriceDetailsSchema = new MongooseSchema(
  {
    originalPrice: { type: Number, required: true },
    originalCurrency: { type: String, enum: Object.values(Currency), default: Currency.USD, required: true },
    priceUSD: { type: Number, required: true },
  },
  { _id: false }
);

const AiPlanPricingSchema = new MongooseSchema(
  {
    [BillingCycle.MONTHLY]: { type: AiPlanPriceDetailsSchema, required: true },
    [BillingCycle.YEARLY]: { type: AiPlanPriceDetailsSchema, required: true },
    [BillingCycle.ONE_TIME]: { type: AiPlanPriceDetailsSchema, required: true },
  },
  { _id: false }
);

const AiPlanFeaturesSchema = new MongooseSchema(
  {
    /** Messages allowed per day. Use -1 for unlimited. */
    messagesPerDay: { type: Number, required: true },
    /** Whether the AI assistant feature is enabled at all. */
    aiAssistant: { type: Boolean, required: true },
  },
  { _id: false }
);

export type AiPlanDocument = AiPlan & Document;

@Schema({ timestamps: true })
export class AiPlan extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, enum: Object.values(AiPlanTier), required: true, unique: true })
  tier: AiPlanTier;

  @Prop({ type: AiPlanFeaturesSchema, required: true })
  features: {
    messagesPerDay: number;
    aiAssistant: boolean;
  };

  @Prop({ type: AiPlanPricingSchema, required: true })
  price: {
    [BillingCycle.MONTHLY]: { originalPrice: number; originalCurrency: Currency; priceUSD: number };
    [BillingCycle.YEARLY]: { originalPrice: number; originalCurrency: Currency; priceUSD: number };
    [BillingCycle.ONE_TIME]: { originalPrice: number; originalCurrency: Currency; priceUSD: number };
  };

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  paddlePriceIds?: {
    MONTHLY?: string;
    YEARLY?: string;
  };

  @Prop({ type: MongooseSchema.Types.Mixed })
  lemonSqueezyVariantIds?: {
    MONTHLY?: string;
    YEARLY?: string;
  };
}

export const AiPlanSchema = SchemaFactory.createForClass(AiPlan);
AiPlanSchema.plugin(mongoosePaginate);
