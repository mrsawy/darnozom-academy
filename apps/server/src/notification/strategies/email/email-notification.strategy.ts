import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  INotificationStrategy,
  NotificationChannel,
  NotificationMessagePayload,
  NotificationSendResult,
} from '../interfaces/notification-strategy.interface';

@Injectable()
export class EmailNotificationStrategy implements INotificationStrategy {
  readonly channel = NotificationChannel.EMAIL;
  readonly providerName = 'resend';
  private readonly logger = new Logger(EmailNotificationStrategy.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') ?? 'noreply@darnozomlms.com';
  }

  isConfigured(): boolean {
    return Boolean(this.resend);
  }

  async send(payload: NotificationMessagePayload): Promise<NotificationSendResult> {
    const to = payload.recipient.email;
    if (!to) {
      return {
        success: false,
        channel: this.channel,
        provider: this.providerName,
        error: 'Recipient email is missing',
        timestamp: new Date(),
      };
    }

    if (!this.resend) {
      this.logger.warn(`EmailNotificationStrategy: RESEND_API_KEY not configured. Mocking email to ${to}: ${payload.subject}`);
      return {
        success: true,
        channel: this.channel,
        provider: this.providerName,
        messageId: `mock-email-${Date.now()}`,
        timestamp: new Date(),
      };
    }

    try {
      const subject = payload.subject || 'Notification from DarNozom';
      const html = payload.html || `<p>${payload.content ?? ''}</p>`;

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Resend API error sending email to ${to}:`, error);
        return {
          success: false,
          channel: this.channel,
          provider: this.providerName,
          error: error.message || 'Resend API rejected email',
          timestamp: new Date(),
        };
      }

      this.logger.log(`Email successfully sent to ${to} (id: ${data?.id})`);
      return {
        success: true,
        channel: this.channel,
        provider: this.providerName,
        messageId: data?.id,
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${to}: ${errMsg}`);
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
