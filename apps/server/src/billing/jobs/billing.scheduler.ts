import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BILLING_DAILY_EVERY_MS, BILLING_DAILY_JOB, BILLING_QUEUE } from './billing.queue';

@Injectable()
export class BillingScheduler implements OnModuleInit {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(@InjectQueue(BILLING_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    try {
      // upsert keeps exactly one repeatable schedule across restarts and multiple instances.
      await this.queue.upsertJobScheduler(BILLING_DAILY_JOB, { every: BILLING_DAILY_EVERY_MS }, { name: BILLING_DAILY_JOB });
    } catch (error) {
      this.logger.error(`Could not schedule the daily billing job: ${(error as Error).message}`);
    }
  }
}
