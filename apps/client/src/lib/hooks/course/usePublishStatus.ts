'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { PublishStatus } from '@lms-organization/shared-types';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { setCoursePublishStatus } from '@/lib/actions/courses/getCourses.action';
import { setModulePublishStatus } from '@/lib/actions/courses/modules.action';
import { setContentPublishStatus } from '@/lib/actions/courses/content/content.action';
import { modulesKeys } from '@/lib/hooks/course/useModules';
import { contentKeys } from '@/lib/hooks/course/content/useContent';

function usePublishStatusMutation<TParams extends { publishStatus: PublishStatus }>(
  mutationFn: (params: TParams) => Promise<unknown>,
  toastKeys: { published: string; unpublished: string },
  extraInvalidateQueryKeys: readonly (readonly unknown[])[] = []
) {
  const queryClient = useQueryClient();
  const t = useTranslations('PublishStatus.toasts');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn,
    onSuccess: (_, variables) => {
      const isPublished = variables.publishStatus === PublishStatus.PUBLISHED;
      toast.success(isPublished ? t(toastKeys.published) : t(toastKeys.unpublished));
      void queryClient.invalidateQueries({ queryKey: ['course'] });
      for (const queryKey of extraInvalidateQueryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: unknown) => {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useSetCoursePublishStatus() {
  return usePublishStatusMutation(
    ({ courseId, publishStatus }: { courseId: string; publishStatus: PublishStatus }) =>
      setCoursePublishStatus(courseId, publishStatus),
    { published: 'coursePublished', unpublished: 'courseUnpublished' }
  );
}

export function useSetModulePublishStatus() {
  return usePublishStatusMutation(
    ({ moduleId, publishStatus }: { moduleId: string; publishStatus: PublishStatus }) =>
      setModulePublishStatus(moduleId, publishStatus),
    { published: 'modulePublished', unpublished: 'moduleUnpublished' },
    [modulesKeys.all]
  );
}

export function useSetContentPublishStatus() {
  return usePublishStatusMutation(
    ({ contentId, publishStatus }: { contentId: string; publishStatus: PublishStatus }) =>
      setContentPublishStatus(contentId, publishStatus),
    { published: 'contentPublished', unpublished: 'contentUnpublished' },
    [contentKeys.all]
  );
}
