import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PRE_START_SWEEP_EVERY_MS, PRE_START_SWEEP_JOB, PRE_START_TASK_QUEUE } from './task.queue';

@Injectable()
export class PreStartTaskScheduler implements OnModuleInit {
  private readonly logger = new Logger(PreStartTaskScheduler.name);

  constructor(@InjectQueue(PRE_START_TASK_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    try {
      // upsert keeps exactly one repeatable schedule across restarts and multiple instances.
      await this.queue.upsertJobScheduler(PRE_START_SWEEP_JOB, { every: PRE_START_SWEEP_EVERY_MS }, { name: PRE_START_SWEEP_JOB });
    } catch (error) {
      // A missing schedule only delays tasks; it never corrupts a group, so the app still starts.
      this.logger.error(`Could not schedule the pre-start task sweep: ${(error as Error).message}`);
    }
  }
}
