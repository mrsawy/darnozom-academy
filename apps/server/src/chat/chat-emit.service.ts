import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * Holds the `/chat` namespace Socket.io server so that ChatService can emit
 * events to connected clients without depending on ChatGateway directly
 * (which would create a circular dependency).
 *
 * ChatGateway calls `bindServer` in `afterInit`.
 * ChatService injects this and calls `emitToUser`.
 */
@Injectable()
export class ChatEmitService {
  private readonly logger = new Logger(ChatEmitService.name);
  private server?: Server;

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`ChatEmitService: server not bound, dropping event ${event} for user ${userId}`);
      return;
    }
    const room = `chat:user:${userId}`;
    this.server.to(room).emit(event, payload);
    this.logger.debug(`emit ${event} → room=${room}`);
  }
}
