/** Public HTTP API base (Nest). Used for OAuth redirects and REST calls from the client. */
export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'https://v7156w3b-5000.uks1.devtunnels.ms';
}
