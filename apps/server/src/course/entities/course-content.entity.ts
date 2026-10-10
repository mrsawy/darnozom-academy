import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { ContentType } from '../enum/contentType.enum';
import { ActiveStatus, ApprovalStatus, PublishStatus, EntityStatus } from '@lms-organization/shared-types';
import { Quiz } from './quiz.schema';
import { Video } from './video.schema';
import { Article } from './article.schema';
import { Assignment } from './assignment.schema';
import { Attachment } from './attachment.schema';
import { LiveSession } from './liveSession.schema';
import { Project } from './project.schema';
import { ModuleContentSettingsSchemaPlain, type ModuleContentSettings } from './module-content-settings.embed';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

export type CourseContentDocument =
  | ((CourseContent & Quiz) & { fileUrl?: string })
  | ((CourseContent & Video) & { fileUrl?: string })
  | ((CourseContent & Article) & { fileUrl?: string })
  | ((CourseContent & Assignment) & { fileUrl?: string })
  | ((CourseContent & Attachment) & { fileUrl?: string })
  | ((CourseContent & LiveSession) & { fileUrl?: string })
  | ((CourseContent & Project) & { fileUrl?: string });

@Schema({
  timestamps: true,
  discriminatorKey: 'type',
  collection: 'course_contents',
})
export class CourseContent extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Organization' })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'CourseModule' })
  moduleId: Types.ObjectId;

  @Prop({ type: String, required: true, ref: 'User', refPath: 'username' })
  createdBy: string;

  @Prop({ type: String, enum: ContentType, required: true })
  type: ContentType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

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

  /** Set once enrolled students have been notified that this content is available. Guards against duplicate notifications. */
  @Prop({ type: Date, required: false, default: null })
  studentsNotifiedAt: Date | null;

  @Prop({
    type: String,
    enum: ActiveStatus,
    default: ActiveStatus.ACTIVE,
    index: true,
  })
  activeStatus: ActiveStatus;

  @Prop({ type: String, enum: EntityStatus, default: EntityStatus.ACTIVE, index: true })
  status: EntityStatus;

  /** Soft-delete timestamp. When set, the content is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this content. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;

  @Prop({ type: ModuleContentSettingsSchemaPlain, default: () => ({}) })
  settings: ModuleContentSettings;
}

export const CourseContentSchema = SchemaFactory.createForClass(CourseContent);

// export const QuizModel = CourseContentSchema.discriminator(ContentType.QUIZ, QuizSchema);
// export const ArticleModel = CourseContentSchema.discriminator(ContentType.ARTICLE, ArticleSchema);
// export const AssignmentModel = CourseContentSchema.discriminator(ContentType.ASSIGNMENT, AssignmentSchema);
// export const VideoModel = CourseContentSchema.discriminator(ContentType.VIDEO, VideoSchema);

CourseContentSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: 'username',
  justOne: true,
});
CourseContentSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});
CourseContentSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});
CourseContentSchema.virtual('module', {
  ref: 'CourseModule',
  localField: 'moduleId',
  foreignField: '_id',
  justOne: true,
});
CourseContentSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewedBy',
  foreignField: '_id',
  justOne: true,
});
CourseContentSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

CourseContentSchema.set('toJSON', { virtuals: true });
CourseContentSchema.set('toObject', { virtuals: true });

CourseContentSchema.plugin(mongoosePaginate);
applySoftDeleteMiddleware(CourseContentSchema);
