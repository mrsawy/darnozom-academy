/**
 * Platform-admin organization plan/subscription error keys.
 * Use as exception messages on the backend and next-intl keys under `errors`.
 * Const object (not TS enum) so Nest CJS / watch reloads always get named exports.
 */
export const AdminReviewErrors = {
  ORGANIZATION_NOT_FOUND: 'organizationNotFound',
  PLAN_NOT_FOUND: 'planNotFound',
  PLAN_NOT_ACTIVE: 'planNotActive',
  SUBSCRIPTION_NOT_FOUND: 'subscriptionNotFound',
  INVALID_SUBSCRIPTION_PERIOD: 'invalidSubscriptionPeriod',
} as const;

export type AdminReviewErrorKey = (typeof AdminReviewErrors)[keyof typeof AdminReviewErrors];

export const AdminReviewSuccessMessages = {
  ORGANIZATION_PLAN_SET: 'organizationPlanSet',
  ORGANIZATION_SUBSCRIPTION_UPDATED: 'organizationSubscriptionUpdated',
  ORGANIZATION_SUBSCRIPTION_SUSPENDED: 'organizationSubscriptionSuspended',
  ORGANIZATION_SUBSCRIPTION_CANCELLED: 'organizationSubscriptionCancelled',
} as const;
