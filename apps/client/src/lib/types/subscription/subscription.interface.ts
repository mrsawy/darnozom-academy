import { BillingCycle } from '../course/enum/BillingCycle.enum';
import { SubscriptionStatus } from './subscription.enum';

export interface SubscriptionTypeDef {
  reminder_days?: number;
  status: SubscriptionStatus; // assuming "state" refers to subscription status
  starts_at: Date | string;
  next_billing?: Date | string;
  reminder_date?: Date | string;
  ends_at?: Date | string;
  resumed_at?: Date;
  suspended_at?: Date;
  reactivated_at?: Date;
  transaction_id?: string;
  billing: {
    email: string;
    last_name: string;
    first_name: string;
    phone_number?: string;
    amount: number;
    currency: string;
    billingCycle: BillingCycle;
  };

  createdAt: Date | string;
  updatedAt: Date | string;
}
