import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class CourseReview {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Enrollment' })
  enrollmentId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isEnrolled: boolean;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  contentQuality: number;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  instructorQuality: number;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  valueForMoney: number;
}

export const CourseReviewSchema = SchemaFactory.createForClass(CourseReview);

CourseReviewSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

CourseReviewSchema.virtual('enrollment', {
  ref: 'Enrollment',
  localField: 'enrollmentId',
  foreignField: '_id',
  justOne: true,
});

CourseReviewSchema.set('toJSON', { virtuals: true });
CourseReviewSchema.set('toObject', { virtuals: true });
