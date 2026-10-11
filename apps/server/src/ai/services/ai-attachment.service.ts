import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { extractRawText } from 'mammoth';
import type { FilePart, ImagePart, TextPart } from 'ai';
import {
  AI_ATTACHMENT_ALLOWED_MIME,
  AI_ATTACHMENT_IMAGE_MIME,
  AI_ATTACHMENT_MAX_FILES,
  AI_ATTACHMENT_MAX_FILE_SIZE_BYTES,
  AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES,
  AI_ATTACHMENT_MIME_DOCX,
  AI_ATTACHMENT_MIME_MD,
  AI_ATTACHMENT_MIME_PDF,
  AI_ATTACHMENT_MIME_TXT,
  AI_ATTACHMENT_PER_FILE_TEXT_BUDGET,
  AI_ATTACHMENT_TOTAL_TEXT_BUDGET,
  AiAttachmentErrors,
  AiAttachmentMime,
} from '@darnozom/shared-types';

export type AiAttachmentPart = TextPart | ImagePart | FilePart;

export interface AiAttachmentProcessResult {
  parts: AiAttachmentPart[];
  hasFiles: boolean;
}

@Injectable()
export class AiAttachmentService {
  private readonly logger = new Logger(AiAttachmentService.name);

  validate(files: Express.Multer.File[] | undefined): Express.Multer.File[] {
    if (!files?.length) return [];

    if (files.length > AI_ATTACHMENT_MAX_FILES) {
      throw new BadRequestException(`${AiAttachmentErrors.AI_ATTACHMENT_TOO_MANY}|${AI_ATTACHMENT_MAX_FILES}`);
    }

    let total = 0;
    for (const file of files) {
      if (!AI_ATTACHMENT_ALLOWED_MIME.includes(file.mimetype as AiAttachmentMime)) {
        throw new BadRequestException(`${AiAttachmentErrors.AI_ATTACHMENT_BAD_TYPE}|${file.originalname}`);
      }
      if (file.size > AI_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(`${AiAttachmentErrors.AI_ATTACHMENT_TOO_LARGE_PER_FILE}|${file.originalname}`);
      }
      total += file.size;
    }

    if (total > AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES) {
      throw new BadRequestException(AiAttachmentErrors.AI_ATTACHMENT_TOO_LARGE_TOTAL);
    }

    return files;
  }

  async process(files: Express.Multer.File[] | undefined): Promise<AiAttachmentProcessResult> {
    const validated = this.validate(files);
    if (validated.length === 0) return { parts: [], hasFiles: false };

    const parts: AiAttachmentPart[] = [];
    let textBudget = AI_ATTACHMENT_TOTAL_TEXT_BUDGET;

    for (const file of validated) {
      try {
        const part = await this.toPart(file, textBudget);
        if (!part) continue;
        if (part.type === 'text') textBudget -= part.text.length;
        parts.push(part);
      } catch (err) {
        this.logger.warn(`[AiAttachment] skipping "${file.originalname}" (${file.mimetype}): ${(err as Error).message}`);
      }
    }

    return { parts, hasFiles: parts.length > 0 };
  }

  private async toPart(file: Express.Multer.File, remainingBudget: number): Promise<AiAttachmentPart | null> {
    const mime = file.mimetype as AiAttachmentMime;

    if (mime === AI_ATTACHMENT_MIME_PDF) {
      return { type: 'file', data: file.buffer, mediaType: mime, filename: file.originalname };
    }

    if ((AI_ATTACHMENT_IMAGE_MIME as readonly string[]).includes(mime)) {
      return { type: 'image', image: file.buffer, mediaType: mime };
    }

    if (mime === AI_ATTACHMENT_MIME_DOCX) {
      const { value } = await extractRawText({ buffer: file.buffer });
      return this.makeTextPart(file.originalname, value, remainingBudget);
    }

    if (mime === AI_ATTACHMENT_MIME_TXT || mime === AI_ATTACHMENT_MIME_MD) {
      return this.makeTextPart(file.originalname, file.buffer.toString('utf8'), remainingBudget);
    }

    return null;
  }

  private makeTextPart(filename: string, raw: string, remainingBudget: number): AiAttachmentPart | null {
    if (remainingBudget <= 0) return null;
    const cap = Math.min(AI_ATTACHMENT_PER_FILE_TEXT_BUDGET, remainingBudget);
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const text = trimmed.length > cap ? `${trimmed.slice(0, cap)}…` : trimmed;
    return { type: 'text', text: `Attached file: ${filename}\n${text}` };
  }
}
