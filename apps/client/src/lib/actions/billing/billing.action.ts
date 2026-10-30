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
import type {
  IPaymentMethodConfig,
  IPaymentMethodFieldInput,
} from '@/lib/types/billing/payment-method-config';
import type { PaymentProvider } from '@darnozom/shared-types';

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

export async function getAllPaymentMethods() {
  return createAuthorizedNatsRequest<IPaymentMethodOption[]>('billing.payments.methods.all', {});
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

export async function getReceiptQueue(filter?: { status?: string; groupId?: string }) {
  return createAuthorizedNatsRequest<IFamilyPayment[]>('billing.payments.queue', filter ?? {});
}

export async function getMyFamilyPayments() {
  return createAuthorizedNatsRequest<IFamilyPayment[]>('billing.payments.myFamily', {});
}

export async function approvePayment(paymentId: string) {
  return createAuthorizedNatsRequest<void>('billing.payments.approve', { paymentId });
}

export async function rejectPayment(paymentId: string, reason: string) {
  return createAuthorizedNatsRequest<void>('billing.payments.reject', { paymentId, reason });
}

export async function getBillingSettings() {
  return createAuthorizedNatsRequest<{
    enabledFamilyPaymentMethods: string[];
    academyFeeGatewayProvider: PaymentProvider | null;
  }>('billing.settings.get', {});
}

export async function updateBillingSettings(data: {
  enabledFamilyPaymentMethods: string[];
  academyFeeGatewayProvider: PaymentProvider | null;
}) {
  return createAuthorizedNatsRequest<{
    enabledFamilyPaymentMethods: string[];
    academyFeeGatewayProvider: PaymentProvider | null;
  }>('billing.settings.update', data);
}

export async function listPaymentMethodConfigs() {
  return createAuthorizedNatsRequest<IPaymentMethodConfig[]>('billing.paymentMethodConfigs.list', {});
}

export async function upsertPaymentMethodConfigFields(configId: string, fields: IPaymentMethodFieldInput[]) {
  return createAuthorizedNatsRequest<IPaymentMethodConfig>('billing.paymentMethodConfigs.upsertFields', {
    configId,
    fields,
  });
}

export async function setPaymentMethodConfigEnabled(configId: string, enabled: boolean) {
  return createAuthorizedNatsRequest<IPaymentMethodConfig>('billing.paymentMethodConfigs.setEnabled', {
    configId,
    enabled,
  });
}

export async function createCustomPaymentMethodConfig(label: string, fields: IPaymentMethodFieldInput[]) {
  return createAuthorizedNatsRequest<IPaymentMethodConfig>('billing.paymentMethodConfigs.createCustom', {
    label,
    fields,
  });
}
