/**
 * Payment-provider error keys (Paymob, etc.). Use as translation keys on backend and frontend.
 */
export enum PaymentErrors {
  /** Paymob/provider rejected the configured integration ID(s). */
  INTEGRATION_NOT_FOUND = 'paymentIntegrationNotFound',
  /** Provider intention/checkout request failed for a non-specific reason. */
  PROVIDER_REQUEST_FAILED = 'paymentProviderRequestFailed',
  /** Live public key mixed with test secret (or the reverse). */
  KEY_MODE_MISMATCH = 'paymentKeyModeMismatch',
}
