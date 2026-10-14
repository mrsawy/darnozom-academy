import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SESSION_COMPLETED_EVENT, SessionCompletedPayload } from 'src/academics/events/session.events';
import { SessionChargesService } from '../jobs/session-charges.service';

@Injectable()
export class SessionCompletedBillingListener {
  private readonly logger = new Logger(SessionCompletedBillingListener.name);

  constructor(private readonly sessionCharges: SessionChargesService) {}

  @OnEvent(SESSION_COMPLETED_EVENT)
  async onSessionCompleted(payload: SessionCompletedPayload): Promise<void> {
    try {
      await this.sessionCharges.onSessionCompleted(payload.sessionId);
    } catch (error) {
      this.logger.error(`Failed to post session charges for session ${payload.sessionId}: ${(error as Error).message}`);
    }
  }
}
