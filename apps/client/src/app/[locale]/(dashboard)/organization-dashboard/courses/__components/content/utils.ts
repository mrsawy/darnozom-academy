import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import type { CourseContentFormData } from '@/lib/schema/content.schema';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import type { IContent } from '@/lib/types/course/content.interface';
import { slugify } from '@/lib/utils/slugify';

export function ensurePrivateKey(fileKey: string): string {
  const trimmed = fileKey.trim().replace(/^\/+/, '');
  if (trimmed.startsWith('private/') || trimmed.startsWith('public/')) {
    return trimmed;
  }
  return `private/${trimmed}`;
}

export function buildVideoFileKey(file: File, customPath: string): string {
  const lastDotIndex = file.name.lastIndexOf('.');
  const fileExtension = lastDotIndex > 0 ? file.name.slice(lastDotIndex + 1) : '';
  const baseFileName = lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;
  const slugifiedBaseName = slugify(baseFileName);
  const fileName = fileExtension ? `${slugifiedBaseName}.${fileExtension}` : slugifiedBaseName;
  return `${customPath}/${uuidv4()}_${fileName}`;
}

export function buildFileKey(file: File, customPath: string): string {
  const lastDotIndex = file.name.lastIndexOf('.');
  const fileExtension = lastDotIndex > 0 ? file.name.slice(lastDotIndex + 1) : '';
  const baseFileName = lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;
  const slugifiedBaseName = slugify(baseFileName);
  const fileName = fileExtension ? `${slugifiedBaseName}.${fileExtension}` : slugifiedBaseName;
  return `${customPath}/${uuidv4()}_${fileName}`;
}

/** Build flat payload for course.updateContent including fileSizeBytes when content has a file. */
export function buildUpdatePayload(
  contentData: CourseContentFormData & { type: CourseContentType },
  initialContent: IContent
): Partial<IContent> {
  const { content, type, title, description, _id, settings, ...rest } = contentData;
  const base: Partial<IContent> = {
    type: type,
    title: typeof title === 'string' ? title : undefined,
    description: typeof description === 'string' ? description : undefined,
  };
  if (type === CourseContentType.VIDEO && content && 'videoType' in content) {
    Object.assign(base, {
      videoType: content.videoType,
      videoUrl: content.videoUrl,
      fileKey: content.fileKey,
      fileSizeBytes: content.fileSizeBytes ?? initialContent.fileSizeBytes,
    });
  }
  if (type === CourseContentType.ASSIGNMENT && content && 'fileKey' in content) {
    const rawDueDate = (content as { dueDate?: Date | string }).dueDate;
    const dueDate =
      rawDueDate instanceof Date && !Number.isNaN(rawDueDate.getTime())
        ? moment(rawDueDate).utc().toISOString()
        : typeof rawDueDate === 'string'
          ? rawDueDate
          : undefined;
    const assignmentFileKey = (content as { fileKey?: string }).fileKey;
    const assignmentFileSizeBytes = (content as { fileSizeBytes?: number }).fileSizeBytes;
    // When user removed the template, clear fileKey and fileSizeBytes
    const fileKey = assignmentFileKey?.trim() ? assignmentFileKey : undefined;
    const fileSizeBytes =
      fileKey == null ? undefined : (assignmentFileSizeBytes ?? initialContent.fileSizeBytes);
    Object.assign(base, {
      dueDate,
      maxPoints: (content as { maxPoints?: number }).maxPoints,
      instructions: (content as { instructions?: string }).instructions,
      fileKey,
      fileSizeBytes,
    });
  }
  if (type === CourseContentType.ARTICLE && content && 'body' in content) {
    Object.assign(base, { body: content.body });
  }
  if (type === CourseContentType.QUIZ && content && 'questions' in content) {
    Object.assign(base, {
      questions: (content as { questions: unknown }).questions,
      quizStartDate: (content as { quizStartDate?: Date }).quizStartDate,
      quizEndDate: (content as { quizEndDate?: Date }).quizEndDate,
      quizDurationInMinutes: (content as { quizDurationInMinutes?: number }).quizDurationInMinutes,
      maxAttempts: (content as { maxAttempts?: number }).maxAttempts,
    });
  }
  if (type === CourseContentType.LIVE_SESSION && content && 'meetingUrl' in content) {
    const rawDuration = (content as { durationInMinutes?: number | string }).durationInMinutes;
    const parsed =
      typeof rawDuration === 'number' && !Number.isNaN(rawDuration)
        ? rawDuration
        : typeof rawDuration === 'string' && rawDuration !== ''
          ? Number(rawDuration)
          : undefined;
    const durationInMinutes: number | undefined =
      parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined;
    Object.assign(base, {
      startDate: (content as { startDate?: Date }).startDate,
      endDate: (content as { endDate?: Date }).endDate,
      meetingUrl: (content as { meetingUrl?: string }).meetingUrl,
      meetingId: (content as { meetingId?: string }).meetingId,
      meetingPassword: (content as { meetingPassword?: string }).meetingPassword,
      platform: (content as { platform?: string }).platform,
      recordingUrl: (content as { recordingUrl?: string }).recordingUrl,
      instructions: (content as { instructions?: string }).instructions,
      recordedSession: (content as { recordedSession?: string }).recordedSession,
      durationInMinutes,
    });
  }
  if (type === CourseContentType.ATTACHMENT && content && 'fileKey' in content) {
    const attachmentFileKey = (content as { fileKey?: string }).fileKey;
    const fileKey = attachmentFileKey?.trim() ? attachmentFileKey : undefined;
    const fileSizeBytes =
      fileKey == null
        ? undefined
        : ((content as { fileSizeBytes?: number }).fileSizeBytes ?? initialContent.fileSizeBytes);
    const mimeType = fileKey == null ? undefined : (content as { mimeType?: string }).mimeType;
    Object.assign(base, {
      fileKey,
      fileSizeBytes,
      mimeType,
    });
  }
  const out: Partial<IContent> = { ...base, ...rest };
  if (settings !== undefined) {
    out.settings = settings;
  }
  return out;
}
