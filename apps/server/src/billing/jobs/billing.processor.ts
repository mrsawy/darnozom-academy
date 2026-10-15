import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BILLING_DAILY_JOB, BILLING_QUEUE } from './billing.queue';
import { MonthlyChargesService } from './monthly-charges.service';
import { RemindersService } from './reminders.service';

export interface BillingDailyJobResult {
  charged: number;
  reminded: number;
}

@Processor(BILLING_QUEUE)
export class BillingProcessor extends WorkerHost {
  constructor(
    private readonly monthlyCharges: MonthlyChargesService,
    private readonly reminders: RemindersService
  ) {
    super();
  }

  async process(job: Job): Promise<BillingDailyJobResult> {
    if (job.name !== BILLING_DAILY_JOB) {
      return { charged: 0, reminded: 0 };
    }
    const now = new Date();
    const charged = await this.monthlyCharges.run(now);
    const reminded = await this.reminders.run(now);
    return { charged, reminded };
  }
}
