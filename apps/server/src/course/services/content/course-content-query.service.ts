import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, Model, PaginateModel } from 'mongoose';
import { FileService } from 'src/file/file.service';
import { STUDENT_VISIBLE_CONTENT_FILTER } from './sharia/student-visible-filter';
import { CourseContentDocument } from 'src/utils/types/content.interface';
import { CourseContent } from '../../entities/course-content.entity';
import { CourseModuleEntity } from '../../entities/course-module.entity';
import { ContentType } from '../../enum/contentType.enum';
import { sanitizeContentsForStudent } from '../../utils/content-sanitizer.util';
import { NOT_DELETED_CONTENT_FILTER, withNotDeletedContentFilter } from '../../utils/not-deleted-content.filter';

@Injectable()
export class CourseContentQueryService {
  constructor(
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: PaginateModel<CourseContent>,
    @InjectModel('CourseModule')
    private readonly courseModuleModel: Model<CourseModuleEntity>,
    private readonly fileService: FileService
  ) {}

  async listContents(filters?: mongoose.FilterQuery<CourseContent>, options?: mongoose.PaginateOptions) {
    return this.courseContentModel.paginate(withNotDeletedContentFilter(filters ?? {}), {
      ...options,
    });
  }

  async getContentsByModuleId(moduleId: string, session: ClientSession | null = null) {
    const modules = await this.courseModuleModel
      .aggregate<CourseContent>([
        { $match: { _id: new mongoose.Types.ObjectId(moduleId) } },
        {
          $lookup: {
            from: 'course_contents',
            let: { contentIds: '$contentsIds' },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ['$_id', '$$contentIds'] },
                  ...NOT_DELETED_CONTENT_FILTER,
                },
              },
            ],
            as: 'contents',
          },
        },
        {
          $addFields: {
            contents: {
              $map: {
                input: '$contentsIds',
                as: 'contentId',
                in: {
                  $arrayElemAt: [
                    '$contents',
                    {
                      $indexOfArray: ['$contents._id', '$$contentId'],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            contents: {
              $filter: {
                input: '$contents',
                as: 'c',
                cond: { $ne: ['$$c', null] },
              },
            },
          },
        },
      ])
      .session(session);

    // Strip quiz answer keys and every student's submissions/attendance before
    // returning. Students can reach this via GET /content/module/:moduleId, and
    // a module content list never needs the answer key or peers' submissions.
    const moduleDoc = modules[0];
    sanitizeContentsForStudent((moduleDoc as unknown as { contents?: unknown[] })?.contents);
    return moduleDoc;
  }

  async getContent(contentId: string, session: ClientSession | null = null, studentId: string | null = null, requireApproved = false) {
    const assignmentSubmissionsExpr =
      studentId != null && studentId !== ''
        ? {
            $filter: {
              input: { $ifNull: ['$submissions', []] },
              as: 's',
              cond: { $eq: ['$$s.studentId', new mongoose.Types.ObjectId(studentId)] },
            },
          }
        : [];

    const matchStage: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(contentId),
      ...NOT_DELETED_CONTENT_FILTER,
    };
    if (requireApproved) {
      Object.assign(matchStage, STUDENT_VISIBLE_CONTENT_FILTER);
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $addFields: {
          submissions: {
            $cond: [{ $ne: ['$type', ContentType.ASSIGNMENT] }, '$submissions', assignmentSubmissionsExpr],
          },
        },
      },
      {
        $set: {
          quizSubmissions: {
            $cond: {
              if: { $eq: ['$type', ContentType.QUIZ] },
              // eslint-disable-next-line unicorn/no-thenable
              then: '$$REMOVE',
              else: '$quizSubmissions',
            },
          },
        },
      },
    ];

    const agg = this.courseContentModel.aggregate(pipeline);
    if (session) agg.session(session);
    const docs = await agg.exec();
    const contentObj = docs[0] as CourseContentDocument | undefined;

    if (!contentObj) {
      throw new NotFoundException('Content not found');
    }

    // Remove submissions if it's a project, or attendance if it's a live session (quiz submissions stripped in pipeline)
    if (contentObj.type === ContentType.PROJECT && 'submissions' in contentObj) {
      const { submissions, ...contentWithoutSubmissions } = contentObj;
      return contentWithoutSubmissions as CourseContentDocument;
    }
    if (contentObj.type === ContentType.LIVE_SESSION && 'attendance' in contentObj) {
      const { attendance, ...contentWithoutSubmissions } = contentObj;
      return contentWithoutSubmissions as CourseContentDocument;
    }

    // For assignments: add signed fileUrl to each submission that has fileKey so the student can view their submitted file
    const assignmentContent = contentObj as { type: ContentType; submissions?: { fileKey?: string; fileUrl?: string }[] };
    if (assignmentContent.type === ContentType.ASSIGNMENT && Array.isArray(assignmentContent.submissions)) {
      for (const s of assignmentContent.submissions) {
        if (s?.fileKey) {
          s.fileUrl = await this.fileService.getFileUrl(s.fileKey);
        }
      }
    }

    return contentObj;
  }
}
