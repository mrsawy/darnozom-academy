import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { RealtimeRooms } from './realtime.constants';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server?: Server;

  bindServer(server: Server): void {
    this.server = server;
  }

  async emitToUser(userId: string, event: string, payload: unknown): Promise<void> {
    if (!this.server) {
      this.logger.warn(`emitToUser skipped; server not bound for event ${event}`);
      return;
    }
    const room = RealtimeRooms.user(userId);
    const sockets = await this.server.in(room).fetchSockets();
    this.logger.log(`emitToUser ${event} room=${room} sockets=${sockets.length}`);
    this.server.to(room).emit(event, payload);
  }

  async emitToSession(sessionId: string, event: string, payload: unknown): Promise<void> {
    if (!this.server) {
      this.logger.warn(`emitToSession skipped; server not bound for event ${event}`);
      return;
    }
    const room = RealtimeRooms.session(sessionId);
    const sockets = await this.server.in(room).fetchSockets();
    this.logger.log(`emitToSession ${event} room=${room} sockets=${sockets.length}`);
    this.server.to(room).emit(event, payload);
  }

  logConnectionError(reason: string, details?: string): void {
    if (details) {
      this.logger.warn(`${reason} :: ${details}`);
      return;
    }
    this.logger.warn(reason);
  }
}
