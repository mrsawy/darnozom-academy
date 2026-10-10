import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeRooms } from './realtime.constants';
import { RealtimeService } from './realtime.service';
import { RealtimeSessionAuthService } from './realtime-session-auth.service';
import { ACCESS_TOKEN_NAME } from '@lms-organization/shared-types';
import { getWebSocketCorsOptions } from './websocket-cors';

@WebSocketGateway({
  namespace: '/realtime',
  cors: getWebSocketCorsOptions(),
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly realtimeSessionAuthService: RealtimeSessionAuthService
  ) {}

  afterInit(server: Server): void {
    this.realtimeService.bindServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const sessionUser = await this.realtimeSessionAuthService.verify(token);
      void client.join(RealtimeRooms.user(sessionUser.userId));
      void client.join(RealtimeRooms.session(sessionUser.sid));
      this.realtimeService.logConnectionError(
        'realtime socket connected',
        `socketId=${client.id} userId=${sessionUser.userId} sid=${sessionUser.sid}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown reason';
      this.realtimeService.logConnectionError('realtime socket connection rejected', message);
      client.disconnect();
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as { token?: string })?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string') {
      const [type, token] = authorization.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;

    for (const part of cookieHeader.split(';')) {
      const [name, ...valueParts] = part.trim().split('=');
      if (name === ACCESS_TOKEN_NAME) {
        return decodeURIComponent(valueParts.join('='));
      }
    }

    return null;
  }
}
