declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'DEVELOPMENT' | 'PRODUCTION';

      PORT: string;

      MONGODB_URI_DEV: string;
      MONGODB_URI_PROD: string;

      REDIS_UR_DEV: string;
      REDIS_UR_PROD: string;

      JSON_PRIVATE_KEY: string;
      AUTH_EXPIRES_IN: string;

      BASE_URL: string;
      SECURED_BASE_URL: string;
      SECURED_CLIENT_BASE_URL: string;

      CLIENT_BASE_URL: string;
      S3_BUCKET_NAME: string;
      AWS_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      /** Optional. CloudFront domain for file URLs (e.g. d1234567890.cloudfront.net). When set, getPublicFileUrl and uploadToS3 use CloudFront. */
      CLOUDFRONT_DOMAIN?: string;
      /** Optional. CloudFront distribution ID. When set, cache invalidations are created after S3 upload/delete so CloudFront serves fresh content. */
      CLOUDFRONT_DISTRIBUTION_ID?: string;
      /** Optional. Required for private content via CloudFront. CloudFront key pair ID (public key ID from AWS). */
      CLOUDFRONT_KEY_PAIR_ID?: string;
      /** Optional. Required for private content via CloudFront. PEM private key (e.g. from .pem file). In env use \\n for newlines. */
      CLOUDFRONT_PRIVATE_KEY?: string;

      PAYMOB_API_KEY: string;
      PAYMOB_SECRET_KEY: string;
      PAYMOB_PUBLIC_KEY: string;
      PAYMOB_HMAC_SECRET: string;
      PAYMOB_BASEURL: string;
      PAYMOB_ISLIVE: string;

      CREDIT_CARD_INTEGRATION_ID: string;
      /** Paymob card payment method alias (e.g. creditcard / MIGS-online). */
      S_INTEGRATION: string;
      WALLET_INTEGRATION_ID: string;
      /** Paymob wallet payment method alias (e.g. paywallet / UIG-online_new). */
      WALLET_METHOD_NAME?: string;

      PAYPAL_BASE_URL: string;
      PAYPAL_CLIENT_ID: string;
      PAYPAL_SECRET: string;

      HOST_URL: string;

      EXCHANGE_RATES_URL: string;
      NATS_URLS: string;

      KASHIER_BASE_URL: string;
      KASHIER_MERCHANT_ACCOUNT_ID: string;
      KASHIER_API_KEY: string;
      KASHIER_SECRET_KEY: string;
      KASHIER_TEST_URL: string;
      KASHIER_PAYMENT_API_KEY: string;

      RESEND_API_KEY?: string;
      EMAIL_FROM?: string;

      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      TWILIO_PHONE_NUMBER?: string;

      WHATSAPP_ACCESS_TOKEN?: string;
      WHATSAPP_PHONE_NUMBER_ID?: string;
    }
  }
}
