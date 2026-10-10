import { PaginateOptions } from 'mongoose';

export interface PaginateOptionsWithSearch extends PaginateOptions {
  search?: string;
  courseIds?: string[];
}
