'use client';

import { createReview } from '@/lib/actions/review/createReview.action';
import { enrollmentKeys } from '@/lib/hooks/enrollment/enrollments.hook';
import {
  detailedEnrolledCourseKeys,
  type DetailedEnrolledCourseData,
} from '@/lib/hooks/course/useDetailedEnrolledCourse';
import type { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import type { Paginated } from '@/lib/types/Paginated';
import type { IUserReview } from '@/lib/types/review/review.types';
import { CreateReviewInput, ReviewType } from '@/lib/types/review/review.types';
import { useMutation, useQueryClient } from '@/lib/utils';
import type { QueryClient, QueryKey } from '@/lib/utils';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';

export interface UpsertReviewVariables {
  input: CreateReviewInput;
  /** Course id for patching enrollment list and detailed course tree. */
  cacheCourseId: string;
  enrollmentId?: string;
}

export function normalizeUserReviewFromApi(raw: unknown): IUserReview | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { _id?: unknown; rating?: unknown; comment?: unknown };
  if (o._id == null || typeof o._id !== 'string') return null;
  if (o.rating == null || typeof o.rating !== 'number') return null;
  return {
    _id: o._id,
    rating: o.rating,
    comment: typeof o.comment === 'string' ? o.comment : undefined,
  };
}

function patchDetailedEnrolledCourse(
  old: DetailedEnrolledCourseData | undefined,
  input: CreateReviewInput,
  userReview: IUserReview
): DetailedEnrolledCourseData | undefined {
  if (!old) return old;
  const { course } = old;
  switch (input.reviewType) {
    case ReviewType.COURSE: {
      return { ...old, course: { ...course, userReview } };
    }
    case ReviewType.MODULE: {
      const id = input.moduleId;
      if (!id) return old;
      return {
        ...old,
        course: {
          ...course,
          modules: course.modules.map((m) => (m._id === id ? { ...m, userReview } : m)),
        },
      };
    }
    case ReviewType.CONTENT: {
      const id = input.contentId;
      if (!id) return old;
      return {
        ...old,
        course: {
          ...course,
          modules: course.modules.map((m) => ({
            ...m,
            contents: m.contents.map((c) => (c._id === id ? { ...c, userReview } : c)),
          })),
        },
      };
    }
    default: {
      return old;
    }
  }
}

function getExistingReviewId(
  queryClient: QueryClient,
  enrollmentId: string | undefined,
  input: CreateReviewInput,
  cacheCourseId: string
): string | undefined {
  if (enrollmentId) {
    const d = queryClient.getQueryData<DetailedEnrolledCourseData>(
      detailedEnrolledCourseKeys.detail(enrollmentId)
    );
    if (d) {
      const ur = readUserReviewFromDetailed(d, input);
      return ur?._id;
    }
  }
  const lists = queryClient.getQueriesData<Paginated<IEnrollment>>({
    queryKey: enrollmentKeys.student(),
  });
  for (const [, pag] of lists) {
    if (!pag?.docs) continue;
    for (const e of pag.docs) {
      if (e.course?._id === cacheCourseId && input.reviewType === ReviewType.COURSE) {
        return e.course.userReview?._id;
      }
    }
  }
  return undefined;
}

function readUserReviewFromDetailed(
  d: DetailedEnrolledCourseData,
  input: CreateReviewInput
): IUserReview | null | undefined {
  switch (input.reviewType) {
    case ReviewType.COURSE: {
      return d.course.userReview ?? null;
    }
    case ReviewType.MODULE: {
      const id = input.moduleId;
      if (!id) return undefined;
      return d.course.modules.find((m) => m._id === id)?.userReview ?? null;
    }
    case ReviewType.CONTENT: {
      const id = input.contentId;
      if (!id) return undefined;
      for (const m of d.course.modules) {
        const c = m.contents.find((x) => x._id === id);
        if (c) return c.userReview ?? null;
      }
      return null;
    }
    default: {
      return undefined;
    }
  }
}

export function applyUserReviewToQueryCaches(
  queryClient: QueryClient,
  params: {
    input: CreateReviewInput;
    userReview: IUserReview;
    cacheCourseId: string;
    enrollmentId?: string;
  }
) {
  const { input, userReview, cacheCourseId, enrollmentId } = params;

  if (input.reviewType === ReviewType.COURSE) {
    queryClient.setQueriesData<Paginated<IEnrollment>>(
      { queryKey: enrollmentKeys.student() },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          docs: old.docs.map((e) => {
            if (e.course?._id !== cacheCourseId) return e;
            return {
              ...e,
              course: e.course ? { ...e.course, userReview } : e.course,
            };
          }),
        };
      }
    );
  }

  if (enrollmentId) {
    queryClient.setQueryData<DetailedEnrolledCourseData>(
      detailedEnrolledCourseKeys.detail(enrollmentId),
      (old) => patchDetailedEnrolledCourse(old, input, userReview)
    );
  }
}

interface MutationContext {
  previousStudent: [QueryKey, unknown][];
  previousDetailed: DetailedEnrolledCourseData | undefined;
  enrollmentId: string | undefined;
}

export function useUpsertReview() {
  const queryClient = useQueryClient();
  const tErrors = useTranslations('errors');
  const tMutations = useTranslations('mutations');

  return useMutation<unknown, Error, UpsertReviewVariables, MutationContext>({
    mutationFn: async (vars) => createReview(vars.input),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: enrollmentKeys.student() });
      await queryClient.cancelQueries({ queryKey: detailedEnrolledCourseKeys.all });
      if (vars.enrollmentId) {
        await queryClient.cancelQueries({
          queryKey: detailedEnrolledCourseKeys.detail(vars.enrollmentId),
        });
      }

      const previousStudent = queryClient.getQueriesData({ queryKey: enrollmentKeys.student() });
      const previousDetailed = vars.enrollmentId
        ? queryClient.getQueryData<DetailedEnrolledCourseData>(
            detailedEnrolledCourseKeys.detail(vars.enrollmentId)
          )
        : undefined;

      const existingId =
        getExistingReviewId(queryClient, vars.enrollmentId, vars.input, vars.cacheCourseId) ??
        'pending';

      const optimistic: IUserReview = {
        _id: existingId,
        rating: vars.input.rating,
        comment: vars.input.comment,
      };

      applyUserReviewToQueryCaches(queryClient, {
        input: vars.input,
        userReview: optimistic,
        cacheCourseId: vars.cacheCourseId,
        enrollmentId: vars.enrollmentId,
      });

      return { previousStudent, previousDetailed, enrollmentId: vars.enrollmentId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousStudent) {
        for (const [key, data] of ctx.previousStudent) {
          queryClient.setQueryData(key, data);
        }
      }
      if (ctx?.enrollmentId) {
        queryClient.setQueryData(
          detailedEnrolledCourseKeys.detail(ctx.enrollmentId),
          ctx.previousDetailed
        );
      }
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('reviewSaveFailed'));
    },
    onSuccess: (data, vars) => {
      const normalized = normalizeUserReviewFromApi(data);
      if (!normalized) return;
      applyUserReviewToQueryCaches(queryClient, {
        input: vars.input,
        userReview: normalized,
        cacheCourseId: vars.cacheCourseId,
        enrollmentId: vars.enrollmentId,
      });
    },
  });
}
