import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../notification.service';
import { RealtimeService } from 'src/realtime/realtime.service';
import { RealtimeEvents, NotificationType } from '@darnozom/shared-types';
import {
  INotificationStrategy,
  NotificationChannel,
  NotificationMessagePayload,
  NotificationSendResult,
} from '../interfaces/notification-strategy.interface';

@Injectable()
export class InAppNotificationStrategy implements INotificationStrategy {
  readonly channel = NotificationChannel.IN_APP;
  readonly providerName = 'in-app-database';
  private readonly logger = new Logger(InAppNotificationStrategy.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly realtimeService: RealtimeService
  ) {}

  isConfigured(): boolean {
    return true;
  }

  async send(payload: NotificationMessagePayload): Promise<NotificationSendResult> {
    const userId = payload.recipient.userId;
    if (!userId) {
      return {
        success: false,
        channel: this.channel,
        provider: this.providerName,
        error: 'Recipient userId is required for IN_APP notifications',
        timestamp: new Date(),
      };
    }

    try {
      const created = await this.notificationService.create({
        userId,
        titleKey: payload.titleKey || 'info',
        bodyKey: payload.bodyKey,
        params: payload.params,
        data: payload.data as Record<string, string> | undefined,
        type: (payload.metadata?.type as NotificationType) || NotificationType.INFO,
        relatedId: payload.metadata?.relatedId as string | undefined,
        relatedModel: payload.metadata?.relatedModel as any,
      });

      // Also emit via Realtime websocket if available
      try {
        await this.realtimeService.emitToUser(userId, RealtimeEvents.NOTIFICATION_COURSE_CONTENT_CREATED, created);
      } catch (rtErr) {
        this.logger.debug(`Realtime push skipped or failed for user ${userId}: ${rtErr}`);
      }

      return {
        success: true,
        channel: this.channel,
        provider: this.providerName,
        messageId: created._id.toString(),
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to store IN_APP notification for ${userId}: ${errMsg}`);
      return {
        success: false,
        channel: this.channel,
        provider: this.providerName,
        error: errMsg,
        timestamp: new Date(),
      };
    }
  }
}
