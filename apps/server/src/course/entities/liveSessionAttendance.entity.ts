import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, _id: false })
export class LiveSessionAttendance extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  joinedAt: Date;

  @Prop({ type: Date })
  leftAt?: Date;

  @Prop({ type: Number, min: 0 })
  durationInMinutes?: number;

  @Prop({ type: Boolean, default: false })
  wasPresent: boolean;

  @Prop({ type: String })
  notes?: string;
}

export const LiveSessionAttendanceSchema = SchemaFactory.createForClass(LiveSessionAttendance);

LiveSessionAttendanceSchema.pre('validate', function (next) {
  if (this.leftAt && this.leftAt < this.joinedAt) {
    return next(new Error('leftAt must be after joinedAt.'));
  }
  if (this.leftAt && this.joinedAt && this.durationInMinutes) {
    const calculatedDuration = (this.leftAt.getTime() - this.joinedAt.getTime()) / (1000 * 60);
    if (Math.abs(calculatedDuration - this.durationInMinutes) > 1) {
      return next(new Error('durationInMinutes does not match the time difference between joinedAt and leftAt.'));
    }
  }
  next();
});
