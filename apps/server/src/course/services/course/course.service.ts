import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import mongoose, { ClientSession, Connection, FilterQuery, PaginateModel } from 'mongoose';
import { ActiveStatus, ApprovalStatus, PublishStatus, Currency, CourseErrors, GradeErrors, SchoolTypeErrors } from '@darnozom/shared-types';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { CurrencyService } from 'src/currency/currency.service';
import { FileService } from 'src/file/file.service';
import { ICourseFilters } from 'src/utils/types/CourseFilters';
import { APPROVED_STATUSES, buildApprovedFilter, applyUpdateWithApproval, escapeRegex } from 'src/utils/approval.utils';
import { COURSE_CATEGORY_CHANGED_EVENT, CourseCategoryChangedEvent } from 'src/category/events/category-count.events';
import { assertOrgApproved, isOrgApproved } from 'src/utils/verification.utils';
import { Category } from 'src/category/entities/category.entity';
import { Grade } from 'src/grade/entities/grade.entity';
import { SchoolType } from 'src/school-type/entities/school-type.entity';
import { Course, SettingsSchema } from '../../entities/course.entity';
import { CourseModulesService } from '../module/course-modules.service';
import { CreateCourseDto } from '../../dto/create-course.dto';
import { UpdateCourseDto } from '../../dto/update-course.dto';
import { CourseModule } from '../../course.module';
import { CourseContent } from '../../entities/course-content.entity';
import { sanitizeContentsForStudent } from '../../utils/content-sanitizer.util';
import { NOT_DELETED_CONTENT_FILTER } from '../../utils/not-deleted-content.filter';
import { InstructorService } from 'src/user/services/instructor.service';
import { convertObjectValuesToObjectId, convertToObjectId } from 'src/utils/ObjectId.utils';
import { Organization } from 'src/organization/entities/organization.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { CourseOverview } from '../../types/courseOverview.interface';
import { COURSE_CREATED_EVENT, CourseCreatedEvent } from 'src/organization/events/organization-stats.events';
import { buildSoftDeleteSet, lookupNotDeleted, NOT_DELETED_FILTER } from 'src/utils/soft-delete';

function isCourseFileFieldCleared(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

const DEFAULT_COURSE_FIND_ALL_OPTIONS: ICourseFilters & { approvedOnly?: boolean } = {
  page: 1,
  limit: 10,
  sort: { createdAt: -1 },
  search: '',
  maxPrice: undefined,
  minPrice: undefined,
  priceCurrency: undefined,
  billingCycle: undefined,
  minRating: undefined,
};

@Injectable()
export class CourseService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>,
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @InjectModel(Category.name)
    private readonly categoryModel: PaginateModel<Category>,
    @InjectModel(Grade.name)
    private readonly gradeModel: mongoose.Model<Grade>,
    @InjectModel(SchoolType.name)
    private readonly schoolTypeModel: mongoose.Model<SchoolType>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: PaginateModel<Enrollment>,
    private readonly currencyService: CurrencyService,
    @Inject(forwardRef(() => CourseModulesService))
    private readonly courseModuleService: CourseModulesService,
    private readonly fileService: FileService,
    private readonly instructorService: InstructorService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Validates that the optional gradeId / schoolTypeIds reference existing records.
   * Grade and SchoolType are fully independent; neither requires the other.
   */
  private async assertGradeAndSchoolTypeExist(gradeId?: string | null, schoolTypeIds?: string[] | null) {
    if (gradeId) {
      const grade = await this.gradeModel.exists({ _id: gradeId });
      if (!grade) throw new BadRequestException(GradeErrors.GRADE_NOT_FOUND);
    }
    if (schoolTypeIds && schoolTypeIds.length > 0) {
      for (const id of schoolTypeIds) {
        const schoolType = await this.schoolTypeModel.exists({ _id: id });
        if (!schoolType) throw new BadRequestException(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND);
      }
    }
  }

  async create(
    createCourseDto: CreateCourseDto & {
      organizationId: string;
      createdBy: string;
    }
  ) {
    const foundedCourse = await this.courseModel.findOne({
      organizationId: createCourseDto.organizationId,
      name: createCourseDto.name,
    });
    if (foundedCourse) throw new BadRequestException('Course With the same name already exist for this organization .');
    await this.assertGradeAndSchoolTypeExist(createCourseDto.gradeId, createCourseDto.schoolTypeIds);
    if (createCourseDto.isPaid) {
      createCourseDto.pricing = Object.fromEntries(
        Object.entries(createCourseDto.pricing).map(([key, value]) => {
          const pricingValue = value as { originalPrice: number; originalCurrency: Currency };
          return [
            key,
            {
              ...pricingValue,
              priceUSD: this.currencyService.convertToUSD(pricingValue.originalPrice, pricingValue.originalCurrency),
            },
          ];
        })
      );
    }
    const org = await this.organizationModel.findById(createCourseDto.organizationId);
    assertOrgApproved(org);
    const publishStatus = PublishStatus.PUBLISHED;
    const createdCourse = await this.courseModel.create({
      ...createCourseDto,
      publishStatus,
      publishedAt: new Date(),
      settings: {
        ...createCourseDto.settings,
        isPublished: true,
        isDraft: false,
      },
      approvalStatus: isOrgApproved(org) ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
    });

    this.eventEmitter.emit(COURSE_CREATED_EVENT, new CourseCreatedEvent(createCourseDto.organizationId));

    if (createCourseDto.instructorId) {
      void this.instructorService.update({ _id: new mongoose.Types.ObjectId(createCourseDto.instructorId) }, { $inc: { totalCourses: 1 } });
    }

    if (createdCourse.categoriesIds?.length) {
      this.eventEmitter.emit(
        COURSE_CATEGORY_CHANGED_EVENT,
        new CourseCategoryChangedEvent(
          createdCourse.categoriesIds.map((id) => id.toString()),
          [],
          createdCourse.instructorId?.toString()
        )
      );
    }

    return {
      message: 'Course created successfully',
      course: createdCourse,
    };
  }

  async findAll(filters?: mongoose.RootFilterQuery<Course>, options?: ICourseFilters & { approvedOnly?: boolean }) {
    const mergedOptions = { ...DEFAULT_COURSE_FIND_ALL_OPTIONS, ...options };
    const {
      maxPrice,
      minPrice,
      priceCurrency,
      billingCycle,
      minRating,
      minModules,
      selectedCategory,
      categoryIds,
      gradeId,
      schoolTypeIds,
      search,
      approvedOnly,
      ...paginateOptions
    } = mergedOptions;

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- mapped to $in for old URLs
    const legacySchoolTypeId = mergedOptions.schoolTypeId;

    const query = Object.assign({}, filters) as mongoose.RootFilterQuery<Course> & Record<string, unknown>;

    if (approvedOnly) {
      Object.assign(query, buildApprovedFilter());
      query.publishStatus = PublishStatus.PUBLISHED;
      query.activeStatus = ActiveStatus.ACTIVE;
    }

    // Handle search functionality
    if (search?.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      const searchOr: mongoose.RootFilterQuery<Course>[] = [
        { name: searchRegex },
        { description: searchRegex },
        { shortDescription: searchRegex },
        { learningObjectives: { $elemMatch: { $regex: searchRegex } } },
      ];

      const UserModel = this.connection.model('User');
      const [matchingCategories, matchingInstructors] = await Promise.all([
        this.categoryModel.find({ name: searchRegex }).select('_id').limit(50).lean(),
        UserModel.find({
          $or: [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }],
        })
          .select('_id')
          .limit(50)
          .lean<{ _id: mongoose.Types.ObjectId }[]>(),
      ]);

      if (matchingCategories.length > 0) {
        searchOr.push({
          categoriesIds: { $in: matchingCategories.map((category) => category._id) },
        });
      }

      if (matchingInstructors.length > 0) {
        const matchedInstructorIds = matchingInstructors.map((user) => user._id);
        searchOr.push({ instructorId: { $in: matchedInstructorIds } }, { coInstructorsIds: { $in: matchedInstructorIds } });
      }

      const existingOr = Array.isArray(query.$or) ? (query.$or as mongoose.RootFilterQuery<Course>[]) : undefined;

      if (existingOr && existingOr.length > 0) {
        const existingAnd = Array.isArray(query.$and) ? (query.$and as mongoose.RootFilterQuery<Course>[]) : [];
        query.$and = [...existingAnd, { $or: existingOr }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // Handle price filtering
    if (billingCycle && (maxPrice !== undefined || minPrice !== undefined)) {
      const priceField = `pricing.${billingCycle}`;
      const minPriceUSD = minPrice === undefined ? undefined : priceCurrency ? this.currencyService.convertToUSD(minPrice, priceCurrency) : minPrice;
      const maxPriceUSD = maxPrice === undefined ? undefined : priceCurrency ? this.currencyService.convertToUSD(maxPrice, priceCurrency) : maxPrice;

      if (minPriceUSD !== undefined) {
        const existingPriceFilter = query[`${priceField}.priceUSD`] as Record<string, unknown> | undefined;
        // Use Object.assign to avoid Promise type inference from spread operator
        query[`${priceField}.priceUSD`] = Object.assign({}, existingPriceFilter ?? {}, { $gte: minPriceUSD }) as unknown;
      }
      if (maxPriceUSD !== undefined) {
        const existingPriceFilter = query[`${priceField}.priceUSD`] as Record<string, unknown> | undefined;
        // Use Object.assign to avoid Promise type inference from spread operator
        query[`${priceField}.priceUSD`] = Object.assign({}, existingPriceFilter ?? {}, { $lte: maxPriceUSD }) as unknown;
      }
    }

    // Handle rating filter
    if (minRating !== undefined) {
      query['stats.averageRating'] = { $gte: minRating };
    }

    // Handle minimum modules filter
    if (minModules !== undefined) {
      query.modulesIds = { $exists: true };
      query.$expr = { $gte: [{ $size: '$modulesIds' }, Number(minModules)] };
    }

    // Category filtering with hierarchy. Accepts a single `selectedCategory` id (used by
    // the web catalog) and/or a `categoryIds` multi-select list (comma-separated string or
    // array, used by mobile). Each id is expanded to include its direct descendants so
    // filtering stays hierarchical, then all are unioned.
    const requestedCategoryIds = [
      ...(Array.isArray(categoryIds) ? categoryIds : typeof categoryIds === 'string' ? categoryIds.split(',') : []),
      ...(selectedCategory ? [selectedCategory] : []),
    ]
      .map((id) => (typeof id === 'string' ? id.trim() : id))
      .filter((id): id is string => typeof id === 'string' && mongoose.isValidObjectId(id));

    if (requestedCategoryIds.length > 0) {
      const selectedIds = requestedCategoryIds.map((id) => new mongoose.Types.ObjectId(id));

      const descendants = await this.categoryModel
        .find({ $or: [{ _id: { $in: selectedIds } }, { parentId: { $in: selectedIds } }] })
        .select('_id')
        .lean();

      const resolvedCategoryIds = descendants.length > 0 ? descendants.map((c) => c._id) : selectedIds;

      query.categoriesIds = { $in: resolvedCategoryIds };
    }

    // Grade / SchoolType filters are fully independent optional lookups.
    if (gradeId) {
      query.gradeId = new mongoose.Types.ObjectId(gradeId);
    }
    const rawSchoolTypeIds = [
      ...(Array.isArray(schoolTypeIds) ? schoolTypeIds : typeof schoolTypeIds === 'string' ? schoolTypeIds.split(',') : []),
      ...(legacySchoolTypeId ? [legacySchoolTypeId] : []),
    ]
      .map((id) => (typeof id === 'string' ? id.trim() : id))
      .filter((id): id is string => typeof id === 'string' && mongoose.isValidObjectId(id));

    if (rawSchoolTypeIds.length > 0) {
      query.schoolTypeIds = {
        $in: rawSchoolTypeIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    const result = await this.courseModel.paginate(query, {
      ...paginateOptions,
      populate: [
        {
          path: 'instructor',
          select: 'username email firstName lastName profile.avatar',
        },
        {
          path: 'coInstructors',
          select: 'username firstName lastName',
        },
        {
          path: 'categories',
          select: 'name',
        },
        {
          path: 'grade',
          select: 'nameEn nameAr',
        },
        {
          path: 'schoolTypes',
          select: 'nameEn nameAr',
        },
      ],
      sort: paginateOptions.sort ?? { createdAt: -1 },
      lean: true,
    });
    await this.enrichPendingUpdateRefs(result.docs);
    return result;
  }

  private async enrichPendingUpdateRefs(docs: Course[]): Promise<void> {
    const allCategoryIds = new Set<string>();
    const allUserIds = new Set<string>();

    for (const doc of docs) {
      const snapshot: Pick<Course, 'pendingUpdate'> =
        'toObject' in doc && typeof doc.toObject === 'function'
          ? (doc.toObject() as Pick<Course, 'pendingUpdate'>)
          : (doc as Pick<Course, 'pendingUpdate'>);
      const pending = snapshot.pendingUpdate;
      if (!pending) continue;
      if (Array.isArray(pending.categoriesIds)) {
        for (const id of pending.categoriesIds) allCategoryIds.add(String(id));
      }
      if (pending.instructorId) allUserIds.add(String(pending.instructorId));
      if (Array.isArray(pending.coInstructorsIds)) {
        for (const id of pending.coInstructorsIds) allUserIds.add(String(id));
      }
    }

    const [categoryMap, userMap] = await Promise.all([this.resolveCategoryNames(allCategoryIds), this.resolveUserNames(allUserIds)]);

    for (const doc of docs) {
      const pending = doc.pendingUpdate;
      if (!pending) continue;

      if (Array.isArray(pending.categoriesIds)) {
        pending.categories = (pending.categoriesIds as unknown[]).map((id) => ({
          _id: String(id),
          name: categoryMap.get(String(id)) ?? String(id),
        }));
        delete pending.categoriesIds;
      }

      if (pending.instructorId) {
        const u = userMap.get(String(pending.instructorId));
        pending.instructor = u
          ? { _id: String(pending.instructorId), firstName: u.firstName, lastName: u.lastName, username: u.username }
          : { _id: String(pending.instructorId), name: String(pending.instructorId) };
        delete pending.instructorId;
      }

      if (Array.isArray(pending.coInstructorsIds)) {
        pending.coInstructors = (pending.coInstructorsIds as unknown[]).map((id) => {
          const u = userMap.get(String(id));
          return u ? { _id: String(id), firstName: u.firstName, lastName: u.lastName, username: u.username } : { _id: String(id), name: String(id) };
        });
        delete pending.coInstructorsIds;
      }
      // if (pending.thumbnailKey) {
      //   pending.thumbnailUrl = await this.fileService.getFileUrl(pending.thumbnailKey as string);
      //   delete pending.thumbnailKey;
      // }
      // if (pending.trailerKey) {
      //   pending.trailerUrl = await this.fileService.getFileUrl(pending.trailerKey as string);
      //   delete pending.trailerKey;
      // }
    }
  }

  private async resolveCategoryNames(ids: Set<string>): Promise<Map<string, string>> {
    if (ids.size === 0) return new Map();
    const cats = await this.categoryModel.find({ _id: { $in: [...ids].map((id) => new mongoose.Types.ObjectId(id)) } }, { _id: 1, name: 1 }).lean();
    return new Map(cats.map((c) => [c._id.toString(), c.name]));
  }

  private async resolveUserNames(ids: Set<string>): Promise<Map<string, { firstName: string; lastName: string; username: string }>> {
    if (ids.size === 0) return new Map();
    const UserModel = this.connection.model('User');
    const users = await UserModel.find({ _id: { $in: [...ids].map((id) => new mongoose.Types.ObjectId(id)) } })
      .select('_id firstName lastName username')
      .lean<
        {
          _id: mongoose.Types.ObjectId;
          firstName: string;
          lastName: string;
          username: string;
        }[]
      >();
    return new Map(users.map((u) => [u._id.toString(), { firstName: u.firstName, lastName: u.lastName, username: u.username }]));
  }

  async findOne(filters: FilterQuery<Course>, session?: ClientSession) {
    const query = this.courseModel
      .findOne(filters)
      .populate('creator')
      .populate('modules')
      .populate('categories')
      .populate('grade')
      .populate('schoolTypes');
    if (session) query.session(session);
    const foundedCourse = await query.exec();
    if (!foundedCourse) throw new NotFoundException('Course Not Found');
    return foundedCourse;
  }

  async findOneById(id: string, session?: ClientSession) {
    const query = this.courseModel
      .findById(id)
      .populate('creator')
      .populate('modules')
      .populate('categories')
      .populate('grade')
      .populate('schoolTypes');
    if (session) query.session(session);
    const foundedCourse = await query.exec();
    if (!foundedCourse) throw new NotFoundException('Course Not Found');
    return foundedCourse;
  }

  async update(updateCourseDto: UpdateCourseDto) {
    try {
      const { courseId, ...updateData } = updateCourseDto;

      const existingCourse = await this.courseModel.findById(courseId);
      if (!existingCourse) {
        throw new NotFoundException('Course not found');
      }

      await this.assertGradeAndSchoolTypeExist(updateCourseDto.gradeId, updateCourseDto.schoolTypeIds);

      // Snapshot for category event emission
      const oldCategoryIds = (existingCourse.categoriesIds ?? []).map((id) => id.toString());
      const oldInstructorId = existingCourse.instructorId?.toString();

      if (updateCourseDto?.instructorId && updateCourseDto.instructorId.toString() !== existingCourse.instructorId.toString()) {
        const oldInstructorTotalCourses = await this.courseModel.countDocuments({ instructorId: existingCourse.instructorId });
        const newInstructorTotalCourses = await this.courseModel.countDocuments({ instructorId: updateCourseDto.instructorId });
        void this.instructorService.update({ _id: convertToObjectId(existingCourse.instructorId) }, { totalCourses: oldInstructorTotalCourses });
        void this.instructorService.update({ _id: convertToObjectId(updateCourseDto.instructorId) }, { totalCourses: newInstructorTotalCourses });
      }

      const processedData = this.processUpdateData(updateData, existingCourse);
      const { keysToUnset } = await this.handleFileKeyChanges(processedData, existingCourse);

      const { authorization, ...changes } = processedData;

      // Encode cleared file keys as explicit nulls so they survive in pendingUpdate
      for (const key of keysToUnset) {
        (changes as Record<string, unknown>)[key] = null;
      }

      const raw = changes as Record<string, unknown>;
      if ('publishStatus' in raw) {
        const isPublishing = raw.publishStatus === PublishStatus.PUBLISHED;
        raw.publishedAt = isPublishing ? new Date() : null;
        raw['settings.isPublished'] = isPublishing;
        raw['settings.isDraft'] = !isPublishing;
      }

      await this.cleanOrphanedPendingFiles(existingCourse, changes as Record<string, unknown>);
      const org = await this.organizationModel.findById(existingCourse.organizationId);
      applyUpdateWithApproval(existingCourse, changes as Record<string, unknown>, isOrgApproved(org));
      await existingCourse.save();

      // Emit category change events only for changes that were applied to the document
      // directly (not queued in pendingUpdate). Use the saved document's actual state.
      const actualNewCategoryIds = (existingCourse.categoriesIds ?? []).map((id) => id.toString());
      const newInstructorId = existingCourse.instructorId?.toString() ?? oldInstructorId;
      const oldSet = new Set(oldCategoryIds);
      const newSet = new Set(actualNewCategoryIds);
      const addedCategoryIds = actualNewCategoryIds.filter((id) => !oldSet.has(id));
      const removedCategoryIds = oldCategoryIds.filter((id) => !newSet.has(id));
      if (addedCategoryIds.length > 0 || removedCategoryIds.length > 0 || oldInstructorId !== newInstructorId) {
        this.eventEmitter.emit(
          COURSE_CATEGORY_CHANGED_EVENT,
          new CourseCategoryChangedEvent(addedCategoryIds, removedCategoryIds, newInstructorId, oldInstructorId)
        );
      }

      const updatedCourse = await this.courseModel.findById(courseId);
      return {
        message: 'Course updated successfully',
        updated: true,
        course: updatedCourse,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(error);
    }
  }

  private processUpdateData(updateData: Partial<UpdateCourseDto>, existingCourse: Course) {
    if (updateData.isPaid && updateData.pricing) {
      updateData.pricing = Object.fromEntries(
        Object.entries(updateData.pricing).map(([key, value]) => {
          const pricingValue = value as { originalPrice: number; originalCurrency: Currency };
          return [
            key,
            {
              ...pricingValue,
              priceUSD: this.currencyService.convertToUSD(pricingValue.originalPrice, pricingValue.originalCurrency),
            },
          ];
        })
      );
    }

    if (updateData.attendanceSettings) {
      const currentSettings = existingCourse.attendanceSettings ?? {};
      updateData.attendanceSettings = {
        requireAttendance: updateData.attendanceSettings.requireAttendance ?? currentSettings.requireAttendance,
        offlineSchedule: updateData.attendanceSettings.offlineSchedule ?? currentSettings.offlineSchedule ?? [],
      };
    }

    return updateData;
  }

  private async handleFileKeyChanges(updateData: Partial<UpdateCourseDto>, existingCourse: Course): Promise<{ keysToUnset: string[] }> {
    const keysToUnset: string[] = [];
    const updateKeys = new Set(Object.keys(updateData));

    const isLive = existingCourse.approvalStatus === ApprovalStatus.APPROVED || existingCourse.approvalStatus === ApprovalStatus.PENDING_UPDATE;

    if (updateKeys.has('thumbnailKey')) {
      const newThumb = updateData.thumbnailKey;
      const existingThumb = existingCourse.thumbnailKey;
      if (isCourseFileFieldCleared(newThumb)) {
        if (!isLive && existingThumb) await this.fileService.deleteFile(existingThumb);
        keysToUnset.push('thumbnailKey');
        delete updateData.thumbnailKey;
      } else if (typeof newThumb === 'string' && existingThumb && newThumb !== existingThumb && !isLive) {
        await this.fileService.deleteFile(existingThumb);
      }
    }

    if (updateKeys.has('trailerKey')) {
      const newTrailer = updateData.trailerKey;
      const existingTrailer = existingCourse.trailerKey;
      if (isCourseFileFieldCleared(newTrailer)) {
        if (!isLive && existingTrailer) await this.fileService.deleteFile(existingTrailer);
        keysToUnset.push('trailerKey');
        delete updateData.trailerKey;
      } else if (typeof newTrailer === 'string' && existingTrailer && newTrailer !== existingTrailer && !isLive)
        await this.fileService.deleteFile(existingTrailer);
    }

    return { keysToUnset };
  }

  private async cleanOrphanedPendingFiles(existingCourse: Course, incomingChanges: Record<string, unknown>): Promise<void> {
    if (existingCourse.approvalStatus !== ApprovalStatus.PENDING_UPDATE || !existingCourse.pendingUpdate) return;

    for (const field of ['thumbnailKey', 'trailerKey'] as const) {
      const oldPendingVal = existingCourse.pendingUpdate[field] as string | undefined;
      const newVal = incomingChanges[field] as string | undefined;
      if (oldPendingVal && typeof oldPendingVal === 'string' && oldPendingVal !== newVal) {
        await this.fileService.deleteFile(oldPendingVal);
      }
    }
  }

  remove(id: number) {
    return `This action removes a #${id} course`;
  }

  async getCourseWithOrderedModules(courseId: string, includeContents = false, contentSelect = 'title type', requireApproved = false) {
    const moduleMatch = {
      ...NOT_DELETED_FILTER,
      ...(requireApproved
        ? { approvalStatus: { $in: APPROVED_STATUSES }, publishStatus: PublishStatus.PUBLISHED, activeStatus: ActiveStatus.ACTIVE }
        : {}),
    };

    const populateConfig: mongoose.PopulateOptions = {
      path: 'modules',
      options: { sort: { order: 1 } },
      match: moduleMatch,
    };

    if (includeContents) {
      populateConfig.populate = {
        path: 'contents',
        model: 'CourseContent',
        ...(contentSelect ? { select: contentSelect } : {}),
        match: {
          ...NOT_DELETED_CONTENT_FILTER,
          ...(requireApproved
            ? { approvalStatus: { $in: APPROVED_STATUSES }, publishStatus: PublishStatus.PUBLISHED, activeStatus: ActiveStatus.ACTIVE }
            : {}),
        },
      };
    }

    const course = await this.courseModel
      .findById(courseId)
      .populate('categories')
      .populate('instructor')
      .populate('coInstructors')
      .populate('grade')
      .populate('schoolTypes')
      .populate('reviews')
      .populate(populateConfig);

    if (!course) throw new NotFoundException('Course not found');

    if (
      requireApproved &&
      (!APPROVED_STATUSES.includes(course.approvalStatus) ||
        course.publishStatus !== PublishStatus.PUBLISHED ||
        course.activeStatus !== ActiveStatus.ACTIVE)
    ) {
      throw new NotFoundException('Course not found');
    }

    if (includeContents) {
      const courseOverview = course as unknown as CourseOverview;
      if (courseOverview.modules) {
        for (const module of courseOverview.modules) {
          if (module.contentsIds && module.contentsIds.length > 0) {
            const contentsIdsArray = module.contentsIds;
            module.contentsIds = contentsIdsArray.toSorted((a, b) => {
              const aIndex = contentsIdsArray.findIndex((id) => id.toString() === a.toString());
              const bIndex = contentsIdsArray.findIndex((id) => id.toString() === b.toString());
              return aIndex - bIndex;
            });
          }
        }
      }
    }

    return {
      ...course.toObject(),
      thumbnailUrl: await this.fileService.getFileUrl(course.thumbnailKey),
      trailerUrl: await this.fileService.getFileUrl(course.trailerKey),
    };
  }

  async addModuleToCourse(courseId: string, moduleId: string, session?: ClientSession) {
    try {
      const result = await this.courseModel.updateOne(
        { _id: courseId },
        { $addToSet: { modulesIds: new mongoose.Types.ObjectId(moduleId) } },
        { session }
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException('Course not found');
      }

      return {
        message: 'Module added to course successfully',
        updated: true,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  async removeModuleFromCourse(courseId: string, moduleId: string, session?: ClientSession) {
    try {
      const result = await this.courseModel.updateOne(
        { _id: courseId },
        { $pull: { modulesIds: new mongoose.Types.ObjectId(moduleId) } },
        { session }
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException('Course not found');
      }

      return {
        message: 'Module removed from course successfully',
        updated: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async removeModulesFromCourse(courseId: string, moduleIds: string[], session?: ClientSession) {
    try {
      const result = await this.courseModel.updateOne(
        { _id: courseId },
        {
          $pullAll: {
            modulesIds: moduleIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        { session }
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException('Course not found');
      }

      return {
        message: 'Modules removed from course successfully',
        updated: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async reorderModules(courseId: string, newOrder: string[]) {
    try {
      // First, get the current course to validate
      const course = await this.courseModel.findById(courseId);
      if (!course) {
        throw new NotFoundException('Course not found');
      }

      // Get current module IDs as strings for comparison
      const currentModuleIds = course.modulesIds.map((id) => id.toString());

      // Validate that all new IDs exist in current modules
      const invalidIds = newOrder.filter((id) => !currentModuleIds.includes(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(`Invalid module IDs: ${invalidIds.join(', ')}`);
      }

      // Validate that all current modules are included in new order
      const missingIds = currentModuleIds.filter((id) => !newOrder.includes(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(`Missing module IDs: ${missingIds.join(', ')}`);
      }

      // Convert to ObjectIds and update
      const validIds = newOrder.map((id) => new mongoose.Types.ObjectId(id));

      await this.courseModel.updateOne({ _id: courseId }, { $set: { modulesIds: validIds } });

      return {
        message: 'Module order updated successfully',
        updated: true,
        newOrder: validIds,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error);
    }
  }

  async deleteCourses(coursesIds: string[], deletedBy?: string | mongoose.Types.ObjectId | null) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const courses = await this.courseModel
        .find({
          _id: { $in: coursesIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
        .session(session);

      for (const course of courses) {
        await this.courseModuleService.deleteModules(
          course.modulesIds.map((id) => id.toString()),
          session,
          deletedBy
        );
      }

      const courseObjectIds = coursesIds.map((id) => new mongoose.Types.ObjectId(id));

      await this.enrollmentModel.updateMany({ courseId: { $in: courseObjectIds } }, { $set: buildSoftDeleteSet(deletedBy) }).session(session);

      await this.courseModel.updateMany({ _id: { $in: courseObjectIds } }, { $set: buildSoftDeleteSet(deletedBy) }).session(session);

      await session.commitTransaction();

      for (const course of courses) {
        const catIds = (course.categoriesIds ?? []).map((id) => id.toString());
        if (catIds.length > 0) {
          this.eventEmitter.emit(COURSE_CATEGORY_CHANGED_EVENT, new CourseCategoryChangedEvent([], catIds, course.instructorId?.toString()));
        }
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete Courses', error instanceof Error ? error.message : String(error));

      await session.abortTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete Courses');
    } finally {
      await session.endSession();
    }
  }

  async getCourseWithOrderedModulesAndContents(
    courseId: string,
    session?: ClientSession,
    requireApproved = false
  ): Promise<Course & { modules: (CourseModule & { contents: (CourseContent & { _id: mongoose.Types.ObjectId })[] })[] }> {
    const approvedFilter = requireApproved
      ? { approvalStatus: { $in: APPROVED_STATUSES }, publishStatus: PublishStatus.PUBLISHED, activeStatus: ActiveStatus.ACTIVE }
      : {};

    const aggregate = this.courseModel.aggregate<
      Course & { modules: (CourseModule & { contents: (CourseContent & { _id: mongoose.Types.ObjectId })[] })[] }
    >([
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },

      lookupNotDeleted('categories', 'categoriesIds', 'categories'),

      lookupNotDeleted('users', 'instructorId', 'instructor'),
      { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },

      lookupNotDeleted('users', 'coInstructorsIds', 'coInstructors'),

      {
        $lookup: {
          from: 'course_modules',
          let: { moduleIds: '$modulesIds' },
          pipeline: [{ $match: { $expr: { $in: ['$_id', '$$moduleIds'] }, ...NOT_DELETED_FILTER, ...approvedFilter } }],
          as: 'modulesData',
        },
      },

      {
        $addFields: {
          modules: {
            $map: {
              input: '$modulesIds',
              as: 'moduleId',
              in: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$modulesData',
                      cond: { $eq: ['$$this._id', '$$moduleId'] },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },

      // Remove null entries from modules that were filtered out by approval
      ...(requireApproved
        ? [
            {
              $addFields: {
                modules: { $filter: { input: '$modules', as: 'm', cond: { $ne: ['$$m', null] } } },
              },
            },
          ]
        : []),

      {
        $lookup: {
          from: 'course_contents',
          let: { contentIds: { $reduce: { input: '$modules.contentsIds', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } } },
          pipeline: [{ $match: { $expr: { $in: ['$_id', '$$contentIds'] }, ...NOT_DELETED_CONTENT_FILTER, ...approvedFilter } }],
          as: 'allContents',
        },
      },

      {
        $addFields: {
          modules: {
            $map: {
              input: '$modules',
              as: 'module',
              in: {
                $mergeObjects: [
                  '$$module',
                  {
                    contents: {
                      $filter: {
                        input: {
                          $map: {
                            input: '$$module.contentsIds',
                            as: 'contentId',
                            in: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: '$allContents',
                                    cond: { $eq: ['$$this._id', '$$contentId'] },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                        },
                        as: 'c',
                        cond: { $ne: ['$$c', null] },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          modulesData: 0,
          allContents: 0,
        },
      },
    ]);
    if (session) {
      aggregate.session(session);
    }
    const result = await aggregate.exec();

    if (!result || result.length === 0) {
      throw new NotFoundException('Course not found');
    }

    // When serving to a learner (requireApproved === true, the only caller path
    // being getDetailedEnrolledCourse), strip quiz answer keys and every
    // student's submissions/attendance from the content tree.
    if (requireApproved) {
      for (const moduleItem of result[0].modules ?? []) {
        sanitizeContentsForStudent(moduleItem?.contents);
      }
    }

    return result[0];
  }

  async setPublishStatus(organizationId: string, courseId: string, publishStatus: PublishStatus): Promise<Course> {
    const course = await this.courseModel.findOne({
      _id: convertObjectValuesToObjectId(courseId),
      organizationId: convertObjectValuesToObjectId(organizationId),
    });
    if (!course) throw new NotFoundException('Course not found');

    const isPublishing = publishStatus === PublishStatus.PUBLISHED;
    course.publishStatus = publishStatus;
    course.publishedAt = isPublishing ? new Date() : null;

    if (!course.settings) {
      course.settings = {} as SettingsSchema;
    }
    course.settings.isPublished = isPublishing;
    course.settings.isDraft = !isPublishing;
    course.markModified('settings');

    await course.save();
    return course;
  }

  async getCoursePrice({
    currency,
    courseId,
    billingCycle,
  }: {
    courseId: string;
    billingCycle: BillingCycle;
    currency: Currency;
  }): Promise<{ price: number; course: Course }> {
    const course = await this.findOneById(courseId);
    if (!course) throw new NotFoundException(CourseErrors.COURSE_NOT_FOUND);

    // Free courses are seeded/created without a pricing object — never index it.
    if (!course.isPaid) {
      return { price: 0, course };
    }

    const pricingDetails = course.pricing?.[billingCycle];
    if (!pricingDetails) throw new BadRequestException(CourseErrors.COURSE_PRICE_NOT_AVAILABLE);

    if (currency === pricingDetails.originalCurrency && !!pricingDetails.originalPrice) {
      const basePrice = pricingDetails.originalPrice;
      return { price: this.applyCoursePricingDiscount(basePrice, pricingDetails), course };
    }

    const priceUSD = pricingDetails.priceUSD;
    if (!priceUSD) throw new BadRequestException(CourseErrors.COURSE_PRICE_NOT_AVAILABLE);

    const basePrice = this.currencyService.convertFromUSD(priceUSD, currency);
    return { price: this.applyCoursePricingDiscount(basePrice, pricingDetails), course };
  }

  /** Returns the discounted price if a discount is currently active, otherwise the base price. */
  private applyCoursePricingDiscount(
    basePrice: number,
    pricing: { discountPercentage?: number; discountStartDate?: Date; discountEndDate?: Date }
  ): number {
    if (!pricing.discountPercentage || pricing.discountPercentage <= 0) return basePrice;
    const now = new Date();
    if (pricing.discountStartDate && now < new Date(pricing.discountStartDate)) return basePrice;
    if (pricing.discountEndDate && now > new Date(pricing.discountEndDate)) return basePrice;
    return +(basePrice * (1 - pricing.discountPercentage / 100)).toFixed(2);
  }
}
