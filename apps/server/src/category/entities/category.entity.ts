import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { ActiveStatus, ApprovalStatus, PublishStatus } from '@lms-organization/shared-types';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'Organization',
  })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    default: null,
    required: false,
  })
  parentId: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
    index: true,
  })
  approvalStatus: ApprovalStatus;

  @Prop({ type: String, required: false })
  approvalComment: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  reviewedBy: Types.ObjectId;

  @Prop({ type: Date, required: false })
  reviewedAt: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false, default: null })
  pendingUpdate: Record<string, unknown> | null;

  @Prop({
    type: String,
    enum: PublishStatus,
    default: PublishStatus.PUBLISHED,
    index: true,
  })
  publishStatus: PublishStatus;

  @Prop({ type: Date, required: false, default: null })
  publishedAt: Date | null;

  @Prop({
    type: String,
    enum: ActiveStatus,
    default: ActiveStatus.ACTIVE,
    index: true,
  })
  activeStatus: ActiveStatus;

  @Prop({ type: Number, default: 0 })
  coursesCount: number;

  @Prop({ type: Number, default: 0 })
  instructorsCount: number;

  /** Soft-delete timestamp. When set, the category is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this category. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.plugin(mongoosePaginate);

CategorySchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewedBy',
  foreignField: '_id',
  justOne: true,
});

CategorySchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

CategorySchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });
applySoftDeleteMiddleware(CategorySchema);
