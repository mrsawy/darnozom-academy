import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PasswordResetChannel, PASSWORD_RESET } from '@darnozom/shared-types';
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PasswordResetToken extends Document<Types.ObjectId> {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: 'User', index: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: String, index: true })
  email: string;

  @Prop({ required: true, type: String })
  hashedToken: string;

  /** `otp` = mobile 6-digit code; `link` = web reset token (also used after OTP exchange). */
  @Prop({ type: String, enum: PasswordResetChannel, default: PasswordResetChannel.LINK })
  channel: PasswordResetChannel;

  @Prop({ type: Number, default: 0 })
  failedAttempts: number;

  createdAt: Date;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);

PasswordResetTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: PASSWORD_RESET.TTL_SECONDS });
