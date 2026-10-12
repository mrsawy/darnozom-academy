import type { NatsErr } from '@/lib/utils/natsErrorHandler';

function isNatsErr(value: unknown): value is NatsErr {
  return typeof value === 'object' && value !== null && 'err' in value;
}

/** Server actions return `R | { err }`; react-query needs a throw to enter its error state. */
export function unwrap<T>(result: T | NatsErr): T {
  if (isNatsErr(result)) throw new Error(result.err.message);
  return result;
}
