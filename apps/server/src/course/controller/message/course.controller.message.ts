import { BadRequestException, Controller, UseGuards } from '@nestjs/common';
import { CourseService } from '../../services/course/course.service';
import { CourseFeaturedService } from '../../services/course/course-featured.service';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { CreateCourseDto } from '../../dto/create-course.dto';
import { UpdateCourseDto } from '../../dto/update-course.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { Types, PaginateOptions } from 'mongoose';
import { ICourseFilters } from 'src/utils/types/CourseFilters';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { Actions, CourseSuccessMessages, PublishStatus, Subjects, UserErrors } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { CheckSubscriptionLimit } from 'src/subscription/decorators/check-subscription-limit.decorator';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { IsEnum, IsString } from 'class-validator';

class SetPublishStatusDto {
  @IsString()
  courseId: string;

  @IsEnum(PublishStatus)
  publishStatus: PublishStatus;
}

@ApplyRpcErrorHandling
@Controller()
export class CourseControllerMessage {
  constructor(
    private courseService: CourseService,
    private courseFeaturedService: CourseFeaturedService,
    private subscriptionService: SubscriptionService
  ) {}

  @MessagePattern('courses.findAllCourses')
  async findAllCourses(
    @Payload(new RpcValidationPipe())
    payload: {
      options: ICourseFilters & { instructorId?: string; $or?: { instructorId?: string; coInstructorsIds?: string }[]; approvedOnly?: boolean };
    }
  ) {
    const query: Record<string, unknown> = {};

    if (payload.options.instructorId) {
      query.instructorId = new Types.ObjectId(payload.options.instructorId);
    }

    if (payload.options.$or && Array.isArray(payload.options.$or)) {
      const processedOr = payload.options.$or.map((condition) => {
        const processedCondition: Record<string, unknown> = {};
        if (condition.instructorId !== undefined) {
          processedCondition.instructorId = new Types.ObjectId(condition.instructorId);
        }
        if (condition.coInstructorsIds !== undefined) {
          processedCondition.coInstructorsIds = new Types.ObjectId(condition.coInstructorsIds);
        }
        return processedCondition;
      });
      query.$or = processedOr;
    }

    const { instructorId, $or, approvedOnly: _ignored, ...filters } = payload.options;
    const courses = await this.courseService.findAll(query, { ...filters, approvedOnly: true });
    return courses;
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.COURSE })
  @UseGuards(AuthGuard)
  @MessagePattern('courses.getAllCourses')
  async getAllCourses(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { options: PaginateOptions }
  ) {
    const user = context.userPayload;
    const courses = await this.courseService.findAll({ organizationId: user.organizationId }, payload.options);

    return courses;
  }

  @MessagePattern('courses.getCourseWithModule')
  async getCourseWithModule(
    @Payload(new RpcValidationPipe())
    payload: {
      courseId: string;
      includeContents?: boolean;
      contentSelect?: string;
      requireApproved?: boolean;
    }
  ) {
    return await this.courseService.getCourseWithOrderedModules(
      payload.courseId,
      payload.includeContents,
      payload.contentSelect,
      payload.requireApproved ?? true
    );
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COURSE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.updateCourse')
  async updateCourse(
    @Payload(new RpcValidationPipe())
    payload: UpdateCourseDto,
    @Ctx() _context: IUserContext
  ) {
    const result = await this.courseService.update(payload);
    return {
      success: true,
      data: result,
      message: CourseSuccessMessages.COURSE_UPDATED,
    };
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.COURSE })
  @CheckSubscriptionLimit('coursesPerSubscription')
  @MessagePattern('course.createCourse')
  async createCourse(
    @Payload(new RpcValidationPipe())
    payload: CreateCourseDto,
    @Ctx() context: IUserContext
  ) {
    const user = context.userPayload;
    if (!user.organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    const organizationId = user.organizationId.toString();
    const result = await this.courseService.create({
      organizationId,
      createdBy: user._id.toString(),
      ...payload,
    });

    await this.subscriptionService.incrementUsage(organizationId, 'coursesUsed');
    return result;
  }

  @MessagePattern('courses.getFeatured')
  async getFeatured(
    @Payload(new RpcValidationPipe())
    payload: {
      limit: number;
    }
  ) {
    const result = await this.courseFeaturedService.getFeatured(payload.limit);
    return result as unknown[];
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COURSE })
  @UseGuards(AuthGuard)
  @MessagePattern('courses.reorderModules')
  async reorderModules(
    @Payload(new RpcValidationPipe())
    payload: { courseId: string; newOrder: string[] },
    @Ctx() _context: IUserContext
  ) {
    return await this.courseService.reorderModules(payload.courseId, payload.newOrder);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.COURSE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.deleteCourse')
  async deleteCourse(
    @Payload(new RpcValidationPipe())
    payload: { courseId: string },
    @Ctx() context: IUserContext
  ) {
    await this.courseService.deleteCourses([payload.courseId], context.userPayload._id?.toString());
    return { success: true, message: CourseSuccessMessages.COURSE_DELETED };
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COURSE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.setPublishStatus')
  async setPublishStatus(
    @Payload(new RpcValidationPipe())
    payload: SetPublishStatusDto,
    @Ctx() context: IUserContext
  ) {
    if (!context.userPayload.organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    const course = await this.courseService.setPublishStatus(context.userPayload.organizationId.toString(), payload.courseId, payload.publishStatus);
    return {
      success: true,
      data: course,
      message: CourseSuccessMessages.PUBLISH_STATUS_UPDATED,
    };
  }
}
