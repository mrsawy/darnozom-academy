import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Currency, ActiveStatus, ApprovalStatus, PublishStatus, EntityStatus } from '@darnozom/shared-types';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { ReviewType } from 'src/review/enum/reviewType.enum';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

const timeSlotTimeValidator = {
  validator: function (time: string) {
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i;
    return timeRegex.test(time);
  },
  message: 'Time must be in format HH:MM am/pm (e.g., 02:00 pm, 11:30 am)',
};

/** TypeScript types for embedded documents */
export interface PricingDetails {
  originalPrice: number;
  originalCurrency?: Currency;
  priceUSD?: number;
  discountEndDate?: Date;
  discountStartDate?: Date;
  discountPercentage?: number;
}
export interface PricingSchema {
  [BillingCycle.MONTHLY]?: PricingDetails;
  [BillingCycle.YEARLY]?: PricingDetails;
  [BillingCycle.ONE_TIME]?: PricingDetails;
}
export interface SettingsSchema {
  isPublished?: boolean;
  isDraft?: boolean;
  enrollmentLimit?: number;
  enrollmentDeadline?: Date;
  certificateEnabled?: boolean;
  downloadEnabled?: boolean;
}
export interface StatsSchema {
  totalEnrollments?: number;
  totalReviews?: number;
  averageRating?: number;
  totalViews?: number;
}
export interface TimeSlot {
  /** Present when `offlineSchedule` is stored as a subdocument array. */
  _id?: Types.ObjectId;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  /** Optional link to the module this offline session belongs to (for calendar / reporting). */
  moduleId?: Types.ObjectId;
  /** Denormalized module title for display when resolving the module is not needed. */
  moduleName?: string;
  instructorsIds?: Types.ObjectId[];
  coInstructorsIds?: Types.ObjectId[];
  studentsIds?: Types.ObjectId[];
  /** Soft-delete: set to a date when the slot is removed. Null means active. */
  deletedAt?: Date | null;
}
export interface AttendanceSettings {
  requireAttendance?: boolean;
  offlineSchedule?: TimeSlot[];
}

const PricingDetailsSchema = new mongoose.Schema(
  {
    originalPrice: { type: Number, required: false },
    originalCurrency: { type: String, default: 'EGP', enum: Object.values(Currency) },
    priceUSD: Number,
    discountEndDate: Date,
    discountStartDate: Date,
    discountPercentage: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const PricingSchemaPlain = new mongoose.Schema(
  {
    [BillingCycle.MONTHLY]: { type: PricingDetailsSchema, required: false },
    [BillingCycle.YEARLY]: { type: PricingDetailsSchema, required: false },
    [BillingCycle.ONE_TIME]: { type: PricingDetailsSchema, required: false },
  },
  { _id: false }
);

const SettingsSchemaPlain = new mongoose.Schema(
  {
    isPublished: { type: Boolean, default: true },
    isDraft: { type: Boolean, default: false },
    enrollmentLimit: Number,
    enrollmentDeadline: Date,
    certificateEnabled: { type: Boolean, default: false },
    downloadEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const StatsSchemaPlain = new mongoose.Schema(
  {
    totalEnrollments: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
  },
  { _id: false }
);

const TimeSlotSchemaPlain = new mongoose.Schema(
  {
    startTime: { type: String, required: true, validate: timeSlotTimeValidator },
    endTime: { type: String, required: true, validate: timeSlotTimeValidator },
    dayOfWeek: { type: String, required: true },
    moduleId: { type: Types.ObjectId, required: false, ref: 'CourseModule' },
    moduleName: { type: String, required: false },
    instructorsIds: { type: [Types.ObjectId], required: false, ref: 'User' },
    coInstructorsIds: { type: [Types.ObjectId], required: false, ref: 'User' },
    studentsIds: { type: [Types.ObjectId], required: false, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { _id: true }
);

const AttendanceSettingsSchema = new mongoose.Schema(
  {
    requireAttendance: { type: Boolean, default: false },
    offlineSchedule: { type: [TimeSlotSchemaPlain], default: [] },
  },
  { _id: false }
);

@Schema({ timestamps: true, discriminatorKey: 'type' })
export class Course extends Document<Types.ObjectId> {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'Organization',
  })
  organizationId!: Types.ObjectId;

  /** Program this course belongs to (academics); null for courses outside any program. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Program', required: false, default: null, index: true })
  programId?: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, ref: 'User', refPath: 'username' })
  createdBy!: string;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Category' })
  categoriesIds!: Types.ObjectId[];

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: 'CourseModule',
    default: [],
  })
  modulesIds!: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isPaid!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  instructorId!: Types.ObjectId;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User' })
  coInstructorsIds!: Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Grade', required: false, default: null })
  gradeId?: Types.ObjectId | null;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'SchoolType', required: false, default: [] })
  schoolTypeIds?: Types.ObjectId[];

  @Prop({ type: String })
  description!: string;

  @Prop({ type: String })
  shortDescription!: string;

  @Prop({ type: [String], required: false })
  learningObjectives!: string[];

  @Prop({ type: String, required: false })
  thumbnailKey?: string;

  @Prop({ type: String, required: false })
  trailerKey?: string;

  // Use the proper schema for pricing
  // Note: At least one of monthly, yearly, or one-time pricing must be provided only if isPaid is true
  @Prop({
    type: PricingSchemaPlain,
    required: function (this: Course) {
      return this.isPaid;
    },
    validate: {
      validator: function (this: Course, pricing: PricingSchema) {
        // If isPaid is false, pricing is not required
        if (!this.isPaid) {
          return true;
        }
        // If isPaid is true, ensure at least one pricing option is available
        return !!(pricing && (pricing[BillingCycle.MONTHLY] ?? pricing[BillingCycle.YEARLY] ?? pricing[BillingCycle.ONE_TIME]));
      },
      message: 'At least one pricing option (monthly, yearly, or one-time) must be provided when isPaid is true',
    },
  })
  pricing!: PricingSchema;

  // Use the proper schema for settings
  @Prop({ type: SettingsSchemaPlain, default: {} })
  settings!: SettingsSchema;

  // Use the proper schema for stats
  @Prop({ type: StatsSchemaPlain, default: {} })
  stats!: StatsSchema;

  @Prop({ type: AttendanceSettingsSchema, default: {} })
  attendanceSettings!: AttendanceSettings;

  @Prop({ type: String, required: false })
  planId!: string;

  @Prop({
    type: String,
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
    index: true,
  })
  approvalStatus!: ApprovalStatus;

  @Prop({ type: String, required: false })
  approvalComment!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  reviewedBy!: Types.ObjectId;

  @Prop({ type: Date, required: false })
  reviewedAt!: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false, default: null })
  pendingUpdate!: CoursePendingUpdate | null;

  @Prop({
    type: String,
    enum: PublishStatus,
    default: PublishStatus.PUBLISHED,
    index: true,
  })
  publishStatus!: PublishStatus;

  @Prop({ type: Date, required: false, default: null })
  publishedAt!: Date | null;

  @Prop({ type: String, enum: EntityStatus, default: EntityStatus.ACTIVE, index: true })
  status!: EntityStatus;

  @Prop({
    type: String,
    enum: ActiveStatus,
    default: ActiveStatus.ACTIVE,
    index: true,
  })
  activeStatus!: ActiveStatus;

  /** Soft-delete timestamp. When set, the course is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this course. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

/** Populated relation keys used when mirroring a lean/populated course shape on `pendingUpdate`. */
export type CoursePendingUpdatePopulatedKeys = 'categories' | 'instructor' | 'coInstructors' | 'thumbnailUrl' | 'trailerUrl';

export type CoursePendingUpdate = Partial<Record<keyof Course | CoursePendingUpdatePopulatedKeys, unknown>>;

export const CourseSchema = SchemaFactory.createForClass(Course);
export const TimeSlotSchema = TimeSlotSchemaPlain;

// TimeSlot virtuals for population
TimeSlotSchema.virtual('instructors', {
  ref: 'User',
  localField: 'instructorsIds',
  foreignField: '_id',
  justOne: false,
});

TimeSlotSchema.virtual('coInstructors', {
  ref: 'User',
  localField: 'coInstructorsIds',
  foreignField: '_id',
  justOne: false,
});

TimeSlotSchema.virtual('students', {
  ref: 'User',
  localField: 'studentsIds',
  foreignField: '_id',
  justOne: false,
});

TimeSlotSchema.virtual('attendanceHistory', {
  ref: 'Attendance',
  localField: 'attendanceHistoryIds',
  foreignField: '_id',
  justOne: false,
});

TimeSlotSchema.set('toJSON', { virtuals: true });
TimeSlotSchema.set('toObject', { virtuals: true });

// Course virtuals for population
CourseSchema.virtual('modules', {
  ref: 'CourseModule',
  localField: 'modulesIds',
  foreignField: '_id',
  justOne: false,
});
CourseSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});
CourseSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: 'username',
  justOne: true,
});
CourseSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructorId',
  foreignField: '_id',
  justOne: true,
});
CourseSchema.virtual('coInstructors', {
  ref: 'User',
  localField: 'coInstructorsIds',
  foreignField: '_id',
  justOne: false,
});
CourseSchema.virtual('modules', {
  ref: 'CourseModule',
  localField: 'modulesIds',
  foreignField: '_id',
  justOne: false,
});

CourseSchema.virtual('categories', {
  ref: 'Category',
  localField: 'categoriesIds',
  foreignField: '_id',
  justOne: false,
});

CourseSchema.virtual('grade', {
  ref: 'Grade',
  localField: 'gradeId',
  foreignField: '_id',
  justOne: true,
});

CourseSchema.virtual('schoolTypes', {
  ref: 'SchoolType',
  localField: 'schoolTypeIds',
  foreignField: '_id',
  justOne: false,
});

CourseSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewedBy',
  foreignField: '_id',
  justOne: true,
});

CourseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'courseId',
  justOne: false,
  match: { reviewType: ReviewType.COURSE },
});

CourseSchema.set('toJSON', { virtuals: true });
CourseSchema.set('toObject', { virtuals: true });

CourseSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

CourseSchema.plugin(mongoosePaginate);
applySoftDeleteMiddleware(CourseSchema);

// Export plain schemas for sub-documents (backward compat)
export const PricingSchemaFactory = PricingSchemaPlain;
export const SettingsSchemaFactory = SettingsSchemaPlain;
export const StatsSchemaFactory = StatsSchemaPlain;
export const TimeSlotSchemaFactory = TimeSlotSchemaPlain;
