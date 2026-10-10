import { PayPalWebhookLink } from './paybalWebhookBody.interface';

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalWebhookLink[];
}

export interface PayPalCaptureResource {
  id: string;
  status: string;
  amount: {
    value: string;
    currency_code: string;
  };
  custom_id?: string;
  payer?: {
    payer_id?: string;
    email_address?: string;
  };
}

export interface PayPalOrderDetails {
  id: string;
  status: string;
  purchase_units: {
    amount: {
      value: string;
      currency_code: string;
    };
  }[];
  payer?: {
    payer_id?: string;
    email_address?: string;
  };
}

export interface PayPalTokenResponse {
  access_token: string;
  expires_in: number;
}
