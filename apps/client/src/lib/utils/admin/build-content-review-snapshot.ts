import { CourseContentType } from '@darnozom/shared-types';
import type { IReviewableContent } from '@/lib/types/admin-review/admin-review.interface';

function assignIfDefined(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}

/**
 * Snapshot of course content for the main-admin review dialog (quiz questions, assignment text, etc.).
 * Omits learner submission arrays and approval meta.
 */
export function buildContentReviewSnapshot(item: IReviewableContent): Record<string, unknown> {
  const type = item.type as CourseContentType;
  const out: Record<string, unknown> = {
    title: item.title,
    type: item.type,
  };
  assignIfDefined(out, 'description', item.description);

  switch (type) {
    case CourseContentType.QUIZ: {
      assignIfDefined(out, 'questions', item.questions);
      assignIfDefined(out, 'quizDurationInMinutes', item.quizDurationInMinutes);
      assignIfDefined(out, 'quizStartDate', item.quizStartDate);
      assignIfDefined(out, 'quizEndDate', item.quizEndDate);
      assignIfDefined(out, 'maxAttempts', item.maxAttempts);
      break;
    }
    case CourseContentType.ASSIGNMENT: {
      assignIfDefined(out, 'dueDate', item.dueDate);
      assignIfDefined(out, 'maxPoints', item.maxPoints);
      assignIfDefined(out, 'instructions', item.instructions);
      assignIfDefined(out, 'content', item.content);
      assignIfDefined(out, 'fileKey', item.fileKey);
      assignIfDefined(out, 'fileUrl', item.fileUrl);
      assignIfDefined(out, 'fileSizeBytes', item.fileSizeBytes);
      assignIfDefined(out, 'mimeType', item.mimeType);
      break;
    }
    case CourseContentType.VIDEO: {
      assignIfDefined(out, 'videoType', item.videoType);
      assignIfDefined(out, 'videoUrl', item.videoUrl);
      assignIfDefined(out, 'fileKey', item.fileKey);
      assignIfDefined(out, 'fileUrl', item.fileUrl);
      assignIfDefined(out, 'fileSizeBytes', item.fileSizeBytes);
      assignIfDefined(out, 'mimeType', item.mimeType);
      break;
    }
    case CourseContentType.ARTICLE: {
      assignIfDefined(out, 'body', item.body);
      assignIfDefined(out, 'summary', item.summary);
      break;
    }
    case CourseContentType.ATTACHMENT: {
      assignIfDefined(out, 'fileKey', item.fileKey);
      assignIfDefined(out, 'fileUrl', item.fileUrl);
      assignIfDefined(out, 'fileSizeBytes', item.fileSizeBytes);
      assignIfDefined(out, 'mimeType', item.mimeType);
      break;
    }
    case CourseContentType.LIVE_SESSION: {
      assignIfDefined(out, 'startDate', item.startDate);
      assignIfDefined(out, 'endDate', item.endDate);
      assignIfDefined(out, 'meetingUrl', item.meetingUrl);
      assignIfDefined(out, 'meetingId', item.meetingId);
      assignIfDefined(out, 'meetingPassword', item.meetingPassword);
      assignIfDefined(out, 'platform', item.platform);
      assignIfDefined(out, 'recordingUrl', item.recordingUrl);
      assignIfDefined(out, 'instructions', item.instructions);
      assignIfDefined(out, 'durationInMinutes', item.durationInMinutes);
      break;
    }
    case CourseContentType.PROJECT: {
      assignIfDefined(out, 'dueDate', item.dueDate);
      assignIfDefined(out, 'maxPoints', item.maxPoints);
      assignIfDefined(out, 'requirements', item.requirements);
      assignIfDefined(out, 'deliverables', item.deliverables);
      assignIfDefined(out, 'isGroupProject', item.isGroupProject);
      assignIfDefined(out, 'maxGroupSize', item.maxGroupSize);
      break;
    }
    default: {
      break;
    }
  }

  return out;
}
