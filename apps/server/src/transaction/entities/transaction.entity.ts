import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { PaymentMethod, PaymentPurpose, PaymentProvider } from '@lms-organization/shared-types';

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  TRANSFER = 'TRANSFER',
  REFUND = 'REFUND',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

@Schema({
  timestamps: true,
  collection: 'transactions',
})
export class Transaction extends Document<Types.ObjectId> {
  // ========== Multi-Tenant Context ==========
  @Prop({ required: false, type: Types.ObjectId, ref: 'Organization', index: true })
  toOrganizationId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Wallet', index: true })
  walletId?: Types.ObjectId; // Wallet that this transaction affects (for credit/debit)

  // ========== Core Transaction Info ==========
  @Prop({ required: true, type: String, enum: PaymentPurpose, index: true })
  purpose: PaymentPurpose;

  @Prop({ required: true, type: String, enum: TransactionType, index: true })
  type: TransactionType;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, required: true, default: 'USD' })
  currency: string;

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
    index: true,
  })
  status: TransactionStatus;

  @Prop({ type: Number, required: true })
  balanceBefore: number;

  @Prop({ type: Number, required: true })
  balanceAfter: number;

  // ========== Financial Details ==========
  @Prop({ type: Number, default: 0, min: 0 })
  fees?: number; // Transaction fees (platform fees, processing fees)

  @Prop({ type: Number, default: 0, min: 0 })
  netAmount?: number; // Amount after fees (amount - fees)

  @Prop({ type: Number })
  exchangeRate?: number; // Exchange rate if currency conversion occurred

  @Prop({ type: Number })
  originalAmount?: number; // Original amount before currency conversion

  @Prop({ type: String })
  originalCurrency?: string; // Original currency before conversion

  // ========== Payment Provider Info ==========
  @Prop({ type: String, enum: PaymentProvider })
  paymentProvider?: PaymentProvider; // PAYMOB, PAYPAL, KASHIER, etc.

  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod?: PaymentMethod; // WALLET, DIRECT, CREDIT_CARD, etc.

  @Prop({ type: String, unique: true, sparse: true, index: true })
  externalTransactionId?: string; // Payment provider's transaction ID

  // ========== LMS-Specific References ==========
  @Prop({ type: Types.ObjectId, ref: 'Course', index: true })
  courseId?: Types.ObjectId; // For course purchase transactions

  @Prop({ type: Types.ObjectId, ref: 'Enrollment', index: true })
  enrollmentId?: Types.ObjectId; // For enrollment-related transactions

  @Prop({ type: Types.ObjectId, ref: 'Plan' })
  planId?: Types.ObjectId; // For subscription/plan transactions

  @Prop({ type: String })
  subscriptionId?: string; // External subscription ID from payment provider

  // ========== Description & Reference ==========
  @Prop({ type: String })
  description: string; // Human-readable description of the transaction

  @Prop({ type: String, index: true })
  reference: string; // Internal reference number

  @Prop({ type: String, unique: true, sparse: true })
  invoiceNumber?: string; // Invoice number for accounting purposes

  // ========== Transfer Transactions ==========
  @Prop({ type: Types.ObjectId, ref: 'Wallet' })
  recipientWalletId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Wallet' })
  senderWalletId?: Types.ObjectId;

  // ========== Related Entities ==========
  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  // ========== Metadata & Additional Info ==========
  @Prop({ type: Object })
  metadata: Record<string, unknown>; // Additional flexible data (payment details, webhook data, etc.)

  @Prop({ type: [String], default: [] })
  tags?: string[]; // Tags for categorization and filtering (e.g., ['refund', 'course-purchase', 'subscription'])

  // ========== Error Handling ==========
  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: String })
  errorCode?: string; // Payment provider error code

  @Prop({ type: String })
  errorMessage?: string; // Detailed error message

  // ========== Timestamps ==========
  @Prop({ type: Date })
  processedAt?: Date; // When transaction was processed

  @Prop({ type: Date })
  reversedAt?: Date; // When transaction was reversed

  @Prop({ type: Types.ObjectId, ref: 'Transaction' })
  reversalTransactionId?: Types.ObjectId; // Reference to reversal transaction

  @Prop({ type: Types.ObjectId, ref: 'Transaction' })
  parentTransactionId?: Types.ObjectId; // For refunds/reversals, reference to original transaction
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.plugin(mongoosePaginate);

// Virtuals
TransactionSchema.virtual('wallet', {
  ref: 'Wallet',
  localField: 'walletId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('recipientWallet', {
  ref: 'Wallet',
  localField: 'recipientWalletId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('senderWallet', {
  ref: 'Wallet',
  localField: 'senderWalletId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('createdBy', {
  ref: 'User',
  localField: 'createdById',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('enrollment', {
  ref: 'Enrollment',
  localField: 'enrollmentId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('plan', {
  ref: 'Plan',
  localField: 'planId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.virtual('parentTransaction', {
  ref: 'Transaction',
  localField: 'parentTransactionId',
  foreignField: '_id',
  justOne: true,
});

TransactionSchema.set('toJSON', { virtuals: true });
TransactionSchema.set('toObject', { virtuals: true });
