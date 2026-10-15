import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Counter extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, default: 0 })
  sequence: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
CounterSchema.index({ organizationId: 1, key: 1 }, { unique: true });
