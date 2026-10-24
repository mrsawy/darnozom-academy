import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailNotificationStrategy } from '../strategies/email/email-notification.strategy';
import { SmsNotificationStrategy } from '../strategies/sms/sms-notification.strategy';
import { WhatsappNotificationStrategy } from '../strategies/whatsapp/whatsapp-notification.strategy';
import { InAppNotificationStrategy } from '../strategies/in-app/in-app-notification.strategy';
import { NotificationChannel } from '../strategies/interfaces/notification-strategy.interface';
import { OrgReviewNotificationService } from './org-review-notification.service';
import { NotificationService } from '../notification.service';
import { RealtimeService } from 'src/realtime/realtime.service';

describe('Notification Strategies & Dispatcher', () => {
  let dispatcher: NotificationDispatcherService;
  let emailStrategy: EmailNotificationStrategy;
  let smsStrategy: SmsNotificationStrategy;
  let whatsappStrategy: WhatsappNotificationStrategy;
  let inAppStrategy: InAppNotificationStrategy;
  let orgReviewService: OrgReviewNotificationService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'EMAIL_FROM') return 'noreply@test.com';
      if (key === 'CLIENT_BASE_URL') return 'https://test.darnozomlms.com';
      return null;
    }),
  };

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({ _id: 'notif-123' }),
  };

  const mockRealtimeService = {
    emitToUser: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        EmailNotificationStrategy,
        SmsNotificationStrategy,
        WhatsappNotificationStrategy,
        InAppNotificationStrategy,
        OrgReviewNotificationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();

    dispatcher = module.get<NotificationDispatcherService>(NotificationDispatcherService);
    emailStrategy = module.get<EmailNotificationStrategy>(EmailNotificationStrategy);
    smsStrategy = module.get<SmsNotificationStrategy>(SmsNotificationStrategy);
    whatsappStrategy = module.get<WhatsappNotificationStrategy>(WhatsappNotificationStrategy);
    inAppStrategy = module.get<InAppNotificationStrategy>(InAppNotificationStrategy);
    orgReviewService = module.get<OrgReviewNotificationService>(OrgReviewNotificationService);
  });

  it('should register all notification strategies', () => {
    expect(dispatcher.getStrategy(NotificationChannel.EMAIL)).toBe(emailStrategy);
    expect(dispatcher.getStrategy(NotificationChannel.SMS)).toBe(smsStrategy);
    expect(dispatcher.getStrategy(NotificationChannel.WHATSAPP)).toBe(whatsappStrategy);
    expect(dispatcher.getStrategy(NotificationChannel.IN_APP)).toBe(inAppStrategy);
  });

  it('should fallback to mock email delivery when API key is not configured', async () => {
    const result = await dispatcher.send(NotificationChannel.EMAIL, {
      recipient: { email: 'org-admin@example.com' },
      subject: 'Test Subject',
      content: 'Hello World',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe(NotificationChannel.EMAIL);
    expect(result.provider).toBe('resend');
    expect(result.messageId).toContain('mock-email');
  });

  it('should fallback to mock SMS delivery when Twilio credentials are not set', async () => {
    const result = await dispatcher.send(NotificationChannel.SMS, {
      recipient: { phone: '+201234567890' },
      content: 'SMS message test',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe(NotificationChannel.SMS);
    expect(result.provider).toBe('twilio-sms');
    expect(result.messageId).toContain('mock-sms');
  });

  it('should fallback to mock WhatsApp delivery when credentials are not set', async () => {
    const result = await dispatcher.send(NotificationChannel.WHATSAPP, {
      recipient: { phone: '+201234567890' },
      content: 'WhatsApp message test',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe(NotificationChannel.WHATSAPP);
    expect(result.provider).toBe('whatsapp-cloud');
    expect(result.messageId).toContain('mock-wa');
  });

  it('should return error when recipient email is missing for email strategy', async () => {
    const result = await dispatcher.send(NotificationChannel.EMAIL, {
      recipient: {},
      subject: 'Test without email',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Recipient email is missing');
  });

  it('should send organization approval notification via OrgReviewNotificationService', async () => {
    const result = await orgReviewService.notifyOrgApproved({
      email: 'superadmin@org.com',
      organizationName: 'Al-Azhar Academy',
      phone: '+201000000000',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe(NotificationChannel.EMAIL);
  });

  it('should send organization rejection notification via OrgReviewNotificationService', async () => {
    const result = await orgReviewService.notifyOrgRejected(
      {
        email: 'superadmin@org.com',
        organizationName: 'Al-Azhar Academy',
        phone: '+201000000000',
      },
      'Missing commercial registration document'
    );

    expect(result.success).toBe(true);
    expect(result.channel).toBe(NotificationChannel.EMAIL);
  });
});
