/** Public HTTP API base (NestJS server). Used for OAuth redirects and REST calls from the client. */
export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
}
