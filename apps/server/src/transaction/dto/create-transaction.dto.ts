// src/transaction/dto/create-transaction.dto.ts
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import mongoose, { Types } from 'mongoose';
import { TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { PaymentMethod, PaymentPurpose, PaymentProvider } from '@darnozom/shared-types';

export class CreateTransactionDto {
  // ========== Multi-Tenant Context ==========
  // At least one of organizationId, walletId, or createdById must be provided
  @IsMongoId()
  @IsOptional()
  toOrganizationId?: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  userId: mongoose.Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  walletId?: Types.ObjectId;

  // ========== Core Transaction Info ==========
  @IsEnum(PaymentPurpose)
  @IsNotEmpty()
  purpose: PaymentPurpose;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsEnum(TransactionStatus)
  @IsNotEmpty()
  status: TransactionStatus;

  @IsNumber()
  @IsNotEmpty()
  balanceBefore: number;

  @IsNumber()
  @IsNotEmpty()
  balanceAfter: number;

  // ========== Financial Details ==========
  @IsNumber()
  @Min(0)
  @IsOptional()
  fees?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  netAmount?: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  originalAmount?: number;

  @IsString()
  @IsOptional()
  originalCurrency?: string;

  // ========== Payment Provider Info ==========
  @IsEnum(PaymentProvider)
  @IsOptional()
  paymentProvider?: PaymentProvider;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  externalTransactionId?: string;

  // ========== LMS-Specific References ==========
  @IsMongoId()
  @IsOptional()
  courseId?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  enrollmentId?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  planId?: Types.ObjectId;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  // ========== Description & Reference ==========
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  // ========== Transfer Transactions ==========
  @IsMongoId()
  @IsOptional()
  recipientWalletId?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  senderWalletId?: Types.ObjectId;

  // ========== Related Entities ==========
  @IsMongoId()
  @IsOptional()
  paymentId?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  orderId?: Types.ObjectId;

  // ========== Metadata & Additional Info ==========
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // ========== Error Handling ==========
  @IsString()
  @IsOptional()
  failureReason?: string;

  @IsString()
  @IsOptional()
  errorCode?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  // ========== Timestamps ==========
  @IsOptional()
  processedAt?: Date;

  @IsMongoId()
  @IsOptional()
  parentTransactionId?: Types.ObjectId;
}
