import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { SubscriptionLimitGuard } from '../guards/subscription-limit.guard';
import { Plan } from 'src/plan/entities/plan.entity';
import { AuthGuard } from 'src/auth/guards/auth.guard';

export const SUBSCRIPTION_LIMIT_KEY = 'subscription_limit_feature';

/**
 * Enforces a plan subscription limit before the handler executes.
 *
 * @param feature - Key from `Plan.features` (e.g. `'usersPerSubscription'`, `'pagesPerSubscription'`).
 *   The check strategy (numeric vs boolean) is resolved from `FEATURE_LIMIT_CONFIG`.
 *
 * Must be placed **after** `@UseGuards(AuthGuard)` so the user context is available.
 */
export const CheckSubscriptionLimit = (feature: keyof Plan['features']) =>
  applyDecorators(SetMetadata(SUBSCRIPTION_LIMIT_KEY, feature), UseGuards(AuthGuard, SubscriptionLimitGuard));
