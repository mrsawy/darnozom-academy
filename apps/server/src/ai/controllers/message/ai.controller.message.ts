import { Controller, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { AiThreadService } from '../../services/ai-thread.service';
import { AiService } from '../../services/ai.service';
import { AiContextService } from '../../services/ai-context.service';
import { AiAttachmentService } from '../../services/ai-attachment.service';
import { RenameAiThreadDto, AiThreadIdDto, ListAiThreadsDto } from '../../dto/ai-thread.dto';
import { GenerateQuizNatsDto, GenerateArticleNatsDto } from '../../dto/generate-content-nats.dto';
import { CheckAiSubscriptionLimit } from 'src/ai-subscription/decorators/check-ai-subscription-limit.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AI_MESSAGE_SENT_EVENT, AiMessageSentEvent } from 'src/ai-subscription/events/ai-message-sent.event';
import { convertNatsFilesToMulterFormat } from '../../utils/convert-nats-files';

@Controller()
@ApplyRpcErrorHandling
export class AiControllerMessage {
  private readonly logger = new Logger(AiControllerMessage.name);

  constructor(
    private readonly aiThreadService: AiThreadService,
    private readonly aiService: AiService,
    private readonly aiContextService: AiContextService,
    private readonly aiAttachmentService: AiAttachmentService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.threads.list')
  async listThreads(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: ListAiThreadsDto) {
    return this.aiThreadService.list(context.userPayload._id.toString(), payload.page ?? 1, payload.limit ?? 20);
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.threads.initialize')
  async initializeThread(@Ctx() context: IUserContext) {
    return this.aiThreadService.create(context.userPayload._id.toString());
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.threads.fetch')
  async fetchThread(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: AiThreadIdDto) {
    return this.aiThreadService.fetch(payload.remoteId, context.userPayload._id.toString());
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.threads.rename')
  async renameThread(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: RenameAiThreadDto) {
    await this.aiThreadService.rename(payload.remoteId, context.userPayload._id.toString(), payload.title);
    return { success: true };
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.threads.archive')
  async archiveThread(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: AiThreadIdDto) {
    await this.aiThreadService.archive(payload.remoteId, context.userPayload._id.toString());
    return { success: true };
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.threads.unarchive')
  async unarchiveThread(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: AiThreadIdDto) {
    await this.aiThreadService.unarchive(payload.remoteId, context.userPayload._id.toString());
    return { success: true };
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.threads.delete')
  async deleteThread(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: AiThreadIdDto) {
    await this.aiThreadService.delete(payload.remoteId, context.userPayload._id.toString());
    return { success: true };
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.generate.quiz')
  async generateQuiz(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GenerateQuizNatsDto) {
    this.logger.debug(`Received quiz generation request: questionCount=${payload.questionCount}, files=${payload.files?.length ?? 0}`);
    const userId = context.userPayload._id.toString();
    const [contextData, attachments] = await Promise.all([
      this.aiContextService.buildGenerationContext(payload.courseId, payload.moduleId, payload.contentId).catch(() => null),
      this.aiAttachmentService.process(convertNatsFilesToMulterFormat(payload.files)),
    ]);
    const questions = await this.aiService.generateQuiz(payload.questionCount, contextData, payload.prompt, attachments.parts);
    this.eventEmitter.emit(AI_MESSAGE_SENT_EVENT, new AiMessageSentEvent(userId));
    return questions;
  }

  @CheckAiSubscriptionLimit('aiAssistant')
  @MessagePattern('ai.generate.article')
  async generateArticle(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GenerateArticleNatsDto) {
    this.logger.debug(`Received article generation request: files=${payload.files?.length ?? 0}`);
    const userId = context.userPayload._id.toString();
    const [contextData, attachments] = await Promise.all([
      this.aiContextService.buildGenerationContext(payload.courseId, payload.moduleId, payload.contentId).catch(() => null),
      this.aiAttachmentService.process(convertNatsFilesToMulterFormat(payload.files)),
    ]);
    const body = await this.aiService.generateArticle(contextData, payload.prompt, attachments.parts);
    this.eventEmitter.emit(AI_MESSAGE_SENT_EVENT, new AiMessageSentEvent(userId));
    return { body };
  }
}
