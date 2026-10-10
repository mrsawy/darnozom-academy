declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';

      // Auth
      AUTH_EXPIRES_IN: string;
      ACCESS_TOKEN_EXPIRES_IN?: string;
      REFRESH_TOKEN_EXPIRES_IN?: string;

      // AWS S3
      NEXT_PUBLIC_S3_BUCKET_NAME: string;
      NEXT_PUBLIC_S3_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      /** CloudFront domain for public assets (e.g. d1234567890.cloudfront.net or cdn.example.com). When set, getFileFullUrl uses CloudFront instead of direct S3. */
      NEXT_PUBLIC_CLOUDFRONT_DOMAIN?: string;

      // Email
      RESEND_API_KEY?: string;

      // NATS
      NATS_URLS: string;

      // Redis
      REDIS_URL: string;

      /** Server-side only: origin for middleware fetch to this app (e.g. http://127.0.0.1:3000 in Docker). */
      INTERNAL_APP_ORIGIN?: string;
    }
  }
}
