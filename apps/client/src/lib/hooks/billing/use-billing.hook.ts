'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as billingApi from '@/lib/actions/billing/billing.action';
import type {
  CreateAdjustmentFormValues,
  CreateSubscriptionFormValues,
  IBillingSubscription,
  IFamilyPayment,
  IFamilyStatement,
  InitiatePaymentFormValues,
  IPaymentMethodOption,
} from '@/lib/types/billing/billing';

const ROOT = 'billing';

export const billingKeys = {
  groupSubscriptions: (groupId: string) => [ROOT, 'group-subscriptions', groupId] as const,
  familySubscriptions: (familyId: string) => [ROOT, 'family-subscriptions', familyId] as const,
  statement: (familyId: string) => [ROOT, 'statement', familyId] as const,
  receiptQueue: [ROOT, 'receipt-queue'] as const,
  methods: [ROOT, 'methods'] as const,
};

export function useBillingMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const t = useTranslations('Billing');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const useGroupSubscriptions = (groupId: string, enabled = true) =>
  useQuery({
    queryKey: billingKeys.groupSubscriptions(groupId),
    queryFn: async (): Promise<IBillingSubscription[]> =>
      unwrap(await billingApi.getSubscriptionsForGroup(groupId)),
    enabled: enabled && Boolean(groupId),
  });

export const useFamilySubscriptions = (familyId: string, enabled = true) =>
  useQuery({
    queryKey: billingKeys.familySubscriptions(familyId),
    queryFn: async (): Promise<IBillingSubscription[]> =>
      unwrap(await billingApi.getSubscriptionsForFamily(familyId)),
    enabled: enabled && Boolean(familyId),
  });

export const useStatement = (familyId: string, enabled = true) =>
  useQuery({
    queryKey: billingKeys.statement(familyId),
    queryFn: async (): Promise<IFamilyStatement> =>
      unwrap(await billingApi.getFamilyStatement(familyId)),
    enabled: enabled && Boolean(familyId),
  });

export const useReceiptQueue = (enabled = true) =>
  useQuery({
    queryKey: billingKeys.receiptQueue,
    queryFn: async (): Promise<IFamilyPayment[]> => unwrap(await billingApi.getReceiptQueue()),
    enabled,
  });

export const usePaymentMethods = (enabled = true) =>
  useQuery({
    queryKey: billingKeys.methods,
    queryFn: async (): Promise<IPaymentMethodOption[]> =>
      unwrap(await billingApi.getPaymentMethods()),
    enabled,
  });

export const useMethods = usePaymentMethods;

export const useCreateSubscription = () =>
  useBillingMutation(async (data: CreateSubscriptionFormValues) =>
    unwrap(await billingApi.createSubscription(data))
  );

export const useEndSubscription = () =>
  useBillingMutation(async (id: string) => unwrap(await billingApi.endSubscription(id)));

export const useAdjustLedger = () =>
  useBillingMutation(async (data: CreateAdjustmentFormValues) =>
    unwrap(await billingApi.adjustLedger(data))
  );

export const useInitiatePayment = () =>
  useBillingMutation(async (data: InitiatePaymentFormValues) =>
    unwrap(await billingApi.initiatePayment(data))
  );

export const useAttachReceipt = () =>
  useBillingMutation(async (vars: { paymentId: string; fileKey: string }) =>
    unwrap(await billingApi.attachReceipt(vars.paymentId, vars.fileKey))
  );

export const useApprovePayment = () =>
  useBillingMutation(async (paymentId: string) =>
    unwrap(await billingApi.approvePayment(paymentId))
  );

export const useRejectPayment = () =>
  useBillingMutation(async (vars: { paymentId: string; reason: string }) =>
    unwrap(await billingApi.rejectPayment(vars.paymentId, vars.reason))
  );
