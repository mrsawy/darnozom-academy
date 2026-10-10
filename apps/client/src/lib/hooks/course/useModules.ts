'use client';

import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import {
  getCourseWithModules,
  createCourseModule,
  updateModule,
  deleteModule,
  deleteModules,
  getModule,
  reorderCourseModules,
} from '@/lib/actions/courses/modules.action';
import { CreateModuleSchema, UpdateModuleSchema } from '@/lib/schema/module.schema';
import { toast } from 'react-toastify';
import useGeneralStore from '@/lib/store/generalStore';
import { useTranslations } from 'next-intl';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';

// Query keys
export const modulesKeys = {
  all: ['modules'] as const,
  /** Use for invalidate/remove so both approved-only and all-modules queries refresh */
  coursePrefix: (courseId: string) => [...modulesKeys.all, 'course', courseId] as const,
  course: (courseId: string, requireApproved = false) =>
    [...modulesKeys.coursePrefix(courseId), requireApproved] as const,
  module: (moduleId: string) => [...modulesKeys.all, 'module', moduleId] as const,
};

// Custom hook for fetching modules by course ID
export function useModules(courseId: string, requireApproved = false) {
  return useQuery({
    queryKey: modulesKeys.course(courseId, requireApproved),
    queryFn: async () => {
      const response = await getCourseWithModules(courseId, requireApproved);
      if (response == null) return [];
      const course = throwIfNatsError(response);
      return course.modules ?? [];
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
// Custom hook for deleting a single module
export function useDeleteModule(courseId: string) {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation<unknown, Error, string>({
    mutationFn: async (moduleId: string) => {
      useGeneralStore.setState({ generalIsLoading: true });
      return await deleteModule(moduleId);
    },
    onSuccess: () => {
      void queryClient.removeQueries({ queryKey: modulesKeys.coursePrefix(courseId) });
      void queryClient.invalidateQueries({ queryKey: modulesKeys.coursePrefix(courseId) });
      toast.success(tMutations('moduleDeleted'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('moduleDeleteFailed'));
    },
    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
  });
}

// Custom hook for creating a module
export function useCreateModule() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation<unknown, Error, { courseId: string; moduleData: CreateModuleSchema }>({
    mutationFn: async ({
      courseId,
      moduleData,
    }: {
      courseId: string;
      moduleData: CreateModuleSchema;
    }) => {
      return await createCourseModule({ ...moduleData, courseId });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: modulesKeys.coursePrefix(variables.courseId),
      });
      toast.success(tMutations('moduleCreated'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('moduleCreateFailed'));
    },
  });
}

// Custom hook for fetching a single module
export function useModule(moduleId: string) {
  return useQuery({
    queryKey: modulesKeys.module(moduleId),
    queryFn: async () => throwIfNatsError(await getModule(moduleId)),
    enabled: !!moduleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for updating a module
export function useUpdateModule() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation<unknown, Error, { moduleId: string; updateData: UpdateModuleSchema }>({
    mutationFn: async ({
      moduleId,
      updateData,
    }: {
      moduleId: string;
      updateData: UpdateModuleSchema;
    }) => {
      return await updateModule(moduleId, updateData);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: modulesKeys.module(variables.moduleId) });
      void queryClient.invalidateQueries({ queryKey: modulesKeys.all });
      toast.success(tMutations('moduleUpdated'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('moduleUpdateFailed'));
    },
  });
}

// Custom hook for deleting multiple modules
export function useDeleteModules() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation<unknown, Error, string[]>({
    mutationFn: async (moduleIds: string[]) => {
      return await deleteModules(moduleIds);
    },
    onSuccess: (_data, moduleIds) => {
      for (const moduleId of moduleIds) {
        void queryClient.removeQueries({ queryKey: modulesKeys.module(moduleId) });
      }
      void queryClient.invalidateQueries({ queryKey: modulesKeys.all });
      toast.success(tMutations('modulesDeleted', { count: moduleIds.length }));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('moduleDeleteFailed'));
    },
  });
}

// Custom hook for reordering modules
export function useReorderModules(courseId: string) {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      return await reorderCourseModules(courseId, newOrder);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modulesKeys.coursePrefix(courseId) });
      toast.success(tMutations('moduleOrderUpdated'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('moduleOrderUpdateFailed'));
    },
  });
}

// Helper function to get module count for a course
export function useModuleCount(courseId: string) {
  const { data: modules } = useModules(courseId);
  return modules?.length ?? 0;
}
