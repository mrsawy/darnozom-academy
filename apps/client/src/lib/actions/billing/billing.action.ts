'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  CreateAdjustmentFormValues,
  CreateSubscriptionFormValues,
  IBillingSubscription,
  IFamilyPayment,
  IFamilyStatement,
  InitiatePaymentFormValues,
  IPaymentMethodOption,
} from '@/lib/types/billing/billing';

export async function createSubscription(data: CreateSubscriptionFormValues) {
  return createAuthorizedNatsRequest<IBillingSubscription>('billing.subscriptions.create', data);
}

export async function getSubscriptionsForGroup(groupId: string) {
  return createAuthorizedNatsRequest<IBillingSubscription[]>('billing.subscriptions.listForGroup', {
    groupId,
  });
}

export async function getSubscriptionsForFamily(familyId: string) {
  return createAuthorizedNatsRequest<IBillingSubscription[]>(
    'billing.subscriptions.listForFamily',
    {
      familyId,
    }
  );
}

export async function endSubscription(id: string) {
  return createAuthorizedNatsRequest<IBillingSubscription>('billing.subscriptions.end', { id });
}

export async function getFamilyStatement(familyId: string) {
  return createAuthorizedNatsRequest<IFamilyStatement>('billing.ledger.statement', { familyId });
}

export async function adjustLedger(data: CreateAdjustmentFormValues) {
  return createAuthorizedNatsRequest('billing.ledger.adjust', data);
}

export async function getPaymentMethods() {
  return createAuthorizedNatsRequest<IPaymentMethodOption[]>('billing.payments.methods', {});
}

export async function initiatePayment(data: InitiatePaymentFormValues) {
  return createAuthorizedNatsRequest<{
    paymentId: string;
    clientSecret?: string;
    kind?: string;
    url?: string;
  }>('billing.payments.initiate', data);
}

export async function attachReceipt(paymentId: string, fileKey: string) {
  return createAuthorizedNatsRequest<void>('billing.payments.attachReceipt', {
    paymentId,
    fileKey,
  });
}

export async function getReceiptQueue() {
  return createAuthorizedNatsRequest<IFamilyPayment[]>('billing.payments.queue', {});
}

export async function approvePayment(paymentId: string) {
  return createAuthorizedNatsRequest<void>('billing.payments.approve', { paymentId });
}

export async function rejectPayment(paymentId: string, reason: string) {
  return createAuthorizedNatsRequest<void>('billing.payments.reject', { paymentId, reason });
}
