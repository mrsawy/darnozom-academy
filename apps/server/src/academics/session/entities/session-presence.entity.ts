import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PresenceRole } from '@darnozom/shared-types';

@Schema({ _id: false })
export class PresenceSegmentDoc {
  @Prop({ type: Date, required: true })
  joinedAt: Date;

  @Prop({ type: Date, required: false, default: null })
  leftAt?: Date | null;
}
export const PresenceSegmentSchema = SchemaFactory.createForClass(PresenceSegmentDoc);

/** One record per user per session: when they joined through the platform and how long they stayed. */
@Schema({ timestamps: true })
export class SessionPresence extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(PresenceRole), required: true })
  role: PresenceRole;

  @Prop({ type: Date, required: true })
  firstJoinedAt: Date;

  @Prop({ type: Date, required: true })
  lastSeenAt: Date;

  @Prop({ type: [PresenceSegmentSchema], default: [] })
  segments: PresenceSegmentDoc[];
}

export const SessionPresenceSchema = SchemaFactory.createForClass(SessionPresence);
SessionPresenceSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
SessionPresenceSchema.index({ organizationId: 1, userId: 1, firstJoinedAt: -1 });
