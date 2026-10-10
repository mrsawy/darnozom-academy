import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import { ApprovalStatus, VerificationStatus } from '@lms-organization/shared-types';
import { Category } from 'src/category/entities/category.entity';
import { Course } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/user/entities/user.entity';
import { buildPendingReviewFilter } from 'src/utils/approval.utils';

@Injectable()
export class AdminReviewStatsService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: PaginateModel<Category>,
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>,
    @InjectModel('CourseModule')
    private readonly moduleModel: PaginateModel<CourseModuleEntity>,
    @InjectModel(CourseContent.name)
    private readonly contentModel: PaginateModel<CourseContent>,
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<User>
  ) {}

  async getDashboardStats() {
    const pendingFilter = buildPendingReviewFilter();

    const [pendingCategories, pendingCourses, pendingModules, pendingContents, totalOrganizations, totalUsers, pendingVerifications] =
      await Promise.all([
        this.categoryModel.countDocuments(pendingFilter),
        this.courseModel.countDocuments(pendingFilter),
        this.moduleModel.countDocuments(pendingFilter),
        this.contentModel.countDocuments(pendingFilter),
        this.organizationModel.countDocuments(),
        this.userModel.countDocuments({ deletedAt: null }),
        this.organizationModel.countDocuments({
          approvalStatus: ApprovalStatus.PENDING,
          'verification.identity.status': VerificationStatus.PENDING,
        }),
      ]);

    return {
      pendingCategories,
      pendingCourses,
      pendingModules,
      pendingContents,
      totalOrganizations,
      totalUsers,
      pendingVerifications,
    };
  }
}
