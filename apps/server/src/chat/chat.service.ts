import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateModel, Types } from 'mongoose';
import { ChatAccessService } from './chat-access.service';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatAttachmentDto, SendMessageDto } from './dto/chat.dto';
import { ChatEmitService } from './chat-emit.service';
import { NotificationService } from 'src/notification/notification.service';
import { ChatEvents } from './chat.constants';
import { NotificationType, NotificationTextKey } from '@lms-organization/shared-types';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation> & PaginateModel<Conversation>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessage> & PaginateModel<ChatMessage>,
    private readonly access: ChatAccessService,
    private readonly chatEmit: ChatEmitService,
    private readonly notifications: NotificationService
  ) {}

  /** Lexicographically sorted participant ids, so [a,b] and [b,a] resolve to the same conversation. */
  private sortedParticipants(a: string, b: string): Types.ObjectId[] {
    const [first, second] = [a, b].toSorted();
    return [new Types.ObjectId(first), new Types.ObjectId(second)];
  }

  async ensureConversation(userId: string, recipientId: string): Promise<Conversation> {
    await this.access.assertCanChat(userId, recipientId);
    const participants = this.sortedParticipants(userId, recipientId);

    const existing = await this.conversationModel.findOne({
      participantIds: { $all: participants, $size: 2 },
    });
    if (existing) return existing;

    const doc = await this.conversationModel.create({
      participantIds: participants,
      unreadCount: {},
    });
    return doc;
  }

  async getConversations(userId: string, page = 1, limit = 20) {
    const result = await this.conversationModel.paginate(
      { participantIds: new Types.ObjectId(userId) },
      {
        page,
        limit: Math.min(limit, 50),
        sort: { lastMessageAt: -1, updatedAt: -1 },
        populate: [
          {
            path: 'participantIds',
            select: 'firstName lastName username profile.avatar roleName',
          },
        ],
      }
    );
    return result;
  }

  async getConversationById(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participantIds', 'firstName lastName username profile.avatar roleName');
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conversation, userId);
    return conversation;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 30) {
    const conversation = await this.conversationModel.findById(conversationId).select('participantIds');
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conversation, userId);

    return this.messageModel.paginate(
      { conversationId: new Types.ObjectId(conversationId) },
      {
        page,
        limit: Math.min(limit, 100),
        sort: { createdAt: -1 },
      }
    );
  }

  async sendMessage(userId: string, dto: SendMessageDto): Promise<ChatMessage> {
    const trimmed = dto.content?.trim() ?? '';
    const attachments = dto.attachments ?? [];
    if (!trimmed && attachments.length === 0) {
      throw new BadRequestException('Message must have content or at least one attachment');
    }
    this.assertAttachmentsPublic(attachments);

    const conversation = await this.ensureConversation(userId, dto.recipientId);
    const conversationId = conversation._id as Types.ObjectId;

    const message = await this.messageModel.create({
      conversationId,
      senderId: new Types.ObjectId(userId),
      content: trimmed,
      attachments,
    });

    const recipientKey = dto.recipientId;
    const currentUnread = conversation.unreadCount?.get(recipientKey) ?? 0;
    conversation.unreadCount?.set(recipientKey, currentUnread + 1);
    conversation.unreadCount?.set(userId, 0);
    conversation.lastMessagePreview = trimmed.length > 0 ? trimmed.slice(0, 120) : `[${attachments.length} attachment(s)]`;
    conversation.lastMessageSenderId = new Types.ObjectId(userId);
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const payload = {
      _id: (message._id as Types.ObjectId).toString(),
      conversationId: conversationId.toString(),
      senderId: userId,
      recipientId: dto.recipientId,
      content: message.content,
      attachments: message.attachments,
      createdAt: message.createdAt,
    };

    this.chatEmit.emitToUser(dto.recipientId, ChatEvents.MESSAGE_CREATED, payload);
    this.chatEmit.emitToUser(userId, ChatEvents.MESSAGE_CREATED, payload);

    await this.notifications.create({
      userId: dto.recipientId,
      titleKey: NotificationTextKey.CHAT_MESSAGE_TITLE,
      bodyKey: trimmed.length > 0 ? NotificationTextKey.CHAT_MESSAGE_BODY : NotificationTextKey.CHAT_MESSAGE_ATTACHMENT_BODY,
      params: trimmed.length > 0 ? { preview: trimmed.slice(0, 140) } : undefined,
      type: NotificationType.CHAT,
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string): Promise<{ success: true }> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conversation, userId);

    conversation.unreadCount?.set(userId, 0);
    await conversation.save();

    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        readAt: { $exists: false },
      },
      { $set: { readAt: new Date() } }
    );

    const other = conversation.participantIds.find((p) => p.toString() !== userId);
    if (other) {
      this.chatEmit.emitToUser(other.toString(), ChatEvents.CONVERSATION_READ, {
        conversationId,
        readerId: userId,
      });
    }

    return { success: true };
  }

  async getUnreadTotal(userId: string): Promise<number> {
    const pipeline = [
      { $match: { participantIds: new Types.ObjectId(userId) } },
      { $project: { count: { $ifNull: [{ $getField: { field: userId, input: '$unreadCount' } }, 0] } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ];
    const result = await this.conversationModel.aggregate(pipeline);
    return (result[0] as { total?: number } | undefined)?.total ?? 0;
  }

  private assertParticipant(conversation: Conversation, userId: string): void {
    const isParticipant = conversation.participantIds.some((p) => p.toString() === userId);
    if (!isParticipant) throw new ForbiddenException('You are not a participant of this conversation');
  }

  private assertAttachmentsPublic(attachments: ChatAttachmentDto[]): void {
    for (const attachment of attachments) {
      const key = attachment.fileKey.replace(/^\/+/, '');
      if (!key.startsWith('public/')) {
        throw new BadRequestException('Chat attachments must be uploaded under the public/ namespace');
      }
    }
  }
}
