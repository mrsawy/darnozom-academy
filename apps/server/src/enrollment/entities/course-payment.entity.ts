import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { CoursePaymentStatus } from '../enum/enrollmentStatus.enum';

/**
 * A student's manual-transfer (InstaPay / Vodafone Cash / custom) payment for a standalone course.
 * Created together with a PENDING_PAYMENT enrollment; the organization approves or rejects it.
 */
@Schema({ timestamps: true })
export class CoursePayment extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Enrollment', required: true })
  enrollmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PaymentMethodConfig', required: true })
  paymentMethodConfigId: Types.ObjectId;

  /** Snapshot of what the student saw, so later admin edits never change a past payment. */
  @Prop({ type: Object, required: true })
  methodSnapshot: { label: string; key: string };

  @Prop({ type: String, enum: Object.values(BillingCycle), required: true })
  billingCycle: BillingCycle;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  receiptFileKey: string;

  @Prop({ type: String, enum: Object.values(CoursePaymentStatus), default: CoursePaymentStatus.PENDING_REVIEW, index: true })
  status: CoursePaymentStatus;

  @Prop({ type: String, default: null })
  rejectReason: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;
}

export const CoursePaymentSchema = SchemaFactory.createForClass(CoursePayment);
CoursePaymentSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
CoursePaymentSchema.virtual('course', { ref: 'Course', localField: 'courseId', foreignField: '_id', justOne: true });
CoursePaymentSchema.set('toJSON', { virtuals: true });
CoursePaymentSchema.set('toObject', { virtuals: true });
