import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptSource } from 'src/course/enum/transcriptStatus.enum';
import { extractYoutubeId } from '../utils/youtube-id';
import { NoCaptionsError, TranscriptionResult, TranscriptionSkipError } from '../transcription.types';

@Injectable()
export class YoutubeStrategy {
  private readonly logger = new Logger(YoutubeStrategy.name);

  constructor(private readonly configService: ConfigService) {}

  async transcribe(videoUrl: string): Promise<TranscriptionResult> {
    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) throw new TranscriptionSkipError('NOT_A_YOUTUBE_URL');

    const arabic = await this.tryFetchTranscript(videoId, 'ar');
    if (arabic) {
      return {
        text: arabic,
        language: 'ar',
        source: TranscriptSource.YT_CAPTIONS_AR,
      };
    }

    const english = await this.tryFetchTranscript(videoId, 'en');
    if (english) {
      const translated = await this.translateToArabic(english);
      return {
        text: translated,
        language: 'en',
        source: TranscriptSource.YT_CAPTIONS_TRANSLATED,
      };
    }

    const anyLang = await this.tryFetchTranscript(videoId);
    if (anyLang) {
      const translated = await this.translateToArabic(anyLang);
      return {
        text: translated,
        language: 'unknown',
        source: TranscriptSource.YT_CAPTIONS_TRANSLATED,
      };
    }

    throw new NoCaptionsError();
  }

  private async tryFetchTranscript(videoId: string, lang?: string): Promise<string | null> {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId, lang ? { lang } : undefined);
      if (!segments?.length) return null;
      const text = segments
        .map((s) => s.text)
        .join(' ')
        .replaceAll(/\s+/g, ' ')
        .trim();
      return text.length > 0 ? text : null;
    } catch (err) {
      this.logger.debug(`YouTube transcript fetch failed for ${videoId} (lang=${lang ?? 'default'}): ${(err as Error).message}`);
      return null;
    }
  }

  private async translateToArabic(text: string): Promise<string> {
    const input = text.slice(0, 40_000);
    const { text: translated } = await generateText({
      model: openai('gpt-4o-mini'),
      system:
        'You are a professional translator. Translate the user-provided transcript into Modern Standard Arabic. Preserve meaning, names, and numbers. Return ONLY the Arabic translation with no preamble, headers, or commentary.',
      prompt: input,
    });
    return translated.trim();
  }
}
