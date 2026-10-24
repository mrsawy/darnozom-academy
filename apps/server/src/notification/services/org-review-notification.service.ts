import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationTextKey } from '@darnozom/shared-types';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationChannel } from '../strategies/interfaces/notification-strategy.interface';
import {
  buildOrgApprovalEmailHtml,
  buildOrgRejectionEmailHtml,
} from '../templates/org-review-email.template';

export interface OrgReviewRecipient {
  userId?: string;
  email: string;
  phone?: string;
  superAdminName?: string;
  organizationName: string;
}

@Injectable()
export class OrgReviewNotificationService {
  private readonly logger = new Logger(OrgReviewNotificationService.name);
  private readonly clientBaseUrl: string;

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly configService: ConfigService
  ) {
    this.clientBaseUrl =
      this.configService.get<string>('CLIENT_BASE_URL') ||
      this.configService.get<string>('BASE_URL') ||
      'https://darnozomlms.com';
  }

  /**
   * Send approval notification to organization super admin via Email (and optional SMS / WhatsApp / In-App)
   */
  async notifyOrgApproved(recipient: OrgReviewRecipient) {
    this.logger.log(`Sending approval notification to organization: ${recipient.organizationName} (${recipient.email})`);

    const loginUrl = `${this.clientBaseUrl.replace(/\/+$/, '')}/login`;
    const subject = `Congratulations! ${recipient.organizationName} has been approved`;
    const emailHtml = buildOrgApprovalEmailHtml({
      organizationName: recipient.organizationName,
      loginUrl,
    });
    const plainText = `Congratulations! Your organization "${recipient.organizationName}" has been approved by the platform admin. You can now access your dashboard: ${loginUrl}`;

    // Send email (guaranteed)
    const emailResult = await this.dispatcher.send(NotificationChannel.EMAIL, {
      recipient: {
        email: recipient.email,
        phone: recipient.phone,
        name: recipient.superAdminName,
      },
      subject,
      html: emailHtml,
      content: plainText,
      metadata: {
        organizationName: recipient.organizationName,
        status: 'APPROVED',
      },
    });

    // If super admin has in-app userId, also deliver in-app notification
    if (recipient.userId) {
      await this.dispatcher.send(NotificationChannel.IN_APP, {
        recipient: { userId: recipient.userId },
        titleKey: NotificationTextKey.ORG_APPROVED_TITLE,
        bodyKey: NotificationTextKey.ORG_APPROVED_BODY,
        params: { organizationName: recipient.organizationName },
        content: plainText,
      }).catch((err) => this.logger.warn(`In-app approval notification failed: ${err}`));
    }

    // If phone number is available, also notify via SMS / WhatsApp if configured
    if (recipient.phone) {
      await this.dispatcher.send(NotificationChannel.SMS, {
        recipient: { phone: recipient.phone },
        content: plainText,
      }).catch((err) => this.logger.warn(`SMS approval notification failed: ${err}`));
    }

    return emailResult;
  }

  /**
   * Send rejection notification to organization super admin via Email (and optional SMS / WhatsApp / In-App)
   */
  async notifyOrgRejected(recipient: OrgReviewRecipient, comment?: string) {
    this.logger.log(`Sending rejection notification to organization: ${recipient.organizationName} (${recipient.email})`);

    const resubmitUrl = `${this.clientBaseUrl.replace(/\/+$/, '')}/verification`;
    const subject = `Update on your organization application: ${recipient.organizationName}`;
    const emailHtml = buildOrgRejectionEmailHtml({
      organizationName: recipient.organizationName,
      reason: comment,
      resubmitUrl,
    });
    const reasonText = comment ? ` Reason: ${comment}.` : '';
    const plainText = `Your application for "${recipient.organizationName}" was not approved.${reasonText} You can review and resubmit here: ${resubmitUrl}`;

    // Send email
    const emailResult = await this.dispatcher.send(NotificationChannel.EMAIL, {
      recipient: {
        email: recipient.email,
        phone: recipient.phone,
        name: recipient.superAdminName,
      },
      subject,
      html: emailHtml,
      content: plainText,
      metadata: {
        organizationName: recipient.organizationName,
        status: 'REJECTED',
        comment,
      },
    });

    // In-app notification if userId exists
    if (recipient.userId) {
      await this.dispatcher.send(NotificationChannel.IN_APP, {
        recipient: { userId: recipient.userId },
        titleKey: NotificationTextKey.ORG_REJECTED_TITLE,
        bodyKey: NotificationTextKey.ORG_REJECTED_BODY,
        params: { organizationName: recipient.organizationName },
        content: plainText,
      }).catch((err) => this.logger.warn(`In-app rejection notification failed: ${err}`));
    }

    // SMS if phone number exists
    if (recipient.phone) {
      await this.dispatcher.send(NotificationChannel.SMS, {
        recipient: { phone: recipient.phone },
        content: plainText,
      }).catch((err) => this.logger.warn(`SMS rejection notification failed: ${err}`));
    }

    return emailResult;
  }
}
