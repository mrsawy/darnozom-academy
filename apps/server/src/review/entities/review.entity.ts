import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { ReviewType } from '../enum/reviewType.enum';

@Schema({
  timestamps: true,
  discriminatorKey: 'reviewType',
  collection: 'reviews',
})
export class Review extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ReviewType, required: true })
  reviewType: string;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, required: false })
  comment: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

ReviewSchema.set('toJSON', { virtuals: true });
ReviewSchema.set('toObject', { virtuals: true });

// Pre-save hook to prevent duplicate course reviews
ReviewSchema.pre('save', async function (next) {
  const reviewDoc = this as Review & { courseId?: Types.ObjectId };
  if (this.isNew && this.reviewType === (ReviewType.COURSE as string) && reviewDoc.courseId) {
    const ReviewModel = this.constructor as unknown as {
      findOne: (query: Record<string, unknown>) => Promise<Review | null>;
    };

    // Check for existing course review by same user
    const existingReview = await ReviewModel.findOne({
      userId: this.userId,
      courseId: reviewDoc.courseId,
      reviewType: ReviewType.COURSE,
      isActive: true,
    });

    if (existingReview) {
      const error = new Error('Duplicate review: A review already exists for this course by this user') as Error & { code?: number };
      error.code = 11_000; // MongoDB duplicate key error code
      return next(error);
    }
  }

  next();
});

ReviewSchema.plugin(mongoosePaginate);
