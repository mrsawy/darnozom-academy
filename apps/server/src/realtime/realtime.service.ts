import { Injectable, Logger } from '@nestjs/common';

/**
 * Minimal real-time bootstrap. No websocket gateway is wired up yet (out of
 * scope for this build) — this service just centralizes where session/user
 * events would be emitted once a gateway (or NATS-based push) is added.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  async emitToSession(sessionId: string, event: string, payload: unknown): Promise<void> {
    this.logger.debug(`emitToSession(${sessionId}, ${event}) — no realtime transport wired up yet`, payload as object);
    await Promise.resolve();
  }

  async emitToUser(userId: string, event: string, payload: unknown): Promise<void> {
    this.logger.debug(`emitToUser(${userId}, ${event}) — no realtime transport wired up yet`, payload as object);
    await Promise.resolve();
  }
}
