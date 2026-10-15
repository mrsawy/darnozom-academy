import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency, TeacherPayModel } from '@darnozom/shared-types';

export type TeacherPayProfileDocument = TeacherPayProfile & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class TeacherPayProfile {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  teacherId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(TeacherPayModel), required: true })
  model: TeacherPayModel;

  @Prop({ type: Number, required: true, min: 0 })
  rate: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  @Prop({ type: Date, required: true, default: () => new Date() })
  effectiveFrom: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TeacherPayProfileSchema = SchemaFactory.createForClass(TeacherPayProfile);
TeacherPayProfileSchema.index({ organizationId: 1, teacherId: 1, effectiveFrom: -1 });
