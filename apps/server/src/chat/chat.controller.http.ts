import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { SkipRateLimit } from 'src/rate-limiter/rate-limiter.decorator';
import { ChatService } from './chat.service';
import { EnsureConversationDto, SendMessageDto } from './dto/chat.dto';

@Controller('chat')
export class ChatControllerHttp {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard)
  @Get('conversations')
  async getConversations(@Request() req: IUserRequest, @Query('page') pageStr?: string, @Query('limit') limitStr?: string) {
    const page = Math.max(1, Number.parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(limitStr ?? '20', 10) || 20));
    return this.chatService.getConversations(req.user._id.toString(), page, limit);
  }

  @UseGuards(AuthGuard)
  @Post('conversations/ensure')
  async ensureConversation(@Request() req: IUserRequest, @Body() dto: EnsureConversationDto) {
    return this.chatService.ensureConversation(req.user._id.toString(), dto.recipientId);
  }

  @UseGuards(AuthGuard)
  @Get('conversations/:conversationId')
  async getConversation(@Request() req: IUserRequest, @Param('conversationId') conversationId: string) {
    return this.chatService.getConversationById(conversationId, req.user._id.toString());
  }

  @UseGuards(AuthGuard)
  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Request() req: IUserRequest,
    @Param('conversationId') conversationId: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string
  ) {
    const page = Math.max(1, Number.parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(limitStr ?? '30', 10) || 30));
    return this.chatService.getMessages(conversationId, req.user._id.toString(), page, limit);
  }

  /** Idempotent, JWT-authenticated; global IP rate limit (10/min) was too easy to hit via ngrok/localhost and chat UX. */
  @SkipRateLimit()
  @UseGuards(AuthGuard)
  @Post('conversations/:conversationId/read')
  markAsRead(@Request() req: IUserRequest, @Param('conversationId') conversationId: string) {
    return this.chatService.markAsRead(conversationId, req.user._id.toString());
  }

  @UseGuards(AuthGuard)
  @Post('messages')
  async sendMessage(@Request() req: IUserRequest, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.user._id.toString(), dto);
  }

  @UseGuards(AuthGuard)
  @Get('unread-total')
  async getUnreadTotal(@Request() req: IUserRequest) {
    return this.chatService.getUnreadTotal(req.user._id.toString());
  }
}
