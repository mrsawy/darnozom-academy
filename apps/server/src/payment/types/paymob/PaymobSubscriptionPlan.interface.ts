import { Currency } from '@lms-organization/shared-types';

export interface PaymobSubscriptionPlan {
  id?: number;
  frequency: number;
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  name: string;
  reminder_days: number | null;
  retrial_days: number | null;
  plan_type: 'rent'; // currently only "rent" is supported
  number_of_deductions?: number;
  amount_cents: number;
  use_transaction_amount: boolean;
  is_active: boolean;
  webhook_url: string;
  integration: number;
  fee?: number;
  currency: Currency;
}
