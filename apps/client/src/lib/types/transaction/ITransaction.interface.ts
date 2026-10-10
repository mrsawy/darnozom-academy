import { PaymentMethod, PaymentProvider, PaymentPurpose } from '../payment/payment.interface';

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  status: TransactionStatus;
  createdAt: string;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  purpose: PaymentPurpose;
  paymentMethod: PaymentMethod;
  paymentProvider: PaymentProvider;
  externalTransactionId: string;
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  TRANSFER = 'TRANSFER',
  REFUND = 'REFUND',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',
}
