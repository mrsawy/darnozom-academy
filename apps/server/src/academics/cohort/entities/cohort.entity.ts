import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class Cohort extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Level', required: true, index: true })
  levelId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const CohortSchema = SchemaFactory.createForClass(Cohort);
applySoftDeleteMiddleware(CohortSchema);
