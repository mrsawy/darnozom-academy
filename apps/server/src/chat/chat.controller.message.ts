import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { ChatService } from './chat.service';
import { EnsureConversationDto, GetConversationsDto, GetMessagesDto, MarkConversationReadDto, SendMessageDto } from './dto/chat.dto';

@Controller()
@ApplyRpcErrorHandling
export class ChatControllerMessage {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('chat.getConversations')
  async getConversations(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GetConversationsDto) {
    return this.chatService.getConversations(context.userPayload._id.toString(), payload.page, payload.limit);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('chat.ensureConversation')
  async ensureConversation(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: EnsureConversationDto) {
    return this.chatService.ensureConversation(context.userPayload._id.toString(), payload.recipientId);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('chat.getConversation')
  async getConversation(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: { conversationId: string }) {
    return this.chatService.getConversationById(payload.conversationId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('chat.getMessages')
  async getMessages(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GetMessagesDto) {
    return this.chatService.getMessages(payload.conversationId, context.userPayload._id.toString(), payload.page, payload.limit);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('chat.sendMessage')
  async sendMessage(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: SendMessageDto) {
    return this.chatService.sendMessage(context.userPayload._id.toString(), payload);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('chat.markAsRead')
  async markAsRead(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: MarkConversationReadDto) {
    return this.chatService.markAsRead(payload.conversationId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('chat.getUnreadTotal')
  async getUnreadTotal(@Ctx() context: IUserContext) {
    return this.chatService.getUnreadTotal(context.userPayload._id.toString());
  }
}
