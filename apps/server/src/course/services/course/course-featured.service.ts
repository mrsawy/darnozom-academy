import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { PaginateModel } from 'mongoose';
import { APPROVED_STATUSES } from 'src/utils/approval.utils';
import { PublishStatus } from '@lms-organization/shared-types';
import { Course } from '../../entities/course.entity';
import { FeaturedCourse } from '../../types/featured-course.interface';
import { NORMALIZATION_FACTORS, WEIGHTS, CAPS, MINIMUM_THRESHOLDS, SCALING_OPTIONS, RECENCY_CONFIG } from '../../config/featuredCourses.config';
import { lookupNotDeleted } from 'src/utils/soft-delete';

/**
 * Lookup optional Grade (singular) and SchoolTypes (array).
 * Grade and SchoolType are independent; each resolves on its own id(s).
 */
function buildGradeAndSchoolTypeLookupStages(): mongoose.PipelineStage[] {
  return [
    lookupNotDeleted('grades', 'gradeId', 'grade'),
    lookupNotDeleted('schooltypes', 'schoolTypeIds', 'schoolTypes'),
    {
      $addFields: {
        grade: {
          $cond: {
            if: { $gt: [{ $size: '$grade' }, 0] },
            // eslint-disable-next-line unicorn/no-thenable
            then: {
              _id: { $arrayElemAt: ['$grade._id', 0] },
              nameEn: { $arrayElemAt: ['$grade.nameEn', 0] },
              nameAr: { $arrayElemAt: ['$grade.nameAr', 0] },
            },
            else: null,
          },
        },
        schoolTypes: {
          $map: {
            input: '$schoolTypes',
            as: 'st',
            in: {
              _id: '$$st._id',
              nameEn: '$$st.nameEn',
              nameAr: '$$st.nameAr',
            },
          },
        },
      },
    },
  ];
}

@Injectable()
export class CourseFeaturedService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>
  ) {}

  /**
   * Retrieves featured courses ranked by a comprehensive scoring algorithm.
   *
   * This function calculates a featured score for each course using a weighted formula that
   * combines course-specific metrics, organization reputation, and instructor credibility.
   *
   * **Scoring Formula:**
   * The featured score is calculated as a weighted sum of normalized metrics from three categories:
   *
   * **1. Course Metrics (Primary Factors - Weight: 0.95):**
   *    - Total Enrollments (weight: 0.30): Number of students enrolled in the course
   *    - Total Reviews (weight: 0.25): Number of reviews the course has received
   *    - Average Rating (weight: 0.25): Average rating score (0-5 scale, normalized to 0-1)
   *    - Total Views (weight: 0.15): Number of times the course has been viewed
   *
   * **2. Organization Metrics (Secondary Factors - Weight: 0.36):**
   *    - Average Courses Rating (weight: 0.10): Organization's average rating across all courses
   *    - Total Courses Reviews (weight: 0.08): Total reviews across all organization courses
   *    - Total Enrollments (weight: 0.10): Total enrollments across all organization courses
   *    - Total Courses (weight: 0.08): Total number of courses in the organization
   *
   * **3. Instructor Metrics (Tertiary Factors - Weight: 0.50):**
   *    - Average Courses Rating (weight: 0.16): Instructor's average rating across all their courses
   *    - Total Courses Reviews (weight: 0.14): Total reviews across all instructor's courses
   *    - Total Students (weight: 0.11): Total number of students across all instructor's courses
   *    - Total Courses (weight: 0.09): Total number of courses taught by the instructor
   *
   * **4. Recency Factor (Weight: -0.03):**
   *    - Newer courses receive a slight boost to promote fresh content
   *    - Calculated as: (course_age_in_years * -0.03)
   *
   * **Scoring Process:**
   * 1. **Filtering**: First attempts to get courses with minimum thresholds
   *    - Course must be published (`publishStatus = PUBLISHED`)
   *    - Must have at least 1 enrollment and 1 review
   *    - If not enough courses meet these criteria, fills remaining slots with recent courses
   *      (published courses sorted by creation date, newest first)
   *
   * 2. **Data Aggregation**: Joins course data with:
   *    - Organization collection (for organization stats)
   *    - Users collection (for instructor stats)
   *
   * 3. **Normalization**: All metrics are normalized to prevent outliers from dominating:
   *    - Metrics are divided by normalization factors (e.g., enrollments/1000, reviews/100)
   *    - Ratings are scaled from 0-5 to 0-1 range
   *
   * 4. **Logarithmic Scaling**: Applied to high-variance metrics for better distribution:
   *    - Enrollments: Uses log scaling to reduce impact of extremely popular courses
   *    - Views: Uses log scaling to balance view counts
   *    - Reviews: Linear scaling (no log)
   *
   * 5. **Capping**: Normalized values are capped to prevent extreme outliers:
   *    - Example: Course enrollments capped at 5000 normalized value
   *    - This ensures no single metric can dominate the final score
   *
   * 6. **Weighted Calculation**: Each normalized and capped metric is multiplied by its weight
   *    and summed together to produce the final featured score
   *
   * 7. **Sorting & Limiting**: Courses are sorted by featured score (descending) and limited
   *    to the requested number of results
   *
   * **Configuration:**
   * All weights, normalization factors, caps, and thresholds are defined in
   * `featuredCourses.config.ts` and can be adjusted without modifying this code.
   *
   * @param limit - Maximum number of featured courses to return (default: 10)
   * @returns Promise resolving to an array of featured courses with their calculated scores,
   *          sorted by featured score (highest first). Each course object includes:
   *          - All standard course fields (id, name, description, pricing, stats, etc.)
   *          - `featuredScore`: The calculated numerical score used for ranking
   *          - `organizationStats`: Aggregated statistics from the course's organization
   *            (totalCourses, totalEnrollments, totalCoursesReviews, averageCoursesRating)
   *          - `organization`: Basic organization information (id, name, slug)
   *          - `instructorStats`: Aggregated statistics from the course's instructor
   *            (totalCoursesReviews, averageCoursesRating, totalStudents, totalCourses)
   *          - `instructor`: Basic instructor information (id, username, firstName, lastName, profile)
   *
   * @example
   * ```typescript
   * // Get top 10 featured courses
   * const featured = await courseFeaturedService.getFeatured(10);
   *
   * // Get top 5 featured courses
   * const topFive = await courseFeaturedService.getFeatured(5);
   *
   * // Access the featured score
   * featured.forEach(course => {
   *   console.log(`${course.name}: Score ${course.featuredScore}`);
   * });
   * ```
   */
  async getFeatured(limit = 10): Promise<FeaturedCourse[]> {
    // Extract config values as literals for MongoDB aggregation
    const {
      courseEnrollments: normCourseEnrollments,
      courseReviews: normCourseReviews,
      courseViews: normCourseViews,
      courseRating: normCourseRating,
      orgReviews: normOrgReviews,
      orgEnrollments: normOrgEnrollments,
      orgCourses: normOrgCourses,
      orgRating: normOrgRating,
      instructorReviews: normInstructorReviews,
      instructorStudents: normInstructorStudents,
      instructorCourses: normInstructorCourses,
      instructorRating: normInstructorRating,
    } = NORMALIZATION_FACTORS;

    const {
      course: {
        totalEnrollments: weightCourseTotalEnrollments,
        totalReviews: weightCourseTotalReviews,
        averageRating: weightCourseAverageRating,
        totalViews: weightCourseTotalViews,
      },
      organization: {
        averageCoursesRating: weightOrgAverageCoursesRating,
        totalCoursesReviews: weightOrgTotalCoursesReviews,
        totalEnrollments: weightOrgTotalEnrollments,
        totalCourses: weightOrgTotalCourses,
      },
      instructor: {
        averageCoursesRating: weightInstructorAverageCoursesRating,
        totalCoursesReviews: weightInstructorTotalCoursesReviews,
        totalStudents: weightInstructorTotalStudents,
        totalCourses: weightInstructorTotalCourses,
      },
      recency: weightRecency,
    } = WEIGHTS;

    const {
      courseTotalEnrollments: capCourseEnrollments,
      courseTotalReviews: capCourseReviews,
      courseTotalViews: capCourseViews,
      orgTotalCoursesReviews: capOrgReviews,
      orgTotalEnrollments: capOrgEnrollments,
      orgTotalCourses: capOrgCourses,
      instructorTotalCoursesReviews: capInstructorReviews,
      instructorTotalStudents: capInstructorStudents,
      instructorTotalCourses: capInstructorCourses,
    } = CAPS;

    const { totalEnrollments: minTotalEnrollments, totalReviews: minTotalReviews } = MINIMUM_THRESHOLDS;

    const { useLogarithmicScaling } = SCALING_OPTIONS;
    const { enabled: recencyEnabled, millisecondsPerYear } = RECENCY_CONFIG;

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          publishStatus: PublishStatus.PUBLISHED,
          approvalStatus: { $in: APPROVED_STATUSES },
          $and: [{ 'stats.totalEnrollments': { $gte: minTotalEnrollments } }, { 'stats.totalReviews': { $gte: minTotalReviews } }],
        },
      },
      // Lookup organization to get organization stats
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organization',
        },
      },
      {
        $unwind: {
          path: '$organization',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup instructor to get instructor stats
      lookupNotDeleted('users', 'instructorId', 'instructor'),
      {
        $unwind: {
          path: '$instructor',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Prepare all stats fields
      {
        $addFields: {
          // Course stats (with defaults if null)
          courseTotalEnrollments: { $ifNull: ['$stats.totalEnrollments', 0] },
          courseTotalReviews: { $ifNull: ['$stats.totalReviews', 0] },
          courseAverageRating: { $ifNull: ['$stats.averageRating', 0] },
          courseTotalViews: { $ifNull: ['$stats.totalViews', 0] },
          // Organization stats (with defaults if organization doesn't exist)
          orgStats: {
            $cond: {
              if: { $ne: ['$organization', null] },
              // eslint-disable-next-line unicorn/no-thenable
              then: '$organization.stats',
              else: {
                totalCourses: 0,
                totalEnrollments: 0,
                totalCoursesReviews: 0,
                averageCoursesRating: 0,
              },
            },
          },
          // Instructor stats (with defaults if instructor doesn't exist)
          instructorStats: {
            $cond: {
              if: { $ne: ['$instructor', null] },
              // eslint-disable-next-line unicorn/no-thenable
              then: {
                totalCoursesReviews: { $ifNull: ['$instructor.totalCoursesReviews', 0] },
                averageCoursesRating: { $ifNull: ['$instructor.averageCoursesRating', 0] },
                totalStudents: { $ifNull: ['$instructor.totalStudents', 0] },
                totalCourses: { $ifNull: ['$instructor.totalCourses', 0] },
              },
              else: {
                totalCoursesReviews: 0,
                averageCoursesRating: 0,
                totalStudents: 0,
                totalCourses: 0,
              },
            },
          },
          // Calculate course age in years (for recency factor)
          courseAgeYears: {
            $divide: [
              {
                $subtract: [new Date(), { $ifNull: ['$createdAt', new Date()] }],
              },
              millisecondsPerYear,
            ],
          },
        },
      },
      // Calculate featured score
      {
        $addFields: {
          featuredScore: {
            $add: [
              // Course metrics (weighted)
              // Total enrollments (with capping and optional logarithmic scaling)
              {
                $multiply: [
                  {
                    $min: [
                      useLogarithmicScaling.enrollments
                        ? {
                            $divide: [
                              {
                                $ln: {
                                  $add: ['$courseTotalEnrollments', 1],
                                },
                              },
                              {
                                $ln: {
                                  $add: [normCourseEnrollments, 1],
                                },
                              },
                            ],
                          }
                        : {
                            $divide: ['$courseTotalEnrollments', normCourseEnrollments],
                          },
                      capCourseEnrollments,
                    ],
                  },
                  weightCourseTotalEnrollments,
                ],
              },
              // Total reviews (with capping)
              {
                $multiply: [
                  {
                    $min: [
                      useLogarithmicScaling.reviews
                        ? {
                            $divide: [
                              {
                                $ln: {
                                  $add: ['$courseTotalReviews', 1],
                                },
                              },
                              {
                                $ln: {
                                  $add: [normCourseReviews, 1],
                                },
                              },
                            ],
                          }
                        : {
                            $divide: ['$courseTotalReviews', normCourseReviews],
                          },
                      capCourseReviews,
                    ],
                  },
                  weightCourseTotalReviews,
                ],
              },
              // Average rating - scale 0-5 to 0-1
              {
                $multiply: [
                  {
                    $divide: ['$courseAverageRating', normCourseRating],
                  },
                  weightCourseAverageRating,
                ],
              },
              // Total views (with capping and optional logarithmic scaling)
              {
                $multiply: [
                  {
                    $min: [
                      useLogarithmicScaling.views
                        ? {
                            $divide: [
                              {
                                $ln: {
                                  $add: ['$courseTotalViews', 1],
                                },
                              },
                              {
                                $ln: {
                                  $add: [normCourseViews, 1],
                                },
                              },
                            ],
                          }
                        : {
                            $divide: ['$courseTotalViews', normCourseViews],
                          },
                      capCourseViews,
                    ],
                  },
                  weightCourseTotalViews,
                ],
              },
              // Organization metrics (weighted)
              // Organization average courses rating - scale 0-5 to 0-1
              {
                $multiply: [
                  {
                    $divide: [{ $ifNull: ['$orgStats.averageCoursesRating', 0] }, normOrgRating],
                  },
                  weightOrgAverageCoursesRating,
                ],
              },
              // Organization total courses reviews (with capping)
              {
                $multiply: [
                  {
                    $min: [
                      {
                        $divide: [{ $ifNull: ['$orgStats.totalCoursesReviews', 0] }, normOrgReviews],
                      },
                      capOrgReviews,
                    ],
                  },
                  weightOrgTotalCoursesReviews,
                ],
              },
              // Organization total enrollments (with capping)
              {
                $multiply: [
                  {
                    $min: [
                      {
                        $divide: [{ $ifNull: ['$orgStats.totalEnrollments', 0] }, normOrgEnrollments],
                      },
                      capOrgEnrollments,
                    ],
                  },
                  weightOrgTotalEnrollments,
                ],
              },
              // Organization total courses (with capping)
              {
                $multiply: [
                  {
                    $min: [
                      {
                        $divide: [{ $ifNull: ['$orgStats.totalCourses', 0] }, normOrgCourses],
                      },
                      capOrgCourses,
                    ],
                  },
                  weightOrgTotalCourses,
                ],
              },
              // Instructor metrics (weighted)
              // Instructor average courses rating - scale 0-5 to 0-1
              {
                $multiply: [
                  {
                    $divide: [{ $ifNull: ['$instructorStats.averageCoursesRating', 0] }, normInstructorRating],
                  },
                  weightInstructorAverageCoursesRating,
                ],
              },
              // Instructor total courses reviews (with capping and optional logarithmic scaling)
              {
                $multiply: [
                  {
                    $min: [
                      useLogarithmicScaling.reviews
                        ? {
                            $divide: [
                              {
                                $ln: {
                                  $add: [{ $ifNull: ['$instructorStats.totalCoursesReviews', 0] }, 1],
                                },
                              },
                              {
                                $ln: {
                                  $add: [normInstructorReviews, 1],
                                },
                              },
                            ],
                          }
                        : {
                            $divide: [{ $ifNull: ['$instructorStats.totalCoursesReviews', 0] }, normInstructorReviews],
                          },
                      capInstructorReviews,
                    ],
                  },
                  weightInstructorTotalCoursesReviews,
                ],
              },
              // Instructor total students (with logarithmic scaling and capping)
              {
                $multiply: [
                  {
                    $min: [
                      useLogarithmicScaling.enrollments
                        ? {
                            $divide: [
                              {
                                $ln: {
                                  $add: [{ $ifNull: ['$instructorStats.totalStudents', 0] }, 1],
                                },
                              },
                              {
                                $ln: {
                                  $add: [normInstructorStudents, 1],
                                },
                              },
                            ],
                          }
                        : {
                            $divide: [{ $ifNull: ['$instructorStats.totalStudents', 0] }, normInstructorStudents],
                          },
                      capInstructorStudents,
                    ],
                  },
                  weightInstructorTotalStudents,
                ],
              },
              // Instructor total courses (with capping)
              {
                $multiply: [
                  {
                    $min: [
                      {
                        $divide: [{ $ifNull: ['$instructorStats.totalCourses', 0] }, normInstructorCourses],
                      },
                      capInstructorCourses,
                    ],
                  },
                  weightInstructorTotalCourses,
                ],
              },
              // Recency factor (newer courses get slight boost)
              ...(recencyEnabled
                ? [
                    {
                      $multiply: ['$courseAgeYears', weightRecency],
                    },
                  ]
                : []),
            ],
          },
        },
      },
      // Sort by featured score descending
      {
        $sort: { featuredScore: -1 },
      },
      // Limit results
      {
        $limit: limit,
      },
      // Project final fields (before categories lookup to preserve categoriesIds)
      {
        $project: {
          // Include all course fields
          _id: 1,
          organizationId: 1,
          name: 1,
          createdBy: 1,
          categoriesIds: 1,
          gradeId: 1,
          schoolTypeIds: 1,
          modulesIds: 1,
          isPaid: 1,
          instructorId: 1,
          coInstructorsIds: 1,
          description: 1,
          shortDescription: 1,
          learningObjectives: 1,
          thumbnailKey: 1,
          trailerKey: 1,
          pricing: 1,
          settings: 1,
          stats: 1,
          attendanceSettings: 1,
          paypalPlanId: 1,
          createdAt: 1,
          updatedAt: 1,
          featuredScore: 1,
          // Include organization stats (clean nested structure)
          organizationStats: {
            totalCourses: { $ifNull: ['$orgStats.totalCourses', 0] },
            totalEnrollments: { $ifNull: ['$orgStats.totalEnrollments', 0] },
            totalCoursesReviews: { $ifNull: ['$orgStats.totalCoursesReviews', 0] },
            averageCoursesRating: { $ifNull: ['$orgStats.averageCoursesRating', 0] },
          },
          // Include organization basic info
          organization: {
            _id: '$organization._id',
            name: '$organization.name',
            slug: '$organization.slug',
          },
          // Include instructor stats
          instructorStats: {
            totalCoursesReviews: { $ifNull: ['$instructorStats.totalCoursesReviews', 0] },
            averageCoursesRating: { $ifNull: ['$instructorStats.averageCoursesRating', 0] },
            totalStudents: { $ifNull: ['$instructorStats.totalStudents', 0] },
            totalCourses: { $ifNull: ['$instructorStats.totalCourses', 0] },
          },
          // Include instructor basic info (avatar needed on course cards)
          instructor: {
            _id: '$instructor._id',
            username: '$instructor.username',
            firstName: '$instructor.firstName',
            lastName: '$instructor.lastName',
            profile: {
              avatar: '$instructor.profile.avatar',
            },
          },
        },
      },
      // Lookup categories after projection to ensure categoriesIds is available
      lookupNotDeleted('categories', 'categoriesIds', 'categories'),
      // Final projection with categories
      {
        $addFields: {
          categories: {
            $cond: {
              if: { $isArray: '$categories' },
              // eslint-disable-next-line unicorn/no-thenable
              then: {
                $map: {
                  input: '$categories',
                  as: 'category',
                  in: {
                    _id: '$$category._id',
                    name: '$$category.name',
                    description: '$$category.description',
                    organizationId: '$$category.organizationId',
                    parentId: '$$category.parentId',
                  },
                },
              },
              else: [],
            },
          },
        },
      },
      ...buildGradeAndSchoolTypeLookupStages(),
    ];

    const featuredCourses = await this.courseModel.aggregate<FeaturedCourse>(pipeline);

    // If we don't have enough courses with enrollments/reviews, fill with recent courses
    if (featuredCourses.length < limit) {
      const remainingLimit = limit - featuredCourses.length;
      const existingCourseIds = featuredCourses.map((course) => course._id);

      const recentCoursesPipeline: mongoose.PipelineStage[] = [
        {
          $match: {
            publishStatus: PublishStatus.PUBLISHED,
            approvalStatus: { $in: APPROVED_STATUSES },
            _id: { $nin: existingCourseIds },
            $or: [{ 'stats.totalEnrollments': { $lt: minTotalEnrollments } }, { 'stats.totalReviews': { $lt: minTotalReviews } }],
          },
        },
        // Lookup organization
        {
          $lookup: {
            from: 'organizations',
            localField: 'organizationId',
            foreignField: '_id',
            as: 'organization',
          },
        },
        {
          $unwind: {
            path: '$organization',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup instructor
        lookupNotDeleted('users', 'instructorId', 'instructor'),
        {
          $unwind: {
            path: '$instructor',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Add fields for consistency
        {
          $addFields: {
            courseTotalEnrollments: { $ifNull: ['$stats.totalEnrollments', 0] },
            courseTotalReviews: { $ifNull: ['$stats.totalReviews', 0] },
            courseAverageRating: { $ifNull: ['$stats.averageRating', 0] },
            courseTotalViews: { $ifNull: ['$stats.totalViews', 0] },
            orgStats: {
              $cond: {
                if: { $ne: ['$organization', null] },
                // eslint-disable-next-line unicorn/no-thenable
                then: '$organization.stats',
                else: {
                  totalCourses: 0,
                  totalEnrollments: 0,
                  totalCoursesReviews: 0,
                  averageCoursesRating: 0,
                },
              },
            },
            instructorStats: {
              $cond: {
                if: { $ne: ['$instructor', null] },
                // eslint-disable-next-line unicorn/no-thenable
                then: {
                  totalCoursesReviews: { $ifNull: ['$instructor.totalCoursesReviews', 0] },
                  averageCoursesRating: { $ifNull: ['$instructor.averageCoursesRating', 0] },
                  totalStudents: { $ifNull: ['$instructor.totalStudents', 0] },
                  totalCourses: { $ifNull: ['$instructor.totalCourses', 0] },
                },
                else: {
                  totalCoursesReviews: 0,
                  averageCoursesRating: 0,
                  totalStudents: 0,
                  totalCourses: 0,
                },
              },
            },
            // For recent courses, set featuredScore to 0 (they'll be sorted by date)
            featuredScore: 0,
          },
        },
        // Sort by creation date (newest first)
        {
          $sort: { createdAt: -1 },
        },
        // Limit to remaining slots
        {
          $limit: remainingLimit,
        },
        // Lookup categories
        lookupNotDeleted('categories', 'categoriesIds', 'categories'),
        // Project same fields as featured courses
        {
          $project: {
            _id: 1,
            organizationId: 1,
            name: 1,
            createdBy: 1,
            categoriesIds: 1,
            gradeId: 1,
            schoolTypeIds: 1,
            modulesIds: 1,
            isPaid: 1,
            instructorId: 1,
            coInstructorsIds: 1,
            description: 1,
            shortDescription: 1,
            learningObjectives: 1,
            thumbnailKey: 1,
            trailerKey: 1,
            pricing: 1,
            settings: 1,
            stats: 1,
            attendanceSettings: 1,
            paypalPlanId: 1,
            createdAt: 1,
            updatedAt: 1,
            featuredScore: 1,
            organizationStats: {
              totalCourses: { $ifNull: ['$orgStats.totalCourses', 0] },
              totalEnrollments: { $ifNull: ['$orgStats.totalEnrollments', 0] },
              totalCoursesReviews: { $ifNull: ['$orgStats.totalCoursesReviews', 0] },
              averageCoursesRating: { $ifNull: ['$orgStats.averageCoursesRating', 0] },
            },
            organization: {
              _id: '$organization._id',
              name: '$organization.name',
              slug: '$organization.slug',
            },
            instructorStats: {
              totalCoursesReviews: { $ifNull: ['$instructorStats.totalCoursesReviews', 0] },
              averageCoursesRating: { $ifNull: ['$instructorStats.averageCoursesRating', 0] },
              totalStudents: { $ifNull: ['$instructorStats.totalStudents', 0] },
              totalCourses: { $ifNull: ['$instructorStats.totalCourses', 0] },
            },
            instructor: {
              _id: '$instructor._id',
              username: '$instructor.username',
              firstName: '$instructor.firstName',
              lastName: '$instructor.lastName',
              profile: {
                avatar: '$instructor.profile.avatar',
              },
            },
            // Include categories - map the array to include only needed fields
            categories: {
              $cond: {
                if: { $isArray: '$categories' },
                // eslint-disable-next-line unicorn/no-thenable
                then: {
                  $map: {
                    input: '$categories',
                    as: 'category',
                    in: {
                      _id: '$$category._id',
                      name: '$$category.name',
                      description: '$$category.description',
                      organizationId: '$$category.organizationId',
                      parentId: '$$category.parentId',
                    },
                  },
                },
                else: [],
              },
            },
          },
        },
        ...buildGradeAndSchoolTypeLookupStages(),
      ];

      const recentCourses = await this.courseModel.aggregate<FeaturedCourse>(recentCoursesPipeline);

      // Combine featured courses (with scores) and recent courses (sorted by date)
      // Featured courses come first, then recent courses
      return [...featuredCourses, ...recentCourses];
    }

    return featuredCourses;
  }
}
