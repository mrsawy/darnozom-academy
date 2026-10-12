import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FollowUpDecision } from '@darnozom/shared-types';

@Schema({ timestamps: true })
export class FollowUp extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  parentFeedback?: string;

  @Prop({ type: String, enum: Object.values(FollowUpDecision), required: false })
  decision?: FollowUpDecision;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  recordedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  recordedAt?: Date;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
FollowUpSchema.index({ groupId: 1, studentId: 1 }, { unique: true });
