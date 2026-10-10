import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

@Schema({ timestamps: true, collection: 'ai_threads' })
export class AiThread extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, default: 'New Thread' })
  title: string;

  @Prop({ type: String, enum: ['regular', 'archived'], default: 'regular' })
  status: 'regular' | 'archived';

  @Prop({ type: Array, default: [] })
  messages: unknown[];

  declare createdAt: Date;
  declare updatedAt: Date;
}

export type AiThreadDocument = AiThread & Document;
export const AiThreadSchema = SchemaFactory.createForClass(AiThread);
AiThreadSchema.index({ userId: 1, updatedAt: -1 });
AiThreadSchema.plugin(mongoosePaginate);
