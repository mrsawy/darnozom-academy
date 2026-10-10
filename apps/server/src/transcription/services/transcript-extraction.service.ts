import { Injectable, Logger } from '@nestjs/common';
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';

const ExtractedSchema = z.object({
  summary: z.string().describe('ملخص موجز للمحتوى بالعربية الفصحى (3-6 جمل)'),
  keyPoints: z.array(z.string()).describe('قائمة النقاط الرئيسية بالعربية الفصحى'),
  topics: z.array(z.string()).describe('قائمة قصيرة بالموضوعات أو المصطلحات المحورية بالعربية'),
});

export type ExtractedTranscript = z.infer<typeof ExtractedSchema>;

@Injectable()
export class TranscriptExtractionService {
  private readonly logger = new Logger(TranscriptExtractionService.name);

  async extract(transcript: string, contextTitle?: string): Promise<ExtractedTranscript> {
    const input = transcript.slice(0, 40_000);
    const header = contextTitle ? `عنوان الدرس: ${contextTitle}\n\n` : '';

    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({ schema: ExtractedSchema }),
      system:
        'You are an assistant that reads lesson transcripts and extracts structured study notes in Modern Standard Arabic. Always output Arabic regardless of the input language. Be accurate and do not invent content.',
      prompt: `${header}النص:\n${input}`,
    });

    return {
      summary: output.summary.trim(),
      keyPoints: output.keyPoints.map((p) => p.trim()).filter(Boolean),
      topics: output.topics.map((t) => t.trim()).filter(Boolean),
    };
  }
}
