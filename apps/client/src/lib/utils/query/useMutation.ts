'use client';

import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { NatsErr } from '@/lib/utils/natsErrorHandler';
import { defaultMutationOptions } from './queryOptions';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';

/**
 * useMutation with app-wide default options (e.g. retry: 0).
 * Pass options to override; they take precedence over defaults.
 *
 * Automatically re-throws NATS error objects returned by server actions on the
 * client side, so Next.js cannot strip the message in production.
 *
 * Unauthenticated errors are handled globally via MutationCache in
 * `query-client.ts` (clear tokens + open auth dialog).
 */
export type UseAppMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
  mutationFn?: (variables: TVariables) => Promise<TData | NatsErr>;
};

export function useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options?: UseAppMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const mutationFn = options?.mutationFn;
  const safeMutationFn = mutationFn
    ? async (...args: Parameters<NonNullable<typeof mutationFn>>) =>
        throwIfNatsError(await mutationFn(...args)) as TData
    : undefined;

  return useTanStackMutation({
    ...defaultMutationOptions,
    ...options,
    ...(safeMutationFn ? { mutationFn: safeMutationFn } : {}),
  } as UseMutationOptions<TData, TError, TVariables, TContext>);
}
