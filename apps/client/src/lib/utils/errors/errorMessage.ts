import { ALL_ERROR_KEYS_SET } from '@lms-organization/shared-types';
import { _Translator } from 'next-intl';

export const errorMessage = (
  error?: string,
  t?: _Translator<Record<string, string>>,
  fallback?: string
) => {
  if (!error) return fallback ?? t?.('somethingWentWrong');
  return ALL_ERROR_KEYS_SET.has(error) ? t?.(`${error}`) : fallback;
};
