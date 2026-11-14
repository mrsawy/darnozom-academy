import { PaginationOptions } from '../Paginated';

export type IInstructorFilters = PaginationOptions<{
  search?: string;
  minRating?: number;
  /** Subject filter — the selected category id (surfaced as "Subject" in the UI). */
  selectedCategory?: string;
  /** Age range ids the instructor teaches (multi-select). */
  ageRangeIds?: string[];
}>;
