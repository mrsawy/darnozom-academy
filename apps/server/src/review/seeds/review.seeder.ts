import { Model, Types } from 'mongoose';
import { Review } from '../entities/review.entity';
import { ReviewType } from '../enum/reviewType.enum';
import { fakerAR as faker } from '@faker-js/faker';
import { Course } from '../../course/entities/course.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { User } from '../../user/entities/user.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { CourseModuleEntity } from '../../course/entities/course-module.entity';
import { CourseContent } from '../../course/entities/course-content.entity';
import { Roles } from '@darnozom/shared-types';
import { OrganizationSeedConfig } from 'src/database/seeds/seed-config.interface';

export class ReviewSeeder {
  constructor(
    private readonly reviewModel: Model<Review>,
    private readonly courseModel: Model<Course>,
    private readonly enrollmentModel: Model<Enrollment>,
    private readonly userModel: Model<User>,
    private readonly organizationModel: Model<Organization>,
    private readonly moduleModel: Model<CourseModuleEntity>,
    private readonly contentModel: Model<CourseContent>
  ) {}

  async seedCourseReview(
    userId: Types.ObjectId,
    courseId: Types.ObjectId,
    overrides: Partial<{ rating?: number; comment?: string; isActive?: boolean }> = {}
  ) {
    const enrollment = await this.enrollmentModel.findOne({ userId, courseId });
    if (!enrollment) return null;

    const existingReview = await this.reviewModel.findOne({ userId, courseId });
    if (existingReview) return existingReview;

    const rating = overrides.rating ?? faker.number.int({ min: 1, max: 5 });

    const reviewData: Record<string, unknown> = {
      userId,
      reviewType: ReviewType.COURSE,
      rating,
      comment: overrides.comment ?? (faker.datatype.boolean({ probability: 0.7 }) ? faker.lorem.paragraph() : undefined),
      isActive: overrides.isActive ?? true,
      courseId,
      enrollmentId: enrollment._id as Types.ObjectId | undefined,
      isEnrolled: true,
      contentQuality: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      instructorQuality: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      valueForMoney: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      ...overrides,
    };

    const review = await this.reviewModel.create(reviewData);

    // Update course stats incrementally
    const course = await this.courseModel.findById(courseId);
    if (course) {
      const currentTotal = course.stats?.totalReviews ?? 0;
      const currentAvg = course.stats?.averageRating ?? 0;
      const newTotal = currentTotal + 1;
      const newAvg = currentTotal === 0 ? rating : (currentAvg * currentTotal + rating) / newTotal;
      await this.courseModel.findByIdAndUpdate(courseId, {
        $set: {
          'stats.totalReviews': newTotal,
          'stats.averageRating': Math.round(newAvg * 10) / 10,
        },
      });
    }

    return review;
  }

  async seedCoursesReviews(courses: Course[], users: User[], organizationConfig?: unknown) {
    const students = users.filter((user) => user.roleName === Roles.STUDENT);
    if (students.length === 0 || courses.length === 0) return;

    const organizationsToProcess = organizationConfig ? [{ courses: (organizationConfig as OrganizationSeedConfig).courses }] : [];

    for (const organization of organizationsToProcess) {
      for (const courseConfig of organization.courses) {
        const course = courses.find((c) => c.name === courseConfig.name);
        if (!course || !courseConfig.reviews) continue;

        // Only pick students who are actually enrolled in this course so
        // seedCourseReview doesn't silently drop reviews for non-enrolled users,
        // which would leave instructors with totalCoursesReviews = 0.
        const studentIds = students.map((s) => s._id);
        const enrollments = await this.enrollmentModel
          .find({ courseId: course._id, userId: { $in: studentIds } })
          .select('userId')
          .lean();

        const enrolledIdSet = new Set(enrollments.map((e) => e.userId.toString()));
        const enrolledStudents = students.filter((s) => enrolledIdSet.has(s._id.toString()));

        // Fall back to all students if none are enrolled yet (edge-case safety)
        const pool = enrolledStudents.length > 0 ? enrolledStudents : students;
        const unusedPool = [...pool];

        for (const reviewConfig of courseConfig.reviews) {
          if (unusedPool.length === 0) unusedPool.push(...pool);
          const user = faker.helpers.arrayElement(unusedPool);
          const idx = unusedPool.indexOf(user);
          if (idx !== -1) unusedPool.splice(idx, 1);

          await this.seedCourseReview(user._id, course._id, {
            rating: reviewConfig.rating,
            comment: reviewConfig.comment,
          });
        }
      }
    }
  }

  async seedInstructorReview(
    userId: Types.ObjectId,
    instructorId: Types.ObjectId,
    organizationId: Types.ObjectId,
    courseId?: Types.ObjectId,
    overrides: Partial<{ rating?: number; comment?: string; isActive?: boolean }> = {}
  ) {
    const reviewData: Record<string, unknown> = {
      userId,
      reviewType: ReviewType.INSTRUCTOR,
      rating: overrides.rating ?? faker.number.int({ min: 1, max: 5 }),
      comment: overrides.comment ?? (faker.datatype.boolean({ probability: 0.7 }) ? faker.lorem.paragraph() : undefined),
      isActive: overrides.isActive ?? true,
      instructorId,
      courseId: courseId ?? (faker.datatype.boolean({ probability: 0.5 }) ? await this.getRandomCourseId(organizationId) : undefined),
      teachingQuality: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      communication: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      responsiveness: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      knowledgeLevel: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      ...overrides,
    };
    return this.reviewModel.create(reviewData);
  }

  async seedOrganizationReview(
    userId: Types.ObjectId,
    organizationId: Types.ObjectId,
    overrides: Partial<{ rating?: number; comment?: string; isActive?: boolean }> = {}
  ) {
    const reviewData: Record<string, unknown> = {
      userId,
      reviewType: ReviewType.ORGANIZATION,
      rating: overrides.rating ?? faker.number.int({ min: 1, max: 5 }),
      comment: overrides.comment ?? (faker.datatype.boolean({ probability: 0.7 }) ? faker.lorem.paragraph() : undefined),
      isActive: overrides.isActive ?? true,
      reviewedOrganizationId: organizationId,
      coursesQuality: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      platformExperience: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      support: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 1, max: 5 }) : undefined,
      ...overrides,
    };
    return this.reviewModel.create(reviewData);
  }

  async seedModuleReview(
    userId: Types.ObjectId,
    moduleId: Types.ObjectId,
    organizationId: Types.ObjectId,
    courseId?: Types.ObjectId,
    overrides: Partial<{ rating?: number; comment?: string; isActive?: boolean }> = {}
  ) {
    let enrollment: Enrollment | null = null;
    if (courseId) {
      enrollment = await this.enrollmentModel.findOne({ userId, courseId, organizationId });
    }

    const reviewData: Record<string, unknown> = {
      userId,
      reviewType: ReviewType.MODULE,
      rating: overrides.rating ?? faker.number.int({ min: 1, max: 5 }),
      comment: overrides.comment ?? (faker.datatype.boolean({ probability: 0.7 }) ? faker.lorem.sentence() : undefined),
      isActive: overrides.isActive ?? true,
      moduleId,
      enrollmentId: enrollment?._id,
      isEnrolled: !!enrollment,
      ...overrides,
    };

    return this.reviewModel.create(reviewData);
  }

  async seedContentReview(
    userId: Types.ObjectId,
    contentId: Types.ObjectId,
    organizationId: Types.ObjectId,
    courseId?: Types.ObjectId,
    overrides: Partial<{ rating?: number; comment?: string; isActive?: boolean }> = {}
  ) {
    let enrollment: Enrollment | null = null;
    if (courseId) {
      enrollment = await this.enrollmentModel.findOne({ userId, courseId, organizationId });
    }

    const reviewData: Record<string, unknown> = {
      userId,
      reviewType: ReviewType.CONTENT,
      rating: overrides.rating ?? faker.number.int({ min: 1, max: 5 }),
      comment: overrides.comment ?? (faker.datatype.boolean({ probability: 0.7 }) ? faker.lorem.sentence() : undefined),
      isActive: overrides.isActive ?? true,
      contentId,
      enrollmentId: enrollment?._id,
      isEnrolled: !!enrollment,
      ...overrides,
    };

    return this.reviewModel.create(reviewData);
  }

  async seedCourseReviews(courseId: Types.ObjectId, organizationId: Types.ObjectId, count = 5) {
    const course = await this.courseModel.findById(courseId);
    if (!course) throw new Error(`Course ${String(courseId)} not found`);

    const enrollments = await this.enrollmentModel.find({ courseId, organizationId }).limit(count);
    const reviews: Review[] = [];
    for (const enrollment of enrollments) {
      const review = await this.seedCourseReview(enrollment.userId, courseId, {
        rating: enrollment.progressPercentage > 80 ? faker.number.int({ min: 4, max: 5 }) : faker.number.int({ min: 1, max: 5 }),
      });
      if (review) reviews.push(review);
    }
    return reviews;
  }

  async seedInstructorReviews(instructorId: Types.ObjectId, organizationId: Types.ObjectId, count = 5) {
    const courses = await this.courseModel.find({ instructorId, organizationId }).limit(count);
    if (courses.length === 0) return [];

    const reviews: Review[] = [];
    for (const course of courses) {
      const enrollments = await this.enrollmentModel.find({ courseId: course._id, organizationId }).limit(1);
      if (enrollments.length > 0 && enrollments[0].progressPercentage > 30) {
        reviews.push(await this.seedInstructorReview(enrollments[0].userId, instructorId, organizationId, course._id));
      }
    }
    return reviews;
  }

  async seedOrganizationReviews(organizationId: Types.ObjectId, count = 10) {
    const users = await this.userModel.find({ organizationId }).limit(count);
    const reviews: Review[] = [];
    for (const user of users) {
      if (user.roleName === Roles.STUDENT) {
        reviews.push(await this.seedOrganizationReview(user._id, organizationId));
      }
    }
    return reviews;
  }

  async seedModuleReviews(courseId: Types.ObjectId, organizationId: Types.ObjectId, count = 3) {
    const course = await this.courseModel.findById(courseId);
    if (!course) throw new Error(`Course ${String(courseId)} not found`);

    const modulesIds = (course as { modulesIds?: Types.ObjectId[] }).modulesIds ?? [];
    if (modulesIds.length === 0) return [];

    const enrollments = await this.enrollmentModel.find({ courseId, organizationId }).limit(count);
    const reviews: Review[] = [];

    for (const enrollment of enrollments) {
      const selectedModules = faker.helpers.arrayElements(modulesIds, { min: 1, max: Math.min(modulesIds.length, 2) });
      for (const moduleId of selectedModules) {
        if (enrollment.progressPercentage > 30) {
          reviews.push(await this.seedModuleReview(enrollment.userId, moduleId, organizationId, courseId));
        }
      }
    }
    return reviews;
  }

  async seedContentReviews(courseId: Types.ObjectId, organizationId: Types.ObjectId, count = 5) {
    const course = await this.courseModel.findById(courseId);
    if (!course) throw new Error(`Course ${String(courseId)} not found`);

    const modulesIds = (course as { modulesIds?: Types.ObjectId[] }).modulesIds ?? [];
    if (modulesIds.length === 0) return [];

    const allContentIds: Types.ObjectId[] = [];
    const modules = await this.moduleModel
      .find({ _id: { $in: modulesIds } })
      .select('contentsIds')
      .lean();
    for (const mod of modules) {
      allContentIds.push(...((mod as { contentsIds?: Types.ObjectId[] }).contentsIds ?? []));
    }

    if (allContentIds.length === 0) return [];

    const enrollments = await this.enrollmentModel.find({ courseId, organizationId }).limit(count);
    const reviews: Review[] = [];

    for (const enrollment of enrollments) {
      const selectedContents = faker.helpers.arrayElements(allContentIds, { min: 1, max: Math.min(allContentIds.length, 3) });
      for (const contentId of selectedContents) {
        if (enrollment.progressPercentage > 20) {
          reviews.push(await this.seedContentReview(enrollment.userId, contentId, organizationId, courseId));
        }
      }
    }
    return reviews;
  }

  async recalculateAllInstructorCourseRatings(organizationId: Types.ObjectId) {
    const courses = await this.courseModel.find({ organizationId }).select('instructorId coInstructorsIds').lean();

    const allInstructorIdsSet = new Set<string>();
    const instructorIdMap = new Map<string, Types.ObjectId>();

    for (const course of courses) {
      if (course.instructorId) {
        const s = course.instructorId.toString();
        allInstructorIdsSet.add(s);
        instructorIdMap.set(s, course.instructorId);
      }
      for (const id of course.coInstructorsIds ?? []) {
        const s = id.toString();
        allInstructorIdsSet.add(s);
        instructorIdMap.set(s, id);
      }
    }

    const bulkOps: Parameters<typeof this.userModel.bulkWrite>[0] = [];

    for (const instructorIdStr of allInstructorIdsSet) {
      const instructorId = instructorIdMap.get(instructorIdStr)!;

      interface AggResult {
        _id: null;
        totalReviews: number;
        totalRating: number;
      }
      const result = await this.reviewModel.aggregate<AggResult>([
        { $match: { reviewType: ReviewType.COURSE, isActive: true } },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'course.organizationId': organizationId,
            $or: [{ 'course.instructorId': instructorId }, { 'course.coInstructorsIds': instructorId }],
          },
        },
        { $group: { _id: null, totalReviews: { $sum: 1 }, totalRating: { $sum: '$rating' } } },
      ]);

      const totalCoursesReviews = result.length > 0 ? result[0].totalReviews : 0;
      const averageCoursesRating = totalCoursesReviews > 0 ? Math.round((result[0].totalRating / totalCoursesReviews) * 10) / 10 : 0;

      bulkOps.push({
        updateOne: {
          filter: { _id: instructorId },
          update: { $set: { totalCoursesReviews, averageCoursesRating } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await this.userModel.bulkWrite(bulkOps);
    }
  }

  private async getRandomCourseId(organizationId: Types.ObjectId): Promise<Types.ObjectId | undefined> {
    const courses = await this.courseModel.find({ organizationId }).limit(10);
    if (courses.length === 0) return undefined;
    return faker.helpers.arrayElement(courses)._id;
  }
}
