import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AiSubscriptionService } from '../services/ai-subscription.service';
import { AI_MESSAGE_SENT_EVENT, AiMessageSentEvent } from './ai-message-sent.event';
import { USER_CREATED_FOR_AI_EVENT, UserCreatedForAiEvent } from './user-created-for-ai.event';

@Injectable()
export class AiSubscriptionUsageListener {
  private readonly logger = new Logger(AiSubscriptionUsageListener.name);

  constructor(private readonly aiSubscriptionService: AiSubscriptionService) {}

  @OnEvent(AI_MESSAGE_SENT_EVENT)
  async handleAiMessageSent(event: AiMessageSentEvent): Promise<void> {
    try {
      await this.aiSubscriptionService.incrementDailyUsage(event.userId);
    } catch (err: unknown) {
      this.logger.error(`Failed to increment daily AI usage for user ${event.userId}`, err);
    }
  }

  @OnEvent(USER_CREATED_FOR_AI_EVENT)
  async handleUserCreated(event: UserCreatedForAiEvent): Promise<void> {
    try {
      await this.aiSubscriptionService.assignFreePlan(event.userId);
    } catch (err: unknown) {
      this.logger.error(`Failed to assign free AI plan to user ${event.userId}`, err);
    }
  }
}
