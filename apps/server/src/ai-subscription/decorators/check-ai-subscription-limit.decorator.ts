import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AiSubscriptionLimitGuard } from '../guards/ai-subscription-limit.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';

export const AI_SUBSCRIPTION_LIMIT_KEY = 'ai_subscription_limit_feature';

/**
 * Enforces an AI plan subscription limit before the handler executes.
 *
 * @param feature - Key from `AiPlan.features` (e.g. `'messagesPerDay'`, `'aiAssistant'`).
 *   For `messagesPerDay` the guard also performs a daily reset when needed.
 *
 * Must be placed after `@UseGuards(AuthGuard)` so the user context is available.
 */
export const CheckAiSubscriptionLimit = (feature: 'messagesPerDay' | 'aiAssistant') =>
  applyDecorators(SetMetadata(AI_SUBSCRIPTION_LIMIT_KEY, feature), UseGuards(AuthGuard, AiSubscriptionLimitGuard));
