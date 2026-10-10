import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getWallet,
  createWalletPaymentLink,
  checkPaymentStatus,
} from '@/lib/actions/wallet/wallet.actions';
import {
  CreatePaymentLinkRequest,
  type PaymentStatusResponse,
} from '@/lib/types/payment/payment.interface';

// Query keys
export const walletKeys = {
  all: ['wallet'] as const,
  wallet: () => [...walletKeys.all, 'detail'] as const,
  transactions: (page?: number) => [...walletKeys.all, 'transactions', page] as const,
  paymentStatus: (provider: string, paymentId: string) =>
    [...walletKeys.all, 'payment', provider, paymentId] as const,
};

/**
 * Hook to fetch wallet data.
 * Pass `enabled: false` on public pages when the user is unauthenticated
 * so we never hit the authorized wallet endpoint without a token.
 */
export function useWallet(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: walletKeys.wallet(),
    queryFn: getWallet,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create payment link for adding funds
 */
export function useCreatePaymentLink() {
  const queryClient = useQueryClient();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (redirectUrl && globalThis.window !== undefined) {
      globalThis.window.open(redirectUrl, '_blank');
      setRedirectUrl(null);
    }
  }, [redirectUrl]);

  return useMutation({
    mutationFn: async (request: CreatePaymentLinkRequest) => {
      return await createWalletPaymentLink(request);
    },
    onSuccess: (data) => {
      // Invalidate wallet query to refresh after payment
      void queryClient.invalidateQueries({ queryKey: walletKeys.wallet() });

      // Set redirect URL to trigger effect
      setRedirectUrl(data.paymentUrl);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to create payment link');
    },
  });
}
/**
 * Hook to check payment status
 */
export function usePaymentStatus(provider: string, paymentId: string, enabled = false) {
  const queryClient = useQueryClient();
  const query = useQuery<PaymentStatusResponse>({
    queryKey: walletKeys.paymentStatus(provider, paymentId),
    queryFn: () => checkPaymentStatus(provider, paymentId),
    enabled: enabled && !!provider && !!paymentId,
    refetchInterval: (query) => {
      // Stop polling if payment is completed or failed
      if (query.state.data?.status === 'completed' || query.state.data?.status === 'failed') {
        return false;
      }
      // Poll every 3 seconds while pending
      return 3000;
    },
  });

  useEffect(() => {
    if (query.data) {
      if (query.data.status === 'completed') {
        toast.success(
          `Payment of ${query.data.currency} ${query.data.amount} completed successfully!`
        );
        // Refresh wallet data
        void queryClient.invalidateQueries({ queryKey: walletKeys.wallet() });
      } else if (query.data.status === 'failed') {
        toast.error('Payment failed. Please try again.');
      }
    }
  }, [query.data, queryClient]);

  return query;
}

/**
 * Hook to refresh wallet data manually
 */
export function useRefreshWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: walletKeys.wallet() });
      return await getWallet();
    },
    onSuccess: () => {
      toast.success('Wallet data refreshed');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to refresh wallet');
    },
  });
}
