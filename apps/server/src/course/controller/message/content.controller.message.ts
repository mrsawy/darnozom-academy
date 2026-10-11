import { BadRequestException, Controller, ForbiddenException, UseGuards } from '@nestjs/common';
import { CourseService } from '../../services/course/course.service';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { CreateCourseContentDto } from '../../dto/create-course-content.dto';
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
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { Actions, CourseErrors, CourseSuccessMessages, Subjects, UserErrors } from '@darnozom/shared-types';
import { RequirePermissionsGuard, RequiredPermissions } from 'src/role/permission.decorator';
import { PermissionsGuard } from 'src/role/guards/permissions.guard';
import { CheckSubscriptionLimit } from 'src/subscription/decorators/check-subscription-limit.decorator';
import { GradeAssignmentDto, SubmitAssignmentDto } from 'src/enrollment/dto/assignment-submission.dto';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { displayNameFromUser } from 'src/user/utils/display-name.util';
import { EnrollmentService } from 'src/enrollment/services/enrollment.service';
import { authorizeContentForRequester } from '../../utils/content-access.util';
import mongoose from 'mongoose';
@ApplyRpcErrorHandling
@Controller()
export class ContentControllerMessage {
  constructor(
    private courseService: CourseService,
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

  @CheckSubscriptionLimit('maxStorageGB')
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  @MessagePattern('course.createContent')
  async createCourseContent(
    @Payload(new RpcValidationPipe())
    createCourseContentDto: CreateCourseContentDto,
    @Ctx() context: IUserContext
  ) {
    const user = context.userPayload;
    if (!user.organizationId?.toString()) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    createCourseContentDto.organizationId = user.organizationId?.toString();
    createCourseContentDto.createdBy = user.username;

    const createdContent = await this.courseContentService.createCourseContent(convertObjectValuesToObjectId(createCourseContentDto));

    return {
      message: CourseSuccessMessages.CONTENT_CREATED,
      createdContent,
    };
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  @MessagePattern('course.getContentsByModuleId')
  async getContentsByModuleId(
    @Payload(new RpcValidationPipe())
    payload: {
      moduleId: string;
    }
  ) {
    const result = await this.courseContentQueryService.getContentsByModuleId(payload.moduleId);
    return result;
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  @MessagePattern('course.getContent')
  async getContent(
    @Payload(new RpcValidationPipe())
    payload: {
      contentId: string;
    },
    @Ctx() context: IUserContext
  ) {
    const requesterId = context.userPayload._id?.toString() ?? '';

    // Filter assignment submissions to the requester only — no client-supplied studentId (IDOR).
    const result = await this.courseContentQueryService.getContent(payload.contentId, undefined, requesterId);

    // Owner (same org) gets the full doc; a learner must be actively enrolled and
    // only sees published + approved + active content, sanitized (no answer key).
    await authorizeContentForRequester(result, context.userPayload, this.enrollmentService);

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

  @CheckSubscriptionLimit('maxStorageGB')
  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  @MessagePattern('course.deleteContent')
  async deleteContent(
    @Payload(new RpcValidationPipe())
    payload: {
      contentId: string;
    },
    @Ctx() context: IUserContext
  ) {
    return await this.courseContentService.deleteContents([payload.contentId], null, context.userPayload._id?.toString());
  }

  @CheckSubscriptionLimit('maxStorageGB')
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  @MessagePattern('course.updateContent')
  async updateContent(
    @Payload(new RpcValidationPipe())
    payload: CreateCourseContentDto & { contentId: string }
  ) {
    return await this.courseContentService.updateCourseContent(convertObjectValuesToObjectId(payload));
  }

  @MessagePattern('course.getQuizAttemptsLeft')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async getQuizAttemptsLeft(
    @Payload(new RpcValidationPipe())
    payload: { contentId: string },
    @Ctx() context: IUserContext
  ) {
    const studentId = context.userPayload._id.toString();
    const result = await this.quizService.getQuizAttemptsLeft(payload.contentId, studentId);

    return result;
  }

  @MessagePattern('course.getStudentQuizSubmissions')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async getStudentQuizSubmissions(
    @Payload(new RpcValidationPipe())
    payload: { quizContentId: string },
    @Ctx() context: IUserContext
  ) {
    const studentId = context.userPayload._id.toString();
    return this.quizSubmissionsReadService.getStudentQuizSubmissions(payload.quizContentId, studentId);
  }

  @MessagePattern('course.listContentsForOrganization')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async listContentsForOrganization(
    @Payload(new RpcValidationPipe())
    payload: { type: ContentType; page?: number; limit?: number },
    @Ctx() context: IUserContext
  ) {
    return this.courseContentQueryService.listContents(
      {
        organizationId: new mongoose.Types.ObjectId(context.userPayload.organizationId),
        type: payload.type,
      },
      {
        page: payload.page,
        limit: (payload.limit ?? 10) > 50 ? 50 : payload.limit,
      }
    );
  }

  @MessagePattern('course.getQuizSubmissionsForOrganization')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async getQuizSubmissionsForOrganization(
    @Payload(new RpcValidationPipe())
    payload: { quizContentId: string; page?: number; limit?: number },
    @Ctx() context: IUserContext
  ) {
    const organizationId = context.userPayload.organizationId?.toString();
    if (!organizationId) {
      throw new ForbiddenException(CourseErrors.ORGANIZATION_CONTEXT_REQUIRED);
    }
    const page = Math.max(1, Number.isFinite(payload.page) ? Number(payload.page) : 1);
    const limit = Math.min(50, Math.max(1, Number.isFinite(payload.limit) ? Number(payload.limit) : 20));
    return this.quizSubmissionsReadService.listQuizSubmissionsForOrganization(payload.quizContentId, organizationId, page, limit);
  }

  @MessagePattern('course.getProjectSubmissions')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async getProjectSubmissions(
    @Payload(new RpcValidationPipe())
    payload: { projectId: string; studentId?: string },
    @Ctx() context: IUserContext
  ) {
    const studentId = payload.studentId ?? context.userPayload._id.toString();
    const result = await this.projectService.getProjectSubmissions(payload.projectId, studentId);

    return result;
  }

  @MessagePattern('course.gradeProject')
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async gradeProject(
    @Payload(new RpcValidationPipe())
    payload: {
      projectId: string;
      studentId: string;
      score: number;
      feedback?: string;
    }
  ) {
    const result = await this.projectService.gradeProjectSubmission(payload.projectId, payload.studentId, payload.score, payload.feedback);

    return {
      message: CourseSuccessMessages.PROJECT_GRADED,
      result,
      success: true,
    };
  }

  @MessagePattern('course.getLiveSessionAttendance')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async getLiveSessionAttendance(
    @Payload(new RpcValidationPipe())
    payload: { liveSessionId: string; studentId?: string },
    @Ctx() context: IUserContext
  ) {
    const studentId = payload.studentId ?? context.userPayload._id.toString();
    const result = await this.liveSessionService.getLiveSessionAttendance(payload.liveSessionId, studentId);

    return result;
  }

  @MessagePattern('course.submitAssignment')
  @UseGuards(AuthGuard)
  async submitAssignment(
    @Payload(new RpcValidationPipe())
    payload: SubmitAssignmentDto,
    @Ctx() context: IUserContext
  ) {
    payload.studentId = context.userPayload._id.toString();
    payload.studentName = displayNameFromUser(context.userPayload);
    return this.assignmentService.submitAssignment(payload);
  }

  @MessagePattern('course.getAssignmentSubmissions')
  @UseGuards(AuthGuard)
  async getAssignmentSubmissions(
    @Payload(new RpcValidationPipe())
    payload: { assignmentId: string; studentId?: string; allSubmissions?: boolean; page?: number; limit?: number },
    @Ctx() context: IUserContext
  ) {
    const page = Math.max(1, Number.isFinite(payload.page) ? Number(payload.page) : 1);
    const limit = Math.min(50, Math.max(1, Number.isFinite(payload.limit) ? Number(payload.limit) : 5));

    if (payload.allSubmissions === true) {
      return this.assignmentService.getAssignmentSubmissions(payload.assignmentId, undefined, {
        page,
        limit,
        requesterOrganizationId: context.userPayload.organizationId?.toString(),
      });
    }

    const studentId = payload.studentId ?? context.userPayload._id.toString();
    return this.assignmentService.getAssignmentSubmissions(payload.assignmentId, studentId);
  }

  @MessagePattern('course.gradeAssignment')
  @RequiredPermissions({ action: Actions.UPDATE, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard, PermissionsGuard)
  async gradeAssignment(
    @Payload(new RpcValidationPipe())
    payload: GradeAssignmentDto
  ) {
    return this.assignmentService.gradeAssignmentSubmission(payload);
  }
}
