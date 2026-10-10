import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

export type GradeDocument = Grade & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class Grade extends Document<mongoose.Types.ObjectId> {
  @Prop({ type: String, required: true, trim: true })
  nameEn: string;

  @Prop({ type: String, required: true, trim: true })
  nameAr: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  /** Soft-delete timestamp. When set, the grade is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this grade. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const GradeSchema = SchemaFactory.createForClass(Grade);
GradeSchema.plugin(mongoosePaginate);

// Unique only for active grades so soft-deleted rows do not block recreating the same name.
// Existing DBs must drop the old unique indexes (`nameEn_1`, `nameAr_1`) first.
GradeSchema.index(
  { nameEn: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'nameEn_unique_if_not_deleted',
  }
);
GradeSchema.index(
  { nameAr: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'nameAr_unique_if_not_deleted',
  }
);

GradeSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

GradeSchema.set('toJSON', { virtuals: true });
GradeSchema.set('toObject', { virtuals: true });
applySoftDeleteMiddleware(GradeSchema);
