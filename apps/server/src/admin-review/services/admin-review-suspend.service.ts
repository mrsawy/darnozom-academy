import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import { EntityStatus, UserStatus } from '@darnozom/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/user/entities/user.entity';
import { withDeletedQueryOptions } from 'src/utils/soft-delete';

@Injectable()
export class AdminReviewSuspendService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @InjectModel(Course.name)
    private readonly courseModel: PaginateModel<Course>,
    @InjectModel('CourseModule')
    private readonly moduleModel: PaginateModel<CourseModuleEntity>,
    @InjectModel(CourseContent.name)
    private readonly contentModel: PaginateModel<CourseContent>,
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<User>
  ) {}

  async suspendOrganization(orgId: string) {
    const org = await this.organizationModel.findById(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    org.status = EntityStatus.SUSPENDED;
    return org.save();
  }

  async unsuspendOrganization(orgId: string) {
    const org = await this.organizationModel.findById(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    org.status = EntityStatus.ACTIVE;
    return org.save();
  }

  async suspendCourse(courseId: string) {
    const course = await this.courseModel.findById(courseId).setOptions(withDeletedQueryOptions());
    if (!course) throw new NotFoundException('Course not found');
    course.status = EntityStatus.SUSPENDED;
    return course.save();
  }

  async unsuspendCourse(courseId: string) {
    const course = await this.courseModel.findById(courseId).setOptions(withDeletedQueryOptions());
    if (!course) throw new NotFoundException('Course not found');
    course.status = EntityStatus.ACTIVE;
    return course.save();
  }

  async suspendModule(moduleId: string) {
    const module = await this.moduleModel.findById(moduleId).setOptions(withDeletedQueryOptions());
    if (!module) throw new NotFoundException('Module not found');

    (module as CourseModuleEntity).status = EntityStatus.SUSPENDED;
    return module.save();
  }

  async unsuspendModule(moduleId: string) {
    const module = await this.moduleModel.findById(moduleId).setOptions(withDeletedQueryOptions());
    if (!module) throw new NotFoundException('Module not found');

    (module as CourseModuleEntity).status = EntityStatus.ACTIVE;
    return module.save();
  }

  async suspendContent(contentId: string) {
    const content = await this.contentModel.findById(contentId).setOptions(withDeletedQueryOptions());
    if (!content) throw new NotFoundException('Content not found');
    content.status = EntityStatus.SUSPENDED;
    return content.save();
  }

  async unsuspendContent(contentId: string) {
    const content = await this.contentModel.findById(contentId).setOptions(withDeletedQueryOptions());
    if (!content) throw new NotFoundException('Content not found');
    content.status = EntityStatus.ACTIVE;
    return content.save();
  }

  async suspendUser(userId: string) {
    const user = await this.userModel.findById(userId).setOptions(withDeletedQueryOptions());
    if (!user) throw new NotFoundException('User not found');
    user.status = UserStatus.SUSPENDED;
    return user.save();
  }

  async unsuspendUser(userId: string) {
    const user = await this.userModel.findById(userId).setOptions(withDeletedQueryOptions());
    if (!user) throw new NotFoundException('User not found');
    user.status = UserStatus.ACTIVE;
    return user.save();
  }
}
