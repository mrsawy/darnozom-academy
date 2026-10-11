import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Category } from '../entities/category.entity';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { Roles } from '@darnozom/shared-types';
import {
  COURSE_CATEGORY_CHANGED_EVENT,
  INSTRUCTOR_CATEGORY_CHANGED_EVENT,
  CourseCategoryChangedEvent,
  InstructorCategoryChangedEvent,
} from './category-count.events';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';

@Injectable()
export class CategoryCountListener {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  @OnEvent(COURSE_CATEGORY_CHANGED_EVENT)
  async handleCourseCategoryChanged(event: CourseCategoryChangedEvent): Promise<void> {
    const { addedCategoryIds, removedCategoryIds } = event;

    const ops: Promise<unknown>[] = [];

    if (addedCategoryIds.length > 0) {
      ops.push(
        this.categoryModel.updateMany(
          { _id: { $in: addedCategoryIds.map((id) => convertObjectValuesToObjectId(id)) } },
          { $inc: { coursesCount: 1 } }
        )
      );
    }

    if (removedCategoryIds.length > 0) {
      ops.push(
        this.categoryModel.updateMany(
          { _id: { $in: removedCategoryIds.map((id) => convertObjectValuesToObjectId(id)) } },
          { $inc: { coursesCount: -1 } }
        )
      );
    }

    await Promise.all(ops);

    // Recompute instructorsCount for all affected categories
    const affectedCategoryIds = [...new Set([...addedCategoryIds, ...removedCategoryIds])];
    if (affectedCategoryIds.length > 0) {
      await this.recomputeInstructorsCount(affectedCategoryIds);
    }
  }

  @OnEvent(INSTRUCTOR_CATEGORY_CHANGED_EVENT)
  async handleInstructorCategoryChanged(event: InstructorCategoryChangedEvent): Promise<void> {
    const affectedCategoryIds = [...new Set([...event.addedCategoryIds, ...event.removedCategoryIds])];
    if (affectedCategoryIds.length > 0) {
      await this.recomputeInstructorsCount(affectedCategoryIds);
    }
  }

  private async recomputeInstructorsCount(categoryIds: string[]): Promise<void> {
    const objectIds = categoryIds.map((id) => convertObjectValuesToObjectId(id));

    // Collect instructor IDs per category from two sources and union them.

    // Source 1: instructors referenced by courses in that category
    const fromCourses = await this.courseModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      instructors: mongoose.Types.ObjectId[];
    }>([
      { $match: { categoriesIds: { $in: objectIds } } },
      { $unwind: '$categoriesIds' },
      { $match: { categoriesIds: { $in: objectIds } } },
      { $group: { _id: '$categoriesIds', instructors: { $addToSet: '$instructorId' } } },
    ]);

    // Source 2: instructor users whose profile categoriesIds include the category
    const fromUsers = await this.userModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      instructors: mongoose.Types.ObjectId[];
    }>([
      { $match: { roleName: Roles.INSTRUCTOR, categoriesIds: { $in: objectIds } } },
      { $unwind: '$categoriesIds' },
      { $match: { categoriesIds: { $in: objectIds } } },
      { $group: { _id: '$categoriesIds', instructors: { $addToSet: '$_id' } } },
    ]);

    // Build a map: categoryId → Set of unique instructor IDs (string)
    const instructorSets = new Map<string, Set<string>>();
    for (const { _id, instructors } of fromCourses) {
      const key = _id.toString();
      if (!instructorSets.has(key)) instructorSets.set(key, new Set());
      for (const id of instructors) instructorSets.get(key)!.add(id.toString());
    }
    for (const { _id, instructors } of fromUsers) {
      const key = _id.toString();
      if (!instructorSets.has(key)) instructorSets.set(key, new Set());
      for (const id of instructors) instructorSets.get(key)!.add(id.toString());
    }

    const bulkOps = objectIds.map((catId) => ({
      updateOne: {
        filter: { _id: catId },
        update: { $set: { instructorsCount: instructorSets.get(catId.toString())?.size ?? 0 } },
      },
    }));

    if (bulkOps.length > 0) {
      await this.categoryModel.bulkWrite(bulkOps);
    }
  }
}
