import { Injectable, Logger } from '@nestjs/common';
import { openai } from '@ai-sdk/openai';
import { streamText, generateText, convertToModelMessages } from 'ai';
import type { UIMessage, ModelMessage, UserContent } from 'ai';
import type { GeneratedQuestion } from '../dto/generate-content.dto';
import type { AiAttachmentPart } from './ai-attachment.service';

type StreamChatResult = Awaited<ReturnType<typeof streamText>>;

const MODEL_DEFAULT = 'gpt-4o-mini';
const MODEL_WITH_ATTACHMENTS = 'gpt-4o';

const QUIZ_SYSTEM_PROMPT =
  'You are an expert quiz creator for an LMS platform. Generate multiple choice questions in valid JSON format only. Each question must have: questionText (string), options (array of 4 strings), correctOption (0-based integer index of the correct answer). Return ONLY a JSON array with no markdown, no code fences, no extra text.';

const ARTICLE_SYSTEM_PROMPT =
  'You are an expert educational content writer for an LMS platform. Write clear, well-structured articles in plain text or simple HTML. Focus on educational value. Return only the article body content — no titles, no meta-commentary.';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async streamChat(messages: UIMessage[], onFinish?: (text: string) => Promise<void>, systemContext?: string | null): Promise<StreamChatResult> {
    const baseSystem =
      'You are a helpful learning assistant for an LMS platform called Darnozom. Help students with their course-related questions, study tips, and general learning guidance.';
    const system = systemContext ? `${baseSystem}\n\n${systemContext}` : baseSystem;

    return streamText({
      model: openai(MODEL_DEFAULT),
      system,
      messages: await convertToModelMessages(messages),
      onFinish: onFinish
        ? async ({ text }) => {
            await onFinish(text);
          }
        : undefined,
    });
  }

  async generateQuiz(
    questionCount: number,
    context: string | null,
    prompt?: string,
    attachments: AiAttachmentPart[] = []
  ): Promise<GeneratedQuestion[]> {
    const userInstruction = prompt ? `\n\nAdditional instructions: ${prompt}` : '';
    const contextSection = context ? `\n\nContext to base questions on:\n${context}` : '';
    const promptText = `Generate exactly ${questionCount} multiple choice question${questionCount === 1 ? '' : 's'}.${contextSection}${userInstruction}\n\nReturn a JSON array like: [{"questionText":"...","options":["a","b","c","d"],"correctOption":0}]`;

    const { text } = await generateText({
      model: openai(this.pickModel(attachments)),
      messages: this.buildMessages(QUIZ_SYSTEM_PROMPT, promptText, attachments),
    });

    try {
      const parsed = JSON.parse(text.trim()) as unknown[];
      if (!Array.isArray(parsed)) throw new Error('Expected array');
      return parsed
        .filter(
          (q): q is GeneratedQuestion =>
            typeof (q as GeneratedQuestion).questionText === 'string' &&
            Array.isArray((q as GeneratedQuestion).options) &&
            typeof (q as GeneratedQuestion).correctOption === 'number'
        )
        .slice(0, questionCount);
    } catch (err) {
      this.logger.error('[AI] generateQuiz parse failed:', err, text);
      return [];
    }
  }

  async generateArticle(context: string | null, prompt?: string, attachments: AiAttachmentPart[] = []): Promise<string> {
    const contextSection = context ? `\n\nContext to base the article on:\n${context}` : '';
    const userInstruction = prompt ? `\n\nAdditional instructions: ${prompt}` : '';
    const promptText = `Write an educational article.${contextSection}${userInstruction}`;

    const { text } = await generateText({
      model: openai(this.pickModel(attachments)),
      messages: this.buildMessages(ARTICLE_SYSTEM_PROMPT, promptText, attachments),
    });

    return text.trim();
  }

  generateTitle(firstUserMessage: string): StreamChatResult {
    return streamText({
      model: openai(MODEL_DEFAULT),
      messages: [
        {
          role: 'user',
          content: `Generate a concise 4-6 word title for a chat conversation that begins with the following message. Reply with ONLY the title — no quotes, no punctuation, no extra words:\n\n"${firstUserMessage.slice(0, 300)}"`,
        },
      ],
    });
  }

  private pickModel(attachments: AiAttachmentPart[]): string {
    return attachments.length > 0 ? MODEL_WITH_ATTACHMENTS : MODEL_DEFAULT;
  }

  private buildMessages(systemPrompt: string, userText: string, attachments: AiAttachmentPart[]): ModelMessage[] {
    if (attachments.length === 0) {
      return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ];
    }
    const userContent: UserContent = [{ type: 'text', text: userText }, ...attachments];
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];
  }
}
