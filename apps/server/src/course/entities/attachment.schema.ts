import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { TranscriptSource, TranscriptStatus } from '../enum/transcriptStatus.enum';

const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

@Schema({ _id: false })
class AttachmentTranscriptData {
  @Prop({ type: String }) summary?: string;
  @Prop({ type: [String] }) keyPoints?: string[];
  @Prop({ type: [String] }) topics?: string[];
  @Prop({ type: String }) language?: string;
}
const AttachmentTranscriptDataSchema = SchemaFactory.createForClass(AttachmentTranscriptData);

@Schema({ _id: false })
export class Attachment {
  @Prop({ type: String, required: true })
  fileKey: string;

  @Prop({ type: Number, required: true, min: 1 })
  fileSizeBytes: number;

  @Prop({ type: String, enum: ATTACHMENT_MIME_TYPES, required: true })
  mimeType: (typeof ATTACHMENT_MIME_TYPES)[number];

  @Prop({ type: String })
  title?: string;

  @Prop({ type: String })
  description?: string;

  // ── Transcript fields (mirrors video.schema.ts) ──────────────────
  @Prop({ type: String, enum: Object.values(TranscriptStatus), default: TranscriptStatus.PENDING, index: true })
  transcriptStatus: TranscriptStatus;

  @Prop({ type: String })
  transcript?: string;

  @Prop({ type: AttachmentTranscriptDataSchema })
  transcriptData?: AttachmentTranscriptData;

  @Prop({ type: String, enum: Object.values(TranscriptSource) })
  transcriptSource?: TranscriptSource;

  @Prop({ type: String })
  transcriptError?: string;

  @Prop({ type: Date })
  transcriptedAt?: Date;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

// ── Re-export allowed MIME types for use in the strategy ─────────
export { ATTACHMENT_MIME_TYPES };

// ── MIME type helpers ─────────────────────────────────────────────
export const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
