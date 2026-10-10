import { IntervalUnit, PlanStatus, SetupFeeFailureAction, TenureType } from '../../enums/paypal.enum';

export interface FixedPrice {
  value: string; // PayPal expects string values like "44"
  currency_code: string;
}

export interface PricingScheme {
  fixed_price: FixedPrice;
}

export interface Frequency {
  interval_unit: IntervalUnit;
  interval_count: number;
}

export interface BillingCycle {
  frequency: Frequency;
  tenure_type: TenureType;
  sequence: number;
  total_cycle?: number;
  pricing_scheme: PricingScheme;
}

export interface SetupFee {
  value: string;
  currency_code: string;
}

export interface PaymentPreferences {
  auto_bill_outstanding: boolean;
  setup_fee?: SetupFee;
  setup_fee_failure_action?: SetupFeeFailureAction;
  payment_failure_threshold?: number;
}

export interface Taxes {
  percentage: string;
  inclusive: boolean;
}

export interface PayPalPlan {
  product_id: string;
  name: string;
  description?: string;
  status: PlanStatus;
  billing_cycles: BillingCycle[];
  payment_preferences: PaymentPreferences;
  taxes: Taxes;
  type: 'INFINITE' | 'FIXED';
}
