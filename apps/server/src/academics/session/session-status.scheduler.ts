import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SESSION_STATUS_QUEUE, SWEEP_EVERY_MS, SWEEP_OVERDUE_JOB } from './session.queue';

@Injectable()
export class SessionStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(SessionStatusScheduler.name);

  constructor(@InjectQueue(SESSION_STATUS_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    try {
      // upsert keeps exactly one repeatable schedule across restarts and multiple instances.
      await this.queue.upsertJobScheduler(SWEEP_OVERDUE_JOB, { every: SWEEP_EVERY_MS }, { name: SWEEP_OVERDUE_JOB });
    } catch (error) {
      // Session status is also derived on read, so a missing sweep never shows a wrong status.
      this.logger.error(`Could not schedule the overdue-session sweep: ${(error as Error).message}`);
    }
  }
}
