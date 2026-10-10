import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class OrganizationReview {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Organization' })
  reviewedOrganizationId: Types.ObjectId;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  coursesQuality: number;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  platformExperience: number;

  @Prop({ type: Number, min: 1, max: 5, required: false })
  support: number;
}

export const OrganizationReviewSchema = SchemaFactory.createForClass(OrganizationReview);

OrganizationReviewSchema.virtual('reviewedOrganization', {
  ref: 'Organization',
  localField: 'reviewedOrganizationId',
  foreignField: '_id',
  justOne: true,
});

OrganizationReviewSchema.set('toJSON', { virtuals: true });
OrganizationReviewSchema.set('toObject', { virtuals: true });
