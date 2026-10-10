import { PaymentProvider } from './payment.interface';

export interface PaymentResponse {
  paymentUrl: string;
  paymentId: string;
  expiresAt?: Date;
  provider: PaymentProvider;
  metadata?: Record<string, unknown>;
}
