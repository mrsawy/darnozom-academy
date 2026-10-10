import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

@Schema({
  timestamps: true,
  collection: 'wishlists',
})
export class Wishlist extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Course', index: true })
  courseId: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

// Compound unique index to prevent duplicate wishlist entries
WishlistSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Virtual for populating course
WishlistSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for populating user
WishlistSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

WishlistSchema.set('toJSON', { virtuals: true });
WishlistSchema.set('toObject', { virtuals: true });

WishlistSchema.plugin(mongoosePaginate);
