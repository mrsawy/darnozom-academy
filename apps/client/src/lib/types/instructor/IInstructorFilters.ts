import { PaginationOptions } from '../Paginated';

export type IInstructorFilters = PaginationOptions<{
  search?: string;
  minRating?: number;
  /** Subject filter — the selected category id (surfaced as "Subject" in the UI). */
  selectedCategory?: string;
  /** Grade ids the instructor teaches (multi-select). */
  gradeIds?: string[];
  /** School-type ids the instructor teaches (multi-select). */
  schoolTypeIds?: string[];
}>;
