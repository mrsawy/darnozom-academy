import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INotificationStrategy,
  NotificationChannel,
  NotificationMessagePayload,
  NotificationSendResult,
} from '../interfaces/notification-strategy.interface';

@Injectable()
export class WhatsappNotificationStrategy implements INotificationStrategy {
  readonly channel = NotificationChannel.WHATSAPP;
  readonly providerName = 'whatsapp-cloud';
  private readonly logger = new Logger(WhatsappNotificationStrategy.name);

  private readonly accessToken?: string;
  private readonly phoneNumberId?: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
  }

  isConfigured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  async send(payload: NotificationMessagePayload): Promise<NotificationSendResult> {
    const rawPhone = payload.recipient.phone;
    if (!rawPhone) {
      return {
        success: false,
        channel: this.channel,
        provider: this.providerName,
        error: 'Recipient phone number is missing',
        timestamp: new Date(),
      };
    }

    // Clean phone number (strip '+', spaces, dashes for WhatsApp Cloud API)
    const to = rawPhone.replace(/\D/g, '');
    const text = payload.content || payload.subject || '';

    if (!this.isConfigured()) {
      this.logger.warn(`WhatsappNotificationStrategy: WhatsApp API credentials not set. Mocking WhatsApp message to ${to}: ${text}`);
      return {
        success: true,
        channel: this.channel,
        provider: this.providerName,
        messageId: `mock-wa-${Date.now()}`,
        timestamp: new Date(),
      };
    }

    try {
      // WhatsApp Business Cloud API standard Graph endpoint
      const endpoint = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      });

      const data = (await response.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        this.logger.error(`WhatsApp Cloud API error: ${errorMsg}`);
        return {
          success: false,
          channel: this.channel,
          provider: this.providerName,
          error: errorMsg,
          timestamp: new Date(),
        };
      }

      const messageId = data.messages?.[0]?.id ?? `wa-${Date.now()}`;
      this.logger.log(`WhatsApp message dispatched to ${to} (id: ${messageId})`);
      return {
        success: true,
        channel: this.channel,
        provider: this.providerName,
        messageId,
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send WhatsApp message to ${to}: ${errMsg}`);
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
