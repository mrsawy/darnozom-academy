import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

export type AgeRangeDocument = AgeRange & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class AgeRange extends Document<mongoose.Types.ObjectId> {
  @Prop({ type: String, required: true, trim: true })
  nameEn: string;

  @Prop({ type: String, required: true, trim: true })
  nameAr: string;

  @Prop({ type: Number, required: true, min: 0 })
  minAge: number;

  /** null = open-ended (e.g. 18+). */
  @Prop({ type: Number, required: false, default: null, min: 0 })
  maxAge?: number | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  /** Soft-delete timestamp. When set, the ageRange is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this age-range. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const AgeRangeSchema = SchemaFactory.createForClass(AgeRange);
AgeRangeSchema.plugin(mongoosePaginate);

// Unique only for active age ranges so soft-deleted rows do not block recreating the same name.
// Existing DBs must drop the old unique indexes (`nameEn_1`, `nameAr_1`) first.
AgeRangeSchema.index(
  { nameEn: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'nameEn_unique_if_not_deleted',
  }
);
AgeRangeSchema.index(
  { nameAr: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'nameAr_unique_if_not_deleted',
  }
);

AgeRangeSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

AgeRangeSchema.set('toJSON', { virtuals: true });
AgeRangeSchema.set('toObject', { virtuals: true });
applySoftDeleteMiddleware(AgeRangeSchema);
