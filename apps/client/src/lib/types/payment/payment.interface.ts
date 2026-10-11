// lib/types/payment/payment.interface.ts

import type { ComponentType } from 'react';

import { PaymentMethod, PaymentProvider, PaymentPurpose } from '@darnozom/shared-types';

export interface PaymentOption {
  id: string; // Unique identifier for the option
  provider: PaymentProvider;
  method: PaymentMethod;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>; // Lucide icon component
  logo: string; // Emoji or image
  currencies: string[];
  integrationId?: string; // For Paymob different integration IDs
}

export interface CreatePaymentLinkRequest {
  amount: number;
  currency: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentLinkResponse {
  paymentUrl: string;
  paymentId: string;
  expiresAt?: string;
  provider: string;
  method: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}

export { PaymentMethod, PaymentPurpose, PaymentProvider } from '@darnozom/shared-types';
