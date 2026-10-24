import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INotificationStrategy,
  NotificationChannel,
  NotificationMessagePayload,
  NotificationSendResult,
} from '../interfaces/notification-strategy.interface';

@Injectable()
export class SmsNotificationStrategy implements INotificationStrategy {
  readonly channel = NotificationChannel.SMS;
  readonly providerName = 'twilio-sms';
  private readonly logger = new Logger(SmsNotificationStrategy.name);

  private readonly accountSid?: string;
  private readonly authToken?: string;
  private readonly fromPhone?: string;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');
  }

  isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && this.fromPhone);
  }

  async send(payload: NotificationMessagePayload): Promise<NotificationSendResult> {
    const to = payload.recipient.phone;
    if (!to) {
      return {
        success: false,
        channel: this.channel,
        provider: this.providerName,
        error: 'Recipient phone number is missing',
        timestamp: new Date(),
      };
    }

    const text = payload.content || payload.subject || '';

    if (!this.isConfigured()) {
      this.logger.warn(`SmsNotificationStrategy: Twilio SMS credentials not set. Mocking SMS to ${to}: ${text}`);
      return {
        success: true,
        channel: this.channel,
        provider: this.providerName,
        messageId: `mock-sms-${Date.now()}`,
        timestamp: new Date(),
      };
    }

    try {
      // Standard Twilio REST API request without needing external SDK dependency
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const body = new URLSearchParams({
        To: to,
        From: this.fromPhone!,
        Body: text,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await response.json()) as { sid?: string; message?: string; status?: string };

      if (!response.ok) {
        this.logger.error(`Twilio SMS API error: ${data.message || response.statusText}`);
        return {
          success: false,
          channel: this.channel,
          provider: this.providerName,
          error: data.message || `HTTP ${response.status}`,
          timestamp: new Date(),
        };
      }

      this.logger.log(`SMS successfully dispatched to ${to} (sid: ${data.sid})`);
      return {
        success: true,
        channel: this.channel,
        provider: this.providerName,
        messageId: data.sid,
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send SMS to ${to}: ${errMsg}`);
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
