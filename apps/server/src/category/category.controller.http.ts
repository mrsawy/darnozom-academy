import { Controller, Get, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PaginateOptionsWithSearch } from '../utils/types/PaginateOptionsWithSearch';

@Controller('category')
export class CategoryHttpController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('/filtered')
  async getFilteredCategories(@Query() payload: PaginateOptionsWithSearch) {
    // Always forward page/limit. Dropping `page` on empty search caused every
    // infinite-query page request to re-fetch page 1 (duplicate keys + fetch loop).
    return await this.categoryService.getAllFlat(
      {
        ...payload,
        search: payload.search?.trim() ? payload.search.trim() : undefined,
        limit: payload.limit ?? 10,
        page: payload.page ?? 1,
      },
      undefined,
      true
    );
  }
}
