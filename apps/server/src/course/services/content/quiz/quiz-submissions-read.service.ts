import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CourseContent } from '../../../entities/course-content.entity';
import { ContentType } from '../../../enum/contentType.enum';
import { NOT_DELETED_CONTENT_FILTER } from '../../../utils/not-deleted-content.filter';
import { NOT_DELETED_FILTER } from 'src/utils/soft-delete';

/** Resolves display name in aggregation: embedded `studentName`, else User doc, else student id string. */
const QUIZ_SUBMISSION_STUDENT_NAME_ADD_FIELDS: mongoose.PipelineStage = {
  $addFields: {
    studentName: {
      $let: {
        vars: {
          emb: { $trim: { input: { $ifNull: ['$studentName', ''] } } },
          u: { $arrayElemAt: ['$__quizStudentUser', 0] },
        },
        in: {
          $cond: [
            { $gt: [{ $strLenCP: '$$emb' }, 0] },
            '$$emb',
            {
              $cond: [
                { $ne: ['$$u', null] },
                {
                  $let: {
                    vars: {
                      full: {
                        $trim: {
                          input: {
                            $concat: [{ $ifNull: ['$$u.firstName', ''] }, ' ', { $ifNull: ['$$u.lastName', ''] }],
                          },
                        },
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: [{ $strLenCP: '$$full' }, 0] },
                        '$$full',
                        {
                          $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$$u.username', ''] } }, 0] }, '$$u.username', { $ifNull: ['$$u.email', ''] }],
                        },
                      ],
                    },
                  },
                },
                { $toString: '$studentId' },
              ],
            },
          ],
        },
      },
    },
  },
};

const MAX_PAGE_SIZE = 50;

export interface QuizSubmissionListItem {
  studentId: string;
  /** Denormalized on submit; backfilled from User when missing (legacy / seed data). */
  studentName?: string;
  score: number;
  attemptNumber: number;
  submittedAt: Date;
  timeTakenInSeconds?: number;
  feedback?: string;
  answers?: unknown[];
  integrityEvents?: unknown[];
}

@Injectable()
export class QuizSubmissionsReadService {
  constructor(@InjectModel(CourseContent.name) private readonly courseContentModel: Model<CourseContent>) {}

  async getStudentQuizSubmissions(
    quizContentId: string,
    studentId: string
  ): Promise<{
    contentId: string;
    title: string;
    submissions: QuizSubmissionListItem[];
  }> {
    const studentOid = new mongoose.Types.ObjectId(studentId);
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { _id: new mongoose.Types.ObjectId(quizContentId), type: ContentType.QUIZ, ...NOT_DELETED_CONTENT_FILTER } },
      {
        $project: {
          _id: 1,
          title: 1,
          mySubmissions: {
            $filter: {
              input: { $ifNull: ['$quizSubmissions', []] },
              as: 's',
              cond: { $eq: ['$$s.studentId', studentOid] },
            },
          },
        },
      },
    ];

    const rows = await this.courseContentModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      title: string;
      mySubmissions: QuizSubmissionListItem[];
    }>(pipeline);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Quiz not found');
    }

    const submissions = [...(row.mySubmissions ?? [])].toSorted((a, b) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0));

    return {
      contentId: row._id.toString(),
      title: row.title,
      submissions: submissions.map((s) => ({
        studentId: String(s.studentId),
        score: s.score,
        attemptNumber: s.attemptNumber,
        submittedAt: s.submittedAt,
        timeTakenInSeconds: s.timeTakenInSeconds,
        feedback: s.feedback,
        answers: s.answers,
        integrityEvents: s.integrityEvents,
      })),
    };
  }

  async listQuizSubmissionsForOrganization(
    quizContentId: string,
    requesterOrganizationId: string,
    page: number,
    limit: number
  ): Promise<{
    items: QuizSubmissionListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const orgOid = new mongoose.Types.ObjectId(requesterOrganizationId);

    const matchPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(quizContentId),
          type: ContentType.QUIZ,
          organizationId: orgOid,
          ...NOT_DELETED_CONTENT_FILTER,
        },
      },
    ];

    const found = await this.courseContentModel.aggregate(matchPipeline);
    if (found.length === 0) {
      const any = await this.courseContentModel.findById(quizContentId).select('type organizationId').lean();
      if (!any || (any as { type?: string }).type !== ContentType.QUIZ) {
        throw new NotFoundException('Quiz not found');
      }
      throw new ForbiddenException('You do not have access to submissions for this quiz');
    }

    const pipeline = [
      ...matchPipeline,
      {
        $facet: {
          countArr: [{ $project: { total: { $size: { $ifNull: ['$quizSubmissions', []] } } } }],
          pageItems: [
            { $unwind: { path: '$quizSubmissions', preserveNullAndEmptyArrays: false } },
            { $replaceRoot: { newRoot: '$quizSubmissions' } },
            {
              $lookup: {
                from: 'users',
                let: { sid: '$studentId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $or: [{ $eq: ['$_id', '$$sid'] }, { $eq: [{ $toString: '$_id' }, { $toString: '$$sid' }] }],
                      },
                      ...NOT_DELETED_FILTER,
                    },
                  },
                  { $project: { firstName: 1, lastName: 1, username: 1, email: 1 } },
                ],
                as: '__quizStudentUser',
              },
            },
            QUIZ_SUBMISSION_STUDENT_NAME_ADD_FIELDS,
            { $project: { __quizStudentUser: 0 } },
            { $sort: { submittedAt: -1 as const } },
            { $skip: skip },
            { $limit: safeLimit },
          ],
        },
      },
    ] as mongoose.PipelineStage[];

    const facetRows = await this.courseContentModel.aggregate<{
      countArr: { total: number }[];
      pageItems: Record<string, unknown>[];
    }>(pipeline);

    const facet = facetRows[0];
    const total = facet?.countArr?.[0]?.total ?? 0;
    const rawItems = facet?.pageItems ?? [];

    const items: QuizSubmissionListItem[] = rawItems.map((doc) => {
      const sn = doc.studentName;
      const studentName = typeof sn === 'string' && sn.trim().length > 0 ? sn.trim() : String(doc.studentId);
      return {
        studentId: String(doc.studentId),
        studentName,
        score: doc.score as number,
        attemptNumber: doc.attemptNumber as number,
        submittedAt: doc.submittedAt as Date,
        timeTakenInSeconds: doc.timeTakenInSeconds as number | undefined,
        feedback: doc.feedback as string | undefined,
        answers: doc.answers as unknown[] | undefined,
        integrityEvents: doc.integrityEvents as unknown[] | undefined,
      };
    });

    return { items, total, page: safePage, limit: safeLimit };
  }
}
