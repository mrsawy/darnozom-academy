import { useQuery } from '@/lib/utils';
import { listContentsForOrganization } from '@/lib/actions/courses/content/content.action';
import type { ListOrganizationContentsResult } from '@/lib/types/course/organization-contents-list.types';
import { CourseContentType } from '@lms-organization/shared-types';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';

export const organizationContentsKeys = {
  all: ['organization-contents'] as const,
  list: (type: CourseContentType, page: number, limit: number) =>
    [...organizationContentsKeys.all, 'list', type, page, limit] as const,
};

export function useOrganizationContentsList(options: {
  type: CourseContentType;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  return useQuery<ListOrganizationContentsResult>({
    queryKey: organizationContentsKeys.list(options.type, page, limit),
    queryFn: async () =>
      throwIfNatsError(await listContentsForOrganization({ type: options.type, page, limit })),
    enabled: options.enabled ?? true,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
