export enum IntervalUnit {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export enum TenureType {
  TRIAL = 'TRIAL',
  REGULAR = 'REGULAR',
}

export enum SetupFeeFailureAction {
  CONTINUE = 'CONTINUE',
  CANCEL = 'CANCEL',
}

export enum PlanStatus {
  CREATED = 'CREATED',
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
}

export enum ShippingPreference {
  GET_FROM_FILE = 'GET_FROM_FILE',
  NO_SHIPPING = 'NO_SHIPPING',
  SET_PROVIDED_ADDRESS = 'SET_PROVIDED_ADDRESS',
}

export enum UserAction {
  SUBSCRIBE_NOW = 'SUBSCRIBE_NOW',
  CONTINUE = 'CONTINUE',
}

export enum PayeePreferred {
  IMMEDIATE_PAYMENT_REQUIRED = 'IMMEDIATE_PAYMENT_REQUIRED',
  UNRESTRICTED = 'UNRESTRICTED',
}

export enum PayerSelected {
  PAYPAL = 'PAYPAL',
}
