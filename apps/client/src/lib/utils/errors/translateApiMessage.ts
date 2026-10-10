import {
  AiAttachmentErrors,
  AiSubscriptionErrors,
  ALL_ERROR_KEYS_SET,
  AuthErrors,
  CommonErrors,
  SubscriptionLimitErrors,
  UserErrors,
  VerificationErrors,
} from '@lms-organization/shared-types';

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

/**
 * Maps backend API message keys (shared-types enums) to localized strings.
 * Translations live under the root `errors` namespace in `messages/en.json` and `messages/ar.json`.
 * Dynamic messages use `key|param` (see docs/api-error-messages.md).
 */
export function translateApiMessage(message: string, t: TranslateFn): string {
  if (typeof message !== 'string' || message.length === 0) {
    return typeof message === 'string' ? message : '';
  }

  const sep = message.indexOf('|');
  const key = sep === -1 ? message : message.slice(0, sep);
  const param = sep === -1 ? undefined : message.slice(sep + 1);

  if (!ALL_ERROR_KEYS_SET.has(key)) {
    return message;
  }

  if (
    (key as AiSubscriptionErrors) === AiSubscriptionErrors.UNKNOWN_AI_SUBSCRIPTION_FEATURE &&
    param !== undefined
  ) {
    return t(key, { feature: param });
  }
  if (
    (key as AiSubscriptionErrors) === AiSubscriptionErrors.AI_PLAN_FEATURE_NOT_INCLUDED &&
    param !== undefined
  ) {
    return t(key, { feature: param });
  }
  if (
    (key as AiSubscriptionErrors) === AiSubscriptionErrors.DAILY_AI_MESSAGE_LIMIT_REACHED &&
    param !== undefined
  ) {
    const [currentPart, limitPart] = param.split('|');
    return t(key, { current: Number(currentPart), limit: Number(limitPart) });
  }

  if (
    (key as SubscriptionLimitErrors) === SubscriptionLimitErrors.UNKNOWN_SUBSCRIPTION_FEATURE &&
    param !== undefined
  ) {
    return t(key, { feature: param });
  }
  if (
    (key as SubscriptionLimitErrors) === SubscriptionLimitErrors.PLAN_FEATURE_NOT_INCLUDED &&
    param !== undefined
  ) {
    return t(key, { feature: param });
  }
  if (
    (key as SubscriptionLimitErrors) === SubscriptionLimitErrors.SUBSCRIPTION_PLAN_LIMIT_REACHED &&
    param !== undefined
  ) {
    const [currentPart, limitPart] = param.split('|');
    return t(key, { current: Number(currentPart), limit: Number(limitPart) });
  }

  if ((key as UserErrors) === UserErrors.FIELD_VALUE_ALREADY_EXISTS && param !== undefined) {
    const sepIdx = param.indexOf('|');
    const field = sepIdx === -1 ? param : param.slice(0, sepIdx);
    const value = sepIdx === -1 ? '' : param.slice(sepIdx + 1);
    return t(key, { field, value });
  }

  if (
    (key as AiAttachmentErrors) === AiAttachmentErrors.AI_ATTACHMENT_TOO_LARGE_PER_FILE &&
    param !== undefined
  ) {
    return t(key, { filename: param });
  }
  if (
    (key as AiAttachmentErrors) === AiAttachmentErrors.AI_ATTACHMENT_BAD_TYPE &&
    param !== undefined
  ) {
    return t(key, { filename: param });
  }
  if (
    (key as AiAttachmentErrors) === AiAttachmentErrors.AI_ATTACHMENT_TOO_MANY &&
    param !== undefined
  ) {
    return t(key, { max: Number(param) });
  }

  const errorKey = key as VerificationErrors | AuthErrors;
  if (errorKey === VerificationErrors.OTP_RESEND_COOLDOWN && param !== undefined) {
    return t(key, { seconds: Number(param) });
  }
  if (errorKey === VerificationErrors.OTP_ACCOUNT_LOCKED_MINUTES && param !== undefined) {
    return t(key, { minutes: Number(param) });
  }
  if (errorKey === AuthErrors.PASSWORD_RESET_COOLDOWN && param !== undefined) {
    return t(key, { seconds: Number(param) });
  }
  if ((key as CommonErrors) === CommonErrors.TOO_MANY_REQUESTS) {
    return t(key, { seconds: param === undefined ? 60 : Number(param) });
  }
  return t(key);
}
