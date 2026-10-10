import { TranscriptSource } from '../course/enum/transcriptStatus.enum';

export interface TranscriptionResult {
  text: string;
  language?: string;
  source: TranscriptSource;
}

export const TRANSCRIPTION_QUEUE = 'transcription';
export const TRANSCRIBE_VIDEO_JOB = 'transcribe-video';

export interface TranscribeVideoJob {
  contentId: string;
}

export class TranscriptionSkipError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'TranscriptionSkipError';
  }
}

export class NoCaptionsError extends TranscriptionSkipError {
  constructor() {
    super('NO_CAPTIONS');
    this.name = 'NoCaptionsError';
  }
}
