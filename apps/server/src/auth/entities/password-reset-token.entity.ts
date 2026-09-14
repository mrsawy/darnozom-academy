import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

/** How long a password-reset token stays valid before Mongo TTL-expires it (1 hour). */
const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

@Schema({ timestamps: true })
export class PasswordResetToken extends Document<Types.ObjectId> {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: 'User', index: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: String, index: true })
  email: string;

  @Prop({ required: true, type: String })
  hashedToken: string;

  @Prop({ type: Number, default: 0 })
  failedAttempts: number;

  createdAt: Date;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);

PasswordResetTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: PASSWORD_RESET_TTL_SECONDS });
