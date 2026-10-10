import { Controller, Post, Get, Patch, Body, Param, Query, Res, Req, Logger, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiService } from '../../services/ai.service';
import { AiThreadService } from '../../services/ai-thread.service';
import { AiContextService } from '../../services/ai-context.service';
import { AiAttachmentService } from '../../services/ai-attachment.service';
import { ChatRequestDto } from '../../dto/chat-message.dto';
import { GenerateQuizDto, GenerateArticleDto } from '../../dto/generate-content.dto';
import { CheckAiSubscriptionLimit } from 'src/ai-subscription/decorators/check-ai-subscription-limit.decorator';
import { AI_MESSAGE_SENT_EVENT, AiMessageSentEvent } from 'src/ai-subscription/events/ai-message-sent.event';
import type { UIMessage } from 'ai';
import type { UserDocument } from 'src/user/entities/user.entity';
import { AI_ATTACHMENT_MAX_FILES, AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES } from '@lms-organization/shared-types';

type AuthedRequest = Request & { user: UserDocument };

@Controller('ai')
export class AiControllerHttp {
  private readonly logger = new Logger(AiControllerHttp.name);

  constructor(
    private readonly aiService: AiService,
    private readonly aiThreadService: AiThreadService,
    private readonly aiContextService: AiContextService,
    private readonly aiAttachmentService: AiAttachmentService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Post('chat')
  @CheckAiSubscriptionLimit('messagesPerDay')
  async chat(@Body() body: ChatRequestDto, @Req() req: AuthedRequest, @Res() res: Response) {
    const userId = req.user._id.toString();
    const requestedThreadId = typeof body.threadId === 'string' ? body.threadId.trim() : '';
    /** New chats omit `threadId`; create a DB thread immediately so history, titles, and the thread list work like the web client. */
    let threadId = requestedThreadId || undefined;
    if (!threadId) {
      const created = await this.aiThreadService.create(userId);
      threadId = created.remoteId;
    }

    const userMessages = body.messages as UIMessage[];

    const systemContext = body.contentId ? await this.aiContextService.buildSystemContext(body.contentId).catch(() => null) : null;

    const result = await this.aiService.streamChat(
      userMessages,
      async (text) => {
        const assistantMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          parts: [{ type: 'text', text }],
        } as UIMessage;
        const allMessages = [...userMessages, assistantMessage];

        await this.aiThreadService.saveMessages(threadId, userId, allMessages).catch((err: unknown) => {
          this.logger.error('[AI] saveMessages failed:', err);
        });

        this.autoGenerateTitle(threadId, userId, userMessages);
      },
      systemContext
    );

    // Emit usage event after stream setup (non-blocking)
    this.eventEmitter.emit(AI_MESSAGE_SENT_EVENT, new AiMessageSentEvent(userId));

    const webResponse = result.toUIMessageStreamResponse();
    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));
    // Help intermediaries and clients see headers immediately while the model streams.
    (res as Response & { flushHeaders?: () => void }).flushHeaders?.();

    // So mobile/web clients can bind `serverThreadId` before any model tokens arrive.
    res.write(`data: ${JSON.stringify({ threadId })}\n\n`);

    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  }

  @Post('generate-quiz')
  @CheckAiSubscriptionLimit('aiAssistant')
  @UseInterceptors(FilesInterceptor('files', AI_ATTACHMENT_MAX_FILES, { limits: { fileSize: AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES } }))
  async generateQuiz(@Body() dto: GenerateQuizDto, @UploadedFiles() files: Express.Multer.File[] | undefined, @Req() req: AuthedRequest) {
    const userId = req.user._id.toString();
    const [context, attachments] = await Promise.all([
      this.aiContextService.buildGenerationContext(dto.courseId, dto.moduleId, dto.contentId).catch(() => null),
      this.aiAttachmentService.process(files),
    ]);
    const questions = await this.aiService.generateQuiz(dto.questionCount, context, dto.prompt, attachments.parts);
    this.eventEmitter.emit(AI_MESSAGE_SENT_EVENT, new AiMessageSentEvent(userId));
    return questions;
  }

  @Post('generate-article')
  @CheckAiSubscriptionLimit('aiAssistant')
  @UseInterceptors(FilesInterceptor('files', AI_ATTACHMENT_MAX_FILES, { limits: { fileSize: AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES } }))
  async generateArticle(@Body() dto: GenerateArticleDto, @UploadedFiles() files: Express.Multer.File[] | undefined, @Req() req: AuthedRequest) {
    const userId = req.user._id.toString();
    const [context, attachments] = await Promise.all([
      this.aiContextService.buildGenerationContext(dto.courseId, dto.moduleId, dto.contentId).catch(() => null),
      this.aiAttachmentService.process(files),
    ]);
    const body = await this.aiService.generateArticle(context, dto.prompt, attachments.parts);
    this.eventEmitter.emit(AI_MESSAGE_SENT_EVENT, new AiMessageSentEvent(userId));
    return { body };
  }

  @Post('generate-title')
  @CheckAiSubscriptionLimit('aiAssistant')
  async generateTitle(@Body() body: { message: string }, @Res() res: Response) {
    const result = this.aiService.generateTitle(body.message ?? '');
    const webResponse = result.toTextStreamResponse();

    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));

    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  }

  @Get('threads')
  @CheckAiSubscriptionLimit('aiAssistant')
  async listThreads(@Req() req: AuthedRequest, @Query('page') pageStr?: string, @Query('limit') limitStr?: string) {
    const userId = req.user._id.toString();
    const page = Math.max(1, Number.parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(limitStr ?? '30', 10) || 30));
    return this.aiThreadService.list(userId, page, limit);
  }

  @Get('threads/:id/messages')
  @CheckAiSubscriptionLimit('aiAssistant')
  async getThreadMessages(@Param('id') id: string, @Req() req: AuthedRequest, @Query('limit') limitStr?: string, @Query('before') before?: string) {
    const userId = req.user._id.toString();
    const parsed = Number.parseInt(limitStr ?? '12', 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 12;
    return this.aiThreadService.getMessagesPage(id, userId, limit, before);
  }

  @Patch('threads/:id/title')
  @CheckAiSubscriptionLimit('aiAssistant')
  async updateThreadTitle(@Param('id') id: string, @Body() body: { title: string }, @Req() req: AuthedRequest) {
    const userId = req.user._id.toString();
    await this.aiThreadService.updateTitle(id, userId, body.title);
    return { success: true };
  }

  private autoGenerateTitle(threadId: string, userId: string, messages: UIMessage[]) {
    const firstUserPart = messages.find((m) => m.role === 'user')?.parts?.find((p): p is { type: 'text'; text: string } => p.type === 'text');

    if (!firstUserPart?.text) return;

    void (async () => {
      try {
        const result = this.aiService.generateTitle(firstUserPart.text);
        const title = (await result.text).trim();
        if (title) {
          await this.aiThreadService.updateTitle(threadId, userId, title);
        }
      } catch (err) {
        this.logger.error('[AI] autoGenerateTitle failed:', err);
      }
    })();
  }
}
