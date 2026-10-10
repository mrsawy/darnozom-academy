/**
 * Lemon Squeezy Checkout API types.
 * @see https://docs.lemonsqueezy.com/api/checkouts/create-checkout
 * @see https://docs.lemonsqueezy.com/api/checkouts/the-checkout-object
 */

export interface LemonSqueezyCreateCheckoutAttributes {
  custom_price?: number;
  product_options?: {
    enabled_variants?: number[];
    receipt_thank_you_note?: string;
    receipt_link_url?: string;
    receipt_button_text?: string;
    redirect_url?: string;
    media?: string[];
    description?: string;
    name?: string;
  };
  checkout_options?: {
    locale?: string;
    button_color?: string;
    button_text_color?: string;
    background_color?: string;
    embed?: boolean;
    [key: string]: unknown;
  };
  checkout_data?: {
    custom?: Record<string, string | number>;
    email?: string;
    name?: string;
    discount_code?: string;
    tax_number?: string;
    billing_address?: Record<string, string>;
    variant_quantities?: { variant_id: number; quantity: number }[];
  };
  preview?: boolean;
  test_mode?: boolean;
  expires_at?: string | null;
}

export interface LemonSqueezyCreateCheckoutPayload {
  data: {
    type: 'checkouts';
    attributes: LemonSqueezyCreateCheckoutAttributes;
    relationships: {
      store: { data: { type: 'stores'; id: string } };
      variant: { data: { type: 'variants'; id: string } };
    };
  };
}

export interface LemonSqueezyCheckoutResponse {
  data: {
    type: 'checkouts';
    id: string;
    attributes: {
      store_id: number;
      variant_id: number;
      custom_price?: number;
      product_options: Record<string, unknown>;
      checkout_options: Record<string, unknown>;
      checkout_data: Record<string, unknown>;
      url: string;
      created_at: string;
      updated_at: string;
      test_mode: boolean;
      expires_at: string | null;
    };
  };
}
