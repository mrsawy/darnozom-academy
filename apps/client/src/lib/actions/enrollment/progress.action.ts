'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { IContentProgressItem } from '@/lib/types/enrollment/enrollment.interface';

interface RecordContentAccessResponse {
  progress: IContentProgressItem;
  enrollment: { lastAccessedAt: string; timeSpentMinutes: number };
}

export async function recordContentAccess({
  enrollmentId,
  contentId,
  contentTitle,
  contentType,
  videoPositionSeconds,
}: {
  enrollmentId: string;
  contentId: string;
  contentTitle?: string;
  contentType?: string;
  videoPositionSeconds?: number;
}) {
  return createAuthorizedNatsRequest<RecordContentAccessResponse>(
    'enrollment.recordContentAccess',
    {
      enrollmentId,
      contentId,
      contentTitle,
      contentType,
      videoPositionSeconds,
    }
  );
}

export async function recordTimeSpent({
  enrollmentId,
  contentId,
  additionalMinutes,
}: {
  enrollmentId: string;
  contentId: string;
  additionalMinutes: number;
}) {
  const enrollment = await createAuthorizedNatsRequest<{ timeSpentMinutes: number }>(
    'enrollment.recordTimeSpent',
    {
      enrollmentId,
      contentId,
      additionalMinutes,
    }
  );
  return enrollment;
}

export async function updateVideoProgress({
  enrollmentId,
  contentId,
  positionSeconds,
}: {
  enrollmentId: string;
  contentId: string;
  positionSeconds: number;
}) {
  return createAuthorizedNatsRequest<{ videoLastPositionSeconds: number }>(
    'enrollment.updateVideoProgress',
    {
      enrollmentId,
      contentId,
      positionSeconds,
    }
  );
}

export async function getContentProgress({
  enrollmentId,
  contentId,
}: {
  enrollmentId: string;
  contentId: string;
}) {
  return createAuthorizedNatsRequest<IContentProgressItem | null>('enrollment.getContentProgress', {
    enrollmentId,
    contentId,
  });
}
