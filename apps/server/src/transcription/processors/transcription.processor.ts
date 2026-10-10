import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { ContentType } from 'src/course/enum/contentType.enum';
import { VideoType } from 'src/course/enum/videoType.enum';
import { TranscriptStatus } from 'src/course/enum/transcriptStatus.enum';
import { UploadedVideoStrategy } from '../strategies/uploaded-video.strategy';
import { YoutubeStrategy } from '../strategies/youtube.strategy';
import { AttachmentStrategy } from '../strategies/attachment.strategy';
import { TranscriptExtractionService } from '../services/transcript-extraction.service';
import { TRANSCRIBE_VIDEO_JOB, TRANSCRIPTION_QUEUE, TranscribeVideoJob, TranscriptionSkipError, TranscriptionResult } from '../transcription.types';
import { extractYoutubeId } from '../utils/youtube-id';
import { sanitizeTranscript } from '../utils/sanitize-transcript';

interface VideoContentLike {
  _id: unknown;
  type: ContentType;
  title?: string;
  videoType?: VideoType;
  fileKey?: string;
  videoUrl?: string;
  mimeType?: string;
}

@Processor(TRANSCRIPTION_QUEUE, { concurrency: 2 })
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    @InjectModel(CourseContent.name) private readonly courseContentModel: Model<CourseContent>,
    private readonly configService: ConfigService,
    private readonly uploadedStrategy: UploadedVideoStrategy,
    private readonly youtubeStrategy: YoutubeStrategy,
    private readonly attachmentStrategy: AttachmentStrategy,
    private readonly extractionService: TranscriptExtractionService
  ) {
    super();
  }

  async process(job: Job<TranscribeVideoJob>): Promise<void> {
    if (job.name !== TRANSCRIBE_VIDEO_JOB) return;

    const { contentId } = job.data;
    const content = (await this.courseContentModel.findById(contentId).lean()) as VideoContentLike | null;

    if (!content) {
      this.logger.warn(`Content ${contentId} not found; skipping transcription.`);
      return;
    }
    if (content.type !== ContentType.VIDEO && content.type !== ContentType.ATTACHMENT) return;

    await this.setStatus(contentId, TranscriptStatus.PROCESSING);

    try {
      const result = await this.runStrategy(content);
      if (!result.text) throw new Error('Empty transcript');

      // Sanitize only for audio transcriptions (Whisper hallucinations don't occur in document extraction)
      const cleanText = content.type === ContentType.ATTACHMENT ? result.text : sanitizeTranscript(result.text);
      if (!cleanText) throw new Error('Transcript was empty after hallucination sanitization');
      if (content.type !== ContentType.ATTACHMENT) {
        this.logger.debug(`Transcript sanitized: ${result.text.length} → ${cleanText.length} chars`);
      }

      const extracted = await this.extractionService.extract(cleanText, content.title);

      await this.courseContentModel.updateOne(
        { _id: contentId },
        {
          $set: {
            transcriptStatus: TranscriptStatus.READY,
            transcript: cleanText,
            transcriptData: {
              summary: extracted.summary,
              keyPoints: extracted.keyPoints,
              topics: extracted.topics,
              language: result.language,
            },
            transcriptSource: result.source,
            transcriptedAt: new Date(),
            transcriptError: null,
          },
        },
        { strict: false }
      );
      this.logger.log(`Transcribed content ${contentId} via ${result.source}`);
    } catch (err) {
      if (err instanceof TranscriptionSkipError) {
        await this.courseContentModel.updateOne(
          { _id: contentId },
          { $set: { transcriptStatus: TranscriptStatus.SKIPPED, transcriptError: err.message } },
          { strict: false }
        );
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Transcription failed for ${contentId}: ${message}`);
      await this.courseContentModel.updateOne(
        { _id: contentId },
        { $set: { transcriptStatus: TranscriptStatus.FAILED, transcriptError: message.slice(0, 500) } },
        { strict: false }
      );
      throw err;
    }
  }

  private async runStrategy(content: VideoContentLike): Promise<TranscriptionResult> {
    if (content.type === ContentType.ATTACHMENT) {
      if (!content.fileKey || !content.mimeType) {
        throw new TranscriptionSkipError('ATTACHMENT_MISSING_FILE_OR_MIME');
      }
      return this.attachmentStrategy.extract(content.fileKey, content.mimeType, content.title);
    }
    if (content.videoType === VideoType.UPLOAD && content.fileKey) {
      return this.uploadedStrategy.transcribe(content.fileKey, content.title);
    }
    if (content.videoType === VideoType.URL && content.videoUrl) {
      if (!extractYoutubeId(content.videoUrl)) {
        throw new TranscriptionSkipError('NOT_A_YOUTUBE_URL');
      }
      return this.youtubeStrategy.transcribe(content.videoUrl);
    }
    throw new TranscriptionSkipError('UNSUPPORTED_VIDEO_SHAPE');
  }

  private async setStatus(contentId: string, status: TranscriptStatus): Promise<void> {
    await this.courseContentModel.updateOne({ _id: contentId }, { $set: { transcriptStatus: status } }, { strict: false });
  }
}
