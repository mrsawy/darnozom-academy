export interface PaymobPaymentIntentionResponse {
  payment_keys: {
    integration: number;
    key: string;
    gateway_type: string;
    iframe_id: number | null;
    order_id: number;
    redirection_url: string;
    save_card: boolean;
  }[];

  intention_order_id: number;
  id: string;
  client_secret: string;

  intention_detail: {
    amount: number;
    currency: string;
    items: {
      name: string;
      amount: number;
      description: string;
      quantity: number;
      image: string | null;
    }[];
    billing_data: {
      apartment: string;
      floor: string;
      first_name: string;
      last_name: string;
      street: string;
      building: string;
      phone_number: string;
      shipping_method: string;
      city: string;
      country: string;
      state: string;
      email: string;
      postal_code: string;
    };
  };

  payment_methods: {
    integration_id: number;
    alias: string | null;
    name: string | null;
    method_type: string;
    currency: string;
    live: boolean;
    use_cvc_with_moto: boolean;
  }[];

  special_reference: string;

  extras: {
    creation_extras: unknown;
    confirmation_extras: unknown;
  };

  confirmed: boolean;
  status: string;
  created: string; // ISO timestamp
  card_detail: unknown;
  card_tokens: unknown[];
  object: string;
}
