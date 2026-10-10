import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { Model, Connection } from 'mongoose';
import { CourseContent, CourseContentDocument } from '../../../entities/course-content.entity';
import { ContentType } from '../../../enum/contentType.enum';

import { SubmitProjectDto } from '../../../../enrollment/dto/project-submission.dto';
import { Project } from '../../../entities/project.schema';
import { ProjectSubmission } from '../../../entities/projectSubmission.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContent>,
    @InjectConnection() private readonly connection: Connection
  ) {}

  async submitProject(submission: SubmitProjectDto): Promise<{
    message: string;
    projectId: string;
  }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { projectId: contentId, studentId, fileUrl, repositoryUrl, liveDemoUrl, description, groupMembers } = submission;

      // Fetch the project content
      const content = (await this.courseContentModel.findById(contentId).session(session)) as CourseContentDocument | null;

      if (!content) {
        throw new NotFoundException('Project not found');
      }

      if (content.type !== ContentType.PROJECT) {
        throw new BadRequestException('Content is not a project');
      }

      const project = content as unknown as CourseContent & Project;

      // Check if project is past due date
      const now = new Date();
      if (project.dueDate && now > new Date(project.dueDate)) {
        throw new BadRequestException('Project submission deadline has passed');
      }

      // Validate group project requirements
      if (project.isGroupProject) {
        if (!groupMembers || groupMembers.length === 0) {
          throw new BadRequestException('Group members are required for group projects');
        }

        if (project.maxGroupSize && groupMembers.length > project.maxGroupSize) {
          throw new BadRequestException(`Group size cannot exceed ${project.maxGroupSize} members`);
        }
      }

      // Check if student already submitted
      const existingSubmission = project.submissions?.find((sub: ProjectSubmission) => sub.studentId.toString() === studentId);

      if (existingSubmission) {
        throw new BadRequestException('Project already submitted');
      }

      // Create submission record
      const projectSubmission: Partial<ProjectSubmission> = {
        studentId: new mongoose.Types.ObjectId(studentId),
        fileUrl,
        repositoryUrl,
        liveDemoUrl,
        description,
        groupMembers: groupMembers ? groupMembers.map((id) => new mongoose.Types.ObjectId(id)) : undefined,
      };

      // Add submission to project
      const updatedContent = await this.courseContentModel.findOneAndUpdate(
        {
          _id: contentId,
          type: ContentType.PROJECT,
          submissions: {
            $not: {
              $elemMatch: {
                studentId: projectSubmission.studentId,
              },
            },
          },
        },
        {
          $push: { submissions: projectSubmission },
        },
        { session, new: true }
      );

      if (!updatedContent) {
        throw new NotFoundException('Content not found or duplicate submission');
      }

      await session.commitTransaction();

      return {
        message: 'Project submitted successfully',
        projectId: contentId,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }

  async getProjectSubmissions(
    projectId: string,
    studentId?: string
  ): Promise<{
    submission?: ProjectSubmission | null;
    submissions?: ProjectSubmission[];
    project: {
      dueDate: Date;
      maxPoints?: number;
      requirements: string;
      description?: string;
      deliverables?: string[];
      isGroupProject?: boolean;
      maxGroupSize?: number;
    };
  }> {
    const content = (await this.courseContentModel.findById(projectId)) as CourseContentDocument | null;

    if (!content) {
      throw new NotFoundException('Project not found');
    }

    if (content.type !== ContentType.PROJECT) {
      throw new BadRequestException('Content is not a project');
    }

    const project = content as unknown as CourseContent & Project;

    if (studentId) {
      // Return only the student's submission
      const studentSubmission = project.submissions?.find((sub: ProjectSubmission) => sub.studentId.toString() === studentId);

      return {
        submission: studentSubmission ?? null,
        project: {
          dueDate: project.dueDate,
          maxPoints: project.maxPoints,
          requirements: project.requirements,
          description: project.description,
          deliverables: project.deliverables,
          isGroupProject: project.isGroupProject,
          maxGroupSize: project.maxGroupSize,
        },
      };
    }

    // Return all submissions (for instructors/admins)
    return {
      submissions: project.submissions ?? [],
      project: {
        dueDate: project.dueDate,
        maxPoints: project.maxPoints,
        requirements: project.requirements,
        description: project.description,
        deliverables: project.deliverables,
        isGroupProject: project.isGroupProject,
        maxGroupSize: project.maxGroupSize,
      },
    };
  }

  async gradeProjectSubmission(
    projectId: string,
    studentId: string,
    score: number,
    feedback?: string
  ): Promise<{
    message: string;
    score: number;
    feedback?: string;
  }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const content = (await this.courseContentModel.findById(projectId).session(session)) as CourseContentDocument | null;

      if (!content) {
        throw new NotFoundException('Project not found');
      }

      if (content.type !== ContentType.PROJECT) {
        throw new BadRequestException('Content is not a project');
      }

      const project = content as unknown as CourseContent & Project;

      const maxPoints = project.maxPoints ?? 100;
      if (score < 0 || score > maxPoints) {
        throw new BadRequestException(`Score must be between 0 and ${maxPoints}`);
      }

      const submissionIndex = project.submissions?.findIndex((sub: ProjectSubmission) => sub.studentId.toString() === studentId);

      if (submissionIndex === -1 || submissionIndex === undefined) {
        throw new NotFoundException('Submission not found');
      }

      // Update the submission with score and feedback
      const updatePath = `submissions.${submissionIndex}.score`;
      const feedbackPath = `submissions.${submissionIndex}.feedback`;

      const updateData: Record<string, unknown> = { [updatePath]: score };
      if (feedback !== undefined) {
        updateData[feedbackPath] = feedback;
      }

      await this.courseContentModel.findByIdAndUpdate(projectId, { $set: updateData }, { session, new: true });

      await session.commitTransaction();

      return {
        message: 'Project graded successfully',
        score,
        feedback,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }
}
