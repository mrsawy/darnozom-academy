import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, ForbiddenException } from '@nestjs/common';
import { CourseContentService } from '../../services/content/course-content.service';
import { CourseContentQueryService } from '../../services/content/course-content-query.service';
import { QuizService } from '../../services/content/quiz/quiz.service';
import { QuizSubmissionsReadService } from '../../services/content/quiz/quiz-submissions-read.service';
import { ContentType } from '../../enum/contentType.enum';
import { VideoType } from '../../enum/videoType.enum';
import { FileService } from 'src/file/file.service';
import { ProjectService } from '../../services/content/project/project.service';
import { LiveSessionService } from '../../services/content/live-session/live-session.service';
import { AssignmentService } from '../../services/content/assignment/assignment.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { CreateCourseContentDto } from '../../dto/create-course-content.dto';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { CheckSubscriptionLimit } from 'src/subscription/decorators/check-subscription-limit.decorator';
import { GradeAssignmentDto, SubmitAssignmentDto } from 'src/enrollment/dto/assignment-submission.dto';
import { displayNameFromUser } from 'src/user/utils/display-name.util';
import { EnrollmentService } from 'src/enrollment/services/enrollment.service';
import { ActiveEnrollmentGuard } from 'src/enrollment/guards/active-enrollment.guard';
import { authorizeContentForRequester } from '../../utils/content-access.util';

@Controller('content')
export class ContentControllerHttp {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizSubmissionsReadService: QuizSubmissionsReadService,
    private readonly courseContentService: CourseContentService,
    private readonly courseContentQueryService: CourseContentQueryService,
    private readonly fileService: FileService,
    private readonly projectService: ProjectService,
    private readonly liveSessionService: LiveSessionService,
    private readonly assignmentService: AssignmentService,
    private readonly enrollmentService: EnrollmentService
  ) {}

  @UseGuards(AuthGuard)
  @CheckSubscriptionLimit('maxStorageGB')
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.CONTENT })
  @Post()
  async createCourseContent(@Body() createCourseContentDto: CreateCourseContentDto, @Req() req: IUserRequest) {
    const user = req.user;
    createCourseContentDto.organizationId = user.organizationId?.toString() ?? '';
    createCourseContentDto.createdBy = user.username ?? '';

    const createdContent = await this.courseContentService.createCourseContent(createCourseContentDto);

    return {
      message: 'Course content created successfully',
      createdContent,
    };
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get('module/:moduleId')
  async getContentsByModuleId(@Param('moduleId') moduleId: string) {
    const result = await this.courseContentQueryService.getContentsByModuleId(moduleId);
    return result;
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get('quiz/:contentId/attempts-left')
  async getQuizAttemptsLeft(@Param('contentId') contentId: string, @Req() req: IUserRequest) {
    const studentId = req.user._id?.toString() ?? '';
    const result = await this.quizService.getQuizAttemptsLeft(contentId, studentId);
    return result;
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get('quiz/:quizContentId/my-submissions')
  async getStudentQuizSubmissions(@Param('quizContentId') quizContentId: string, @Req() req: IUserRequest) {
    const studentId = req.user._id?.toString() ?? '';
    return this.quizSubmissionsReadService.getStudentQuizSubmissions(quizContentId, studentId);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get('quiz/:quizContentId/submissions')
  async getQuizSubmissionsForOrganization(
    @Param('quizContentId') quizContentId: string,
    @Query('page') pageStr: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @Req() req: IUserRequest
  ) {
    const organizationId = req.user.organizationId?.toString();
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }
    const page = Math.max(1, Number.parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(limitStr ?? '20', 10) || 20));
    return this.quizSubmissionsReadService.listQuizSubmissionsForOrganization(quizContentId, organizationId, page, limit);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get('project/:projectId/submissions')
  async getProjectSubmissions(@Param('projectId') projectId: string, @Query('studentId') studentId: string | undefined, @Req() req: IUserRequest) {
    const resolvedStudentId = studentId ?? req.user._id?.toString() ?? '';
    const result = await this.projectService.getProjectSubmissions(projectId, resolvedStudentId);
    return result;
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CONTENT })
  @Post('project/grade')
  async gradeProject(@Body() payload: { projectId: string; studentId: string; score: number; feedback?: string }) {
    const result = await this.projectService.gradeProjectSubmission(payload.projectId, payload.studentId, payload.score, payload.feedback);

    return {
      message: 'Project graded successfully',
      result,
      success: true,
    };
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get('live-session/:liveSessionId/attendance')
  async getLiveSessionAttendance(
    @Param('liveSessionId') liveSessionId: string,
    @Query('studentId') studentId: string | undefined,
    @Req() req: IUserRequest
  ) {
    const resolvedStudentId = studentId ?? req.user._id?.toString() ?? '';
    const result = await this.liveSessionService.getLiveSessionAttendance(liveSessionId, resolvedStudentId);
    return result;
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @Get(':contentId')
  async getContent(@Param('contentId') contentId: string, @Req() req: IUserRequest) {
    const requesterId = req.user._id?.toString() ?? '';

    // Assignment submissions are always filtered to the requester's own id — never
    // trust a client-supplied studentId (that was an IDOR into peers' submissions).
    const result = await this.courseContentQueryService.getContent(contentId, null, requesterId);

    // Owner (same org) gets the full doc; a learner must be actively enrolled and
    // only sees published + approved + active content, sanitized (no answer key).
    await authorizeContentForRequester(result, req.user, this.enrollmentService);

    if (result.type === ContentType.VIDEO && 'videoType' in result && result.videoType === VideoType.UPLOAD) {
      const fileUrl = await this.fileService.getFileUrl(result.fileKey);
      result.videoUrl = fileUrl;
    }
    if (result.type === ContentType.ATTACHMENT && 'fileKey' in result && result.fileKey) {
      result.fileUrl = await this.fileService.getFileUrl(result.fileKey);
    }
    if (result.type === ContentType.ASSIGNMENT && 'fileKey' in result && result.fileKey) {
      result.fileUrl = await this.fileService.getFileUrl(result.fileKey);
    }

    return result;
  }

  @UseGuards(AuthGuard)
  @CheckSubscriptionLimit('maxStorageGB')
  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.CONTENT })
  @Delete(':contentId')
  async deleteContent(@Param('contentId') contentId: string, @Req() req: IUserRequest) {
    return await this.courseContentService.deleteContents([contentId], null, req.user._id?.toString());
  }

  @UseGuards(AuthGuard)
  @CheckSubscriptionLimit('maxStorageGB')
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CONTENT })
  @Patch(':contentId')
  async updateContent(@Param('contentId') contentId: string, @Body() body: CreateCourseContentDto) {
    return await this.courseContentService.updateCourseContent({ ...body, contentId });
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @Post('assignment/submit')
  async submitAssignment(@Body() payload: SubmitAssignmentDto, @Req() req: IUserRequest) {
    payload.studentId = req.user._id?.toString() ?? '';
    payload.studentName = displayNameFromUser(req.user);
    return this.assignmentService.submitAssignment(payload);
  }

  @UseGuards(AuthGuard)
  @Get('assignment/:assignmentId/submissions')
  async getAssignmentSubmissions(
    @Param('assignmentId') assignmentId: string,
    @Query('studentId') studentId: string | undefined,
    @Query('allSubmissions') allSubmissions: string | undefined,
    @Query('page') pageStr: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @Req() req: IUserRequest
  ) {
    const page = Math.max(1, Number.parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(limitStr ?? '5', 10) || 5));
    const listAll = allSubmissions === 'true' || allSubmissions === '1';

    if (listAll) {
      return this.assignmentService.getAssignmentSubmissions(assignmentId, undefined, {
        page,
        limit,
        requesterOrganizationId: req.user.organizationId?.toString(),
      });
    }

    const resolvedStudentId = studentId ?? req.user._id?.toString() ?? '';
    return this.assignmentService.getAssignmentSubmissions(assignmentId, resolvedStudentId);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CONTENT })
  @Post('assignment/grade')
  async gradeAssignment(@Body() payload: GradeAssignmentDto) {
    return this.assignmentService.gradeAssignmentSubmission(payload);
  }
}
