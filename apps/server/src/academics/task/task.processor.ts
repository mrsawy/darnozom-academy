import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TaskEscalationService } from './task-escalation.service';
import { TaskGenerationService } from './task-generation.service';
import { PRE_START_SWEEP_JOB, PRE_START_TASK_QUEUE } from './task.queue';

export interface PreStartSweepResult {
  created: number;
  escalated: number;
}

@Processor(PRE_START_TASK_QUEUE)
export class PreStartTaskProcessor extends WorkerHost {
  constructor(
    private readonly generation: TaskGenerationService,
    private readonly escalation: TaskEscalationService
  ) {
    super();
  }

  async process(job: Job): Promise<PreStartSweepResult> {
    if (job.name !== PRE_START_SWEEP_JOB) return { created: 0, escalated: 0 };
    // Generation first: a task born in this sweep gets its full window before escalation checks.
    const now = new Date();
    const created = await this.generation.run(now);
    const escalated = await this.escalation.run(now);
    return { created, escalated };
  }
}
