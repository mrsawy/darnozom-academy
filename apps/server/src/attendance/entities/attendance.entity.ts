import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { AttendanceStatus } from '../enum/attendance-status.enum';

@Schema({ timestamps: true })
export class Attendance extends Document<Types.ObjectId> {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  slotId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Organization' })
  organizationId: Types.ObjectId;

  @Prop({ type: String, enum: AttendanceStatus, required: true })
  status: AttendanceStatus;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  markedBy: Types.ObjectId;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ courseId: 1, slotId: 1, date: 1 });
AttendanceSchema.index({ studentId: 1, courseId: 1 });
AttendanceSchema.index({ organizationId: 1, date: 1 });
AttendanceSchema.index({ studentId: 1, courseId: 1, slotId: 1, date: 1 }, { unique: true });

AttendanceSchema.plugin(mongoosePaginate);
