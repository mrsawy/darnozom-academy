import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AtRiskReason, FinalResult, GroupPaymentStatus, GroupStatus, GroupStudentStatus } from '@darnozom/shared-types';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ _id: false })
export class GroupScheduleSlot {
  @Prop({ type: Number, required: true, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: Number, required: true, min: 15, max: 480 })
  durationMinutes: number;
}
export const GroupScheduleSlotSchema = SchemaFactory.createForClass(GroupScheduleSlot);

@Schema({ _id: false })
export class GroupStudent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(GroupPaymentStatus), default: GroupPaymentStatus.UNPAID })
  paymentStatus: GroupPaymentStatus;

  @Prop({ type: Boolean, default: false })
  whatsappAdded: boolean;

  @Prop({ type: Date, default: () => new Date() })
  addedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  addedBy?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(GroupStudentStatus), default: GroupStudentStatus.ACTIVE })
  status: GroupStudentStatus;

  @Prop({ type: Date, required: false })
  withdrawnAt?: Date;

  @Prop({ type: String, enum: Object.values(FinalResult), required: false, default: null })
  finalResult?: FinalResult | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  finalResultBy?: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  finalResultAt?: Date | null;
}
export const GroupStudentSchema = SchemaFactory.createForClass(GroupStudent);

@Schema({ _id: false })
export class GroupStatusChange {
  @Prop({ type: String, required: false, default: null })
  from: GroupStatus | null;

  @Prop({ type: String, required: true })
  to: GroupStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  by: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  at: Date;

  @Prop({ type: String, required: false })
  reason?: string;
}
export const GroupStatusChangeSchema = SchemaFactory.createForClass(GroupStatusChange);

@Schema({ _id: false })
export class ContentSent {
  @Prop({ type: Boolean, default: false })
  done: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  by?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  at?: Date;
}
export const ContentSentSchema = SchemaFactory.createForClass(ContentSent);

@Schema({ timestamps: true })
export class Group extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Cohort', required: true })
  cohortId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Level', required: true })
  levelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  teacherId: Types.ObjectId | null;

  /** Owns the group's pre-start tasks (escalation level 0). Must hold COORDINATOR. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  coordinatorId: Types.ObjectId | null;

  /** Escalation level 1, and the evaluator in sub-project 5. Must hold SUPERVISOR. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  supervisorId: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false, index: true })
  atRisk: boolean;

  @Prop({ type: Date, required: false, default: null })
  atRiskSince: Date | null;

  @Prop({ type: String, enum: Object.values(AtRiskReason), required: false, default: null })
  atRiskReason: AtRiskReason | null;

  @Prop({ type: [GroupScheduleSlotSchema], required: true })
  schedule: GroupScheduleSlot[];

  @Prop({ type: String, required: true })
  timezone: string;

  @Prop({ type: Number, required: true, min: 1 })
  minStudents: number;

  @Prop({ type: Number, required: true, min: 1 })
  maxStudents: number;

  /** Sessions generated when the group starts; null on groups created before sub-project 2. */
  @Prop({ type: Number, required: false, min: 1, max: 500, default: null })
  totalSessions?: number | null;

  /** Informational estimated end date (UI only, not used in session calculations). */
  @Prop({ type: Date, required: false, default: null })
  estimatedEndDate?: Date | null;

  @Prop({ type: String, required: false, trim: true })
  meetingLink?: string;

  @Prop({ type: String, required: false, trim: true })
  whatsappGroupLink?: string;

  @Prop({ type: ContentSentSchema, default: () => ({ done: false }) })
  contentSent: ContentSent;

  @Prop({ type: [GroupStudentSchema], default: [] })
  students: GroupStudent[];

  @Prop({ type: String, enum: Object.values(GroupStatus), default: GroupStatus.FORMING })
  status: GroupStatus;

  @Prop({ type: [GroupStatusChangeSchema], default: [] })
  statusHistory: GroupStatusChange[];

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ organizationId: 1, status: 1 });
GroupSchema.index({ organizationId: 1, atRisk: 1 });
GroupSchema.index({ teacherId: 1, status: 1 });
GroupSchema.index({ cohortId: 1 });
GroupSchema.index({ 'students.studentId': 1 });
applySoftDeleteMiddleware(GroupSchema);
