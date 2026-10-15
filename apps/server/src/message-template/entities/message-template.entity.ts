import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TemplateContext } from '@darnozom/shared-types';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class MessageTemplate extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: ['STUDENT', 'GROUP'] as TemplateContext[], required: true })
  context: TemplateContext;

  @Prop({ type: String, required: true, maxlength: 2000 })
  body: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const MessageTemplateSchema = SchemaFactory.createForClass(MessageTemplate);
MessageTemplateSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
applySoftDeleteMiddleware(MessageTemplateSchema);
