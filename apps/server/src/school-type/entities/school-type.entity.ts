import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

export type SchoolTypeDocument = SchoolType & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class SchoolType extends Document<mongoose.Types.ObjectId> {
  @Prop({ type: String, required: true, trim: true })
  nameEn: string;

  @Prop({ type: String, required: true, trim: true })
  nameAr: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  /** Soft-delete timestamp. When set, the school type is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this school type. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const SchoolTypeSchema = SchemaFactory.createForClass(SchoolType);
SchoolTypeSchema.plugin(mongoosePaginate);

// Unique only for active school types so soft-deleted rows do not block recreating the same name.
// Existing DBs must drop the old unique indexes (`nameEn_1`, `nameAr_1`) first.
SchoolTypeSchema.index(
  { nameEn: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'nameEn_unique_if_not_deleted',
  }
);
SchoolTypeSchema.index(
  { nameAr: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'nameAr_unique_if_not_deleted',
  }
);

SchoolTypeSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

SchoolTypeSchema.set('toJSON', { virtuals: true });
SchoolTypeSchema.set('toObject', { virtuals: true });
applySoftDeleteMiddleware(SchoolTypeSchema);
