import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel, Types } from 'mongoose';
import { AdminReviewErrors } from '@darnozom/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/user/entities/user.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Plan } from 'src/plan/entities/plan.entity';
import { CourseService } from 'src/course/services/course/course.service';
import { CourseContentService } from 'src/course/services/content/course-content.service';
import { EnrollmentService } from 'src/enrollment/services/enrollment.service';
import { UserService } from 'src/user/services/user.service';
import { SubscriptionAdminService } from 'src/subscription/services/subscription.admin.service';
import type { AdminPaginateDto } from '../dto/admin-paginate.dto';
import type { SetOrganizationPlanDto } from '../dto/set-organization-plan.dto';
import type { UpdateOrganizationSubscriptionDto } from '../dto/update-organization-subscription.dto';
import { withDeletedQueryOptions } from 'src/utils/soft-delete';
import { AdminReviewSupport, stripLearnerFieldsFromContentPlain } from './admin-review.support';

@Injectable()
export class AdminReviewOrganizationService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<User>,
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>,
    @InjectModel('CourseModule')
    private readonly moduleModel: PaginateModel<CourseModuleEntity>,
    @InjectModel(CourseContent.name)
    private readonly contentModel: PaginateModel<CourseContent>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: PaginateModel<Enrollment>,
    private readonly courseService: CourseService,
    private readonly courseContentService: CourseContentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userService: UserService,
    private readonly subscriptionAdminService: SubscriptionAdminService,
    private readonly support: AdminReviewSupport
  ) {}

  async getOrganizations(dto: AdminPaginateDto) {
    const filter = this.support.buildSearchFilter<Organization>(dto.search, ['name']);
    const result = await this.organizationModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      sort: { createdAt: -1 },
      lean: true,
    });

    const subscriptionIds = result.docs
      .map((org) => {
        const id = (org as Organization & { subscriptionId?: Types.ObjectId | string | null }).subscriptionId;
        return id == null ? null : String(id);
      })
      .filter((id): id is string => id != null);

    const statusById = await this.subscriptionAdminService.findStatusesByIds(subscriptionIds);

    return {
      ...result,
      docs: result.docs.map((org) => {
        const subscriptionId = (org as Organization & { subscriptionId?: Types.ObjectId | string | null }).subscriptionId;
        const key = subscriptionId == null ? null : String(subscriptionId);
        return {
          ...org,
          subscriptionStatus: key ? (statusById.get(key) ?? null) : null,
        };
      }),
    };
  }

  async getOrganizationDetails(orgId: string) {
    const organization = await this.organizationModel.findById(orgId);
    if (!organization) throw new NotFoundException(AdminReviewErrors.ORGANIZATION_NOT_FOUND);

    const orgFilter = this.support.organizationIdMatch(orgId);
    const [usersCount, coursesCount, subscription] = await Promise.all([
      this.userModel.countDocuments({ ...orgFilter, deletedAt: null }),
      this.courseModel.countDocuments(orgFilter),
      this.subscriptionAdminService.findCurrentForOrganization(orgId),
    ]);

    const planDoc = subscription ? ((subscription as unknown as { plan?: Plan }).plan ?? null) : null;

    return {
      ...organization.toObject(),
      usersCount,
      coursesCount,
      plan: planDoc
        ? {
            _id: String(planDoc._id),
            name: planDoc.name,
            tier: planDoc.tier,
            features: planDoc.features,
            isActive: planDoc.isActive,
          }
        : null,
      subscription: subscription
        ? {
            _id: String(subscription._id),
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            startsAt: subscription.startsAt,
            endsAt: subscription.endsAt,
            nextBillingAt: subscription.nextBillingAt,
            usage: subscription.usage,
          }
        : null,
    };
  }

  async setOrganizationPlan(dto: SetOrganizationPlanDto) {
    const organization = await this.organizationModel.findById(dto.orgId).select('_id').lean().exec();
    if (!organization) throw new NotFoundException(AdminReviewErrors.ORGANIZATION_NOT_FOUND);

    return this.subscriptionAdminService.assignPlan(dto.orgId, dto.planId, dto.billingCycle, dto.endsAt);
  }

  async updateOrganizationSubscription(dto: UpdateOrganizationSubscriptionDto) {
    const organization = await this.organizationModel.findById(dto.orgId).select('_id').lean().exec();
    if (!organization) throw new NotFoundException(AdminReviewErrors.ORGANIZATION_NOT_FOUND);

    const subscription = await this.subscriptionAdminService.findCurrentForOrganization(dto.orgId);
    if (!subscription) throw new NotFoundException(AdminReviewErrors.SUBSCRIPTION_NOT_FOUND);

    return this.subscriptionAdminService.updatePeriod(
      String(subscription._id),
      {
        billingCycle: dto.billingCycle,
        endsAt: dto.endsAt,
        nextBillingAt: dto.nextBillingAt,
      },
      subscription.startsAt
    );
  }

  async suspendOrganizationSubscription(orgId: string) {
    const organization = await this.organizationModel.findById(orgId).select('_id').lean().exec();
    if (!organization) throw new NotFoundException(AdminReviewErrors.ORGANIZATION_NOT_FOUND);

    const subscription = await this.subscriptionAdminService.findCurrentForOrganization(orgId);
    if (!subscription) throw new NotFoundException(AdminReviewErrors.SUBSCRIPTION_NOT_FOUND);

    return this.subscriptionAdminService.suspend(String(subscription._id));
  }

  async cancelOrganizationSubscription(orgId: string) {
    const organization = await this.organizationModel.findById(orgId).select('_id').lean().exec();
    if (!organization) throw new NotFoundException(AdminReviewErrors.ORGANIZATION_NOT_FOUND);

    const subscription = await this.subscriptionAdminService.findCurrentForOrganization(orgId);
    if (!subscription) throw new NotFoundException(AdminReviewErrors.SUBSCRIPTION_NOT_FOUND);

    return this.subscriptionAdminService.cancel(String(subscription._id));
  }

  async getOrganizationUsers(orgId: string, dto?: AdminPaginateDto) {
    const searchFilter = this.support.buildSearchFilter<User>(dto?.search, ['firstName', 'lastName', 'email', 'username']);
    // Platform admin sees all users including soft-deleted (audit).
    return this.userModel.paginate(
      { ...this.support.organizationIdMatch(orgId), ...searchFilter },
      {
        ...this.support.extractPaginateOptions(dto),
        ...withDeletedQueryOptions(),
        select: '-password',
        sort: { createdAt: -1 },
        lean: true,
        populate: [{ path: 'deletedByUser', select: 'firstName lastName username email' }],
      }
    );
  }

  async getOrganizationCourses(orgId: string, dto?: AdminPaginateDto) {
    const searchFilter = this.support.buildSearchFilter<Course>(dto?.search, ['name', 'description']);
    return this.courseModel.paginate(
      { ...this.support.organizationIdMatch(orgId), ...searchFilter },
      {
        ...this.support.extractPaginateOptions(dto),
        ...withDeletedQueryOptions(),
        populate: [
          { path: 'instructor', select: 'firstName lastName username' },
          { path: 'categories', select: 'name' },
          { path: 'deletedByUser', select: 'firstName lastName username email' },
        ],
        sort: { createdAt: -1 },
        lean: true,
      }
    );
  }

  async getOrganizationContents(orgId: string, dto?: AdminPaginateDto) {
    const searchFilter = this.support.buildSearchFilter<CourseContent>(dto?.search, ['title', 'description']);
    const result = await this.contentModel.paginate(
      { ...this.support.organizationIdMatch(orgId), ...searchFilter },
      {
        ...this.support.extractPaginateOptions(dto),
        ...withDeletedQueryOptions(),
        populate: [
          { path: 'courseId', select: 'name' },
          { path: 'moduleId', select: 'title' },
          { path: 'deletedByUser', select: 'firstName lastName username email' },
        ],
        sort: { createdAt: -1 },
        lean: true,
      }
    );
    return {
      ...result,
      docs: result.docs.map((d) => stripLearnerFieldsFromContentPlain({ ...d } as Record<string, unknown>)),
    };
  }

  async getOrganizationEnrollments(orgId: string, dto?: AdminPaginateDto) {
    const searchFilter = this.support.buildSearchFilter<Enrollment>(dto?.search, []);
    return this.enrollmentModel.paginate(
      { ...this.support.organizationIdMatch(orgId), ...searchFilter },
      {
        ...this.support.extractPaginateOptions(dto),
        ...withDeletedQueryOptions(),
        populate: [
          { path: 'userId', select: 'firstName lastName email username' },
          { path: 'courseId', select: 'name' },
          { path: 'deletedByUser', select: 'firstName lastName username email' },
        ],
        sort: { enrolledAt: -1 },
        lean: true,
      }
    );
  }

  async deleteOrganizationUser(orgId: string, userId: string, deletedById?: string) {
    const user = await this.userModel.findOne({ _id: userId, ...this.support.organizationIdMatch(orgId) });
    if (!user) throw new NotFoundException('User not found in this organization');
    await this.userService.delete({ _id: userId }, deletedById);
    return { success: true };
  }

  async deleteOrganizationCourse(orgId: string, courseId: string, deletedById?: string) {
    const course = await this.courseModel.findOne({ _id: courseId, ...this.support.organizationIdMatch(orgId) });
    if (!course) throw new NotFoundException('Course not found in this organization');
    await this.courseService.deleteCourses([courseId], deletedById);
    return { success: true };
  }

  async deleteOrganizationContent(orgId: string, contentId: string, deletedById?: string) {
    const content = await this.contentModel.findOne({ _id: contentId, ...this.support.organizationIdMatch(orgId) });
    if (!content) throw new NotFoundException('Content not found in this organization');
    await this.courseContentService.deleteContents([contentId], null, deletedById);
    return { success: true };
  }

  async deleteOrganizationEnrollment(orgId: string, enrollmentId: string, deletedById?: string) {
    const enrollment = await this.enrollmentModel.findOne({
      _id: enrollmentId,
      ...this.support.organizationIdMatch(orgId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found in this organization');
    await this.enrollmentService.delete({ _id: enrollmentId }, deletedById);
    return { success: true };
  }

  async getOrganizationCourseModules(orgId: string, courseId: string, dto?: AdminPaginateDto) {
    const orgFilter = this.support.organizationIdMatch(orgId);
    // Soft-deleted courses remain drillable for platform admin audit.
    const course = await this.courseModel.findOne({ _id: courseId, ...orgFilter }).setOptions(withDeletedQueryOptions());
    if (!course) throw new NotFoundException('Course not found in this organization');

    const searchFilter = this.support.buildSearchFilter<CourseModuleEntity>(dto?.search, ['title', 'description']);
    return this.moduleModel.paginate(
      { courseId: new Types.ObjectId(courseId), ...searchFilter },
      {
        ...this.support.extractPaginateOptions(dto),
        ...withDeletedQueryOptions(),
        populate: [{ path: 'deletedByUser', select: 'firstName lastName username email' }],
        sort: { createdAt: 1 },
        lean: true,
      }
    );
  }

  async getOrganizationModuleContents(orgId: string, moduleId: string, dto?: AdminPaginateDto) {
    const orgFilter = this.support.organizationIdMatch(orgId);
    const module = await this.moduleModel.findOne({ _id: moduleId, ...orgFilter }).setOptions(withDeletedQueryOptions());
    if (!module) throw new NotFoundException('Module not found in this organization');

    const searchFilter = this.support.buildSearchFilter<CourseContent>(dto?.search, ['title', 'description']);
    const result = await this.contentModel.paginate(
      { moduleId: new Types.ObjectId(moduleId), ...searchFilter },
      {
        ...this.support.extractPaginateOptions(dto),
        ...withDeletedQueryOptions(),
        populate: [{ path: 'deletedByUser', select: 'firstName lastName username email' }],
        sort: { createdAt: 1 },
        lean: true,
      }
    );
    return {
      ...result,
      docs: result.docs.map((d) => stripLearnerFieldsFromContentPlain({ ...d } as Record<string, unknown>)),
    };
  }
}
