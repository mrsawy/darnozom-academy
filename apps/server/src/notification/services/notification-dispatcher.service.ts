import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  INotificationStrategy,
  NotificationChannel,
  NotificationMessagePayload,
  NotificationSendResult,
} from '../strategies/interfaces/notification-strategy.interface';
import { EmailNotificationStrategy } from '../strategies/email/email-notification.strategy';
import { SmsNotificationStrategy } from '../strategies/sms/sms-notification.strategy';
import { WhatsappNotificationStrategy } from '../strategies/whatsapp/whatsapp-notification.strategy';
import { InAppNotificationStrategy } from '../strategies/in-app/in-app-notification.strategy';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);
  private readonly strategies = new Map<NotificationChannel, INotificationStrategy>();

  constructor(
    private readonly emailStrategy: EmailNotificationStrategy,
    private readonly smsStrategy: SmsNotificationStrategy,
    private readonly whatsappStrategy: WhatsappNotificationStrategy,
    private readonly inAppStrategy: InAppNotificationStrategy
  ) {
    this.registerStrategy(this.emailStrategy);
    this.registerStrategy(this.smsStrategy);
    this.registerStrategy(this.whatsappStrategy);
    this.registerStrategy(this.inAppStrategy);
  }

  /**
   * Register a notification channel strategy
   */
  registerStrategy(strategy: INotificationStrategy): void {
    this.strategies.set(strategy.channel, strategy);
    this.logger.log(`Registered notification strategy: ${strategy.channel} [${strategy.providerName}]`);
  }

  /**
   * Get strategy by channel
   */
  getStrategy(channel: NotificationChannel): INotificationStrategy {
    const strategy = this.strategies.get(channel);
    if (!strategy) {
      throw new BadRequestException(`No notification strategy registered for channel: ${channel}`);
    }
    return strategy;
  }

  /**
   * Send a notification through a single channel
   */
  async send(channel: NotificationChannel, payload: NotificationMessagePayload): Promise<NotificationSendResult> {
    const strategy = this.getStrategy(channel);
    return strategy.send(payload);
  }

  /**
   * Broadcast/multicast a notification across multiple channels simultaneously
   */
  async sendMulti(
    channels: NotificationChannel[],
    payload: NotificationMessagePayload
  ): Promise<NotificationSendResult[]> {
    const results = await Promise.allSettled(
      channels.map(async (channel) => this.send(channel, payload))
    );

    return results.map((res, index) => {
      const channel = channels[index];
      if (res.status === 'fulfilled') {
        return res.value;
      }
      return {
        success: false,
        channel,
        provider: 'unknown',
        error: res.reason instanceof Error ? res.reason.message : String(res.reason),
        timestamp: new Date(),
      };
    });
  }
}
