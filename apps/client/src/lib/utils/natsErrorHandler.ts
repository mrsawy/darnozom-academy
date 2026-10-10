import { NatsError } from 'nats';

/** Pass-through error shape from NATS server actions when not throwing (React Query uses `throwIfNatsError`). */
export interface NatsErr {
  err: { message: string };
}

export interface NatsErrorResponse {
  err: NatsError;
}

/** NestJS class-validator ValidationError shape returned by ValidationPipe. */
export interface ValidationErrorItem {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationErrorItem[];
  /** Legacy field used by some custom error serializers. */
  messages?: string[] | { message?: string }[] | Record<string, string>;
}

export interface ValidationErrorResponse {
  err: ValidationErrorItem[];
}

export function isValidationErrorResponse(response: unknown): response is ValidationErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'err' in response &&
    Array.isArray((response as ValidationErrorResponse).err)
  );
}

function extractMessages(item: ValidationErrorItem): string[] {
  const results: string[] = [];

  if (item.constraints) {
    results.push(...Object.values(item.constraints));
  }

  if (item.children?.length) {
    for (const child of item.children) {
      results.push(...extractMessages(child));
    }
  }

  if (results.length === 0 && item.messages) {
    const m = item.messages;
    if (Array.isArray(m)) {
      results.push(
        ...(m
          .map((x) => (typeof x === 'string' ? x : (x as { message?: string })?.message))
          .filter(Boolean) as string[])
      );
    } else if (typeof m === 'object') {
      results.push(...Object.values(m).filter((s): s is string => typeof s === 'string'));
    }
  }

  return results.length > 0 ? results : [item.property];
}

/** Turns backend validation err array into a single human-readable message. */
export function getValidationErrorMessage(err: ValidationErrorItem[]): string {
  return err.flatMap(extractMessages).join('; ');
}

export function isNatsErrorResponse(response: unknown): response is NatsErrorResponse {
  return typeof response === 'object' && response !== null && 'err' in response;
}

/** Narrows `T | NatsErr` from server actions (unlike `isNatsErrorResponse`, which does not relate to `NatsErr`). */
export function isNatsErrResult<T>(result: T | NatsErr): result is NatsErr {
  if (result === null || typeof result !== 'object' || !('err' in result)) {
    return false;
  }
  const { err } = result as { err: unknown };
  if (err === null || typeof err !== 'object' || Array.isArray(err)) {
    return false;
  }
  return 'message' in err && typeof (err as { message: unknown }).message === 'string';
}

export function natsErrorHandler<T>(response: T | NatsErrorResponse | ValidationErrorResponse): T {
  if (isValidationErrorResponse(response)) {
    throw new Error(getValidationErrorMessage(response.err));
  }
  if (isNatsErrorResponse(response)) {
    throw new Error(response.err.message);
  }
  return response;
}

/**
 * Client-side guard: if the server action returned an error object instead of
 * throwing (to avoid Next.js stripping messages in production), re-throw the
 * error here on the client so React Query's onError handler receives it.
 */
export function throwIfNatsError<S>(result: S | NatsErr): S {
  if (result && typeof result === 'object' && 'err' in result) {
    const errObj = (result as { err: unknown }).err;
    if (Array.isArray(errObj)) {
      throw new TypeError(getValidationErrorMessage(errObj as ValidationErrorItem[]));
    }
    if (errObj && typeof errObj === 'object' && 'message' in errObj) {
      throw new Error((errObj as { message: string }).message);
    }
    throw new Error('An unknown error occurred');
  }
  return result;
}
