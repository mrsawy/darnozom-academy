import { ForbiddenException, Injectable } from '@nestjs/common';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { bytesToGB } from './course-content-storage.util';

@Injectable()
export class CourseContentStorageService {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /** Throws when adding `additionalBytes` would exceed the organization's plan storage limit. */
  async checkAndReserveStorage(organizationId: string, additionalBytes: number): Promise<void> {
    const subscription = await this.subscriptionService.findActiveByOrganization(organizationId);
    if (!subscription) throw new ForbiddenException('No active subscription found for this organization.');
    const plan = (subscription as unknown as { plan: { features: { maxStorageGB: number } } }).plan;
    if (!plan) throw new ForbiddenException('Subscription plan could not be resolved.');
    const currentGB = subscription.usage?.storageUsedGB ?? 0;
    const limitGB = plan.features?.maxStorageGB ?? 0;
    if (limitGB < 0) return;
    const additionalGB = bytesToGB(additionalBytes);
    if (currentGB + additionalGB > limitGB) {
      throw new ForbiddenException(
        `Storage limit reached. Plan allows ${limitGB} GB (used: ${currentGB} GB). This file would add ${additionalGB.toFixed(4)} GB. Please upgrade your plan.`
      );
    }
  }
}
