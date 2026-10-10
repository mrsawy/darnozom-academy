import { Model, Types, HydratedDocument } from 'mongoose';
import { Category } from '../entities/category.entity';
import { Course } from '../../course/entities/course.entity';
import { fakerAR as faker } from '@faker-js/faker';
import { ApprovalStatus } from '@lms-organization/shared-types';

export class CategorySeeder {
  constructor(private readonly categoryModel: Model<Category>) {}

  async seedCategory(
    organizationId: Types.ObjectId,
    name: string,
    description?: string,
    parentId?: Types.ObjectId | null,
    approvalStatus?: ApprovalStatus
  ) {
    const category = await this.categoryModel.create({
      organizationId,
      name,
      description: description ?? faker.lorem.sentence(),
      parentId: parentId ?? null,
      approvalStatus: approvalStatus ?? ApprovalStatus.APPROVED,
    });
    return category;
  }

  async seedCategoriesByName(organizationId: Types.ObjectId, categoryNames: string[]): Promise<Category[]> {
    const docs = categoryNames.map((name) => ({
      organizationId,
      name,
      description: faker.lorem.sentence(),
      parentId: null,
      approvalStatus: ApprovalStatus.APPROVED,
    }));
    const inserted = await this.categoryModel.insertMany(docs);
    return inserted as unknown as Category[];
  }

  async seedCategoriesMap(organizationId: Types.ObjectId, categoryNames: string[]): Promise<Map<string, Category>> {
    const categories = await this.seedCategoriesByName(organizationId, categoryNames);
    const categoryMap = new Map<string, Category>();
    for (const cat of categories) {
      categoryMap.set(cat.name, cat);
    }
    return categoryMap;
  }

  async getOrCreateCategories(organizationId: Types.ObjectId, categoryNames: string[]): Promise<HydratedDocument<Category>[]> {
    const categories: HydratedDocument<Category>[] = [];

    for (const name of categoryNames) {
      let category = await this.categoryModel.findOne({ organizationId, name }).exec();

      category ??= await this.seedCategory(organizationId, name);

      categories.push(category);
    }

    return categories;
  }

  /**
   * Updates coursesCount and instructorsCount for all categories belonging to an org.
   * Should be called after all courses for the org have been seeded.
   */
  async recalculateCategoryStats(organizationId: Types.ObjectId, courseModel: Model<Course>): Promise<void> {
    const categories = await this.categoryModel.find({ organizationId }).select('_id').lean();

    const bulkOps: Parameters<typeof this.categoryModel.bulkWrite>[0] = [];

    for (const cat of categories) {
      const catId = cat._id as Types.ObjectId;

      const [coursesCount, instructorIds] = await Promise.all([
        courseModel.countDocuments({ categoriesIds: catId }),
        courseModel
          .find({ categoriesIds: catId })
          .select('instructorId coInstructorsIds')
          .lean()
          .then((courses) => {
            const ids = new Set<string>();
            for (const c of courses) {
              if (c.instructorId) ids.add(c.instructorId.toString());
              for (const id of c.coInstructorsIds ?? []) ids.add(id.toString());
            }
            return ids.size;
          }),
      ]);

      bulkOps.push({
        updateOne: {
          filter: { _id: catId },
          update: { $set: { coursesCount, instructorsCount: instructorIds } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await this.categoryModel.bulkWrite(bulkOps);
    }
  }
}
