import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { AccessType } from '../enum/accessType.enum';
import { SubscriptionDto } from 'src/utils/dto/subscription.dto';
import { SubscriptionTypeDef } from 'src/utils/types/Subscription.interface';
import {
  EnrollmentAssignmentSubmissionSnapshot,
  EnrollmentAssignmentSubmissionSnapshotSchema,
  EnrollmentQuizSubmissionSnapshot,
  EnrollmentQuizSubmissionSnapshotSchema,
} from './enrollment-submission-snapshots.embed';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

/** Per-content progress: time tracking, first/last access, completion, video resume position */
@Schema({ _id: false })
export class ContentProgressItem {
  @Prop({ type: Types.ObjectId, ref: 'CourseContent', required: true })
  contentId: Types.ObjectId;

  @Prop({ type: String, default: '' })
  contentTitle: string;

  @Prop({ type: String, default: '' })
  contentType: string;

  @Prop({ type: Number, default: 0, min: 0 })
  timeSpentMinutes: number;

  @Prop({ type: Date, default: Date.now })
  firstAccessedAt: Date;

  @Prop({ type: Date, default: Date.now })
  lastAccessedAt: Date;

  @Prop({ type: Date })
  completedAt: Date | null;

  /** For video content: last watched position in seconds (resume) */
  @Prop({ type: Number, default: 0, min: 0 })
  videoLastPositionSeconds: number;

  /** Number of times the content was opened */
  @Prop({ type: Number, default: 1 })
  accessCount: number;
}

export const ContentProgressItemSchema = SchemaFactory.createForClass(ContentProgressItem);

@Schema({ _id: false })
export class Progress {
  @Prop({
    type: [Types.ObjectId],
    ref: 'CourseModule',
    default: [],
    _id: false,
  })
  completedModules: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'CourseContent',
    default: [],
    _id: false,
  })
  completedContents: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'Course',
    default: [],
    _id: false,
  })
  completedCourses: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'CourseContent',
    default: [],
    _id: false,
  })
  submittedAssignments: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'CourseContent',
    default: [],
    _id: false,
  })
  submittedProjects: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'CourseContent',
    default: [],
    _id: false,
  })
  submittedQuizzes: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'CourseContent',
    default: [],
    _id: false,
  })
  attendedLiveSessions: Types.ObjectId[];

  /**
   * Denormalized quiz attempts for this enrollment (full attempt payload + content/module/course titles).
   * Source of truth for grading remains on `CourseContent.quizSubmissions`.
   */
  @Prop({
    type: [EnrollmentQuizSubmissionSnapshotSchema],
    default: [],
    _id: false,
  })
  quizSubmissions: EnrollmentQuizSubmissionSnapshot[];

  /**
   * Denormalized assignment submissions for this enrollment (+ titles).
   * Source of truth remains on `CourseContent` embedded `submissions`.
   */
  @Prop({
    type: [EnrollmentAssignmentSubmissionSnapshotSchema],
    default: [],
    _id: false,
  })
  assignmentSubmissions: EnrollmentAssignmentSubmissionSnapshot[];

  /** Detailed per-content time tracking and resume data */
  @Prop({
    type: [ContentProgressItemSchema],
    default: [],
    _id: false,
  })
  contentTimeTracking: ContentProgressItem[];
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);

export interface AttendanceSummary {
  totalClasses?: number;
  attended?: number;
  absent?: number;
  late?: number;
  excused?: number;
  percentage?: number;
}

const AttendanceSummarySchema = new mongoose.Schema(
  {
    totalClasses: { type: Number, default: 0 },
    attended: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    excused: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { _id: false }
);

@Schema({ timestamps: true })
export class Enrollment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: String, default: '' })
  courseTitle: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  enrolledAt: Date;

  // @Prop()
  // expiresAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({
    type: String,
    enum: AccessType,
    required: true,
  })
  accessType: AccessType;

  @Prop({
    type: SubscriptionDto,
    validate: {
      validator: function (this: Enrollment) {
        return (this.accessType !== AccessType.PAID_ONCE && this.accessType !== AccessType.SUBSCRIPTION) || !!this.subscription;
      },
      message: 'subscription is required when AccessType is not ' + AccessType.FREE,
    },
  })
  subscription: SubscriptionTypeDef;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progressPercentage: number;

  @Prop({ type: Number, default: 0 })
  timeSpentMinutes: number;

  @Prop({ type: Date, default: Date.now })
  lastAccessedAt: Date;

  @Prop({
    type: ProgressSchema,
    default: () => ({
      completedModules: [],
      completedContents: [],
      completedCourses: [],
      submittedAssignments: [],
      assignmentSubmissions: [],
      submittedProjects: [],
      submittedQuizzes: [],
      quizSubmissions: [],
      attendedLiveSessions: [],
      contentTimeTracking: [],
    }),
  })
  progress: Progress;

  @Prop({
    type: {
      issued: Boolean,
      issuedAt: Date,
      certificateUrl: String,
    },
    default: {},
  })
  certificate: {
    issued: boolean;
    issuedAt: Date;
    certificateUrl: string;
  };

  @Prop({ type: AttendanceSummarySchema, default: {} })
  attendanceSummary: AttendanceSummary;

  /** Soft-delete timestamp. When set, the enrollment is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this enrollment. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

// Unique only for active enrollments so soft-deleted rows do not block re-enroll.
EnrollmentSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'userId_courseId_unique_if_not_deleted',
  }
);

EnrollmentSchema.plugin(mongoosePaginate);

EnrollmentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

EnrollmentSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

EnrollmentSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

EnrollmentSchema.virtual('completedModules', {
  ref: 'CourseModule',
  localField: 'progress.completedModules',
  foreignField: '_id',
  justOne: false,
});

EnrollmentSchema.virtual('completedContents', {
  ref: 'CourseContent',
  localField: 'progress.completedContents',
  foreignField: '_id',
  justOne: false,
});
EnrollmentSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

EnrollmentSchema.set('toJSON', { virtuals: true });
EnrollmentSchema.set('toObject', { virtuals: true });
applySoftDeleteMiddleware(EnrollmentSchema);
