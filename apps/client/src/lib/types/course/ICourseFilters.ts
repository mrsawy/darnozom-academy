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
  ageRangeIds?: string[];
}>;
