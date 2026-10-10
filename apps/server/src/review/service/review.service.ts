import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateModel, PaginateOptions, RootFilterQuery, Types } from 'mongoose';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { GetReviewsDto } from '../dto/get-reviews.dto';
import { Review } from '../entities/review.entity';
import { ReviewType } from '../enum/reviewType.enum';
import { convertObjectValuesToObjectId, convertToObjectId } from 'src/utils/ObjectId.utils';
import { User } from 'src/user/entities/user.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { Course } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private reviewModel: Model<Review> & PaginateModel<Review>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Organization.name)
    private organizationModel: Model<Organization>,
    @InjectModel(Course.name)
    private courseModel: Model<Course>,
    @InjectModel('CourseModule')
    private courseModuleModel: Model<CourseModuleEntity>,
    @InjectModel(CourseContent.name)
    private courseContentModel: Model<CourseContent>,
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<Enrollment>
  ) {}

  async create(createReviewDto: CreateReviewDto & { userId: string }) {
    for (const key in createReviewDto) {
      const value = createReviewDto[key as keyof typeof createReviewDto];
      if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
        (createReviewDto as unknown as Record<string, unknown>)[key] = convertToObjectId(value);
      }
    }
    const { reviewType, ...baseData } = createReviewDto;
    let modelToUse: Model<Review> & PaginateModel<Review> = this.reviewModel;
    if (this.reviewModel.discriminators?.[reviewType]) {
      modelToUse = this.reviewModel.discriminators[reviewType] as Model<Review> & PaginateModel<Review>;
    }
    await this.requireEnrollmentForReview(createReviewDto);

    const filter = this.buildReviewFilter(createReviewDto);
    const existingReview = await this.reviewModel.findOne(filter);

    let savedReview: Review | null;
    if (existingReview) {
      savedReview = await modelToUse.findByIdAndUpdate(
        existingReview._id,
        {
          $set: {
            rating: baseData.rating,
            comment: baseData.comment,
          },
        },
        { new: true }
      );

      // Update entity ratings based on review type
      await this.updateEntityRatings(reviewType, createReviewDto);
    } else {
      const review = new modelToUse(createReviewDto);
      savedReview = await review.save();

      // Update entity ratings based on review type
      await this.updateEntityRatings(reviewType, createReviewDto);
    }

    return savedReview;
  }

  async findAll(getReviewsDto: GetReviewsDto) {
    const { page = 1, limit = 10, minRating, maxRating, ...filters } = getReviewsDto;

    const query: PaginateOptions & RootFilterQuery<Review> = convertObjectValuesToObjectId({ ...filters, page, limit, isActive: true });

    // Rating range filter
    if (minRating || maxRating) {
      const ratingFilter: { $gte?: number; $lte?: number } = {};
      if (minRating) ratingFilter.$gte = minRating;
      if (maxRating) ratingFilter.$lte = maxRating;
      query.rating = ratingFilter;
    }

    const options: PaginateOptions = {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [{ path: 'user', select: 'username email firstName lastName avatar' }],
    };

    return await this.reviewModel.paginate(query, options);
  }

  async findOne(id: string) {
    const review = await this.reviewModel.findById(id).populate('user', 'username email firstName lastName avatar').exec();

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Populate additional fields based on review type
    switch (review.reviewType as ReviewType) {
      case ReviewType.COURSE: {
        await review.populate('course', 'name thumbnailKey');
        await review.populate('enrollment');

        break;
      }
      case ReviewType.INSTRUCTOR: {
        await review.populate('instructor', 'username firstName lastName avatar');
        const reviewDoc = review.toObject();
        if ('courseId' in reviewDoc && reviewDoc.courseId) {
          await review.populate('course', 'name thumbnailKey');
        }

        break;
      }
      case ReviewType.ORGANIZATION: {
        await review.populate('reviewedOrganization', 'name logo');

        break;
      }
      case ReviewType.MODULE: {
        await review.populate('module', 'title');

        break;
      }
      case ReviewType.CONTENT: {
        await review.populate('content', 'title');

        break;
      }
      // No default
    }

    return review;
  }

  async findOwn(
    userId: string,
    filters: {
      reviewType: ReviewType;
      courseId?: string;
      moduleId?: string;
      contentId?: string;
      instructorId?: string;
      reviewedOrganizationId?: string;
    }
  ) {
    // Convert string IDs to ObjectIds
    const query: RootFilterQuery<Review> = {
      userId: convertToObjectId(userId),
      reviewType: filters.reviewType,
      isActive: true,
    };

    // Add entity-specific filters
    if (filters.courseId) {
      (query as Record<string, unknown>).courseId = convertToObjectId(filters.courseId);
    }
    if (filters.moduleId) {
      (query as Record<string, unknown>).moduleId = convertToObjectId(filters.moduleId);
    }
    if (filters.contentId) {
      (query as Record<string, unknown>).contentId = convertToObjectId(filters.contentId);
    }
    if (filters.instructorId) {
      (query as Record<string, unknown>).instructorId = convertToObjectId(filters.instructorId);
    }
    if (filters.reviewedOrganizationId) {
      (query as Record<string, unknown>).reviewedOrganizationId = convertToObjectId(filters.reviewedOrganizationId);
    }

    const review = await this.reviewModel.findOne(query).exec();
    return review; // Returns null if not found
  }

  /** Lean shape for client: current user's review on an entity. */
  private toUserReviewPayload(doc: { _id: Types.ObjectId; rating: number; comment?: string }): {
    _id: string;
    rating: number;
    comment?: string;
  } {
    return {
      _id: doc._id.toString(),
      rating: doc.rating,
      comment: doc.comment,
    };
  }

  /**
   * Batch-load COURSE reviews for a user for many course ids (enrollment list).
   */
  async findUserCourseReviews(userId: string, courseIds: string[]): Promise<Map<string, { _id: string; rating: number; comment?: string }>> {
    const map = new Map<string, { _id: string; rating: number; comment?: string }>();
    if (courseIds.length === 0) return map;

    const docs = await this.reviewModel
      .find({
        userId: convertToObjectId(userId),
        reviewType: ReviewType.COURSE,
        isActive: true,
        courseId: { $in: courseIds.map((id) => convertToObjectId(id)) },
      })
      .select('_id rating comment courseId')
      .lean()
      .exec();

    for (const r of docs) {
      const row = r as {
        _id: Types.ObjectId;
        rating: number;
        comment?: string;
        courseId?: Types.ObjectId;
      };
      const cid = row.courseId?.toString();
      if (cid) {
        map.set(cid, this.toUserReviewPayload(row));
      }
    }
    return map;
  }

  /**
   * Mutates the aggregated course tree in place: sets `userReview` on course, each module, each content.
   */
  async attachUserReviewsToCourseTree(userId: string, course: Record<string, unknown>): Promise<void> {
    const courseIdRaw = course._id;
    const courseId = courseIdRaw ? String(courseIdRaw) : '';
    if (!courseId) return;

    const modules = (course.modules as Record<string, unknown>[]) ?? [];
    const moduleIds: string[] = [];
    const contentIds: string[] = [];
    for (const m of modules) {
      if (m._id) moduleIds.push(String(m._id));
      const contents = (m.contents as Record<string, unknown>[]) ?? [];
      for (const c of contents) {
        if (c._id) contentIds.push(String(c._id));
      }
    }

    const orConditions: RootFilterQuery<Review>[] = [
      {
        reviewType: ReviewType.COURSE,
        courseId: convertToObjectId(courseId),
      } as RootFilterQuery<Review>,
      ...(moduleIds.length > 0
        ? ([
            {
              reviewType: ReviewType.MODULE,
              moduleId: { $in: moduleIds.map((id) => convertToObjectId(id)) },
            } as RootFilterQuery<Review>,
          ] as RootFilterQuery<Review>[])
        : []),
      ...(contentIds.length > 0
        ? ([
            {
              reviewType: ReviewType.CONTENT,
              contentId: { $in: contentIds.map((id) => convertToObjectId(id)) },
            } as RootFilterQuery<Review>,
          ] as RootFilterQuery<Review>[])
        : []),
    ];

    const reviews = await this.reviewModel
      .find({
        userId: convertToObjectId(userId),
        isActive: true,
        $or: orConditions,
      })
      .select('_id rating comment reviewType courseId moduleId contentId')
      .lean()
      .exec();

    interface LeanRef {
      _id: Types.ObjectId;
      rating: number;
      comment?: string;
      reviewType: ReviewType;
      courseId?: Types.ObjectId;
      moduleId?: Types.ObjectId;
      contentId?: Types.ObjectId;
    }

    const byCourse = (reviews as LeanRef[]).find((r) => r.reviewType === ReviewType.COURSE && String(r.courseId) === courseId);
    course.userReview = byCourse ? this.toUserReviewPayload(byCourse) : null;

    const moduleById = new Map<string, { _id: string; rating: number; comment?: string }>();
    const contentById = new Map<string, { _id: string; rating: number; comment?: string }>();
    for (const r of reviews as LeanRef[]) {
      if (r.reviewType === ReviewType.MODULE && r.moduleId) {
        moduleById.set(String(r.moduleId), this.toUserReviewPayload(r));
      }
      if (r.reviewType === ReviewType.CONTENT && r.contentId) {
        contentById.set(String(r.contentId), this.toUserReviewPayload(r));
      }
    }

    for (const m of modules) {
      const mid = m._id ? String(m._id) : '';
      m.userReview = mid ? (moduleById.get(mid) ?? null) : null;
      const contents = (m.contents as Record<string, unknown>[]) ?? [];
      for (const c of contents) {
        const cid = c._id ? String(c._id) : '';
        c.userReview = cid ? (contentById.get(cid) ?? null) : null;
      }
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const oldRating = review.rating;
    const reviewType = review.reviewType as ReviewType;

    // Use the appropriate discriminator model for update
    let modelToUse: Model<Review> & PaginateModel<Review> = this.reviewModel;
    if (this.reviewModel.discriminators?.[review.reviewType]) {
      modelToUse = this.reviewModel.discriminators[review.reviewType] as Model<Review> & PaginateModel<Review>;
    }

    const updatedReview = await modelToUse.findByIdAndUpdate(id, { $set: updateReviewDto }, { new: true, runValidators: true });

    // Update entity ratings if rating changed
    if (updateReviewDto.rating !== undefined && updateReviewDto.rating !== oldRating) {
      const reviewDoc = review.toObject() as unknown as Review & Record<string, unknown>;
      await this.updateEntityRatingsFromReview(reviewType, reviewDoc);
    }

    return updatedReview;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const reviewType = review.reviewType as ReviewType;
    const reviewDoc = review.toObject() as unknown as Review & Record<string, unknown>;

    await this.reviewModel.findByIdAndUpdate(id, { isActive: false }, { new: true });

    // Update entity ratings based on review type
    await this.updateEntityRatingsFromReview(reviewType, reviewDoc);

    return { message: 'Review deleted successfully', review };
  }

  async getAverageRatingDetails(filter: Partial<GetReviewsDto>) {
    const query: {
      isActive: boolean;
      reviewType?: ReviewType;
      courseId?: string;
      instructorId?: string;
      reviewedOrganizationId?: string;
      moduleId?: string;
      contentId?: string;
    } = { isActive: true };

    if (filter.reviewType) {
      query.reviewType = filter.reviewType;
    }

    if (filter.courseId) {
      query.courseId = filter.courseId;
    }

    if (filter.instructorId) {
      query.instructorId = filter.instructorId;
    }

    if (filter.reviewedOrganizationId) {
      query.reviewedOrganizationId = filter.reviewedOrganizationId;
    }

    if (filter.moduleId) {
      query.moduleId = filter.moduleId;
    }

    if (filter.contentId) {
      query.contentId = filter.contentId;
    }

    interface AggregateResult {
      _id: null;
      averageRating: number;
      totalReviews: number;
      ratingDistribution: number[];
    }

    const result = await this.reviewModel.aggregate<AggregateResult>([
      { $match: query },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution: Record<number, number> = {};
    for (const rating of result[0].ratingDistribution) {
      distribution[rating] = (distribution[rating] ?? 0) + 1;
    }

    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews,
      ratingDistribution: {
        1: distribution[1] || 0,
        2: distribution[2] || 0,
        3: distribution[3] || 0,
        4: distribution[4] || 0,
        5: distribution[5] || 0,
      },
    };
  }

  /**
   * Ensures the user has a valid enrollment before creating/updating a review.
   * Required for: course, module, content, instructor, and organization reviews.
   */
  private async requireEnrollmentForReview(dto: CreateReviewDto & { userId: string }) {
    const userId = convertToObjectId(dto.userId);

    switch (dto.reviewType) {
      case ReviewType.COURSE: {
        if (!dto.courseId) return;
        const enrollment = await this.enrollmentModel.findOne({
          userId,
          courseId: convertToObjectId(dto.courseId),
        });
        if (!enrollment) {
          throw new BadRequestException('You must be enrolled in this course to review it.');
        }
        return;
      }
      case ReviewType.MODULE: {
        if (!dto.moduleId) return;
        const module = await this.courseModuleModel.findById(dto.moduleId).select('courseId').lean().exec();
        if (!module?.courseId) {
          throw new NotFoundException('Module not found');
        }
        const enrollment = await this.enrollmentModel.findOne({
          userId,
          courseId: module.courseId,
        });
        if (!enrollment) {
          throw new BadRequestException('You must be enrolled in the course to review this module.');
        }
        return;
      }
      case ReviewType.CONTENT: {
        if (!dto.contentId) return;
        const content = await this.courseContentModel.findById(dto.contentId).select('courseId').lean().exec();
        if (!content?.courseId) {
          throw new NotFoundException('Content not found');
        }
        const enrollment = await this.enrollmentModel.findOne({
          userId,
          courseId: content.courseId,
        });
        if (!enrollment) {
          throw new BadRequestException('You must be enrolled in the course to review this content.');
        }
        return;
      }
      case ReviewType.INSTRUCTOR: {
        if (!dto.instructorId) return;
        const instructorId = convertToObjectId(dto.instructorId);
        const courses = await this.courseModel
          .find({
            $or: [{ instructorId }, { coInstructorsIds: instructorId }],
          })
          .select('_id')
          .lean()
          .exec();
        const courseIds = courses.map((c) => c._id);
        if (courseIds.length === 0) {
          throw new NotFoundException('No courses found for this instructor');
        }
        const enrollment = await this.enrollmentModel.findOne({
          userId,
          courseId: { $in: courseIds },
        });
        if (!enrollment) {
          throw new BadRequestException('You must be enrolled in at least one course by this instructor to review them.');
        }
        return;
      }
      case ReviewType.ORGANIZATION: {
        if (!dto.reviewedOrganizationId) return;
        const orgId = convertToObjectId(dto.reviewedOrganizationId);
        const enrollment = await this.enrollmentModel.findOne({
          userId,
          organizationId: orgId,
        });
        if (!enrollment) {
          throw new BadRequestException('You must be enrolled in at least one course from this organization to review it.');
        }
        return;
      }
      default: {
        return;
      }
    }
  }

  private buildReviewFilter(dto: CreateReviewDto & { userId: string }) {
    const filter: {
      userId: Types.ObjectId;
      reviewType: ReviewType;
      isActive: boolean;
      courseId?: Types.ObjectId;
      instructorId?: Types.ObjectId;
      reviewedOrganizationId?: Types.ObjectId;
      moduleId?: Types.ObjectId;
      contentId?: Types.ObjectId;
    } = {
      userId: convertToObjectId(dto.userId),
      reviewType: dto.reviewType,
      isActive: true,
    };

    if (dto.reviewType === ReviewType.COURSE && dto.courseId) {
      filter.courseId = convertToObjectId(dto.courseId);
    } else if (dto.reviewType === ReviewType.INSTRUCTOR && dto.instructorId) {
      filter.instructorId = convertToObjectId(dto.instructorId);
    } else if (dto.reviewType === ReviewType.ORGANIZATION && dto.reviewedOrganizationId) {
      filter.reviewedOrganizationId = convertToObjectId(dto.reviewedOrganizationId);
    } else if (dto.reviewType === ReviewType.MODULE && dto.moduleId) {
      filter.moduleId = convertToObjectId(dto.moduleId);
    } else if (dto.reviewType === ReviewType.CONTENT && dto.contentId) {
      filter.contentId = convertToObjectId(dto.contentId);
    }

    return filter;
  }

  /**
   * Routes to the appropriate entity rating update method based on review type
   */
  private async updateEntityRatings(reviewType: ReviewType, createReviewDto: CreateReviewDto & { userId: string }) {
    if (reviewType === ReviewType.INSTRUCTOR && createReviewDto.instructorId) {
      await this.updateUserRatings(convertToObjectId(createReviewDto.instructorId));
    } else if (reviewType === ReviewType.ORGANIZATION && createReviewDto.reviewedOrganizationId) {
      await this.updateOrganizationRatings(convertToObjectId(createReviewDto.reviewedOrganizationId));
    } else if (reviewType === ReviewType.COURSE && createReviewDto.courseId) {
      await this.updateCourseRatings(convertToObjectId(createReviewDto.courseId));
    } else if (reviewType === ReviewType.MODULE && createReviewDto.moduleId) {
      await this.updateCourseModuleRatings(convertToObjectId(createReviewDto.moduleId));
    } else if (reviewType === ReviewType.CONTENT && createReviewDto.contentId) {
      await this.updateCourseContentRatings(convertToObjectId(createReviewDto.contentId));
    }
  }

  /**
   * Routes to the appropriate entity rating update method based on review type from review document
   */
  private async updateEntityRatingsFromReview(reviewType: ReviewType, reviewDoc: Review & Record<string, unknown>) {
    if (reviewType === ReviewType.INSTRUCTOR && 'instructorId' in reviewDoc && reviewDoc.instructorId) {
      await this.updateUserRatings(reviewDoc.instructorId as Types.ObjectId);
    } else if (reviewType === ReviewType.ORGANIZATION && 'reviewedOrganizationId' in reviewDoc && reviewDoc.reviewedOrganizationId) {
      await this.updateOrganizationRatings(reviewDoc.reviewedOrganizationId as Types.ObjectId);
    } else if (reviewType === ReviewType.COURSE && 'courseId' in reviewDoc && reviewDoc.courseId) {
      await this.updateCourseRatings(reviewDoc.courseId as Types.ObjectId);
    } else if (reviewType === ReviewType.MODULE && 'moduleId' in reviewDoc && reviewDoc.moduleId) {
      await this.updateCourseModuleRatings(reviewDoc.moduleId as Types.ObjectId);
    } else if (reviewType === ReviewType.CONTENT && 'contentId' in reviewDoc && reviewDoc.contentId) {
      await this.updateCourseContentRatings(reviewDoc.contentId as Types.ObjectId);
    }
  }

  /**
   * Updates user ratings and total reviews when instructor reviews are created, updated, or deleted
   * This method recalculates the average rating and total reviews from all active reviews
   * @param instructorId - The ID of the instructor (user) being reviewed
   */
  private async updateUserRatings(instructorId: Types.ObjectId) {
    // Get all active reviews for this instructor
    const reviews = await this.reviewModel.find({
      reviewType: ReviewType.INSTRUCTOR,
      instructorId: instructorId,
      isActive: true,
    });

    // Calculate new average rating and total reviews
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10 : 0;

    // Update the user document
    await this.userModel.findByIdAndUpdate(instructorId, {
      $set: {
        averageRating: averageRating,
        totalReviews: totalReviews,
      },
    });
  }

  /**
   * Updates organization ratings and total reviews when organization reviews are created, updated, or deleted
   */
  private async updateOrganizationRatings(organizationId: Types.ObjectId) {
    const reviews = await this.reviewModel.find({
      reviewType: ReviewType.ORGANIZATION,
      reviewedOrganizationId: organizationId,
      isActive: true,
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10 : 0;

    await this.organizationModel.findByIdAndUpdate(organizationId, {
      $set: {
        averageRating: averageRating,
        totalReviews: totalReviews,
      },
    });
  }

  /**
   * Updates course ratings and total reviews when course reviews are created, updated, or deleted
   */
  private async updateCourseRatings(courseId: Types.ObjectId) {
    const reviews = await this.reviewModel.find({
      reviewType: ReviewType.COURSE,
      courseId: courseId,
      isActive: true,
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10 : 0;

    await this.courseModel.findByIdAndUpdate(courseId, {
      $set: {
        'stats.averageRating': averageRating,
        'stats.totalReviews': totalReviews,
      },
    });

    // Update instructor course ratings
    await this.updateInstructorCourseRatings(courseId);

    // Update organization course-related stats
    await this.updateOrganizationCourseStats(courseId);
  }

  /**
   * Updates organization course-related stats (averageCoursesRating, totalCoursesReviews, totalCourses)
   * when course reviews are created, updated, or deleted
   */
  private async updateOrganizationCourseStats(courseId: Types.ObjectId) {
    // Get the course to find its organizationId
    const course = await this.courseModel.findById(courseId).select('organizationId').exec();

    if (!course || !course.organizationId) {
      return;
    }

    const organizationId = course.organizationId;

    // Get all courses in the organization
    const organizationCourses = await this.courseModel
      .find({
        organizationId: organizationId,
      })
      .select('_id')
      .exec();

    const courseIds = organizationCourses.map((c) => c._id);
    const totalCourses = courseIds.length;

    if (courseIds.length === 0) {
      // No courses, reset to 0
      await this.organizationModel.findByIdAndUpdate(organizationId, {
        $set: {
          'stats.averageCoursesRating': 0,
          'stats.totalCoursesReviews': 0,
          'stats.totalCourses': 0,
        },
      });
      return;
    }

    // Get all active course reviews for all courses in the organization
    const allCourseReviews = await this.reviewModel.find({
      reviewType: ReviewType.COURSE,
      courseId: { $in: courseIds },
      isActive: true,
    });

    // Calculate total reviews and average rating across all courses
    const totalCoursesReviews = allCourseReviews.length;
    const averageCoursesRating =
      totalCoursesReviews > 0 ? Math.round((allCourseReviews.reduce((sum, review) => sum + review.rating, 0) / totalCoursesReviews) * 10) / 10 : 0;

    // Update the organization's course-related stats
    await this.organizationModel.findByIdAndUpdate(organizationId, {
      $set: {
        'stats.averageCoursesRating': averageCoursesRating,
        'stats.totalCoursesReviews': totalCoursesReviews,
        'stats.totalCourses': totalCourses,
      },
    });
  }

  /**
   * Updates instructor course ratings (totalCoursesReviews and averageCoursesRating)
   * when course reviews are created, updated, or deleted
   * This updates all instructors associated with the course (instructorId + coInstructorsIds)
   */
  private async updateInstructorCourseRatings(courseId: Types.ObjectId) {
    // Get the course to find all instructors
    const course = await this.courseModel.findById(courseId).select('instructorId coInstructorsIds').exec();

    if (!course) {
      return;
    }

    // Collect all instructor IDs (main instructor + co-instructors)
    const instructorIds: Types.ObjectId[] = [];
    if (course.instructorId) {
      instructorIds.push(course.instructorId);
    }
    if (course.coInstructorsIds && course.coInstructorsIds.length > 0) {
      instructorIds.push(...course.coInstructorsIds);
    }

    if (instructorIds.length === 0) {
      return;
    }

    // For each instructor, calculate their course ratings
    for (const instructorId of instructorIds) {
      // Get all courses taught by this instructor
      const instructorCourses = await this.courseModel
        .find({
          $or: [{ instructorId: instructorId }, { coInstructorsIds: instructorId }],
        })
        .select('_id')
        .exec();

      const courseIds = instructorCourses.map((c) => c._id);

      if (courseIds.length === 0) {
        // No courses, reset to 0
        await this.userModel.findByIdAndUpdate(instructorId, {
          $set: {
            totalCoursesReviews: 0,
            averageCoursesRating: 0,
          },
        });
        continue;
      }

      // Get all active course reviews for all courses taught by this instructor
      const allCourseReviews = await this.reviewModel.find({
        reviewType: ReviewType.COURSE,
        courseId: { $in: courseIds },
        isActive: true,
      });

      // Calculate total reviews and average rating
      const totalCoursesReviews = allCourseReviews.length;
      const averageCoursesRating =
        totalCoursesReviews > 0 ? Math.round((allCourseReviews.reduce((sum, review) => sum + review.rating, 0) / totalCoursesReviews) * 10) / 10 : 0;

      // Update the instructor's course ratings
      await this.userModel.findByIdAndUpdate(instructorId, {
        $set: {
          totalCoursesReviews: totalCoursesReviews,
          averageCoursesRating: averageCoursesRating,
        },
      });
    }
  }

  /**
   * Updates course module ratings and total reviews when module reviews are created, updated, or deleted
   */
  private async updateCourseModuleRatings(moduleId: Types.ObjectId) {
    const reviews = await this.reviewModel.find({
      reviewType: ReviewType.MODULE,
      moduleId: moduleId,
      isActive: true,
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10 : 0;

    await this.courseModuleModel.findByIdAndUpdate(moduleId, {
      $set: {
        averageRating: averageRating,
        totalReviews: totalReviews,
      },
    });
  }

  /**
   * Updates course content ratings and total reviews when content reviews are created, updated, or deleted
   */
  private async updateCourseContentRatings(contentId: Types.ObjectId) {
    const reviews = await this.reviewModel.find({
      reviewType: ReviewType.CONTENT,
      contentId: contentId,
      isActive: true,
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10 : 0;

    await this.courseContentModel.findByIdAndUpdate(contentId, {
      $set: {
        averageRating: averageRating,
        totalReviews: totalReviews,
      },
    });
  }
}
