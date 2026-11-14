import { Currency } from '@darnozom/shared-types';
import { BillingCycle } from '../enums/billingCycle.enum';
import { PaginateOptions } from 'mongoose';

export interface ICourseFilters extends PaginateOptions {
  maxPrice?: number;
  minPrice?: number;
  priceCurrency?: Currency;
  billingCycle?: BillingCycle;
  minRating?: number;
  minModules?: number;
  search?: string;
  selectedCategory?: string;
  /** Multi-select subject filter (comma-separated string or array of category ids). */
  categoryIds?: string | string[];
  /** Multi filter (CSV string or array). OR match via $in. */
  ageRangeIds?: string | string[];
  instructorId?: string;
}
