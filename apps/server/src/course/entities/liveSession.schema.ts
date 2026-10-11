import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LiveSessionAttendance, LiveSessionAttendanceSchema } from './liveSessionAttendance.entity';
import { MeetingProvider, Platform } from '@darnozom/shared-types';

@Schema({ _id: false })
export class LiveSession extends Document {
  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, type: Date })
  endDate: Date;

  @Prop({ type: String, enum: MeetingProvider, default: MeetingProvider.EXTERNAL_URL })
  provider: MeetingProvider;

  @Prop({ type: String })
  meetingUrl?: string;

  @Prop({ type: String })
  agoraChannelName?: string;

  @Prop({ type: String })
  meetingId?: string;

  @Prop({ type: String })
  meetingPassword?: string;

  @Prop({ type: String, enum: Platform, required: true })
  platform: Platform;

  @Prop({ type: String })
  recordingUrl?: string;

  @Prop({ type: String })
  instructions?: string;

  @Prop({ type: String })
  recordedSession?: string;

  @Prop({ type: Number, min: 0 })
  durationInMinutes?: number;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [LiveSessionAttendanceSchema], default: [] })
  attendance: LiveSessionAttendance[];
}

export const LiveSessionSchema = SchemaFactory.createForClass(LiveSession);

LiveSessionSchema.pre('validate', function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('endDate must be after startDate.'));
  }
  if (this.provider === MeetingProvider.EXTERNAL_URL && !this.meetingUrl) {
    return next(new Error('meetingUrl is required when provider is EXTERNAL_URL.'));
  }
  if (this.provider === MeetingProvider.AGORA && !this.agoraChannelName) {
    return next(new Error('agoraChannelName is required when provider is AGORA.'));
  }
  next();
});
