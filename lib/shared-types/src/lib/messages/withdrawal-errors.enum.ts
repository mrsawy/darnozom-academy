/**
 * Withdrawal request / wallet validation keys for API exceptions.
 */
export enum WithdrawalRequestErrors {
  WALLET_NOT_FOUND = 'walletNotFound',
  WALLET_FROZEN = 'walletFrozen',
  WALLET_NOT_ACTIVE = 'walletNotActive',
  INSUFFICIENT_BALANCE_FOR_WITHDRAWAL = 'insufficientBalanceForWithdrawal',
  INVALID_WITHDRAWAL_REQUEST_ID = 'invalidWithdrawalRequestId',
  WITHDRAWAL_REQUEST_NOT_FOUND = 'withdrawalRequestNotFound',
  WITHDRAWAL_REQUEST_ACCESS_DENIED = 'withdrawalRequestAccessDenied',
  ONLY_PENDING_WITHDRAWAL_REQUESTS_EDITABLE = 'onlyPendingWithdrawalRequestsEditable',
  ONLY_PENDING_WITHDRAWAL_REQUESTS_CANCELLABLE = 'onlyPendingWithdrawalRequestsCancellable',
  ONLY_PENDING_WITHDRAWAL_REQUESTS_PROCESSABLE = 'onlyPendingWithdrawalRequestsProcessable',
}
