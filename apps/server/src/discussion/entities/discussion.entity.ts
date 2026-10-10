import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { DiscussionType } from '../enum/discussion-type.enum';

@Schema({ discriminatorKey: 'type', timestamps: true })
export class Discussion extends Document {
  @Prop({ type: String, enum: Object.values(DiscussionType), required: true })
  type: DiscussionType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Discussion', default: null })
  parentId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  likesCount: number;

  @Prop({ type: Number, default: 0 })
  repliesCount: number;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  likedBy: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: false })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const DiscussionSchema = SchemaFactory.createForClass(Discussion);

DiscussionSchema.plugin(mongoosePaginate);

DiscussionSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

DiscussionSchema.set('toJSON', { virtuals: true });
DiscussionSchema.set('toObject', { virtuals: true });
// Add indexes
DiscussionSchema.index({ userId: 1 });
DiscussionSchema.index({ parentId: 1 });
DiscussionSchema.index({ organizationId: 1 });
DiscussionSchema.index({ createdAt: -1 });
