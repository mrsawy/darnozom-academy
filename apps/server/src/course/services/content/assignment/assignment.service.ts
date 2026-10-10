import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model } from 'mongoose';
import { CourseContent, CourseContentDocument } from '../../../entities/course-content.entity';
import { ContentType } from '../../../enum/contentType.enum';
import { Assignment } from '../../../entities/assignment.schema';
import { AssignmentSubmission } from '../../../entities/assignmentSubmission.entity';
import { FileService } from 'src/file/file.service';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { GradeAssignmentDto, SubmitAssignmentDto } from 'src/enrollment/dto/assignment-submission.dto';
import { EnrollmentService } from 'src/enrollment/services/enrollment.service';
import { NOT_DELETED_CONTENT_FILTER } from '../../../utils/not-deleted-content.filter';

const BYTES_PER_GB = 1024 ** 3;

function bytesToGB(bytes: number): number {
  return bytes / BYTES_PER_GB;
}

/** Compare embedded submission.studentId (ObjectId or string) to the grader payload id. */
function submissionStudentIdMatches(docStudentId: unknown, target: mongoose.Types.ObjectId): boolean {
  if (docStudentId == null) return false;
  if (docStudentId instanceof mongoose.Types.ObjectId) {
    return docStudentId.equals(target);
  }
  if (typeof docStudentId === 'string' && mongoose.Types.ObjectId.isValid(docStudentId)) {
    return new mongoose.Types.ObjectId(docStudentId).equals(target);
  }
  return false;
}

@Injectable()
export class AssignmentService {
  constructor(
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContent>,
    @InjectConnection() private readonly connection: Connection,
    private readonly fileService: FileService,
    private readonly subscriptionService: SubscriptionService,
    private readonly enrollmentService: EnrollmentService
  ) {}

  async submitAssignment(submission: SubmitAssignmentDto): Promise<{ message: string; assignmentId: string }> {
    if (!submission.content && !submission.fileKey) {
      throw new BadRequestException('Submission must include either text content or an uploaded file.');
    }

    const trimmedStudentName = submission.studentName?.trim();
    if (!trimmedStudentName) {
      throw new BadRequestException('studentName is required');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { assignmentId: contentId, studentId, fileKey, fileSizeBytes, mimeType, content } = submission;
      const contentDoc = (await this.courseContentModel.findById(contentId).session(session)) as CourseContentDocument | null;

      if (!contentDoc) {
        throw new NotFoundException('Assignment not found');
      }
      if (contentDoc.type !== ContentType.ASSIGNMENT) {
        throw new BadRequestException('Content is not an assignment');
      }

      const assignment = contentDoc as unknown as CourseContent & Assignment;
      if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
        throw new BadRequestException('Assignment submission deadline has passed');
      }

      const existingSubmission = assignment.submissions?.find((sub: AssignmentSubmission) => sub.studentId.toString() === studentId);
      if (existingSubmission) {
        throw new BadRequestException('Assignment already submitted');
      }

      const orgId = assignment.organizationId?.toString();
      if (!orgId) {
        throw new ForbiddenException('Organization context is missing for this assignment');
      }

      if (fileKey) {
        if (!fileSizeBytes || fileSizeBytes <= 0) {
          throw new BadRequestException('fileSizeBytes is required when fileKey is provided');
        }
        await this.subscriptionService.assertWithinLimit(orgId, 'maxStorageGB', bytesToGB(fileSizeBytes));
      }

      const assignmentSubmission: Partial<AssignmentSubmission> = {
        studentId: new mongoose.Types.ObjectId(studentId),
        fileKey,
        fileSizeBytes,
        mimeType,
        content,
        submittedAt: new Date(),
        studentName: trimmedStudentName,
      };

      const updatedContent = await this.courseContentModel.findOneAndUpdate(
        {
          _id: contentId,
          type: ContentType.ASSIGNMENT,
          submissions: {
            $not: {
              $elemMatch: {
                studentId: assignmentSubmission.studentId,
              },
            },
          },
        },
        {
          $push: { submissions: assignmentSubmission },
        },
        { session, new: true }
      );

      if (!updatedContent) {
        throw new NotFoundException('Content not found or duplicate submission');
      }

      await this.enrollmentService.recordAssignmentSubmissionSnapshot(
        submission.enrollmentId,
        studentId!,
        contentId,
        {
          studentId: assignmentSubmission.studentId!,
          studentName: trimmedStudentName,
          fileKey,
          fileSizeBytes,
          mimeType,
          content,
          submittedAt: assignmentSubmission.submittedAt!,
        },
        session
      );

      await this.enrollmentService.toggleContentComplete(submission.enrollmentId, studentId!, contentId, true, session);

      if (fileKey && fileSizeBytes && fileSizeBytes > 0) {
        await this.subscriptionService.incrementUsage(orgId, 'storageUsedGB', bytesToGB(fileSizeBytes), session);
      }

      await session.commitTransaction();

      return {
        message: 'Assignment submitted successfully',
        assignmentId: contentId,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }

  async getAssignmentSubmissions(
    assignmentId: string,
    studentId?: string,
    listOptions?: { page: number; limit: number; requesterOrganizationId?: string }
  ): Promise<{
    submission?: AssignmentSubmission | null;
    submissions?: AssignmentSubmission[];
    assignment: {
      dueDate: Date;
      maxPoints?: number;
      instructions?: string;
      content?: string;
    };
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  }> {
    /** Paginated list (instructor/org): sort + slice in MongoDB; one round-trip, no full-array sort in Node. */
    if (listOptions) {
      if (!listOptions.requesterOrganizationId) {
        throw new ForbiddenException('Organization context is required to list submissions');
      }

      const page = listOptions.page;
      const limit = listOptions.limit;
      const skip = (page - 1) * limit;

      let assignmentOid: mongoose.Types.ObjectId;
      try {
        assignmentOid = new mongoose.Types.ObjectId(assignmentId);
      } catch {
        throw new BadRequestException('Invalid assignment id');
      }

      /**
       * Submissions are embedded, so the storage engine still reads this document as one BSON record.
       * `$sortArray` + `$slice` (MongoDB 5.2+) limits what the server returns across the wire and avoids
       * allocating/sorting every submission in the Node process.
       */
      const [row] = await this.courseContentModel.aggregate<{
        dueDate: Date;
        maxPoints?: number;
        instructions?: string;
        content?: string;
        organizationId?: mongoose.Types.ObjectId;
        total: number;
        pageSubmissions: AssignmentSubmission[];
      }>([
        { $match: { _id: assignmentOid, type: ContentType.ASSIGNMENT, ...NOT_DELETED_CONTENT_FILTER } },
        {
          $project: {
            dueDate: 1,
            maxPoints: 1,
            instructions: 1,
            content: 1,
            organizationId: 1,
            total: { $size: { $ifNull: ['$submissions', []] } },
            sortedSubmissions: {
              $sortArray: {
                input: { $ifNull: ['$submissions', []] },
                sortBy: { submittedAt: -1 },
              },
            },
          },
        },
        {
          $project: {
            dueDate: 1,
            maxPoints: 1,
            instructions: 1,
            content: 1,
            organizationId: 1,
            total: 1,
            pageSubmissions: { $slice: ['$sortedSubmissions', skip, limit] },
          },
        },
      ]);

      if (!row) {
        throw new NotFoundException('Assignment not found');
      }

      const assignOrgId = row.organizationId?.toString();
      if (assignOrgId && listOptions.requesterOrganizationId !== assignOrgId) {
        throw new ForbiddenException('Cannot access assignments outside your organization');
      }

      const listAssignmentMeta = {
        dueDate: row.dueDate,
        maxPoints: row.maxPoints,
        instructions: row.instructions,
        content: row.content,
      };

      const pageSlice = row.pageSubmissions ?? [];
      const total = row.total ?? 0;

      const submissionsWithUrls = await Promise.all(
        pageSlice.map(async (sub) => {
          const plain = { ...(sub as object) };
          const fileKey = sub.fileKey;
          if (fileKey) {
            return { ...plain, fileUrl: await this.fileService.getFileUrl(fileKey) };
          }
          return plain;
        })
      );

      return {
        submissions: submissionsWithUrls as AssignmentSubmission[],
        assignment: listAssignmentMeta,
        total,
        page,
        limit,
        hasMore: skip + submissionsWithUrls.length < total,
      };
    }

    const contentDoc = (await this.courseContentModel.findById(assignmentId)) as CourseContentDocument | null;

    if (!contentDoc) {
      throw new NotFoundException('Assignment not found');
    }
    if (contentDoc.type !== ContentType.ASSIGNMENT) {
      throw new BadRequestException('Content is not an assignment');
    }

    const assignment = contentDoc as unknown as CourseContent & Assignment;

    const assignmentMeta = {
      dueDate: assignment.dueDate,
      maxPoints: assignment.maxPoints,
      instructions: assignment.instructions,
      content: assignment.content,
    };

    if (studentId) {
      const studentSubmission = assignment.submissions?.find((sub: AssignmentSubmission) => sub.studentId.toString() === studentId);
      const submissionWithUrl =
        studentSubmission == null
          ? null
          : {
              ...(typeof (studentSubmission as { toObject?: () => object }).toObject === 'function'
                ? (studentSubmission as { toObject: () => object }).toObject()
                : studentSubmission),
              fileUrl: studentSubmission.fileKey ? await this.fileService.getFileUrl(studentSubmission.fileKey) : undefined,
            };
      return {
        submission: submissionWithUrl as AssignmentSubmission | null,
        assignment: assignmentMeta,
      };
    }

    throw new BadRequestException('studentId is required unless requesting paginated submissions (list mode)');
  }

  async gradeAssignmentSubmission(payload: GradeAssignmentDto): Promise<{ message: string; score: number; feedback?: string }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      let studentOid: mongoose.Types.ObjectId;
      try {
        studentOid = new mongoose.Types.ObjectId(payload.studentId.trim());
      } catch {
        throw new BadRequestException('Invalid student id');
      }

      const contentDoc = (await this.courseContentModel.findById(payload.assignmentId).session(session)) as CourseContentDocument | null;
      if (!contentDoc) {
        throw new NotFoundException('Assignment not found');
      }
      if (contentDoc.type !== ContentType.ASSIGNMENT) {
        throw new BadRequestException('Content is not an assignment');
      }

      const assignment = contentDoc as unknown as CourseContent & Assignment;
      const maxPoints = assignment.maxPoints ?? 100;
      if (payload.score < 0 || payload.score > maxPoints) {
        throw new BadRequestException(`Score must be between 0 and ${maxPoints}`);
      }

      const hasSubmission = assignment.submissions?.some((sub: AssignmentSubmission) => submissionStudentIdMatches(sub.studentId, studentOid));
      if (!hasSubmission) {
        throw new NotFoundException('Submission not found');
      }

      const $set: Record<string, unknown> = {
        'submissions.$[s].score': payload.score,
      };
      if (payload.feedback !== undefined) {
        $set['submissions.$[s].feedback'] = payload.feedback;
      }

      // strict: false — `submissions` lives on the ASSIGNMENT discriminator only; base CourseContent schema has no such path.
      const updateResult = await this.courseContentModel.updateOne(
        { _id: payload.assignmentId, type: ContentType.ASSIGNMENT },
        { $set },
        {
          session,
          arrayFilters: [{ 's.studentId': studentOid }],
          strict: false,
        }
      );

      if (updateResult.matchedCount === 0) {
        throw new NotFoundException('Assignment not found');
      }
      if (updateResult.modifiedCount === 0) {
        // Positional $[s] did not match (e.g. legacy shape); fall back to index update
        const submissionIndex = assignment.submissions?.findIndex((sub: AssignmentSubmission) =>
          submissionStudentIdMatches(sub.studentId, studentOid)
        );
        if (submissionIndex === undefined || submissionIndex < 0) {
          throw new NotFoundException('Submission not found');
        }
        const fallbackSet: Record<string, unknown> = {
          [`submissions.${submissionIndex}.score`]: payload.score,
        };
        if (payload.feedback !== undefined) {
          fallbackSet[`submissions.${submissionIndex}.feedback`] = payload.feedback;
        }
        await this.courseContentModel.updateOne(
          { _id: payload.assignmentId, type: ContentType.ASSIGNMENT },
          { $set: fallbackSet },
          { session, strict: false }
        );
      }

      await session.commitTransaction();

      return {
        message: 'Assignment graded successfully',
        score: payload.score,
        feedback: payload.feedback,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }
}
