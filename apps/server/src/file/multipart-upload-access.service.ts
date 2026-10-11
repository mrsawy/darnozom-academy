import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Roles, STUDENT_ASSIGNMENT_MAX_BYTES } from '@darnozom/shared-types';
import { QueryService } from 'src/database/query';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Assignment } from 'src/course/entities/assignment.schema';
import { AssignmentSubmission } from 'src/course/entities/assignmentSubmission.entity';
import { ContentType } from 'src/course/enum/contentType.enum';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { UserDocument } from 'src/user/entities/user.entity';
import { InitiateMultipartUploadDto } from './dto/multipart-upload.dto';

const BYTES_PER_GB = 1024 ** 3;

function bytesToGB(bytes: number): number {
  return bytes / BYTES_PER_GB;
}

type CourseContentWithSubmissions = CourseContent & Pick<Assignment, 'submissions' | 'dueDate'>;

@Injectable()
export class MultipartUploadAccessService {
  constructor(
    private readonly query: QueryService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  /**
   * Validates multipart initiate policy. Returns optional per-request max file size (students: 20 MB).
   */
  async assertCanInitiateMultipart(user: UserDocument, dto: InitiateMultipartUploadDto): Promise<{ maxFileSizeBytes?: number }> {
    if (user.roleName === Roles.STUDENT) {
      return this.assertStudentAssignmentSubmission(user, dto);
    }

    if (dto.contentId || dto.enrollmentId) {
      throw new BadRequestException('contentId and enrollmentId are only allowed for student assignment uploads');
    }

    const orgId = user.organizationId?.toString();
    if (!orgId) {
      throw new ForbiddenException('Organization context is required for file uploads');
    }

    await this.subscriptionService.assertWithinLimit(orgId, 'maxStorageGB', bytesToGB(dto.fileSize));
    return {};
  }

  private async assertStudentAssignmentSubmission(user: UserDocument, dto: InitiateMultipartUploadDto): Promise<{ maxFileSizeBytes: number }> {
    if (!dto.contentId?.trim() || !dto.enrollmentId?.trim()) {
      throw new BadRequestException('contentId and enrollmentId are required for student file uploads');
    }

    if (dto.fileSize > STUDENT_ASSIGNMENT_MAX_BYTES) {
      throw new BadRequestException('File size exceeds the 20 MB limit for assignment submissions');
    }

    const enrollment = await this.query.findOneOrThrow<Enrollment>(
      Enrollment.name,
      { _id: dto.enrollmentId, userId: user._id },
      'Enrollment not found'
    );

    const content = await this.query.findOneOrThrow<CourseContentWithSubmissions>(
      CourseContent.name,
      { _id: dto.contentId },
      'Assignment content not found'
    );

    if (content.type !== ContentType.ASSIGNMENT) {
      throw new BadRequestException('Content must be an assignment');
    }

    if (content.courseId.toString() !== enrollment.courseId.toString()) {
      throw new ForbiddenException('This assignment is not part of your enrolled course');
    }

    const submissions = content.submissions ?? [];
    const existing = submissions.find((s: AssignmentSubmission) => s.studentId?.toString() === user._id.toString());
    if (existing) {
      throw new BadRequestException('Assignment already submitted');
    }

    if (content.dueDate && new Date() > new Date(content.dueDate)) {
      throw new BadRequestException('Assignment submission deadline has passed');
    }

    return { maxFileSizeBytes: STUDENT_ASSIGNMENT_MAX_BYTES };
  }
}
