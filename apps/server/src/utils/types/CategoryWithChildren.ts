import { Category } from 'src/category/entities/category.entity';

export interface CategoryWithChildren extends Category {
  childCategories: CategoryWithChildren[];
}
