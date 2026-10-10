export const AI_MESSAGE_SENT_EVENT = 'ai.message.sent';

export class AiMessageSentEvent {
  constructor(public readonly userId: string) {}
}
