'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

interface ToggleContentCompleteResponse {
  message: string;
  isCourseCompleted: boolean;
  completedModules: string[];
  completedContents: string[];
}

export type ToggleContentCompleteResult = ToggleContentCompleteResponse & {
  /** Whether `contentId` is in `completedContents` after the toggle. */
  isCompleted: boolean;
};

export const toggleContentComplete = async ({
  enrollmentId,
  contentId,
  completed,
}: {
  enrollmentId: string;
  contentId: string;
  completed: boolean;
}) => {
  const response = await createAuthorizedNatsRequest<ToggleContentCompleteResponse>(
    'enrollment.toggleContentComplete',
    {
      enrollmentId,
      contentId,
      completed,
    }
  );
  if ('err' in response) return response;
  const completedContents = response.completedContents.map(String);
  return {
    ...response,
    completedContents,
    completedModules: response.completedModules.map(String),
    isCompleted: completedContents.includes(contentId),
  };
};
