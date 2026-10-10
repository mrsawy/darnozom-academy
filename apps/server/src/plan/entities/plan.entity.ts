import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { PaymentProvider } from 'src/payment/strategies/interfaces/payment-strategy.interface';
import { Currency } from '@lms-organization/shared-types';

import { PlanTier } from '../enum/planTier.enum';

const FeaturesSchema = new MongooseSchema(
  {
    /** Maximum number of users that can be created per subscription period. Use -1 for unlimited. */
    usersPerSubscription: { type: Number, required: true },
    /** Maximum number of courses that can be created per subscription period. Use -1 for unlimited. */
    coursesPerSubscription: { type: Number, required: true },
    /** Maximum number of parent accounts that can be created per subscription period. Use -1 for unlimited. */
    parentAccountsPerSubscription: { type: Number, required: true },
    /** Maximum number of pages that can be created per subscription period. Use -1 for unlimited. */
    pagesPerSubscription: { type: Number, required: true },
    /** Maximum number of live sessions that can be created per billing period. Use -1 for unlimited. */
    liveSessionsPerMonth: { type: Number, required: true },
    /** Maximum number of assignments that can be created per billing period. Use -1 for unlimited. */
    assignmentsPerMonth: { type: Number, required: true },
    /** Paid plans: maximum storage space in GB. */
    maxStorageGB: { type: Number, required: true },
    /** Paid plans: enable course analytics. */
    courseAnalytics: { type: Boolean, required: true },
    /** Paid plans: enable content analytics. */
    contentAnalytics: { type: Boolean, required: true },
    /** Paid plans: enable module analytics. */
    moduleAnalytics: { type: Boolean, required: true },
    /** Paid plans: track and view student progress (completion, time, etc.). */
    trackingStudentProgress: { type: Boolean, required: true },
    prioritySupport: { type: Boolean, required: true },
    /** Paid plans: allow org to access students information. */
    accessStudentsInfo: { type: Boolean, required: true },
    /** Paid plans: allow issuing completion certificates. */
    certificates: { type: Boolean, required: true },
    /** Paid plans: custom branding (logo, colors). */
    customBranding: { type: Boolean, required: true },
    /** Paid plans: in-app chat (students, instructors, support). */
    inAppChat: { type: Boolean, required: true },
    /** Paid plans: live/scheduled sessions. */
    liveSessions: { type: Boolean, required: true },
    /** Paid plans: bulk export (enrollments, students, reports). */
    bulkExport: { type: Boolean, required: true },
    /** Paid plans: API access for integrations. */
    // apiAccess: { type: Boolean, required: true },
    /** Paid plans: white-label (remove platform branding). */
    // whiteLabel: { type: Boolean, required: true },
    /** Paid plans: use custom domain for student portal. */
    customDomain: { type: Boolean, required: true },
    /** Paid plans: drip/scheduled content release. */
    dripContent: { type: Boolean, required: true },
    /** Paid plans: gamification (badges, points, leaderboards). */
    gamification: { type: Boolean, required: true },
    /** Paid plans: outbound webhooks for events. */
    webhooks: { type: Boolean, required: true },
    /** Paid plans: advanced reporting dashboards. */
    reporting: { type: Boolean, required: true },
  },
  { _id: false }
);

const PlanPriceDetailsSchema = new MongooseSchema(
  {
    originalPrice: { type: Number, required: true },
    originalCurrency: { type: String, enum: Object.values(Currency), default: Currency.USD, required: true },
    priceUSD: { type: Number, required: true },
  },
  { _id: false }
);

const PlanPricingSchema = new MongooseSchema(
  {
    [BillingCycle.MONTHLY]: { type: PlanPriceDetailsSchema, required: true },
    [BillingCycle.YEARLY]: { type: PlanPriceDetailsSchema, required: true },
    [BillingCycle.ONE_TIME]: { type: PlanPriceDetailsSchema, required: true },
  },
  { _id: false }
);

@Schema({ timestamps: true })
export class Plan extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: PlanPricingSchema, required: true })
  price: {
    [BillingCycle.MONTHLY]: { originalPrice: number; originalCurrency: Currency; priceUSD: number };
    [BillingCycle.YEARLY]: { originalPrice: number; originalCurrency: Currency; priceUSD: number };
    [BillingCycle.ONE_TIME]: { originalPrice: number; originalCurrency: Currency; priceUSD: number };
  };

  @Prop({ type: String, enum: PlanTier, required: true, unique: true })
  tier: PlanTier;

  @Prop({ type: String, enum: PaymentProvider })
  planProvider?: PaymentProvider;

  @Prop({ type: String })
  paymentProvider?: PaymentProvider;

  @Prop({ type: String })
  planId?: string;

  /** Paddle Billing price IDs (pri_xxx) per billing cycle for Paddle checkout. See https://developer.paddle.com/api-reference/prices/overview */
  @Prop({ type: MongooseSchema.Types.Mixed })
  paddlePriceIds?: {
    MONTHLY?: string;
    YEARLY?: string;
  };

  /** Lemon Squeezy variant IDs per billing cycle for checkout. See https://docs.lemonsqueezy.com/api/checkouts/create-checkout */
  @Prop({ type: MongooseSchema.Types.Mixed })
  lemonSqueezyVariantIds?: {
    MONTHLY?: string;
    YEARLY?: string;
  };

  @Prop({ type: FeaturesSchema, required: true })
  features: {
    usersPerSubscription: number;
    coursesPerSubscription: number;
    parentAccountsPerSubscription: number;
    pagesPerSubscription: number;
    liveSessionsPerMonth: number;
    assignmentsPerMonth: number;
    maxStorageGB: number;
    courseAnalytics: boolean;
    contentAnalytics: boolean;
    moduleAnalytics: boolean;
    trackingStudentProgress: boolean;
    prioritySupport: boolean;
    accessStudentsInfo: boolean;
    certificates: boolean;
    discussions: boolean;
    customBranding: boolean;
    inAppChat: boolean;
    liveSessions: boolean;
    quizzes: boolean;
    assignments: boolean;
    bulkExport: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    sso: boolean;
    attendanceTracking: boolean;
    dripContent: boolean;
    gamification: boolean;
    webhooks: boolean;
    reporting: boolean;
    courseTemplates: boolean;
    multiLanguage: boolean;
  };

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  /** Platform tax percentage deducted from each enrollment before crediting the org wallet. Covers payment processing and platform fees. */
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  taxPercentage: number;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
