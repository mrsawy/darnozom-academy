import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

/**
 * A live-training course used in the academics chain
 * (program → training course → level → batch → group → session).
 * Separate from the recorded `Course` entity.
 */
@Schema({ timestamps: true })
export class TrainingCourse extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Program', required: false, default: null, index: true })
  programId?: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const TrainingCourseSchema = SchemaFactory.createForClass(TrainingCourse);
applySoftDeleteMiddleware(TrainingCourseSchema);
