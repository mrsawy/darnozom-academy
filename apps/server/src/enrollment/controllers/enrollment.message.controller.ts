import { BadRequestException, Controller, ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { ActiveEnrollmentGuard } from '../guards/active-enrollment.guard';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import mongoose, { Connection, Model } from 'mongoose';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { CourseService } from 'src/course/services/course/course.service';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { EnrollmentService } from '../services/enrollment.service';
import { PaginateOptionsWithSearch } from 'src/utils/types/PaginateOptionsWithSearch';
import { UserService } from 'src/user/services/user.service';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { AccessType } from '../enum/accessType.enum';
import { Enrollment } from '../entities/enrollment.entity';
import { CreateEnrollmentHttpDto } from '../dto/create-enrollment.http.dto';
import { RenewEnrollmentDto } from '../dto/renew-enrollment.dto';
import { ParentEnrollChildDto, ParentEnrollChildFreeDto } from '../dto/parent-enroll-child.dto';
import {
  PaymentMethod,
  PaymentPurpose,
  Actions,
  CourseErrors,
  Currency,
  EnrollmentErrors,
  EnrollmentSuccessMessages,
  ParentErrors,
  Roles,
  Subjects,
  UserErrors,
} from '@darnozom/shared-types';
import { PaymentOrchestratorService } from 'src/payment/services/payment-orchestrator.service';
import { SubmitQuizDto } from '../dto/quiz-submission.dto';
import { QuizService } from 'src/course/services/content/quiz/quiz.service';
import { ProjectService } from 'src/course/services/content/project/project.service';
import { LiveSessionService } from 'src/course/services/content/live-session/live-session.service';
import { MarkLiveSessionAttendanceDto } from '../dto/live-session-attendance.dto';
import { SubmitProjectDto } from '../dto/project-submission.dto';
import { GradeAssignmentDto, SubmitAssignmentDto } from '../dto/assignment-submission.dto';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { CourseContentQueryService } from 'src/course/services/content/course-content-query.service';
import { ContentType } from 'src/course/enum/contentType.enum';
import { VideoType } from 'src/course/enum/videoType.enum';
import { FileService } from 'src/file/file.service';
import { AssignmentService } from 'src/course/services/content/assignment/assignment.service';
import { displayNameFromUser } from 'src/user/utils/display-name.util';
import { CourseContentDocument } from 'src/course/entities/course-content.entity';
import { Course } from 'src/course/entities/course.entity';
import { CourseModulesService } from 'src/course/services/module/course-modules.service';
import { ParentService } from 'src/user/services/parent.service';

@Controller()
@ApplyRpcErrorHandling
export class EnrollmentMessageController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    private readonly courseService: CourseService,
    private readonly courseModulesService: CourseModulesService,
    private readonly courseContentQueryService: CourseContentQueryService,
    private readonly enrollmentService: EnrollmentService,
    private readonly paymentService: PaymentOrchestratorService,
    private readonly userService: UserService,
    private readonly parentService: ParentService,
    private readonly quizService: QuizService,
    private readonly projectService: ProjectService,
    private readonly liveSessionService: LiveSessionService,
    private readonly assignmentService: AssignmentService,
    private readonly fileService: FileService
  ) {}

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getUserEnrollments')
  async getUserEnrollments(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { options: PaginateOptionsWithSearch }
  ) {
    return await this.enrollmentService.getUserEnrollments(context.userPayload._id.toString(), payload.options);
  }

  // this is used to get a single content in an enrollment without the course data (by the student)
  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getSingleContentInEnrollment')
  async getSingleEnrollment(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { enrollmentId: string; contentId: string }
  ) {
    const enrollment = await this.enrollmentService.getSingleEnrollment(payload.enrollmentId, context.userPayload._id.toString());
    const isExpired = await this.enrollmentService.checkAndExpireEnrollment(enrollment);
    if (isExpired) throw new ForbiddenException(EnrollmentErrors.ENROLLMENT_EXPIRED);
    const studentId = context.userPayload._id.toString();
    const rawContent = await this.courseContentQueryService.getContent(payload.contentId, undefined, studentId);
    const content: CourseContentDocument =
      typeof (rawContent as { toObject?: () => CourseContentDocument }).toObject === 'function'
        ? (rawContent as { toObject: () => CourseContentDocument }).toObject()
        : ({ ...rawContent } as CourseContentDocument);
    if (content.type === ContentType.VIDEO && 'videoType' in content && content.videoType === VideoType.UPLOAD) {
      const fileUrl = await this.fileService.getFileUrl(content.fileKey);
      content.videoUrl = fileUrl;
    }
    if (content.type === ContentType.ATTACHMENT && 'fileKey' in content && content.fileKey) {
      content.fileUrl = await this.fileService.getFileUrl(content.fileKey);
    }
    if (content.type === ContentType.ASSIGNMENT && 'fileKey' in content && content.fileKey) {
      content.fileUrl = await this.fileService.getFileUrl(content.fileKey);
    }

    return {
      enrollment,
      content,
    };
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getCertificate')
  async getCertificate(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { enrollmentId: string }
  ) {
    return await this.enrollmentService.getCertificate(payload.enrollmentId, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ENROLLMENT })
  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getOrganizationEnrollments')
  async getOrganizationEnrollments(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { options: PaginateOptionsWithSearch }
  ) {
    if (!context.userPayload.organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return await this.enrollmentService.getOrganizationEnrollments(context.userPayload.organizationId.toString(), payload.options);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ENROLLMENT })
  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getCourseEnrollments')
  async getCourseEnrollments(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { courseId: string; options: PaginateOptionsWithSearch }
  ) {
    if (!context.userPayload.organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return await this.enrollmentService.getCourseEnrollments(payload.courseId, context.userPayload.organizationId.toString(), payload.options);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ENROLLMENT })
  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.enrollToCourseByOrg')
  async enrollToCourseBgOrg(
    @Payload(new RpcValidationPipe())
    payload: { userId: string; courseId: string; startsAt?: string; endsAt?: string },
    @Ctx() context: IUserContext
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const { userId, courseId, startsAt, endsAt } = payload;

      const course = await this.courseService.findOne({
        _id: new mongoose.Types.ObjectId(courseId),
        organizationId: new mongoose.Types.ObjectId(context.userPayload.organizationId),
      });
      if (!course) throw new NotFoundException(CourseErrors.COURSE_NOT_FOUND);

      const user = await this.userService.findOne(userId);
      if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

      const now = new Date().toISOString();
      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        starts_at: startsAt ?? now,
        ...(endsAt ? { ends_at: endsAt } : {}),
        createdAt: now,
        updatedAt: now,
        billing: {
          amount: 0,
          currency: Currency.DEFAULT,
          billingCycle: BillingCycle.ONE_TIME,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          phone_number: user.phone,
        },
      };

      const enrollment = await this.enrollmentService.enrollUserToCourse(
        user._id.toString(),
        courseId,
        AccessType.BY_ORGANIZATION,
        subscription,
        session
      );

      await session.commitTransaction();
      await session.endSession();

      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ENROLLMENT })
  @MessagePattern('enrollment.enrollToFreeCourse')
  async enrollToFreeCourse(
    @Payload(new RpcValidationPipe())
    body: { courseId: string },
    @Ctx() context: IUserContext
  ) {
    if (![Roles.STUDENT, Roles.GUEST].includes(context.userPayload.roleName)) {
      throw new BadRequestException(UserErrors.USER_NOT_A_STUDENT);
    }
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const userId = context.userPayload._id.toString();

      if (context.userPayload.roleName === Roles.GUEST) {
        await this.userService.promoteGuestToStudent(userId, session);
      }

      const enrollment = await this.enrollmentService.enrollUserToCourse(userId, body.courseId, AccessType.FREE, undefined, session);

      await session.commitTransaction();
      await session.endSession();

      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.enrollToCourse')
  async creditWalletSubscription(
    @Payload(new RpcValidationPipe())
    body: CreateEnrollmentHttpDto,
    @Ctx() context: IUserContext
  ) {
    if (![Roles.STUDENT, Roles.GUEST].includes(context.userPayload.roleName)) {
      throw new BadRequestException(UserErrors.USER_NOT_A_STUDENT);
    }
    if (body.paymentMethod === PaymentMethod.WALLET) {
      return await this.enrollmentService.enrollWithWallet(context.userPayload._id.toString(), body.courseId, body.billingCycle);
    }
    const { price: coursePrice, course } = await this.courseService.getCoursePrice({
      courseId: body.courseId,
      billingCycle: body.billingCycle,
      currency: body.currency,
    });
    return await this.paymentService.createPaymentUrl({
      provider: body.provider,
      user: context.userPayload,
      amount: coursePrice,
      currency: body.currency,
      method: body.paymentMethod,
      purpose: PaymentPurpose.COURSE_PURCHASE,
      course,
      billingCycle: body.billingCycle,
    });
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getChildrenEnrollmentStatus')
  async getChildrenEnrollmentStatus(
    @Payload(new RpcValidationPipe())
    payload: {
      childIds: string[];
      courseId: string;
    }
  ) {
    return await this.enrollmentService.getChildrenEnrollmentStatus(payload.childIds, payload.courseId);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getEnrollmentByCourse')
  async getEnrollmentByCourse(
    @Payload(new RpcValidationPipe())
    payload: { courseId: string },
    @Ctx() context: IUserContext
  ) {
    return await this.enrollmentService.getEnrollmentByCourse(context.userPayload._id.toString(), payload.courseId);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.renewEnrollment')
  async renewEnrollment(
    @Payload(new RpcValidationPipe())
    body: RenewEnrollmentDto & { enrollmentId: string },
    @Ctx() context: IUserContext
  ) {
    const userId = context.userPayload._id.toString();
    if (body.paymentMethod === PaymentMethod.WALLET) {
      return await this.enrollmentService.renewEnrollmentWithWallet(userId, body.enrollmentId, body.billingCycle);
    }
    if (!body.provider || !body.currency) {
      throw new BadRequestException('provider and currency are required for direct payment');
    }
    const enrollment = await this.enrollmentService.getSingleEnrollment(body.enrollmentId, userId);
    const { price: coursePrice, course } = await this.courseService.getCoursePrice({
      courseId: enrollment.courseId.toString(),
      billingCycle: body.billingCycle,
      currency: body.currency,
    });
    return await this.paymentService.createPaymentUrl({
      provider: body.provider,
      user: context.userPayload,
      amount: coursePrice,
      currency: body.currency,
      method: body.paymentMethod,
      purpose: PaymentPurpose.COURSE_PURCHASE,
      course,
      billingCycle: body.billingCycle,
      metadata: { enrollmentId: body.enrollmentId },
    });
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getDetailedEnrolledCourse')
  async getDetailedEnrolledCourse(
    @Payload(new RpcValidationPipe())
    payload: { enrollmentId: string },
    @Ctx() context: IUserContext
  ) {
    return await this.enrollmentService.getDetailedEnrolledCourse(payload.enrollmentId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  @MessagePattern('enrollment.toggleContentComplete')
  async toggleContentComplete(
    @Payload(new RpcValidationPipe())
    payload: { enrollmentId: string; contentId: string; completed: boolean },
    @Ctx() context: IUserContext
  ) {
    return await this.enrollmentService.toggleContentComplete(
      payload.enrollmentId,
      context.userPayload._id.toString(),
      payload.contentId,
      payload.completed
    );
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.ENROLLMENT })
  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.updateByOrg')
  async updateByOrg(
    @Payload(new RpcValidationPipe())
    payload: { enrollmentId: string; enrollmentData: Partial<Enrollment> },
    @Ctx() context: IUserContext
  ) {
    return await this.enrollmentService.updateEnrollmentByOrg(
      {
        _id: new mongoose.Types.ObjectId(payload.enrollmentId),
        organizationId: new mongoose.Types.ObjectId(context.userPayload.organizationId),
        accessType: AccessType.BY_ORGANIZATION,
      },
      payload.enrollmentData
    );
  }

  @MessagePattern('enrollment.submitQuiz')
  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  async submitQuiz(
    @Payload(new RpcValidationPipe())
    payload: SubmitQuizDto,
    @Ctx() context: IUserContext
  ) {
    payload.studentId = context.userPayload._id.toString();
    const result = await this.quizService.submitQuiz({
      ...payload,
      studentId: context.userPayload._id.toString(),
      studentName: displayNameFromUser(context.userPayload),
    });

    return {
      message: EnrollmentSuccessMessages.QUIZ_SUBMITTED,
      result,
      success: true,
    };
  }

  @MessagePattern('enrollment.submitProject')
  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  async submitProject(
    @Payload(new RpcValidationPipe())
    payload: SubmitProjectDto,
    @Ctx() context: IUserContext
  ) {
    payload.studentId = context.userPayload._id.toString();
    const result = await this.projectService.submitProject(payload);

    await this.enrollmentService.toggleContentComplete(payload.enrollmentId, payload.studentId, payload.projectId, true);

    return {
      message: EnrollmentSuccessMessages.PROJECT_SUBMITTED,
      result,
      success: true,
    };
  }

  @MessagePattern('enrollment.markLiveSessionAttendance')
  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  async markLiveSessionAttendance(
    @Payload(new RpcValidationPipe())
    payload: MarkLiveSessionAttendanceDto,
    @Ctx() context: IUserContext
  ) {
    payload.studentId = context.userPayload._id.toString();
    const result = await this.liveSessionService.markAttendance(payload);

    await this.enrollmentService.toggleContentComplete(payload.enrollmentId, payload.studentId, payload.liveSessionId, true);

    return {
      message: EnrollmentSuccessMessages.ATTENDANCE_MARKED,
      result,
      success: true,
    };
  }

  @MessagePattern('enrollment.submitAssignment')
  @UseGuards(AuthGuard, ActiveEnrollmentGuard)
  async submitAssignment(
    @Payload(new RpcValidationPipe())
    payload: SubmitAssignmentDto,
    @Ctx() context: IUserContext
  ) {
    payload.studentId = context.userPayload._id.toString();
    payload.studentName = displayNameFromUser(context.userPayload);
    await this.enrollmentService.getSingleEnrollment(payload.enrollmentId, payload.studentId);
    const result = await this.assignmentService.submitAssignment(payload);

    return {
      message: EnrollmentSuccessMessages.ASSIGNMENT_SUBMITTED,
      result,
      success: true,
    };
  }

  @MessagePattern('enrollment.getAssignmentSubmissions')
  @UseGuards(AuthGuard)
  async getAssignmentSubmissions(
    @Payload(new RpcValidationPipe())
    payload: { assignmentId: string; studentId?: string },
    @Ctx() context: IUserContext
  ) {
    const studentId = payload.studentId ?? context.userPayload._id.toString();
    return this.assignmentService.getAssignmentSubmissions(payload.assignmentId, studentId);
  }

  @MessagePattern('enrollment.gradeAssignment')
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CONTENT })
  @UseGuards(AuthGuard)
  async gradeAssignment(
    @Payload(new RpcValidationPipe())
    payload: GradeAssignmentDto
  ) {
    const result = await this.assignmentService.gradeAssignmentSubmission(payload);
    return {
      message: EnrollmentSuccessMessages.ASSIGNMENT_GRADED,
      result,
      success: true,
    };
  }

  // ─── Parent enrollment endpoints ─────────────────────────────────────────

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.parentEnrollChildToFreeCourse')
  async parentEnrollChildToFreeCourse(@Payload(new RpcValidationPipe()) payload: ParentEnrollChildFreeDto, @Ctx() context: IUserContext) {
    if (context.userPayload.roleName !== Roles.PARENT) {
      throw new BadRequestException(ParentErrors.USER_NOT_A_PARENT);
    }
    await this.parentService.validateParentChildLink(
      new mongoose.Types.ObjectId(context.userPayload._id),
      new mongoose.Types.ObjectId(payload.childId)
    );
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const enrollment = await this.enrollmentService.enrollUserToCourse(payload.childId, payload.courseId, AccessType.FREE, undefined, session);
      await session.commitTransaction();
      return enrollment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ENROLLMENT_FOR_OTHER })
  @MessagePattern('enrollment.parentEnrollChildToCourse')
  async parentEnrollChildToCourse(@Payload(new RpcValidationPipe()) payload: ParentEnrollChildDto, @Ctx() context: IUserContext) {
    await this.parentService.validateParentChildLink(
      new mongoose.Types.ObjectId(context.userPayload._id),
      new mongoose.Types.ObjectId(payload.childId)
    );
    if (payload.paymentMethod === PaymentMethod.WALLET) {
      return await this.enrollmentService.enrollChildWithParentWallet(
        context.userPayload._id.toString(),
        payload.childId,
        payload.courseId,
        payload.billingCycle
      );
    } else {
      const { price: coursePrice, course } = await this.courseService.getCoursePrice({
        courseId: payload.courseId,
        billingCycle: payload.billingCycle,
        currency: payload.currency,
      });
      return await this.paymentService.createPaymentUrl({
        provider: payload.provider,
        user: context.userPayload,
        amount: coursePrice,
        currency: payload.currency,
        method: payload.paymentMethod,
        purpose: PaymentPurpose.COURSE_PURCHASE,
        course,
        billingCycle: payload.billingCycle,
        metadata: { childId: payload.childId, parentId: context.userPayload._id.toString() },
      });
    }
  }
}
