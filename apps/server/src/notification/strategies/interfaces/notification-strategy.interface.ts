export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  preferredLanguage?: string;
}

export interface NotificationAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface NotificationMessagePayload {
  recipient: NotificationRecipient;
  subject?: string;
  titleKey?: string;
  bodyKey?: string;
  params?: Record<string, string>;
  content?: string;
  html?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  attachments?: NotificationAttachment[];
}

export interface NotificationSendResult {
  success: boolean;
  channel: NotificationChannel;
  provider: string;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface INotificationStrategy {
  readonly channel: NotificationChannel;
  readonly providerName: string;

  /**
   * Optional check if the strategy is configured and can send (e.g. check for required API credentials).
   */
  isConfigured(): boolean;

  /**
   * Send the notification using this strategy
   */
  send(payload: NotificationMessagePayload): Promise<NotificationSendResult>;
}
