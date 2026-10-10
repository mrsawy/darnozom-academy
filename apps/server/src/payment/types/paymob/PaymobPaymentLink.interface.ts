export interface PaymobPaymentLinkBody {
  amount_cents: number;
  expires_at: string;
  currency: string;
  reference_id?: number;
  payment_methods: string; // {{Card_ID}} | {{Wallet_ID}} | {{Kiosk_ID}} | {{ValU_ID}}
  email: string;
  is_live?: string;
  full_name: string;
  phone_number: string;
  description: string;
  notification_url: string;
  redirection_url: string;
}

export interface PaymobPaymentLinkResponse {
  id: number;
  currency: string | null;
  client_info: {
    email: string;
    full_name: string;
    phone_number: string;
  };
  reference_id: string | null;
  shorten_url: string;
  amount_cents: number;
  payment_link_image: string | null;
  description: string;
  created_at: string; // ISO timestamp
  expires_at: string; // ISO timestamp
  client_url: string;
  origin: number;
  merchant_staff_tag: string | null;
  state: string; // e.g., "created"
  paid_at: string | null; // ISO timestamp or null
  redirection_url: string;
  notification_url: string;
  order: number;
}

export interface PaymobPaymentLinWebHookBody {
  type: string;
  obj: {
    id: number;
    pending: boolean;
    amount_cents: number;
    success: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    is_refunded: boolean;
    is_3d_secure: boolean;
    integration_id: number;
    profile_id: number;
    has_parent_transaction: boolean;
    order: {
      id: number;
      created_at: string;
      delivery_needed: boolean;
      merchant: {
        id: number;
        created_at: string;
        phones: string[];
        company_emails: string[];
        company_name: string;
        state: string;
        country: string;
        city: string;
        postal_code: string;
        street: string;
      };
      collector: null | string;
      amount_cents: number;
      shipping_data: {
        id: number;
        first_name: string;
        last_name: string;
        street: string;
        building: string;
        floor: string;
        apartment: string;
        city: string;
        state: string;
        country: string;
        email: string;
        phone_number: string;
        postal_code: string;
        extra_description: string;
        shipping_method: string;
        order_id: number;
        order: number;
      };
      currency: string;
      is_payment_locked: boolean;
      is_return: boolean;
      is_cancel: boolean;
      is_returned: boolean;
      is_canceled: boolean;
      merchant_order_id: null | string;
      wallet_notification: null | string;
      paid_amount_cents: number;
      notify_user_with_email: boolean;
      items: {
        name: string;
        description: string;
        amount_cents: number;
      }[];
      order_url: string;
      commission_fees: number;
      delivery_fees_cents: number;
      delivery_vat_cents: number;
      payment_method: string;
      merchant_staff_tag: null | string;
      api_source: string;
      data: {
        notification_url: string;
      };
      payment_status: string;
    };
    created_at: string;
    transaction_processed_callback_responses: unknown[];
    currency: string;
    source_data: {
      pan: string;
      type: string;
      tenure: null | string;
      sub_type: string;
    };
    api_source: string;
    terminal_id: null | string;
    merchant_commission: number;
    installment: null | string;
    discount_details: unknown[];
    is_void: boolean;
    is_refund: boolean;
    data: {
      gateway_integration_pk: number;
      klass: string;
      created_at: string;
      amount: number;
      currency: string;
      migs_order: {
        acceptPartialAmount: boolean;
        amount: number;
        authenticationStatus: string;
        chargeback: { amount: number; currency: string };
        creationTime: string;
        currency: string;
        description: string;
        id: string;
        lastUpdatedTime: string;
        merchantAmount: number;
        merchantCategoryCode: string;
        merchantCurrency: string;
        status: string;
        totalAuthorizedAmount: number;
        totalCapturedAmount: number;
        totalRefundedAmount: number;
      };
      merchant: string;
      migs_result: string;
      migs_transaction: {
        acquirer: {
          batch: number;
          date: string;
          id: string;
          merchantId: string;
          settlementDate: string;
          timeZone: string;
          transactionId: string;
        };
        amount: number;
        authenticationStatus: string;
        authorizationCode: string;
        currency: string;
        id: string;
        receipt: string;
        source: string;
        stan: string;
        terminal: string;
        type: string;
      };
      txn_response_code: string;
      acq_response_code: string;
      message: string;
      merchant_txn_ref: string;
      order_info: string;
      receipt_no: string;
      transaction_no: string;
      batch_no: number;
      authorize_id: string;
      card_type: string;
      card_num: string;
      secure_hash: string;
      avs_result_code: string;
      avs_acq_response_code: string;
      captured_amount: number;
      authorised_amount: number;
      refunded_amount: number;
      acs_eci: string;
    };
    is_hidden: boolean;
    payment_key_claims: {
      exp: number;
      extra: { accept_order_id: number; merchant_order_id: null | string };
      user_id: number;
      currency: string;
      order_id: number;
      created_by: null | string;
      is_partner: boolean;
      amount_cents: number;
      billing_data: {
        city: string;
        email: string;
        floor: string;
        state: string;
        street: string;
        country: string;
        building: string;
        apartment: string;
        last_name: string;
        first_name: string;
        postal_code: string;
        phone_number: string;
        extra_description: string;
      };
      redirect_url: string;
      integration_id: number;
      redirection_url: string;
      notification_url: string;
      lock_order_when_paid: boolean;
      next_payment_intention: string;
      single_payment_attempt: boolean;
    };
    error_occured: boolean;
    is_live: boolean;
    other_endpoint_reference: null | string;
    refunded_amount_cents: number;
    source_id: number;
    is_captured: boolean;
    captured_amount: number;
    merchant_staff_tag: null | string;
    updated_at: string;
    is_settled: boolean;
    bill_balanced: boolean;
    is_bill: boolean;
    owner: number;
    parent_transaction: null | string;
  };
  accept_fees: number;
  issuer_bank: null | string;
  transaction_processed_callback_responses: string;
}
