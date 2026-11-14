import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency, GroupPayModel, PayStatementStatus, TeacherPayModel } from '@darnozom/shared-types';

@Schema({ _id: false })
export class PayProfileSnapshot {
  @Prop({ type: String, enum: Object.values(TeacherPayModel), required: true })
  model: TeacherPayModel;

  @Prop({ type: Number, required: true })
  rate: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;
}
export const PayProfileSnapshotSchema = SchemaFactory.createForClass(PayProfileSnapshot);

@Schema({ _id: false })
export class PayBasis {
  @Prop({ type: Number, required: true, default: 0 })
  sessions: number;

  @Prop({ type: Number, required: true, default: 0 })
  minutes: number;

  @Prop({ type: Number, required: true, default: 0 })
  students: number;

  @Prop({ type: Number, required: true, default: 0 })
  revenue: number;
}
export const PayBasisSchema = SchemaFactory.createForClass(PayBasis);

@Schema({ _id: false })
export class PayBonus {
  @Prop({ type: Number, required: true, min: 0.01 })
  amount: number;

  @Prop({ type: String, required: true, trim: true })
  reason: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addedBy: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date() })
  addedAt: Date;
}
export const PayBonusSchema = SchemaFactory.createForClass(PayBonus);

/** One group's contribution to the statement; frozen at generation so later rule edits never rewrite it. */
@Schema({ _id: false })
export class PayStatementLine {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: String, required: true })
  groupName: string;

  @Prop({ type: String, enum: Object.values(GroupPayModel), required: true })
  model: GroupPayModel;

  @Prop({ type: Number, required: true })
  rate: number;

  @Prop({ type: String, enum: Object.values(Currency), required: true })
  currency: Currency;

  @Prop({ type: Number, required: true, default: 0 })
  subscriptions: number;

  @Prop({ type: Number, required: true, default: 0 })
  collected: number;

  @Prop({ type: Number, required: true, default: 0 })
  sessions: number;

  @Prop({ type: Number, required: true })
  amount: number;
}
export const PayStatementLineSchema = SchemaFactory.createForClass(PayStatementLine);

@Schema({ timestamps: true })
export class PayStatement extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  teacherId: Types.ObjectId;

  @Prop({ type: String, required: true })
  month: string; // "YYYY-MM"

  /** Legacy single-profile statements only. Per-group statements carry `lines` instead. */
  @Prop({ type: PayProfileSnapshotSchema, required: false })
  profileSnapshot?: PayProfileSnapshot;

  @Prop({ type: String, enum: Object.values(Currency), required: false })
  currency?: Currency;

  @Prop({ type: [PayStatementLineSchema], default: [] })
  lines: PayStatementLine[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Session' }], default: [] })
  countedSessionIds: Types.ObjectId[];

  @Prop({ type: PayBasisSchema, required: true })
  basis: PayBasis;

  @Prop({ type: Number, required: true })
  baseAmount: number;

  @Prop({ type: [PayBonusSchema], default: [] })
  bonuses: PayBonus[];

  @Prop({ type: Number, required: true })
  total: number;

  @Prop({
    type: String,
    enum: Object.values(PayStatementStatus),
    default: PayStatementStatus.DRAFT,
    index: true,
  })
  status: PayStatementStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  paidBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  paidAt?: Date;

  @Prop({ type: String, required: false })
  paymentReference?: string;
}

export const PayStatementSchema = SchemaFactory.createForClass(PayStatement);
PayStatementSchema.index({ organizationId: 1, teacherId: 1, month: 1 }, { unique: true });
PayStatementSchema.index({ organizationId: 1, month: 1, status: 1 });
