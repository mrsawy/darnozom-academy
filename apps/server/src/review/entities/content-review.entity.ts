import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class ContentReview {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Content' })
  contentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Enrollment' })
  enrollmentId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isEnrolled: boolean;
}

export const ContentReviewSchema = SchemaFactory.createForClass(ContentReview);

ContentReviewSchema.virtual('content', {
  ref: 'Content',
  localField: 'contentId',
  foreignField: '_id',
  justOne: true,
});

ContentReviewSchema.virtual('enrollment', {
  ref: 'Enrollment',
  localField: 'enrollmentId',
  foreignField: '_id',
  justOne: true,
});

ContentReviewSchema.set('toJSON', { virtuals: true });
ContentReviewSchema.set('toObject', { virtuals: true });
