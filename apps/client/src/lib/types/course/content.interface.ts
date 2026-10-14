// content.dto.ts

import { CourseContentType } from './enum/CourseContentType.enum';
import { VideoType } from './enum/VideoType.enum';
import type { IUserReview } from '../review/review.types';
import type { ApprovalStatusType as ApprovalStatus, ShariaStatus } from '@darnozom/shared-types';
import { PublishStatus } from '@darnozom/shared-types';
import type { IModuleContentSettings } from './modules.interface';

export interface Question {
  options: string[];
  correctOption: number;
  questionText: string;
}

export interface IContent {
  _id: string;
  courseId: string;
  moduleId: string;
  /** Current user's review for this content (detailed enrolled course). */
  userReview?: IUserReview | null;
  organizationId?: string;
  createdBy?: string;
  title: string;
  description?: string;
  type: CourseContentType;

  // Video-specific
  videoType?: VideoType;
  videoUrl?: string;
  fileKey?: string; // not just videos
  /** File size in bytes for subscription storage (VIDEO UPLOAD or ASSIGNMENT with file). */
  fileSizeBytes?: number;
  fileUrl?: string;
  mimeType?: string;

  // Article-specific
  body?: string;
  summary?: string;

  // Assignment-specific
  dueDate?: Date;
  maxPoints?: number;
  submissions?: {
    studentId: string;
    fileKey?: string;
    fileUrl?: string;
    fileSizeBytes?: number;
    mimeType?: string;
    content?: string;
    score?: number;
    feedback?: string;
    submittedAt?: Date | string;
  }[];

  authorization?: string;

  // Quiz-specific
  questions?: Question[];
  quizStartDate?: string;
  quizEndDate?: string;
  quizDurationInMinutes?: number;
  maxAttempts?: number;

  // Live session-specific
  startDate?: Date | string;
  endDate?: Date | string;
  /** How participants join: 'EXTERNAL_URL' (default) or 'AGORA'. */
  provider?: 'EXTERNAL_URL' | 'AGORA';
  meetingUrl?: string;
  agoraChannelName?: string;
  meetingId?: string;
  meetingPassword?: string;
  platform?: string;
  recordingUrl?: string;
  instructions?: string; // also for assignments
  recordedSession?: string;
  durationInMinutes?: number;

  createdAt: Date | string;

  content?: unknown;

  approvalStatus?: ApprovalStatus;
  approvalComment?: string | null;
  shariaStatus?: ShariaStatus;
  currentVersion?: number | null;
  pendingVersion?: number | null;
  publishStatus?: PublishStatus;
  publishedAt?: string | null;
  settings?: IModuleContentSettings;
}
