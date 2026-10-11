import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class Program extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const ProgramSchema = SchemaFactory.createForClass(Program);
ProgramSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null }, name: 'org_name_unique_if_not_deleted' }
);
applySoftDeleteMiddleware(ProgramSchema);
