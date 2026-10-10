import { BadRequestException, Controller, Get, Body, Patch, Param, UseGuards, Request, Query, Post, Put } from '@nestjs/common';
import { CreateEnrollmentHttpDto } from '../dto/create-enrollment.http.dto';
import { PaymentMethod, PaymentPurpose } from '@lms-organization/shared-types';

import { EnrollmentService } from '../services/enrollment.service';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PaginateOptionsWithSearch } from 'src/utils/types/PaginateOptionsWithSearch';
import { PaymentOrchestratorService } from 'src/payment/services/payment-orchestrator.service';
import { CourseService } from 'src/course/services/course/course.service';
import { SubmitQuizDto } from '../dto/quiz-submission.dto';
import { QuizService } from 'src/course/services/content/quiz/quiz.service';
import { AssignmentService } from 'src/course/services/content/assignment/assignment.service';
import { GradeAssignmentDto, SubmitAssignmentDto } from '../dto/assignment-submission.dto';
import { displayNameFromUser } from 'src/user/utils/display-name.util';
import { ActiveEnrollmentGuard } from '../guards/active-enrollment.guard';
import { RenewEnrollmentDto } from '../dto/renew-enrollment.dto';
import { EnrollmentProgressService } from '../services/enrollment.progress.service';
import { RecordContentAccessDto, RecordTimeSpentDto, UpdateVideoProgressDto } from '../dto/progress.dto';

@Controller('enrollment')
export class EnrollmentHttpController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly paymentService: PaymentOrchestratorService,
    private readonly courseService: CourseService,
    private readonly quizService: QuizService,
    private readonly assignmentService: AssignmentService,
    private readonly enrollmentProgressService: EnrollmentProgressService
  ) {}

  @UseGuards(AuthGuard)
  @Post('/')
  async createEnrollmentFree(@Request() req: IUserRequest, @Body() body: CreateEnrollmentHttpDto) {
    if (body.paymentMethod === PaymentMethod.WALLET) {
      return await this.enrollmentService.enrollWithWallet(req.user._id.toString(), body.courseId, body.billingCycle);
    } else {
      const { price: coursePrice, course } = await this.courseService.getCoursePrice({
        courseId: body.courseId,
        billingCycle: body.billingCycle,
        currency: body.currency,
      });
      return await this.paymentService.createPaymentUrl({
        provider: body.provider,
        user: req.user,
        amount: coursePrice,
        currency: body.currency,
        method: body.paymentMethod,
        purpose: PaymentPurpose.COURSE_PURCHASE,
        course,
        billingCycle: body.billingCycle,
      });
    }
  }

  @UseGuards(AuthGuard)
  @Get()
  async getUserEnrollments(@Request() req: IUserRequest, @Query() options: PaginateOptionsWithSearch) {
    return await this.enrollmentService.getUserEnrollments(req.user._id.toString(), options);
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @Post('/progress/record-access')
  async httpRecordContentAccess(@Request() req: IUserRequest, @Body() body: RecordContentAccessDto) {
    return await this.enrollmentProgressService.recordContentAccess(body.enrollmentId, req.user._id.toString(), body.contentId, {
      videoPositionSeconds: body.videoPositionSeconds,
      contentTitle: body.contentTitle,
      contentType: body.contentType,
    });
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @Post('/progress/record-time-spent')
  async httpRecordTimeSpent(@Request() req: IUserRequest, @Body() body: RecordTimeSpentDto) {
    const enrollment = await this.enrollmentProgressService.recordTimeSpent(
      body.enrollmentId,
      req.user._id.toString(),
      body.contentId,
      body.additionalMinutes
    );
    return { timeSpentMinutes: enrollment.timeSpentMinutes };
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @Post('/progress/update-video-position')
  async httpUpdateVideoProgress(@Request() req: IUserRequest, @Body() body: UpdateVideoProgressDto) {
    return await this.enrollmentProgressService.updateVideoProgress(body.enrollmentId, req.user._id.toString(), body.contentId, body.positionSeconds);
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async getDetailedEnrolledCourse(@Request() req: IUserRequest, @Param('id') id: string) {
    return await this.enrollmentService.getDetailedEnrolledCourse(id, req.user._id.toString());
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @Patch('/toggle-content-complete')
  async toggleContentComplete(
    @Request() req: IUserRequest,
    @Body()
    body: { enrollmentId: string; contentId: string; completed: boolean }
  ) {
    return await this.enrollmentService.toggleContentComplete(body.enrollmentId, req.user._id.toString(), body.contentId, body.completed);
  }

  @UseGuards(AuthGuard)
  @Post('/:enrollmentId/renew')
  async renewEnrollment(@Param('enrollmentId') enrollmentId: string, @Body() body: RenewEnrollmentDto, @Request() req: IUserRequest) {
    const userId = req.user._id.toString();

    if (body.paymentMethod === PaymentMethod.WALLET) {
      return this.enrollmentService.renewEnrollmentWithWallet(userId, enrollmentId, body.billingCycle);
    }

    // For external payment providers, provider and currency are required
    if (!body.provider || !body.currency) {
      throw new BadRequestException('provider and currency are required for direct payment');
    }

    const enrollment = await this.enrollmentService.getSingleEnrollment(enrollmentId, userId);
    const { price: coursePrice, course } = await this.courseService.getCoursePrice({
      courseId: enrollment.courseId.toString(),
      billingCycle: body.billingCycle,
      currency: body.currency,
    });

    return this.paymentService.createPaymentUrl({
      provider: body.provider,
      user: req.user,
      amount: coursePrice,
      currency: body.currency,
      method: body.paymentMethod,
      purpose: PaymentPurpose.COURSE_PURCHASE,
      course,
      billingCycle: body.billingCycle,
      metadata: { enrollmentId },
    });
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @Put('/content/submit-quiz')
  async submitQuiz(@Body() payload: SubmitQuizDto, @Request() req: IUserRequest) {
    const result = await this.quizService.submitQuiz({
      ...payload,
      studentId: req.user._id.toString(),
    });

    await this.enrollmentService.toggleContentComplete(payload.enrollmentId, req.user._id.toString(), payload.quizId, true);

    return {
      message: 'Quiz submitted successfully',
      result,
      success: true,
    };
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @Put('/content/submit-assignment')
  async submitAssignment(@Body() payload: SubmitAssignmentDto, @Request() req: IUserRequest) {
    payload.studentId = req.user._id.toString();
    payload.studentName = displayNameFromUser(req.user);
    await this.enrollmentService.getSingleEnrollment(payload.enrollmentId, payload.studentId);
    const result = await this.assignmentService.submitAssignment(payload);

    return {
      message: 'Assignment submitted successfully',
      result,
      success: true,
    };
  }

  @UseGuards(AuthGuard)
  @Get('/content/:assignmentId/submissions')
  async getAssignmentSubmissions(
    @Param('assignmentId') assignmentId: string,
    @Query('studentId') studentId: string | undefined,
    @Request() req: IUserRequest
  ) {
    const resolvedStudentId = studentId ?? req.user._id.toString();
    return this.assignmentService.getAssignmentSubmissions(assignmentId, resolvedStudentId);
  }

  @UseGuards(AuthGuard)
  @Post('/content/grade-assignment')
  async gradeAssignment(@Body() payload: GradeAssignmentDto) {
    const result = await this.assignmentService.gradeAssignmentSubmission(payload);
    return {
      message: 'Assignment graded successfully',
      result,
      success: true,
    };
  }
}
