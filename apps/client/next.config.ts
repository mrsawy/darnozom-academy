import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/** Dev tunnels: `x-forwarded-host` is the public URL while `Origin` may be localhost. */
const DEV_TUNNEL_ALLOWED_ORIGIN_PATTERNS = [
  '*.devtunnels.ms',
  '*.ngrok-free.app',
  '*.ngrok.io',
  '*.ngrok.app',
  '*.trycloudflare.com',
] as const;

function resolveServerActionsAllowedOrigins(): string[] {
  const origins = new Set<string>();
  const port = process.env.PORT ?? '3001';

  origins.add(`localhost:${port}`);
  origins.add(`127.0.0.1:${port}`);

  if (process.env.NODE_ENV === 'development') {
    for (const devPort of ['3000', '3001']) {
      origins.add(`localhost:${devPort}`);
      origins.add(`127.0.0.1:${devPort}`);
    }
    for (const pattern of DEV_TUNNEL_ALLOWED_ORIGIN_PATTERNS) {
      origins.add(pattern);
    }
  }

  const extra = process.env.SERVER_ACTIONS_ALLOWED_ORIGINS?.trim();
  if (extra) {
    for (const entry of extra.split(',')) {
      const origin = entry.trim();
      if (origin.length > 0) {
        origins.add(origin);
      }
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../'),
  experimental: {
    serverActions: {
      allowedOrigins: resolveServerActionsAllowedOrigins(),
      bodySizeLimit: '3mb',
    },
    optimisticClientCache: false,
  },
  images: {
    remotePatterns: [
      // CloudFront (preferred when NEXT_PUBLIC_CLOUDFRONT_DOMAIN is set)
      ...(process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN
        ? [
            {
              protocol: 'https' as const,
              hostname: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '').split(
                '/'
              )[0],
            },
          ]
        : []),
      // Direct S3 fallback
      {
        protocol: 'https',
        hostname: `${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com`,
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
