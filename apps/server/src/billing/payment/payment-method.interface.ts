import { Currency } from '@darnozom/shared-types';

/** DI token collecting every registered method. A new method is a new provider under this token. */
export const FAMILY_PAYMENT_METHODS = Symbol('FAMILY_PAYMENT_METHODS');

/** The slice of an organization a method needs. Keeps methods off the full document. */
export interface OrganizationForBilling {
  _id?: unknown;
  enabledFamilyPaymentMethods?: string[];
  academyFeeGatewayProvider?: string | null;
}

export interface InitiateInput {
  organizationId: string;
  familyId: string;
  amountMinor: number;
  currency: Currency;
  payerId: string;
  /** The payer's user document, when the method needs billing details (the gateway does). */
  payer?: unknown;
  meta?: Record<string, unknown>;
}

export type InitiateResult = { kind: 'REDIRECT'; url: string; paymentId: string } | { kind: 'AWAIT_RECEIPT'; paymentId: string };

/**
 * A way for a family to pay. Billing code never names a concrete method: it asks the registry for
 * what the organization has enabled and calls `initiate`. Adding bank transfer, cash at the desk,
 * or a second gateway means writing one class and registering it — no change to billing logic.
 */
export interface FamilyPaymentMethod {
  readonly key: string;
  isEnabled(org: OrganizationForBilling): boolean;
  initiate(input: InitiateInput): Promise<InitiateResult>;
}
