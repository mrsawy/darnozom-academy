import { Currency } from '@lms-organization/shared-types';
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
  gradeId?: string;
  /** Preferred multi filter (CSV string or array). OR match via $in. */
  schoolTypeIds?: string | string[];
  /** @deprecated Prefer schoolTypeIds; mapped to $in for old URLs. */
  schoolTypeId?: string;
  instructorId?: string;
}
