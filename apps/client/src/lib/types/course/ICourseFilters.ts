import { BillingCycle } from './enum/BillingCycle.enum';
import { PaginationOptions } from '../Paginated';

export type ICourseFilters = PaginationOptions<{
  maxPrice?: number;
  minPrice?: number;
  priceCurrency?: string;
  billingCycle?: BillingCycle;
  minRating?: number;
  minModules?: number;
  searchCategories?: string;
  selectedCategory?: string;
  gradeId?: string;
  schoolTypeIds?: string[];
  /** @deprecated Prefer schoolTypeIds */
  schoolTypeId?: string;
}>;
