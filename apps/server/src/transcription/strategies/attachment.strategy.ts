import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';
import axios from 'axios';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { FileService } from 'src/file/file.service';
import { IMAGE_MIME_TYPES, DOCUMENT_MIME_TYPES } from 'src/course/entities/attachment.schema';
import { TranscriptSource } from 'src/course/enum/transcriptStatus.enum';
import { TranscriptionResult, TranscriptionSkipError } from '../transcription.types';

// Cache the module reference — officeparser is CJS; load once via require.
// eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module -- officeparser has no stable ESM entry for Nest CJS bundle
const officeParser = require('officeparser') as {
  parseOfficeAsync: (input: string | Buffer, options?: Record<string, unknown>) => Promise<string>;
};

/**
 * Write a buffer to a temp file, run `fn(tmpPath)`, then clean up.
 */
async function withTempFile<T>(buffer: Buffer, ext: string, fn: (filePath: string) => Promise<T>): Promise<T> {
  const tmpPath = path.join(os.tmpdir(), `lms-att-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  try {
    await fs.promises.writeFile(tmpPath, buffer);
    return await fn(tmpPath);
  } finally {
    await fs.promises.unlink(tmpPath);
  }
}

/** Infer file extension from MIME type for temp-file naming. */
function extFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType] ?? 'bin';
}

@Injectable()
export class AttachmentStrategy {
  private readonly logger = new Logger(AttachmentStrategy.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly fileService: FileService
  ) {
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiKey) this.logger.warn('OPENAI_API_KEY is not set — image vision extraction will fail.');
    this.openai = new OpenAI({ apiKey: openaiKey, timeout: 120_000 });
  }

  async extract(fileKey: string, mimeType: string, title?: string): Promise<TranscriptionResult> {
    const url = await this.fileService.getFileUrl(fileKey);
    if (!url) throw new Error('Could not resolve signed URL for attachment fileKey');

    if (IMAGE_MIME_TYPES.has(mimeType)) {
      // Pass the signed URL directly — no need to download + re-encode as base64.
      // This avoids inflating memory for large images (8 MB → ~11 MB base64).
      return this.extractFromImage(url, mimeType, title);
    }

    if (DOCUMENT_MIME_TYPES.has(mimeType)) {
      this.logger.debug(`Downloading attachment for extraction: ${fileKey} (${mimeType})`);
      const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(res.data);
      return this.extractFromDocument(buffer, mimeType, title);
    }

    throw new TranscriptionSkipError(`UNSUPPORTED_ATTACHMENT_MIME:${mimeType}`);
  }

  private async extractFromDocument(buffer: Buffer, mimeType: string, title?: string): Promise<TranscriptionResult> {
    const ext = extFromMime(mimeType);
    this.logger.debug(`Extracting text from document (.${ext})`);

    let text: string;
    try {
      // officeparser accepts a Buffer directly since v4
      text = await officeParser.parseOfficeAsync(buffer, {
        newlineDelimiter: ' ',
        ignoreNotes: false,
        putTextInOrder: true,
        outputErrorToConsole: false,
      });
    } catch (err) {
      // Fallback: write to temp file (required by some older officeparser builds)
      this.logger.debug(`officeParser buffer attempt failed, retrying with temp file: ${(err as Error).message}`);
      text = await withTempFile(buffer, ext, (tmpPath) =>
        officeParser.parseOfficeAsync(tmpPath, {
          newlineDelimiter: ' ',
          ignoreNotes: false,
          putTextInOrder: true,
          outputErrorToConsole: false,
        })
      );
    }

    text = text.trim();
    if (!text) throw new TranscriptionSkipError('EMPTY_DOCUMENT_TEXT');

    this.logger.debug(`Document text extracted: ${text.length} chars (${title ?? 'untitled'})`);
    return { text, source: TranscriptSource.ATTACHMENT_EXTRACT };
  }

  private async extractFromImage(signedUrl: string, mimeType: string, title?: string): Promise<TranscriptionResult> {
    this.logger.debug(`Extracting content from image via OpenAI vision (${mimeType})`);

    const systemPrompt =
      'أنت مساعد تعليمي. استخرج وصف دقيق لمحتوى الصورة التعليمية. ' +
      'اذكر كل النصوص الظاهرة والمفاهيم والمعلومات الرئيسية. أجب دائماً باللغة العربية.';

    const userContent = title ? `الصورة التالية من الدرس "${title}". صف محتواها بالتفصيل.` : 'صف محتوى هذه الصورة التعليمية بالتفصيل.';

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: signedUrl, detail: 'high' } },
            { type: 'text', text: userContent },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';
    if (!text) throw new TranscriptionSkipError('EMPTY_IMAGE_VISION_RESPONSE');

    this.logger.debug(`Image vision extraction done: ${text.length} chars`);
    return { text, source: TranscriptSource.IMAGE_VISION };
  }
}
