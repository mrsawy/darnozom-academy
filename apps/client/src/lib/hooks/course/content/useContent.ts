'use client';

import {
  createContent,
  deleteContentById,
  getContent,
  getContentsByModuleId,
  getSingleContentInEnrollment,
  updateContent,
} from '@/lib/actions/courses/content/content.action';
import { reorderModuleContents } from '@/lib/actions/courses/modules.action';
import { CourseContentFormData } from '@/lib/schema/content.schema';
import { IContent } from '@/lib/types/course/content.interface';
import type { IEnrollment, IEnrollmentProgress } from '@/lib/types/enrollment/enrollment.interface';
import { IModuleWithContents } from '@/lib/types/course/modules.interface';
import { toast } from 'react-toastify';
import { useRouter } from '@/i18n/navigation';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { toggleContentComplete } from '@/lib/actions/courses/toggleContentComplete.action';
import { CourseMessages } from '@lms-organization/shared-types';
import { useTranslations } from 'next-intl';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';
import { ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT } from '@/lib/data/constants/routes.constants';
import { organizationContentsKeys } from '@/lib/hooks/course/content/use-organization-contents-list';
import { modulesKeys } from '@/lib/hooks/course/useModules';
// import useGeneralStore from '../store/generalStore';

// Query keys
export const contentKeys = {
  all: ['content'] as const,
  module: (moduleId: string) => [...contentKeys.all, 'module', moduleId] as const,
  content: (contentId: string) => [...contentKeys.all, 'content', contentId] as const,
  course: (courseId: string) => [...contentKeys.all, 'course', courseId] as const,
  singleContentInEnrollment: (enrollmentId: string, contentId: string) =>
    [...contentKeys.all, 'singleContentInEnrollment', enrollmentId, contentId] as const,
};

export interface SingleContentInEnrollmentQueryData {
  enrollment: IEnrollment;
  content: IContent;
  progress: IEnrollmentProgress;
  /** False when course, module, or content has discussion disabled in settings. */
  discussionAllowed: boolean;
}

// Custom hook for fetching content by module ID
export function useContentByModule(moduleId: string) {
  return useQuery<IModuleWithContents>({
    queryKey: contentKeys.module(moduleId),
    queryFn: async () => throwIfNatsError(await getContentsByModuleId(moduleId)),
    enabled: !!moduleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for creating content
export function useCreateContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const tErrors = useTranslations('errors');
  const tMutations = useTranslations('mutations');

  return useMutation({
    mutationFn: async ({
      moduleId,
      courseId,
      contentData,
      fileKey,
    }: {
      moduleId: string;
      courseId: string;
      contentData: CourseContentFormData;
      fileKey?: string;
    }) => {
      return await createContent(moduleId, courseId, contentData, fileKey);
    },
    onSuccess: (data, variables) => {
      toast.success(tMutations('contentCreated'));
      void queryClient.invalidateQueries({ queryKey: contentKeys.module(variables.moduleId) });
      void queryClient.invalidateQueries({ queryKey: contentKeys.course(variables.courseId) });
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationContentsKeys.all });
      void queryClient.invalidateQueries({
        queryKey: modulesKeys.coursePrefix(variables.courseId),
      });
      void router.push(
        ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT(
          variables.courseId,
          variables.moduleId,
          data?._id ?? ''
        )
      );
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('contentCreateFailed'));
    },
  });
}
// Custom hook for fetching content by course ID
export function useContentByCourse(courseId: string) {
  return useQuery({
    queryKey: contentKeys.course(courseId),
    queryFn: async () => {
      // This would need to be implemented in the content actions
      // For now, we'll return an empty array
      return [];
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for fetching a single content item
export function useContent(contentId: string) {
  return useQuery({
    queryKey: contentKeys.content(contentId),
    queryFn: async () => throwIfNatsError(await getContent(contentId)),
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for updating content
export function useUpdateContent() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async ({
      contentId,
      updatedData,
    }: {
      contentId: string;
      updatedData: Partial<IContent>;
      courseId?: string;
      moduleId?: string;
    }) => {
      return await updateContent(contentId, updatedData);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.content(variables.contentId) });
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
      toast.success(tMutations('contentUpdated'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('contentUpdateFailed'));
    },
  });
}

// Custom hook for deleting content
export function useDeleteContent() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (contentId: string) => {
      return await deleteContentById(contentId);
    },
    onSuccess: (_data, contentId) => {
      void queryClient.removeQueries({ queryKey: contentKeys.content(contentId) });
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
      toast.success(tMutations('contentDeleted'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('contentDeleteFailed'));
    },
  });
}

// Custom hook for deleting multiple content items
export function useDeleteContents() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      await Promise.all(contentIds.map((id) => deleteContentById(id)));
    },
    onSuccess: (_data, contentIds) => {
      for (const contentId of contentIds) {
        void queryClient.removeQueries({ queryKey: contentKeys.content(contentId) });
      }
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
      toast.success(tMutations('contentsDeleted', { count: contentIds.length }));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('contentDeleteFailed'));
    },
  });
}

// Custom hook for reordering content within a module
export function useReorderContents(moduleId: string) {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      return await reorderModuleContents(moduleId, newOrder);
    },
    onSuccess: (_data, _newOrder) => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.module(moduleId) });
      toast.success(tMutations('contentOrderUpdated'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('contentOrderUpdateFailed'));
    },
  });
}

// Custom hook for getting a single content in an enrollment without the course data (by the student)
export function useSingleContentInEnrollment(enrollmentId: string, contentId: string) {
  return useQuery<SingleContentInEnrollmentQueryData>({
    queryKey: contentKeys.singleContentInEnrollment(enrollmentId, contentId),
    queryFn: () => getSingleContentInEnrollment(enrollmentId, contentId),
    enabled: !!enrollmentId && !!contentId,
  });
}

// Custom hook for toggling content completion
export function useToggleContentComplete() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      contentId,
      completed,
    }: {
      enrollmentId: string;
      contentId: string;
      completed: boolean;
      withToast?: boolean;
      withRefresh?: boolean;
    }) => {
      return await toggleContentComplete({ enrollmentId, contentId, completed });
    },
    onSuccess: (data, variables) => {
      const queryKey = contentKeys.singleContentInEnrollment(
        variables.enrollmentId,
        variables.contentId
      );
      const { completedContents, completedModules } = data;
      const hadCache = queryClient.getQueryData(queryKey) !== undefined;
      queryClient.setQueryData<SingleContentInEnrollmentQueryData | undefined>(queryKey, (old) => {
        if (!old) return old;
        const nextProgress: IEnrollmentProgress = {
          ...old.progress,
          completedContents,
          completedModules,
        };
        return {
          ...old,
          progress: nextProgress,
          enrollment: {
            ...old.enrollment,
            progress: old.enrollment.progress
              ? {
                  ...old.enrollment.progress,
                  completedContents,
                  completedModules,
                }
              : nextProgress,
          },
        };
      });
      if (!hadCache) {
        void queryClient.invalidateQueries({ queryKey });
      }
      if (variables.withRefresh) {
        globalThis.location.reload();
      }
      if (variables.withToast) {
        const message = tErrors(data.message ?? 'ContentCompletionToggledSuccessfully');
        toast.success(message);
      }
    },
    onError: (error) => {
      const raw =
        error instanceof Error ? error.message : CourseMessages.CONTENT_COMPLETION_TOGGLED_FAILED;
      const message = tErrors(raw ?? 'ContentCompletionToggledFailed');
      toast.error(message);
    },
  });
}

// Helper function to get content count for a module
export function useContentCount(moduleId: string): number {
  const { data: moduleData } = useContentByModule(moduleId);
  return moduleData?.contents?.length ?? 0;
}

// Helper function to get content count for a course
export function useContentCountByCourse(courseId: string) {
  const { data: content } = useContentByCourse(courseId);
  return content?.length ?? 0;
}
