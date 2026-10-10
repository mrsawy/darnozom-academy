import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Otp extends Document<Types.ObjectId> {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: 'Organization' })
  organizationId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: String })
  email: string;

  @Prop({ required: true, type: String })
  hashedOtp: string;

  createdAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });
OtpSchema.index({ organizationId: 1 });
