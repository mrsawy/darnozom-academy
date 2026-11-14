import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency, GroupPayModel } from '@darnozom/shared-types';

export type GroupPayRuleDocument = GroupPayRule & Document<Types.ObjectId>;

/**
 * How one teacher is paid for one group. Append-only per (teacher, group): a change is a new row
 * with a later `effectiveFrom`, so a past month is always priced with the rule that applied then.
 */
@Schema({ timestamps: true })
export class GroupPayRule {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(GroupPayModel), required: true })
  model: GroupPayModel;

  @Prop({ type: Number, required: true, min: 0 })
  rate: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  @Prop({ type: Date, required: true, default: () => new Date() })
  effectiveFrom: Date;

  /** Set when the rule is withdrawn; a withdrawn rule stops applying from this date. */
  @Prop({ type: Date, required: false, default: null })
  endedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const GroupPayRuleSchema = SchemaFactory.createForClass(GroupPayRule);
GroupPayRuleSchema.index({ organizationId: 1, teacherId: 1, groupId: 1, effectiveFrom: -1 });
