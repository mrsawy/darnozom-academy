import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SessionCompletionService } from './session-completion.service';
import { SessionPresenceService } from './session-presence.service';
import { SESSION_STATUS_QUEUE, SWEEP_OVERDUE_JOB } from './session.queue';

@Processor(SESSION_STATUS_QUEUE)
export class SessionStatusProcessor extends WorkerHost {
  constructor(
    private readonly completion: SessionCompletionService,
    private readonly presence: SessionPresenceService
  ) {
    super();
  }

  async process(job: Job): Promise<number> {
    if (job.name !== SWEEP_OVERDUE_JOB) return 0;
    const now = new Date();
    const changed = await this.completion.sweepOverdue(now);
    await this.presence.markNoShows(now);
    return changed;
  }
}
