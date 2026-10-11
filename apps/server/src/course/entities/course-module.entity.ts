import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { ActiveStatus, ApprovalStatus, PublishStatus, EntityStatus } from '@darnozom/shared-types';
import { ModuleContentSettingsSchemaPlain, type ModuleContentSettings } from './module-content-settings.embed';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true, collection: 'course_modules' })
export class CourseModuleEntity extends Document<Types.ObjectId> {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'Organization',
  })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, ref: 'User', refPath: 'username' })
  createdBy: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'CourseContent' }],
    default: [],
  })
  contentsIds: Types.ObjectId[];

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: [String], required: false })
  learningObjectives: string[];

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

  @Prop({ type: String, enum: EntityStatus, default: EntityStatus.ACTIVE, index: true })
  status: EntityStatus;

  /** Soft-delete timestamp. When set, the module is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this module. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;

  @Prop({ type: ModuleContentSettingsSchemaPlain, default: () => ({}) })
  settings: ModuleContentSettings;
}

export const CourseModuleSchema = SchemaFactory.createForClass(CourseModuleEntity);

CourseModuleSchema.plugin(mongoosePaginate);

CourseModuleSchema.virtual('contents', {
  ref: 'CourseContent',
  localField: 'contentsIds',
  foreignField: '_id',
  justOne: false,
});
CourseModuleSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: 'username',
  justOne: true,
});
CourseModuleSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});
CourseModuleSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

CourseModuleSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewedBy',
  foreignField: '_id',
  justOne: true,
});
CourseModuleSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

CourseModuleSchema.set('toJSON', { virtuals: true });
CourseModuleSchema.set('toObject', { virtuals: true });
applySoftDeleteMiddleware(CourseModuleSchema);
