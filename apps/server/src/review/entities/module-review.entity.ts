import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class ModuleReview {
  @Prop({ type: Types.ObjectId, required: true, ref: 'CourseModule' })
  moduleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Enrollment' })
  enrollmentId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isEnrolled: boolean;
}

export const ModuleReviewSchema = SchemaFactory.createForClass(ModuleReview);

ModuleReviewSchema.virtual('module', {
  ref: 'CourseModule',
  localField: 'moduleId',
  foreignField: '_id',
  justOne: true,
});

ModuleReviewSchema.virtual('enrollment', {
  ref: 'Enrollment',
  localField: 'enrollmentId',
  foreignField: '_id',
  justOne: true,
});

ModuleReviewSchema.set('toJSON', { virtuals: true });
ModuleReviewSchema.set('toObject', { virtuals: true });
