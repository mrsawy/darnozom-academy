'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { PaymentResponse } from '@/lib/types/payment/directPaymentResponse.interface';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { PaymentMethod } from '@/lib/types/payment/payment.interface';

export interface RenewEnrollmentPayload {
  enrollmentId: string;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  provider?: string;
  currency?: string;
}

export async function renewEnrollment(
  payload: RenewEnrollmentPayload
): Promise<PaymentResponse | IEnrollment> {
  return (await createAuthorizedNatsRequest<PaymentResponse | IEnrollment>(
    'enrollment.renewEnrollment',
    payload
    // true
  )) as PaymentResponse | IEnrollment;
}
