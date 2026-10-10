import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@/lib/utils';
import {
  DiscussionType,
  GetDiscussionsInput,
  CreateDiscussionInput,
  type DiscussionsResponse,
  type IDiscussion,
  type IDiscussionWithReplies,
} from '@/lib/types/discussion/discussion.types';
import { getDiscussions } from '@/lib/actions/discussion/getDiscussions.action';
import { createDiscussion } from '@/lib/actions/discussion/createDiscussion.action';
import { updateDiscussion } from '@/lib/actions/discussion/updateDiscussion.action';
import { deleteDiscussion } from '@/lib/actions/discussion/deleteDiscussion.action';
import { toggleLike } from '@/lib/actions/discussion/toggleLike.action';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import useUserStore from '@/lib/store/userStore';

type ToggleLikeSnapshot = [readonly unknown[], InfiniteData<DiscussionsResponse>][];

function toggleLikeOnDiscussion(
  item: IDiscussionWithReplies,
  targetId: string,
  userId: string
): IDiscussionWithReplies {
  if (item._id === targetId) {
    const liked = item.likedBy?.includes(userId) ?? false;
    const nextLikedBy = liked
      ? (item.likedBy ?? []).filter((id) => id !== userId)
      : [...(item.likedBy ?? []), userId];
    const delta = liked ? -1 : 1;
    return {
      ...item,
      likedBy: nextLikedBy,
      likesCount: Math.max(0, item.likesCount + delta),
    };
  }
  const replies = item.replies?.map((r) => toggleLikeOnDiscussion(r, targetId, userId));
  const children = item.children?.map((r) => toggleLikeOnDiscussion(r, targetId, userId));
  return {
    ...item,
    ...(replies === undefined ? {} : { replies }),
    ...(children === undefined ? {} : { children }),
  };
}

function mapInfiniteToggleLike(
  data: InfiniteData<DiscussionsResponse>,
  targetId: string,
  userId: string
): InfiniteData<DiscussionsResponse> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      docs: page.docs.map((d) => toggleLikeOnDiscussion(d, targetId, userId)),
    })),
  };
}

function mergeServerDiscussionIntoTree(
  item: IDiscussionWithReplies,
  server: IDiscussion
): IDiscussionWithReplies {
  if (item._id === server._id) {
    return {
      ...item,
      ...server,
      replies: item.replies,
      children: item.children,
    };
  }
  const replies = item.replies?.map((r) => mergeServerDiscussionIntoTree(r, server));
  const children = item.children?.map((r) => mergeServerDiscussionIntoTree(r, server));
  return {
    ...item,
    ...(replies === undefined ? {} : { replies }),
    ...(children === undefined ? {} : { children }),
  };
}

function mapInfiniteMergeServer(
  data: InfiniteData<DiscussionsResponse>,
  server: IDiscussion
): InfiniteData<DiscussionsResponse> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      docs: page.docs.map((d) => mergeServerDiscussionIntoTree(d, server)),
    })),
  };
}

interface UseDiscussionProps {
  type: DiscussionType;
  /** Always the course id (matches server `GetDiscussionsDto.entityId` and create DTO `courseId`). */
  entityId: string;
  /** Same as `entityId` when set; prefer passing both for clarity on module/content threads. */
  courseId?: string;
  moduleId?: string;
  contentId?: string;
  parentId?: string;
  enabled?: boolean;
}

export function useDiscussion({
  type,
  entityId,
  courseId: courseIdProp,
  moduleId,
  contentId,
  parentId,
  enabled = true,
}: UseDiscussionProps) {
  const t = useTranslations('StudentCourses.discussion');
  const queryClient = useQueryClient();
  const userId = useUserStore((s) => s.user?._id);
  const limit = 10;
  const resolvedCourseId = courseIdProp ?? entityId;
  const queryKey = ['discussions', type, resolvedCourseId, moduleId, contentId, parentId, limit];

  // Infinite Scroll Query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isError } =
    useInfiniteQuery<
      DiscussionsResponse,
      Error,
      InfiniteData<DiscussionsResponse>,
      readonly unknown[],
      number
    >({
      queryKey,
      queryFn: async ({ pageParam = 1 }) => {
        const input: GetDiscussionsInput = {
          type,
          entityId: resolvedCourseId,
          moduleId,
          contentId,
          parentId,
          page: pageParam,
          limit,
        };
        return getDiscussions(input);
      },
      getNextPageParam: (lastPage) => {
        const nextPage = lastPage.page + 1;
        const totalPages = Math.ceil(lastPage.totalDocs / limit);
        return nextPage <= totalPages ? nextPage : undefined;
      },
      initialPageParam: 1,
      enabled,
    });

  const discussions = data?.pages.flatMap((page) => page.docs) ?? [];
  const total = data?.pages[0]?.totalDocs ?? 0;

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const input: CreateDiscussionInput = {
        type,
        content,
        courseId: resolvedCourseId,
        moduleId,
        contentId,
        parentId,
      };
      return createDiscussion(input);
    },
    onSuccess: () => {
      toast.success(t('toasts.posted'));
      // Invalidate the query to refetch the list
      void queryClient.invalidateQueries({ queryKey });
      // Also invalidate parent query if this is a reply (to update reply count)
      if (parentId) {
        // This is tricky without knowing the parent's query key exactly (it might be in a different list)
        // But we can invalidate loosely or rely on the parent component triggering a refetch if it listens to something
        // For now, refetching the current list (replies) is enough for the user seeing the new reply.
        // If we want to update the parent's "reply count", we might need to invalidate the ROOT list too.
        void queryClient.invalidateQueries({
          queryKey: ['discussions', type, resolvedCourseId, moduleId, contentId, undefined],
        });
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : t('toasts.postFailed');
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return updateDiscussion(id, { content });
    },
    onSuccess: () => {
      toast.success(t('toasts.updated'));
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : t('toasts.updateFailed');
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteDiscussion(id);
    },
    onSuccess: () => {
      toast.success(t('toasts.deleted'));
      void queryClient.invalidateQueries({ queryKey });
      if (parentId) {
        void queryClient.invalidateQueries({
          queryKey: ['discussions', type, resolvedCourseId, moduleId, contentId, undefined],
        });
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : t('toasts.deleteFailed');
      toast.error(errorMessage);
    },
  });

  const discussionScopeKey = ['discussions', type, resolvedCourseId] as const;

  const toggleLikeMutation = useMutation({
    mutationFn: async (id: string) => toggleLike(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [...discussionScopeKey] });

      const previous: ToggleLikeSnapshot = [];

      if (userId) {
        const queries = queryClient.getQueriesData<InfiniteData<DiscussionsResponse>>({
          queryKey: [...discussionScopeKey],
        });

        for (const [key, data] of queries) {
          if (data) {
            previous.push([key, data]);
          }
          queryClient.setQueryData<InfiniteData<DiscussionsResponse>>(key, (old) =>
            old ? mapInfiniteToggleLike(old, id, userId) : old
          );
        }
      }

      return { previous };
    },
    onError: (error, _id, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      const errorMessage = error instanceof Error ? error.message : t('toasts.likeFailed');
      toast.error(errorMessage);
    },
    onSuccess: (serverDiscussion) => {
      queryClient.setQueriesData<InfiniteData<DiscussionsResponse>>(
        { queryKey: [...discussionScopeKey] },
        (old) => (old ? mapInfiniteMergeServer(old, serverDiscussion) : old)
      );
    },
  });

  return {
    discussions,
    total,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    createDiscussion: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateDiscussion: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteDiscussion: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    toggleLike: toggleLikeMutation.mutateAsync,
  };
}
