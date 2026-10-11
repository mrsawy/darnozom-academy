import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { PaginateModel } from 'mongoose';
import { User } from '../entities/user.entity';
import { convertObjectValuesToObjectId } from '../../utils/ObjectId.utils';
import { Roles } from '../../role/enum/Roles.enum';
import { Role } from '../../role/entities/role.entity';
import { NORMALIZATION_FACTORS, WEIGHTS, CAPS, MINIMUM_THRESHOLDS, SCALING_OPTIONS, RECENCY_CONFIG } from '../config/featuredInstructors.config';
import { PaginateOptionsWithSearch } from 'src/utils/types/PaginateOptionsWithSearch';
import { UserStatus, EntityStatus } from '@darnozom/shared-types';
import { buildInstructorMatch, InstructorFilterInput } from '../utils/instructor-filter.util';
import { lookupNotDeleted } from 'src/utils/soft-delete';

@Injectable()
export class InstructorService {
  private readonly logger = new Logger(InstructorService.name);

  constructor(@InjectModel(User.name) private readonly userModel: PaginateModel<User>) {}

  async findAll(options: PaginateOptionsWithSearch, filterInput?: InstructorFilterInput) {
    try {
      // Build the Mongo $match from flat filters (search/rating/category/grade/schoolType),
      // then convert id strings → ObjectIds. Clients never build Mongo operators anymore;
      // all query construction — including regex escaping — lives here in one place.
      const builtMatch = convertObjectValuesToObjectId(buildInstructorMatch(filterInput ?? {}));

      // categoriesIds is applied explicitly below so we can preserve the
      // "must have a categoriesIds array" default when no subject filter is set.
      const { categoriesIds: categoryFilter, ...restMatch } = builtMatch;

      const page = Number(options.page ?? 1);
      const limit = Number(options.limit ?? 10);
      const skip = (page - 1) * limit;
      const sort = options.sort ?? { createdAt: -1 };

      // Build match stage with the new conditions and additional filters
      interface MatchStage {
        roleName: { $regex: RegExp };
        status: string;
        deletedAt: null;
        categoriesIds?: { $in?: unknown[]; $type?: string };
        [key: string]: unknown;
      }
      const matchStage: MatchStage = {
        roleName: {
          $regex: /^instructor$/i,
        },
        status: UserStatus.ACTIVE,
        deletedAt: null,
        // search ($or), rating ($gte), grade/school-type ($in) conditions
        ...restMatch,
        categoriesIds: (categoryFilter as { $in?: unknown[]; $type?: string } | undefined) ?? {
          $type: 'array',
        },
      };

      // Subject (category) filter: use the built $in when provided, otherwise fall
      // back to the default that requires a categoriesIds array to be present.

      const normalizeCategoriesIds: mongoose.PipelineStage = {
        $addFields: {
          categoriesIds: {
            $map: {
              input: { $ifNull: ['$categoriesIds', []] },
              as: 'id',
              in: {
                $cond: [{ $eq: [{ $type: '$$id' }, 'string'] }, { $toObjectId: '$$id' }, '$$id'],
              },
            },
          },
        },
      };

      const dataPipeline: mongoose.PipelineStage[] = [
        lookupNotDeleted('categories', 'categoriesIds', 'categories'),
        lookupNotDeleted('grades', 'gradesIds', 'grades'),
        lookupNotDeleted('schooltypes', 'schoolTypesIds', 'schoolTypes'),
      ];

      // Add sort stage if provided
      if (sort) {
        dataPipeline.push({ $sort: sort as Record<string, 1 | -1> });
      }

      // Add pagination
      dataPipeline.push(
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            password: 0,
            walletId: 0,
            categoriesIds: 0,
            'categories.updatedAt': 0,
            'categories.createdAt': 0,
            'categories.__v': 0,
            'categories.organizationId': 0,
            'categories.description': 0,
            'categories.parentId': 0,
          },
        }
      );

      const pipeline: mongoose.PipelineStage[] = [
        // Normalize categoriesIds strings → ObjectIds BEFORE $match so the
        // $in comparison works regardless of whether the DB stores strings or ObjectIds
        normalizeCategoriesIds,
        {
          $match: matchStage,
        },
        // Filter by organization status — exclude instructors whose org is not ACTIVE
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
        {
          $match: {
            $or: [{ organizationId: { $in: [null, undefined] } }, { 'organization.status': EntityStatus.ACTIVE }],
          },
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            // Type assertion needed: $facet expects FacetPipelineStage[] but mongoose doesn't export this type
            // The stages used (addFields, lookup, sort, skip, limit, project) are all valid for $facet
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: dataPipeline as any,
          },
        },
        {
          $project: {
            docs: '$data',
            totalDocs: { $arrayElemAt: ['$metadata.total', 0] },
            limit: { $literal: limit },
            page: { $literal: page },
          },
        },
      ];
      this.logger.debug(`findAll aggregation pipeline: ${JSON.stringify(pipeline)}`);

      const result = await this.userModel.aggregate<{ docs: unknown[]; totalDocs: number }>(pipeline);
      this.logger.debug(`findAll aggregation result meta: totalDocs=${result[0]?.totalDocs ?? 0}`);
      const aggregationResult = result[0] ?? { docs: [], totalDocs: 0, limit, page };

      const totalDocs = aggregationResult.totalDocs ?? 0;
      const totalPages = Math.ceil(totalDocs / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        docs: aggregationResult.docs,
        totalDocs,
        limit,
        page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      };
    } catch (error: unknown) {
      this.logger.warn(`findAll failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      throw error;
    }
  }

  async filterOne(filters: mongoose.RootFilterQuery<User>) {
    const convertedFilters = convertObjectValuesToObjectId(filters);
    const instructorFilters: mongoose.RootFilterQuery<User> = Object.assign(
      { roleName: Roles.INSTRUCTOR },
      convertedFilters
    ) as mongoose.RootFilterQuery<User>;

    const instructor = await this.userModel
      .findOne(instructorFilters)
      .populate({
        path: 'role',
        model: Role.name,
        localField: 'roleName',
        foreignField: 'name',
      })
      .populate('categories')
      .populate('grades')
      .populate('schoolTypes')
      .exec();

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    const { password: _password, ...instructorData } = instructor.toObject();
    return instructorData;
  }

  async update(
    filters: mongoose.RootFilterQuery<User>,
    updateData: {
      $set?: Partial<User>;
      $inc?: Partial<Record<keyof User, number>>;
      totalCourses?: number;
      totalStudents?: number;
      totalReviews?: number;
      totalEnrollments?: number;
      averageRating?: number;
    }
  ) {
    const instructor = await this.userModel.findOneAndUpdate(filters, updateData, { new: true });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    const { password: _password, ...instructorData } = instructor.toObject();
    return instructorData;
  }

  async getFeatured(limit = 10) {
    // Extract config values as literals for MongoDB aggregation
    const {
      instructorReviews: normInstructorReviews,
      instructorStudents: normInstructorStudents,
      instructorCourses: normInstructorCourses,
      orgReviews: normOrgReviews,
      orgEnrollments: normOrgEnrollments,
      orgCourses: normOrgCourses,
      ratingScale: normRatingScale,
    } = NORMALIZATION_FACTORS;

    const {
      instructor: {
        totalCoursesReviews: weightInstructorTotalCoursesReviews,
        averageCoursesRating: weightInstructorAverageCoursesRating,
        totalStudents: weightInstructorTotalStudents,
        totalCourses: weightInstructorTotalCourses,
      },
      organization: {
        totalCoursesReviews: weightOrgTotalCoursesReviews,
        averageCoursesRating: weightOrgAverageCoursesRating,
        totalEnrollments: weightOrgTotalEnrollments,
        totalCourses: weightOrgTotalCourses,
      },
      recency: weightRecency,
    } = WEIGHTS;

    const {
      instructorTotalCoursesReviews: capInstructorReviews,
      instructorTotalStudents: capInstructorStudents,
      instructorTotalCourses: capInstructorCourses,
      orgTotalCoursesReviews: capOrgReviews,
      orgTotalEnrollments: capOrgEnrollments,
      orgTotalCourses: capOrgCourses,
    } = CAPS;

    const { totalCourses: minTotalCourses } = MINIMUM_THRESHOLDS;

    const { useLogarithmicScaling } = SCALING_OPTIONS;
    const { enabled: recencyEnabled, millisecondsPerYear } = RECENCY_CONFIG;

    const pipeline: mongoose.PipelineStage[] = [
      // Match only instructors with minimum thresholds
      {
        $match: {
          roleName: { $regex: /^instructor$/i },
          status: UserStatus.ACTIVE,
          deletedAt: null,
          // Require at least one course; reviews are weighted in the score below
          // but are not a hard gate so instructors without reviews can still appear.
          totalCourses: { $gte: minTotalCourses },
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
      // Exclude instructors whose organization is not ACTIVE
      {
        $match: {
          $or: [{ organizationId: { $in: [null, undefined] } }, { 'organization.status': EntityStatus.ACTIVE }],
        },
      },
      // Use pre-calculated instructor stats and prepare organization stats
      {
        $addFields: {
          // Use stored instructor metrics (with defaults if null)
          instructorTotalCoursesReviews: { $ifNull: ['$totalCoursesReviews', 0] },
          instructorAverageCoursesRating: { $ifNull: ['$averageCoursesRating', 0] },
          instructorTotalStudents: { $ifNull: ['$totalStudents', 0] },
          instructorTotalCourses: { $ifNull: ['$totalCourses', 0] },
          // Get organization stats (with defaults if organization doesn't exist)
          orgStats: {
            $cond: {
              if: { $ne: ['$organization', null] },
              // eslint-disable-next-line unicorn/no-thenable
              then: '$organization.stats' as unknown,
              else: {
                totalCourses: 0,
                totalEnrollments: 0,
                totalCoursesReviews: 0,
                averageCoursesRating: 0,
              },
            },
          },
          // Calculate account age in years (for recency factor)
          accountAgeYears: {
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
      // Using a weighted formula that combines instructor and organization metrics
      {
        $addFields: {
          featuredScore: {
            $add: [
              // Instructor metrics (weighted)
              // Total courses reviews (with capping and optional logarithmic scaling)
              {
                $multiply: [
                  {
                    $min: [
                      useLogarithmicScaling.reviews
                        ? {
                            $divide: [
                              {
                                $ln: {
                                  $add: ['$instructorTotalCoursesReviews', 1],
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
                            $divide: ['$instructorTotalCoursesReviews', normInstructorReviews],
                          },
                      capInstructorReviews,
                    ],
                  },
                  weightInstructorTotalCoursesReviews,
                ],
              },
              // Average courses rating - scale 0-5 to 0-1
              {
                $multiply: [
                  {
                    $divide: ['$instructorAverageCoursesRating', normRatingScale],
                  },
                  weightInstructorAverageCoursesRating,
                ],
              },
              // Total students (with logarithmic scaling and capping)
              {
                $multiply: [
                  {
                    $min: [
                      useLogarithmicScaling.students
                        ? {
                            $divide: [
                              {
                                $ln: {
                                  $add: ['$instructorTotalStudents', 1],
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
                            $divide: ['$instructorTotalStudents', normInstructorStudents],
                          },
                      capInstructorStudents,
                    ],
                  },
                  weightInstructorTotalStudents,
                ],
              },
              // Total courses (with capping)
              {
                $multiply: [
                  {
                    $min: [
                      {
                        $divide: ['$instructorTotalCourses', normInstructorCourses],
                      },
                      capInstructorCourses,
                    ],
                  },
                  weightInstructorTotalCourses,
                ],
              },
              // Organization metrics (weighted)
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
              // Organization average courses rating - scale 0-5 to 0-1
              {
                $multiply: [
                  {
                    $divide: [{ $ifNull: ['$orgStats.averageCoursesRating', 0] }, normRatingScale],
                  },
                  weightOrgAverageCoursesRating,
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
              // Recency factor (newer instructors get slight boost)
              ...(recencyEnabled
                ? [
                    {
                      $multiply: ['$accountAgeYears', weightRecency],
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
      // Lookup category documents from categoriesIds
      lookupNotDeleted('categories', 'categoriesIds', 'categories', [{ $project: { _id: 1, name: 1 } }]),
      // Add computed fields to root level
      {
        $addFields: {
          totalCourses: '$instructorTotalCourses',
          totalCoursesReviews: '$instructorTotalCoursesReviews',
          averageCoursesRating: '$instructorAverageCoursesRating',
          totalStudents: '$instructorTotalStudents',
        },
      },
      // Project final fields (using inclusion projection)
      {
        $project: {
          // Include all user fields except sensitive ones
          _id: 1,
          organizationId: 1,
          username: 1,
          email: 1,
          phone: 1,
          firstName: 1,
          lastName: 1,
          roleName: 1,
          profile: 1,
          preferences: 1,
          status: 1,
          lastLogin: 1,
          preferredCurrency: 1,
          averageRating: 1,
          totalReviews: 1,
          categoriesIds: 1,
          categories: 1,
          createdAt: 1,
          updatedAt: 1,
          // Include computed instructor metrics
          totalCourses: 1,
          totalCoursesReviews: 1,
          averageCoursesRating: 1,
          totalStudents: 1,
          featuredScore: 1,
          // Include organization stats (clean nested structure)
          organizationStats: {
            totalCourses: { $ifNull: ['$orgStats.totalCourses', 0] },
            totalEnrollments: { $ifNull: ['$orgStats.totalEnrollments', 0] },
            totalCoursesReviews: { $ifNull: ['$orgStats.totalCoursesReviews', 0] },
            averageCoursesRating: { $ifNull: ['$orgStats.averageCoursesRating', 0] },
            totalReviews: { $ifNull: ['$orgStats.totalReviews', 0] },
            averageRating: { $ifNull: ['$orgStats.averageRating', 0] },
          },
          // Include organization basic info
          organization: {
            _id: '$organization._id',
            name: '$organization.name',
          },
        },
      },
    ];

    const featuredInstructors = await this.userModel.aggregate<User>(pipeline);
    return featuredInstructors;
  }
}
