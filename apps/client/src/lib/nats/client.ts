import { connect, NatsConnection, NatsError, Payload, RequestOptions } from 'nats';
import pRetry from 'p-retry';
let client: Awaited<ReturnType<typeof connect>>;

export async function connectToNats() {
  if (!client) {
    const natsUrls = process.env.NATS_URLS;
    if (!natsUrls) {
      throw new Error('NATS_URLS environment variable is not set');
    }

    const servers = natsUrls.split(',').filter((server) => server.trim() !== '');

    if (servers.length === 0) {
      throw new Error('No valid NATS servers found in NATS_URLS');
    }

    client = await connect({ servers });
  }

  return client;
}

export async function request<T>(
  client: NatsConnection,
  subject: string,
  payload: Payload,
  opts?: RequestOptions
): Promise<T | { err: NatsError }> {
  const response = await pRetry(
    () =>
      client.request(subject, payload, {
        timeout: 5000,
        ...opts,
      }),
    {
      retries: 3,
      shouldRetry: (error) => (error as unknown as NatsError).code === '503',
      onFailedAttempt: () => {
        // Silent retry
      },
    }
  );
  const rawJson = response.json<{ err?: NatsError; response: T }>();
  const jsonResponse = await Promise.resolve(rawJson);
  if (jsonResponse.err) {
    return jsonResponse as { err: NatsError };
  }
  return jsonResponse.response;
}

export async function customizedRequest<T>(
  client: NatsConnection,
  subject: string,
  payload: Payload,
  timeout: number,
  opts?: Omit<RequestOptions, 'timeout'>
): Promise<T | { err: NatsError }> {
  return request<T>(client, subject, payload, { ...opts, timeout });
}
