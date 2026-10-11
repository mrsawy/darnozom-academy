import { BadRequestException, Logger } from '@nestjs/common';
import { AiAttachmentErrors, AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES } from '@darnozom/shared-types';
import type { FileAttachmentDto } from '../dto/generate-content-nats.dto';

const logger = new Logger('convertNatsFilesToMulterFormat');

/**
 * Convert base64-encoded file attachments from NATS into a format compatible with AiAttachmentService.
 * Returns an array compatible with Express.Multer.File[] that can be passed to AiAttachmentService.process().
 */
export function convertNatsFilesToMulterFormat(files: FileAttachmentDto[] | undefined): Express.Multer.File[] {
  if (!files?.length) return [];

  const multerFiles: Express.Multer.File[] = [];
  let totalSize = 0;

  for (const file of files) {
    try {
      if (!file.data) {
        logger.warn(`File "${file.filename}" has no base64 data`);
        throw new BadRequestException(`${AiAttachmentErrors.AI_ATTACHMENT_BAD_TYPE}|${file.filename}`);
      }

      // Decode base64 to buffer
      const buffer = Buffer.from(file.data, 'base64');
      totalSize += buffer.byteLength;

      if (totalSize > AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES) {
        throw new BadRequestException(AiAttachmentErrors.AI_ATTACHMENT_TOO_LARGE_TOTAL);
      }

      // Create a mock Express.Multer.File object
      const multerFile: Express.Multer.File = {
        fieldname: 'files',
        originalname: file.filename,
        encoding: '7bit',
        mimetype: file.mimetype,
        size: buffer.byteLength,
        buffer,
        destination: '',
        filename: file.filename,
        path: '',
        stream: undefined as unknown as Express.Multer.File['stream'],
      };

      multerFiles.push(multerFile);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      logger.error(`Failed to convert file "${file.filename}": ${(err as Error).message}`);
      throw new BadRequestException(`${AiAttachmentErrors.AI_ATTACHMENT_BAD_TYPE}|${file.filename}`);
    }
  }

  return multerFiles;
}
