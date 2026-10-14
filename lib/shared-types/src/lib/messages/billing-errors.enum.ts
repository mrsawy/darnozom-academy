/** Billing message keys, translated by the client under its `errors` namespace. */
export enum BillingErrors {
  SUBSCRIPTION_NOT_FOUND = 'billingSubscriptionNotFound',
  SUBSCRIPTION_ALREADY_ACTIVE = 'billingSubscriptionAlreadyActive',
  SUBSCRIPTION_ITEMS_INVALID = 'billingSubscriptionItemsInvalid',
  FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS = 'billingFamilySubscriptionNeedsSiblings',
  AMOUNT_INVALID = 'billingAmountInvalid',
  AMOUNT_LOCKED = 'billingAmountLocked',
  PAYMENT_NOT_FOUND = 'billingPaymentNotFound',
  PAYMENT_NOT_REVIEWABLE = 'billingPaymentNotReviewable',
  PAYMENT_METHOD_UNKNOWN = 'billingPaymentMethodUnknown',
  PAYMENT_METHOD_DISABLED = 'billingPaymentMethodDisabled',
  RECEIPT_REQUIRED = 'billingReceiptRequired',
  REJECT_REASON_REQUIRED = 'billingRejectReasonRequired',
  ADJUSTMENT_REASON_REQUIRED = 'billingAdjustmentReasonRequired',
  NOT_YOUR_FAMILY = 'billingNotYourFamily',
  CURRENCY_MISMATCH = 'billingCurrencyMismatch',
  GATEWAY_NOT_CONFIGURED = 'billingGatewayNotConfigured',
}
