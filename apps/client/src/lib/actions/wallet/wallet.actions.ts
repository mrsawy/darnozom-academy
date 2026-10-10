import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { IWallet } from '@/lib/types/wallet/IWallet';
import {
  CreatePaymentLinkRequest,
  CreatePaymentLinkResponse,
  PaymentStatusResponse,
} from '@/lib/types/payment/payment.interface';

/**
 * Get user's wallet
 */
export async function getWallet() {
  const response = await createAuthorizedNatsRequest<IWallet>('wallet.findByUser');

  return response;
}

/**
 * Create payment link for wallet credit
 */
export async function createWalletPaymentLink(request: CreatePaymentLinkRequest) {
  const response = await createAuthorizedNatsRequest<CreatePaymentLinkResponse>(
    'payment.create-payment-url',
    request
  );

  return response;
}

/**
 * Check payment status
 */
interface PaymentStatusApiResponse {
  success: boolean;
  data?: PaymentStatusResponse;
  error?: string;
}

export async function checkPaymentStatus(provider: string, paymentId: string) {
  const response = await createAuthorizedNatsRequest<PaymentStatusApiResponse>(
    'wallet.payment.status',
    {
      provider,
      paymentId,
    }
  );

  if (isNatsErrResult(response)) {
    throw new Error(response.err.message);
  }

  if (!response.success || !response.data) {
    throw new Error(response.error ?? 'Failed to check payment status');
  }

  return response.data;
}

/**
 * Get wallet transaction history
 */
interface TransactionHistoryApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function getTransactionHistory(page = 1, limit = 10) {
  const response = await createAuthorizedNatsRequest<TransactionHistoryApiResponse>(
    'wallet.transactions.list',
    { page, limit }
  );

  if (isNatsErrResult(response)) {
    throw new Error(response.err.message);
  }

  if (!response.success || !response.data) {
    throw new Error(response.error ?? 'Failed to fetch transactions');
  }

  return response.data;
}
