import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class AvailabilityWindow {
  @Prop({ type: Number, required: true, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: String, required: true })
  endTime: string;
}
export const AvailabilityWindowSchema = SchemaFactory.createForClass(AvailabilityWindow);

@Schema({ timestamps: true })
export class TeacherAvailability extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  teacherId: Types.ObjectId;

  @Prop({ type: String, required: true })
  timezone: string;

  @Prop({ type: [AvailabilityWindowSchema], default: [] })
  slots: AvailabilityWindow[];
}

export const TeacherAvailabilitySchema = SchemaFactory.createForClass(TeacherAvailability);
