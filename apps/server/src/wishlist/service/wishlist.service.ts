import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel, PaginateOptions, Model, RootFilterQuery } from 'mongoose';
import { CreateWishlistDto } from '../dto/create-wishlist.dto';
import { CreateBulkWishlistDto } from '../dto/create-bulk-wishlist.dto';
import { GetWishlistDto } from '../dto/get-wishlist.dto';
import { Wishlist } from '../entities/wishlist.entity';
import { convertToObjectId } from '../../utils/ObjectId.utils';
import { Course } from '../../course/entities/course.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name)
    private readonly wishlistModel: PaginateModel<Wishlist>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>
  ) {}

  async create(createWishlistDto: CreateWishlistDto & { userId: string }) {
    const courseId = convertToObjectId(createWishlistDto.courseId);
    const userId = convertToObjectId(createWishlistDto.userId);

    // Check if course exists
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if wishlist item already exists
    const existingWishlist = await this.wishlistModel.findOne({
      userId,
      courseId,
      isActive: true,
    });

    if (existingWishlist) {
      throw new BadRequestException('Course is already in your wishlist');
    }

    // If exists but inactive, reactivate it
    const inactiveWishlist = await this.wishlistModel.findOne({
      userId,
      courseId,
      isActive: false,
    });

    if (inactiveWishlist) {
      inactiveWishlist.isActive = true;
      return await inactiveWishlist.save();
    }

    // Create new wishlist item
    const wishlist = new this.wishlistModel({
      userId,
      courseId,
      isActive: true,
    });

    return await wishlist.save();
  }

  async findAll(getWishlistDto: GetWishlistDto & { userId: string }) {
    const filter: RootFilterQuery<Wishlist> = {
      userId: convertToObjectId(getWishlistDto.userId),
    };

    if (getWishlistDto.courseId) {
      filter.courseId = convertToObjectId(getWishlistDto.courseId);
    }

    filter.isActive = getWishlistDto.isActive ?? true; // Default to active items

    const options: PaginateOptions = {
      page: getWishlistDto.page ?? 1,
      limit: getWishlistDto.limit ?? 10,
      populate: [
        { path: 'course', select: '-__v' },
        { path: 'user', select: 'firstName lastName email' },
      ],
      sort: { createdAt: -1 },
    };

    return await this.wishlistModel.paginate(filter, options);
  }

  async findOne(id: string, userId: string) {
    const wishlist = await this.wishlistModel.findById(convertToObjectId(id)).populate('course').populate('user', 'firstName lastName email');

    if (!wishlist) {
      throw new NotFoundException('Wishlist item not found');
    }

    // Verify that the wishlist belongs to the user
    if (wishlist.userId.toString() !== convertToObjectId(userId).toString()) {
      throw new NotFoundException('Wishlist item not found');
    }

    return wishlist;
  }

  async findByUserAndCourse(userId: string, courseId: string) {
    return await this.wishlistModel.findOne({
      userId: convertToObjectId(userId),
      courseId: convertToObjectId(courseId),
    });
  }

  async remove(id: string) {
    const wishlist = await this.wishlistModel.findById(convertToObjectId(id));

    if (!wishlist) {
      throw new NotFoundException('Wishlist item not found');
    }

    // Soft delete by setting isActive to false
    wishlist.isActive = false;
    return await wishlist.save();
  }

  async removeByUserAndCourse(userId: string, courseId: string) {
    const wishlist = await this.wishlistModel.findOne({
      userId: convertToObjectId(userId),
      courseId: convertToObjectId(courseId),
      isActive: true,
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist item not found');
    }

    // Soft delete by setting isActive to false
    wishlist.isActive = false;
    return await wishlist.save();
  }

  async createMany(createBulkWishlistDto: CreateBulkWishlistDto & { userId: string }) {
    const userId = convertToObjectId(createBulkWishlistDto.userId);
    const courseIds = createBulkWishlistDto.courseIds.map((id) => convertToObjectId(id));

    // Validate that all courses exist
    const courses = await this.courseModel.find({
      _id: { $in: courseIds },
    });

    if (courses.length !== courseIds.length) {
      const foundCourseIds = new Set(courses.map((c) => String(c._id)));
      const missingCourseIds = courseIds.filter((id) => !foundCourseIds.has(String(id))).map(String);
      throw new NotFoundException(`Some courses not found: ${missingCourseIds.join(', ')}`);
    }

    // Find existing wishlist items (both active and inactive)
    const existingWishlists = await this.wishlistModel.find({
      userId,
      courseId: { $in: courseIds },
    });

    const existingCourseIds = new Set(existingWishlists.map((w) => String(w.courseId)));
    const inactiveWishlists = existingWishlists.filter((w) => !w.isActive);

    // Reactivate inactive wishlist items
    if (inactiveWishlists.length > 0) {
      const inactiveIds = inactiveWishlists.map((w) => w._id);
      await this.wishlistModel.updateMany({ _id: { $in: inactiveIds } }, { $set: { isActive: true } });
    }

    // Find course IDs that need new wishlist items created
    const newCourseIds = courseIds.filter((id) => !existingCourseIds.has(String(id)));

    // Create new wishlist items in bulk
    if (newCourseIds.length > 0) {
      const newWishlists = newCourseIds.map((courseId) => ({
        userId,
        courseId,
        isActive: true,
      }));

      await this.wishlistModel.insertMany(newWishlists);
    }

    // Return all wishlist items (reactivated + newly created)
    const allWishlists = await this.wishlistModel.find({
      userId,
      courseId: { $in: courseIds },
      isActive: true,
    });

    return allWishlists;
  }
}
