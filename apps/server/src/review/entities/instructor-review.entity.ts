import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class InstructorReview {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  instructorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  teachingQuality: number;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  communication: number;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  responsiveness: number;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  knowledgeLevel: number;
}

export const InstructorReviewSchema = SchemaFactory.createForClass(InstructorReview);

InstructorReviewSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructorId',
  foreignField: '_id',
  justOne: true,
});

InstructorReviewSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

InstructorReviewSchema.set('toJSON', { virtuals: true });
InstructorReviewSchema.set('toObject', { virtuals: true });
