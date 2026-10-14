import type { ShariaStatus } from '@darnozom/shared-types';

export interface IShariaQueueItem {
  contentId: string;
  contentTitle: string;
  courseId: string;
  version: number;
  createdAt: string | null;
  createdBy: string | null;
  /** True when the live content is already approved and this version is a held-back edit. */
  isEdit: boolean;
}

export interface IContentVersion {
  _id: string;
  contentId: string;
  courseId: string;
  version: number;
  changes: Record<string, unknown>;
  createdBy: string | null;
  shariaStatus: ShariaStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
}
