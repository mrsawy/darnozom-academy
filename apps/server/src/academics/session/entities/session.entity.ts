import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';

@Schema({ _id: false })
export class SessionAttendance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(AttendanceStatus), required: true })
  status: AttendanceStatus;

  @Prop({ type: String, required: false, trim: true })
  note?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  markedBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  markedAt: Date;
}
export const SessionAttendanceSchema = SchemaFactory.createForClass(SessionAttendance);

@Schema({ _id: false })
export class SessionEvaluation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  participation: number;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  understanding: number;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  behavior: number;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  homework: number;

  @Prop({ type: String, required: false, trim: true })
  note?: string;
}
export const SessionEvaluationSchema = SchemaFactory.createForClass(SessionEvaluation);

@Schema({ _id: false })
export class SessionReport {
  @Prop({ type: [SessionEvaluationSchema], default: [] })
  evaluations: SessionEvaluation[];

  @Prop({ type: String, required: false, trim: true })
  summary?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  submittedAt: Date;
}
export const SessionReportSchema = SchemaFactory.createForClass(SessionReport);

@Schema({ timestamps: true })
export class Session extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  /** Copied from the group when the session is generated. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  sequence: number;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, required: true })
  endsAt: Date;

  @Prop({ type: String, enum: Object.values(SessionStatus), default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Prop({ type: String, enum: Object.values(AttendanceStatus), required: false, default: null })
  teacherAttendance?: AttendanceStatus | null;

  @Prop({ type: [SessionAttendanceSchema], default: [] })
  attendance: SessionAttendance[];

  @Prop({ type: SessionReportSchema, required: false, default: null })
  report?: SessionReport | null;

  @Prop({ type: String, required: false })
  cancelReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  cancelledBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false, index: true })
  disputed: boolean;

  @Prop({ type: String, required: false })
  disputeReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  disputedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  disputedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  disputeResolvedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  disputeResolvedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ groupId: 1, sequence: 1 }, { unique: true });
SessionSchema.index({ teacherId: 1, startsAt: 1 });
SessionSchema.index({ organizationId: 1, status: 1, startsAt: 1 });
