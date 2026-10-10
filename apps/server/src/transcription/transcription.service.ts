import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TRANSCRIBE_VIDEO_JOB, TRANSCRIPTION_QUEUE, TranscribeVideoJob } from './transcription.types';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(@InjectQueue(TRANSCRIPTION_QUEUE) private readonly queue: Queue<TranscribeVideoJob>) {}

  async enqueue(contentId: string): Promise<void> {
    await this.queue.add(
      TRANSCRIBE_VIDEO_JOB,
      { contentId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `transcribe-${contentId}-${Date.now()}`,
        removeOnComplete: 100,
        removeOnFail: 200,
      }
    );
    this.logger.log(`Queued transcription job for content ${contentId}`);
  }
}
