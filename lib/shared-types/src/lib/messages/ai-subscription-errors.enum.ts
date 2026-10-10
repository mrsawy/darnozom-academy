/**
 * AI subscription / plan limit guard error keys. Use as translation keys on backend and frontend.
 */
export enum AiSubscriptionErrors {
  UNKNOWN_AI_SUBSCRIPTION_FEATURE = 'unknownAiSubscriptionFeature',
  UNIMPLEMENTED_COMMUNICATION_CONTEXT = 'unimplementedCommunicationContext',
  NO_ACTIVE_AI_SUBSCRIPTION = 'noActiveAiSubscription',
  AI_SUBSCRIPTION_EXPIRED = 'aiSubscriptionExpired',
  AI_SUBSCRIPTION_PLAN_NOT_RESOLVED = 'aiSubscriptionPlanNotResolved',
  AI_PLAN_FEATURE_NOT_INCLUDED = 'aiPlanFeatureNotIncluded',
  DAILY_AI_MESSAGE_LIMIT_REACHED = 'dailyAiMessageLimitReached',
}
