export type AiFeatureCheckType = 'numeric' | 'boolean';

export interface AiFeatureLimitDefinition {
  type: AiFeatureCheckType;
  /** Key in aiSubscription.usage — required for numeric checks. */
  usageField?: 'dailyMessagesUsed';
}

/**
 * Registry that maps AI plan feature keys to their check strategy.
 *
 * - **numeric**: compares `aiSubscription.usage[usageField]` against `aiPlan.features[key]`.
 *   For `messagesPerDay` the guard also performs a daily reset if `lastDailyReset < today`.
 * - **boolean**: checks `aiPlan.features[key] === true`.
 *
 * To add a new limit, add one entry here and decorate the route with
 * `@CheckAiSubscriptionLimit('<key>')`.
 */
export const AI_FEATURE_LIMIT_CONFIG: Record<string, AiFeatureLimitDefinition> = {
  messagesPerDay: { type: 'numeric', usageField: 'dailyMessagesUsed' },
  aiAssistant: { type: 'boolean' },
};
