import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ _id: false })
export class LevelCertificateRules {
  @Prop({ type: Number, required: false, min: 0, max: 100 })
  minAttendancePercent?: number;

  @Prop({ type: Number, required: false, min: 1, max: 5 })
  minHomeworkAverage?: number;

  @Prop({ type: Boolean, required: false })
  requireExamPass?: boolean;

  @Prop({ type: Boolean, required: false })
  requireFullyPaid?: boolean;
}
export const LevelCertificateRulesSchema = SchemaFactory.createForClass(LevelCertificateRules);

@Schema({ timestamps: true })
export class Level extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true, min: 1 })
  order: number;

  @Prop({ type: LevelCertificateRulesSchema, required: false, default: null })
  certificateRules?: LevelCertificateRules | null;

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const LevelSchema = SchemaFactory.createForClass(Level);
LevelSchema.index({ courseId: 1, order: 1 }, { unique: true, partialFilterExpression: { deletedAt: null }, name: 'course_order_unique_if_not_deleted' });
applySoftDeleteMiddleware(LevelSchema);
