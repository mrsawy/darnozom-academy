import type { IContent } from '@/lib/types/course/content.interface';

/** Shape returned by `course.listContentsForOrganization` (mongoose-paginate). */
export interface ListOrganizationContentsResult {
  docs: IContent[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}
