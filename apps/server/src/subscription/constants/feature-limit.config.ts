export type FeatureCheckType = 'numeric' | 'boolean';

export interface FeatureLimitDefinition {
  type: FeatureCheckType;
  /** Key in subscription.usage — required for numeric checks. */
  usageField?: 'usersUsed' | 'coursesUsed' | 'storageUsedGB' | 'pagesUsed' | 'parentUsersUsed' | 'liveSessionsUsed' | 'assignmentsUsed';
}

/**
 * Registry that maps plan feature keys to their check strategy.
 *
 * - **numeric**: compares `subscription.usage[usageField]` against `plan.features[key]`.
 * - **boolean**: checks `plan.features[key] === true`.
 *
 * To add a new limit, add one entry here and decorate the route with
 * `@CheckSubscriptionLimit('<key>')`.
 */
export const FEATURE_LIMIT_CONFIG: Record<string, FeatureLimitDefinition> = {
  usersPerSubscription: { type: 'numeric', usageField: 'usersUsed' },
  coursesPerSubscription: { type: 'numeric', usageField: 'coursesUsed' },
  pagesPerSubscription: { type: 'numeric', usageField: 'pagesUsed' },
  parentAccountsPerSubscription: { type: 'numeric', usageField: 'parentUsersUsed' },
  liveSessionsPerMonth: { type: 'numeric', usageField: 'liveSessionsUsed' },
  assignmentsPerMonth: { type: 'numeric', usageField: 'assignmentsUsed' },
  maxStorageGB: { type: 'numeric', usageField: 'storageUsedGB' },
};
