import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeSessionAuthService, RealtimeSessionUser } from 'src/realtime/realtime-session-auth.service';
import { ACCESS_TOKEN_NAME } from '@lms-organization/shared-types';
import { ChatService } from './chat.service';
import { ChatEmitService } from './chat-emit.service';
import { getWebSocketCorsOptions } from 'src/realtime/websocket-cors';

interface ChatSocket extends Socket {
  data: {
    user?: RealtimeSessionUser;
  };
}

/**
 * Dedicated gateway for chat — separate namespace `/chat` keeps chat traffic
 * isolated from `/realtime` (used for auth-session events). Message delivery
 * is still done via {@link RealtimeService.emitToUser} inside {@link ChatService}
 * so that this gateway stays thin (connect/typing-only concerns here).
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: getWebSocketCorsOptions(),
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  @WebSocketServer() server: Server;

  constructor(
    private readonly auth: RealtimeSessionAuthService,
    private readonly chatService: ChatService,
    private readonly chatEmit: ChatEmitService
  ) {}

  afterInit(server: Server): void {
    this.chatEmit.bindServer(server);
    this.logger.log('Chat gateway initialized on namespace /chat');
  }

  async handleConnection(client: ChatSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }
      const user = await this.auth.verify(token);
      client.data.user = user;
      void client.join(`chat:user:${user.userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`chat socket rejected: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: ChatSocket): void {
    this.logger.debug(`chat socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat.typing')
  handleTyping(client: ChatSocket, payload: { conversationId: string; recipientId: string }): void {
    const user = client.data.user;
    if (!user || !payload?.recipientId) return;
    this.server.to(`chat:user:${payload.recipientId}`).emit('chat.typing', {
      conversationId: payload.conversationId,
      fromUserId: user.userId,
    });
  }

  @SubscribeMessage('chat.markRead')
  async handleMarkRead(client: ChatSocket, payload: { conversationId: string }): Promise<void> {
    const user = client.data.user;
    if (!user || !payload?.conversationId) return;
    await this.chatService.markAsRead(payload.conversationId, user.userId);
  }

  private extractToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as { token?: string })?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) return authToken;

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string') {
      const [type, token] = authorization.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
      const [name, ...valueParts] = part.trim().split('=');
      if (name === ACCESS_TOKEN_NAME) return decodeURIComponent(valueParts.join('='));
    }
    return null;
  }
}
