import moment from 'moment-timezone';
import type { CourseContentFormData } from '@/lib/schema/content.schema';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import { VideoType } from '@/lib/types/course/enum/VideoType.enum';
import type { IContent } from '@/lib/types/course/content.interface';

const EMPTY_QUESTIONS: { questionText: string; options: string[]; correctOption: number }[] = [];

export function getContentFormDefaultValues(
  initialContent: IContent | null | undefined
): Partial<CourseContentFormData> {
  if (!initialContent) {
    return {
      type: CourseContentType.ARTICLE,
      settings: { discussionEnabled: true },
      content: {
        videoType: VideoType.URL,
      },
    };
  }

  const base = {
    type: initialContent.type,
    title: initialContent.title,
    description: initialContent.description ?? '',
    settings: {
      discussionEnabled: initialContent.settings?.discussionEnabled !== false,
    },
    content:
      initialContent.type === CourseContentType.ARTICLE
        ? { body: initialContent.body ?? '' }
        : initialContent.type === CourseContentType.VIDEO
          ? {
              videoType: initialContent.videoType ?? VideoType.URL,
              videoUrl: initialContent.videoUrl ?? '',
              fileKey: initialContent.fileKey ?? '',
              fileSizeBytes: initialContent.fileSizeBytes,
            }
          : initialContent.type === CourseContentType.QUIZ
            ? {
                questions: initialContent.questions ?? EMPTY_QUESTIONS,
                quizStartDate: initialContent.quizStartDate
                  ? new Date(initialContent.quizStartDate)
                  : undefined,
                quizEndDate: initialContent.quizEndDate
                  ? new Date(initialContent.quizEndDate)
                  : undefined,
                quizDurationInMinutes: initialContent.quizDurationInMinutes ?? 30,
                maxAttempts: initialContent.maxAttempts ?? 1,
              }
            : initialContent.type === CourseContentType.ASSIGNMENT
              ? {
                  // Server stores UTC; parse and show in user's local time
                  dueDate: initialContent.dueDate
                    ? moment.utc(initialContent.dueDate).local().toDate()
                    : undefined,
                  maxPoints: initialContent.maxPoints ?? 100,
                  instructions: initialContent.instructions ?? '',
                  fileKey: initialContent.fileKey ?? '',
                  fileSizeBytes: initialContent.fileSizeBytes,
                }
              : initialContent.type === CourseContentType.LIVE_SESSION
                ? {
                    startDate: initialContent.startDate
                      ? new Date(initialContent.startDate)
                      : undefined,
                    endDate: initialContent.endDate ? new Date(initialContent.endDate) : undefined,
                    provider: initialContent.provider ?? 'EXTERNAL_URL',
                    meetingUrl: initialContent.meetingUrl ?? '',
                    meetingId: initialContent.meetingId ?? '',
                    meetingPassword: initialContent.meetingPassword ?? '',
                    platform: initialContent.platform ?? '',
                    recordingUrl: initialContent.recordingUrl ?? '',
                    instructions: initialContent.instructions ?? '',
                    recordedSession: initialContent.recordedSession ?? '',
                    durationInMinutes: String(initialContent.durationInMinutes ?? 60),
                  }
                : initialContent.type === CourseContentType.ATTACHMENT
                  ? {
                      fileKey: initialContent.fileKey ?? '',
                      fileSizeBytes: initialContent.fileSizeBytes,
                      mimeType: initialContent.mimeType ?? '',
                    }
                  : {},
  };

  return initialContent._id ? { ...base, _id: initialContent._id } : base;
}
