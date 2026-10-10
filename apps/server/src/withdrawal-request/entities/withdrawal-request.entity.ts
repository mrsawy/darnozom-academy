import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Currency, WithdrawalMethod, WithdrawalRequestStatus } from '@lms-organization/shared-types';

export interface MobileWalletDetails {
  phoneNumber: string;
  providerName: string;
}

export interface BankTransferDetails {
  iban: string;
  bankName: string;
  accountHolderName: string;
}

export interface CreditCardDetails {
  cardHolderName: string;
  cardLastFour: string;
}

export type WithdrawalMethodDetails = MobileWalletDetails | BankTransferDetails | CreditCardDetails;

@Schema({ timestamps: true, collection: 'withdrawal_requests' })
export class WithdrawalRequest extends Document<Types.ObjectId> {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Wallet', index: true })
  walletId: Types.ObjectId;

  @Prop({ required: true, type: Number, min: 0 })
  amount: number;

  @Prop({ required: true, type: String, default: Currency.DEFAULT })
  currency: string;

  @Prop({ required: true, type: String, enum: WithdrawalMethod })
  method: WithdrawalMethod;

  @Prop({ required: true, type: Object })
  methodDetails: WithdrawalMethodDetails;

  @Prop({ type: String, enum: WithdrawalRequestStatus, default: WithdrawalRequestStatus.PENDING, index: true })
  status: WithdrawalRequestStatus;

  @Prop({ type: String })
  userNote?: string;

  @Prop({ type: String })
  adminNote?: string;

  @Prop({ type: [String], default: [] })
  proofImageKeys: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId;

  @Prop({ type: Date })
  processedAt?: Date;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);
WithdrawalRequestSchema.plugin(mongoosePaginate);

WithdrawalRequestSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

WithdrawalRequestSchema.virtual('wallet', {
  ref: 'Wallet',
  localField: 'walletId',
  foreignField: '_id',
  justOne: true,
});

WithdrawalRequestSchema.virtual('processor', {
  ref: 'User',
  localField: 'processedBy',
  foreignField: '_id',
  justOne: true,
});

WithdrawalRequestSchema.set('toJSON', { virtuals: true });
WithdrawalRequestSchema.set('toObject', { virtuals: true });
