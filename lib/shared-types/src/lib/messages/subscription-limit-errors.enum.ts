/**
 * Organization subscription / plan limit guard error keys. Use as translation keys on backend and frontend.
 */
export enum SubscriptionLimitErrors {
  UNKNOWN_SUBSCRIPTION_FEATURE = 'unknownSubscriptionFeature',
  UNIMPLEMENTED_COMMUNICATION_CONTEXT = 'unimplementedCommunicationContext',
  NO_ACTIVE_ORGANIZATION_SUBSCRIPTION = 'noActiveOrganizationSubscription',
  ORGANIZATION_SUBSCRIPTION_EXPIRED = 'organizationSubscriptionExpired',
  ORGANIZATION_SUBSCRIPTION_PLAN_NOT_RESOLVED = 'organizationSubscriptionPlanNotResolved',
  PLAN_FEATURE_NOT_INCLUDED = 'planFeatureNotIncluded',
  SUBSCRIPTION_PLAN_LIMIT_REACHED = 'subscriptionPlanLimitReached',
}
