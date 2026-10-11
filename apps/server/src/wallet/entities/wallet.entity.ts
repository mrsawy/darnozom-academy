// src/wallet/schemas/wallet.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Currency } from '@darnozom/shared-types';
@Schema({
  timestamps: true,
  collection: 'wallets',
})
export class Wallet extends Document<Types.ObjectId> {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Organization' })
  organizationId: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0, type: Number })
  balance: number;

  @Prop({ type: String, enum: Currency, default: 'USD' })
  currency: Currency;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isFrozen: boolean;

  @Prop({ type: Date })
  lastTransactionDate: Date;

  @Prop({ type: Object })
  metadata: Record<string, string>;

  @Prop({ default: [], ref: 'Transaction', type: [Types.ObjectId] })
  transactionsHistoryIds: Types.ObjectId[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
WalletSchema.plugin(mongoosePaginate);

WalletSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});
WalletSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});
WalletSchema.virtual('transactionsHistory', {
  ref: 'Transaction',
  localField: 'transactionsHistoryIds',
  foreignField: '_id',
  justOne: false,
});

WalletSchema.set('toJSON', { virtuals: true });
WalletSchema.set('toObject', { virtuals: true });
