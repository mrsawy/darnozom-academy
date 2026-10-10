import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Req } from '@nestjs/common';
import { CreateCourseDto } from '../../dto/create-course.dto';
import { UpdateCourseDto } from '../../dto/update-course.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { CreateCourseContentDto } from '../../dto/create-course-content.dto';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { CourseModulesService } from '../../services/module/course-modules.service';
import { CourseFeaturedService } from '../../services/course/course-featured.service';
import { CreateCourseModuleDto } from '../../dto/create-course-module.dto';
import { ICourseFilters } from 'src/utils/types/CourseFilters';
import { FileService } from 'src/file/file.service';
import { ContentType } from '../../enum/contentType.enum';
import { VideoType } from '../../enum/videoType.enum';
import { CourseService } from '../../services/course/course.service';
import { CourseContentService } from '../../services/content/course-content.service';
import { CourseContentQueryService } from '../../services/content/course-content-query.service';
import mongoose, { PaginateOptions } from 'mongoose';
import { CourseModuleEntity } from '../../entities/course-module.entity';
import { CourseContent } from '../../entities/course-content.entity';
import { FeaturedCourse } from '../../types/featured-course.interface';
import { CheckSubscriptionLimit } from 'src/subscription/decorators/check-subscription-limit.decorator';
import { SubscriptionService } from 'src/subscription/services/subscription.service';

@Controller('course')
export class CourseControllerHttp {
  constructor(
    private readonly courseService: CourseService,
    private readonly courseContentService: CourseContentService,
    private readonly courseContentQueryService: CourseContentQueryService,
    private readonly courseModulesService: CourseModulesService,
    private readonly courseFeaturedService: CourseFeaturedService,
    private readonly fileService: FileService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @Get()
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.COURSE })
  async getAllCourses(@Query() options: PaginateOptions & ICourseFilters) {
    const courses = await this.courseService.findAll(undefined, options);
    return courses;
  }

  @Get('featured')
  async getFeatured(@Query('limit') limit?: string): Promise<FeaturedCourse[]> {
    const limitNum = limit ? Number.parseInt(limit, 10) : 10;
    return this.courseFeaturedService.getFeatured(limitNum);
  }

  @Get('instructor/:instructorId')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.COURSE })
  async getCoursesByInstructor(@Param('instructorId') instructorId: string, @Query() options: PaginateOptions) {
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);
    return this.courseService.findAll(
      {
        $or: [{ instructorId: instructorObjectId }, { coInstructorsIds: instructorObjectId }],
      },
      options
    );
  }

  @Get(':id')
  async getCourseWithModule(
    @Param('id') id: string,
    @Query('includeContents') includeContents?: string,
    @Query('contentSelect') contentSelect?: string
  ) {
    const include = includeContents !== 'false' && includeContents !== '';
    return await this.courseService.getCourseWithOrderedModules(id, include, contentSelect ?? 'title type', true);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COURSE })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    const result = await this.courseService.update({ ...updateCourseDto, courseId: id });
    return { success: true, data: result, message: 'Course updated successfully' };
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.COURSE })
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: IUserRequest) {
    await this.courseService.deleteCourses([id], req.user._id?.toString());
    return { success: true, message: 'Course deleted successfully' };
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.COURSE })
  @CheckSubscriptionLimit('coursesPerSubscription')
  @Post()
  async create(@Body() createCourseDto: CreateCourseDto, @Request() req: IUserRequest) {
    const organizationId = req.user.organizationId?.toString() ?? '';

    const user = req.user;
    if (!user || !user._id) {
      throw new Error('User not found in request');
    }

    const result = await this.courseService.create({
      organizationId,
      createdBy: req.user._id.toString(),
      ...createCourseDto,
    });

    void this.subscriptionService.incrementUsage(organizationId, 'coursesUsed');
    return result;
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.CONTENT })
  @Post('content')
  async createCourseContent(@Body() createCourseContentDto: CreateCourseContentDto, @Req() req: IUserRequest) {
    const orgId = req.user.organizationId;
    const username = req.user.username;
    const orgIdStr = orgId instanceof mongoose.Types.ObjectId ? orgId.toString() : typeof orgId === 'string' ? orgId : orgId ? String(orgId) : '';
    const usernameStr = typeof username === 'string' ? username : username ? String(username) : '';
    createCourseContentDto.organizationId = orgIdStr;
    createCourseContentDto.createdBy = usernameStr;

    const createdContent = await this.courseContentService.createCourseContent(createCourseContentDto);

    return {
      message: 'Course content created successfully',
      createdContent,
    };
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard(
    { action: Actions.READ, subject: Subjects.MODULE },
    { action: Actions.READ, subject: Subjects.COURSE },
    { action: Actions.READ, subject: Subjects.CONTENT }
  )
  @Get('module/:id/:moduleId')
  async getModuleWithOrderedContents(@Param('id') _id: string, @Param('moduleId') moduleId: string) {
    const result = await this.courseModulesService.findModuleWithOrderedContents(moduleId);
    return result as unknown as CourseModuleEntity & { contents: (CourseContent & { _id: mongoose.Types.ObjectId })[] }[];
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.MODULE })
  @Post('/module')
  async createModule(@Body() createModuleDto: CreateCourseModuleDto, @Req() req: IUserRequest) {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const orgIdStr = orgId instanceof mongoose.Types.ObjectId ? orgId.toString() : typeof orgId === 'string' ? orgId : orgId ? String(orgId) : '';
    const userIdStr =
      userId instanceof mongoose.Types.ObjectId ? userId.toString() : typeof userId === 'string' ? userId : userId ? String(userId) : '';
    createModuleDto.organizationId = orgIdStr;
    createModuleDto.createdBy = userIdStr;
    return await this.courseModulesService.create(createModuleDto);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.MODULE })
  @Patch('/module/:moduleId')
  async updateModule(@Param('moduleId') moduleId: string, @Body() updateModuleDto: Partial<CreateCourseModuleDto>) {
    return await this.courseModulesService.update(moduleId, updateModuleDto);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COURSE })
  @Patch(':id/reorder')
  async reorderModules(@Param('id') id: string, @Body() body: { newOrder: string[] }) {
    return await this.courseService.reorderModules(id, body.newOrder);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COURSE })
  @Post(':id/module/:moduleId')
  async addModuleToCourse(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    return await this.courseService.addModuleToCourse(id, moduleId);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get('/content/:id')
  async getContent(@Param('id') id: string, @Query('studentId') studentId?: string) {
    const result = await this.courseContentQueryService.getContent(id, null, studentId ?? null, true);
    if (result.type === ContentType.VIDEO && 'videoType' in result && result.videoType === VideoType.UPLOAD) {
      const fileUrl = await this.fileService.getFileUrl(result.fileKey);
      result.videoUrl = fileUrl;
    }

    return result;
  }
}
