import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import axios from 'axios';
import Groq, { toFile as groqToFile } from 'groq-sdk';
import OpenAI from 'openai';
import { FileService } from 'src/file/file.service';
import { TranscriptSource } from 'src/course/enum/transcriptStatus.enum';
import { TranscriptionResult } from '../transcription.types';

// eslint-disable-next-line unicorn/prefer-module -- Nest bundles CommonJS; __dirname is required for createRequire with ffmpeg-static
const nodeRequire = createRequire(__dirname);

const ffmpegPath: string = nodeRequire('ffmpeg-static') as string;

// Both Groq and OpenAI Whisper have a 25 MB limit.
const MAX_BYTES = 24 * 1_048_576; // 24 MB

/**
 * Extract audio from a video buffer using a temp file.
 * We must use real files (not stdin) because MP4 containers store
 * the moov atom at the end and require seeking — pipes don't allow that.
 */
async function extractAudioBuffer(videoBuffer: Buffer): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `lms-vid-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  const outputPath = inputPath.replace('.mp4', '.mp3');

  try {
    await fs.promises.writeFile(inputPath, videoBuffer);

    await new Promise<void>((resolve, reject) => {
      const ff = spawn(ffmpegPath, [
        '-i',
        inputPath,
        '-vn', // strip video
        '-ar',
        '16000', // 16kHz — Whisper native rate
        '-ac',
        '1', // mono
        '-b:a',
        '32k', // 32kbps — small, good enough for speech
        '-y', // overwrite output if it exists
        outputPath,
      ]);

      ff.stderr.on('data', (): void => {
        /* discard ffmpeg progress noise */
      });
      ff.on('error', (err) => reject(new Error(`ffmpeg-static error: ${err.message}`)));
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });

    return await fs.promises.readFile(outputPath);
  } finally {
    await fs.promises.rm(inputPath, { force: true });
    await fs.promises.rm(outputPath, { force: true });
  }
}

@Injectable()
export class UploadedVideoStrategy {
  private readonly logger = new Logger(UploadedVideoStrategy.name);
  private readonly groq: Groq;
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly fileService: FileService
  ) {
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (!groqKey) this.logger.warn('GROQ_API_KEY is not set — will fall back to OpenAI directly.');
    this.groq = new Groq({ apiKey: groqKey, timeout: 120_000 });

    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiKey) this.logger.warn('OPENAI_API_KEY is not set — fallback transcription will also fail.');
    this.openai = new OpenAI({ apiKey: openaiKey, timeout: 120_000 });
  }

  async transcribe(fileKey: string, vocabHint?: string): Promise<TranscriptionResult> {
    const url = await this.fileService.getFileUrl(fileKey);
    if (!url) throw new Error('Could not resolve signed URL for fileKey');

    this.logger.debug(`Downloading video for transcription: ${fileKey}`);
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    const videoBuffer = Buffer.from(res.data);

    let uploadBuffer: Buffer;
    let fileName: string;

    if (videoBuffer.byteLength <= MAX_BYTES) {
      uploadBuffer = videoBuffer;
      fileName = fileKey.split('/').pop() ?? 'video.mp4';
      this.logger.debug(`Video is ${(videoBuffer.byteLength / 1_048_576).toFixed(1)} MB — sending directly`);
    } else {
      this.logger.debug(`Video is ${(videoBuffer.byteLength / 1_048_576).toFixed(1)} MB — extracting audio via ffmpeg`);
      uploadBuffer = await extractAudioBuffer(videoBuffer);
      fileName = 'audio.mp3';
      this.logger.debug(`Audio extracted: ${(uploadBuffer.byteLength / 1_048_576).toFixed(1)} MB`);
    }

    // Try Groq first, fall back to OpenAI on any error (rate limit, timeout, etc.)
    try {
      return await this.transcribeWithGroq(uploadBuffer, fileName, vocabHint);
    } catch (groqErr) {
      const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
      this.logger.warn(`Groq transcription failed (${msg}) — falling back to OpenAI Whisper`);
      return await this.transcribeWithOpenAI(uploadBuffer, fileName, vocabHint);
    }
  }

  private async transcribeWithGroq(buffer: Buffer, fileName: string, vocabHint?: string): Promise<TranscriptionResult> {
    const transcription = await this.groq.audio.transcriptions.create({
      file: await groqToFile(buffer, fileName),
      model: 'whisper-large-v3',
      language: 'ar',
      prompt: vocabHint?.slice(0, 224),
      response_format: 'verbose_json',
      temperature: 0,
    });

    const text = (transcription as unknown as { text: string }).text ?? '';
    const language = (transcription as unknown as { language?: string }).language;
    this.logger.debug('Transcription completed via Groq');
    return { text: text.trim(), language, source: TranscriptSource.GROQ_WHISPER };
  }

  private async transcribeWithOpenAI(buffer: Buffer, fileName: string, vocabHint?: string): Promise<TranscriptionResult> {
    const { toFile } = await import('openai');
    const transcription = await this.openai.audio.transcriptions.create({
      file: await toFile(buffer, fileName),
      model: 'whisper-1',
      language: 'ar',
      prompt: vocabHint?.slice(0, 224),
      response_format: 'verbose_json',
      temperature: 0,
    });

    const text = (transcription as unknown as { text: string }).text ?? '';
    const language = (transcription as unknown as { language?: string }).language;
    this.logger.debug('Transcription completed via OpenAI (fallback)');
    return { text: text.trim(), language, source: TranscriptSource.OPENAI_WHISPER };
  }
}
