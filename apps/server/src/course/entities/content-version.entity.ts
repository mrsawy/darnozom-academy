import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ShariaStatus } from '@darnozom/shared-types';

@Schema({ timestamps: true })
export class ContentVersion extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CourseContent', required: true })
  contentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  version: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true, default: {} })
  changes: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(ShariaStatus), default: ShariaStatus.PENDING, index: true })
  shariaStatus: ShariaStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  reviewedAt: Date | null;

  @Prop({ type: String, required: false, default: null })
  reviewComment: string | null;
}

export const ContentVersionSchema = SchemaFactory.createForClass(ContentVersion);
ContentVersionSchema.index({ contentId: 1, version: 1 }, { unique: true, name: 'content_version_unique' });
ContentVersionSchema.index({ organizationId: 1, shariaStatus: 1, createdAt: 1 }, { name: 'sharia_queue' });
