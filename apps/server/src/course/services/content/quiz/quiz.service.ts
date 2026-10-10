import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { Model, Connection, ClientSession } from 'mongoose';
import { CourseContent } from '../../../entities/course-content.entity';
import { ContentType } from '../../../enum/contentType.enum';

import { QuizIntegrityEventDto, SubmitQuizDto } from '../../../../enrollment/dto/quiz-submission.dto';
import { SubmittedAnswer } from '../../../entities/quizSubmission.entity';
import { EnrollmentService } from '../../../../enrollment/services/enrollment.service';
import { NOT_DELETED_CONTENT_FILTER } from '../../../utils/not-deleted-content.filter';

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctOption: number;
}

interface QuizSubmissionRecord {
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  organizationId: mongoose.Types.ObjectId;
  score: number;
  submittedAt: Date;
  attemptNumber: number;
  timeTakenInSeconds?: number;
  feedback: string;
  answers: SubmittedAnswer[];
  integrityEvents?: { type: string; at: string; detail?: string }[];
}

interface QuizRowForStudent {
  organizationId: mongoose.Types.ObjectId;
  questions: QuizQuestion[];
  quizStartDate?: Date;
  quizEndDate?: Date;
  quizDurationInMinutes?: number;
  maxAttempts: number;
  attemptsTaken: number;
}

function sanitizeIntegrityEvents(events?: QuizIntegrityEventDto[]): { type: string; at: string; detail?: string }[] | undefined {
  if (!events?.length) return undefined;
  return events.slice(0, 200).map((e) => ({
    type: e.type.slice(0, 64),
    at: e.at.slice(0, 64),
    detail: e.detail === undefined ? undefined : e.detail.slice(0, 500),
  }));
}

/** -1 = unanswered (filled for partial / unload submissions). */
const UNANSWERED_OPTION = -1;

function normalizeQuizAnswers(
  answers: { questionIndex: number; selectedOption: number }[],
  questionCount: number
): { questionIndex: number; selectedOption: number }[] {
  const map = new Map<number, number>();
  for (const a of answers) {
    map.set(a.questionIndex, a.selectedOption);
  }
  const result: { questionIndex: number; selectedOption: number }[] = [];
  for (let i = 0; i < questionCount; i++) {
    result.push({
      questionIndex: i,
      selectedOption: map.has(i) ? map.get(i)! : UNANSWERED_OPTION,
    });
  }
  return result;
}

@Injectable()
export class QuizService {
  constructor(
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContent>,
    @InjectConnection() private readonly connection: Connection,
    private readonly enrollmentService: EnrollmentService
  ) {}

  private buildQuizRowPipeline(contentId: string, studentId: string): mongoose.PipelineStage[] {
    const studentOid = new mongoose.Types.ObjectId(studentId);
    return [
      { $match: { _id: new mongoose.Types.ObjectId(contentId), type: ContentType.QUIZ, ...NOT_DELETED_CONTENT_FILTER } },
      {
        $project: {
          organizationId: 1,
          questions: 1,
          quizStartDate: 1,
          quizEndDate: 1,
          quizDurationInMinutes: 1,
          maxAttempts: { $ifNull: ['$maxAttempts', 1] },
          attemptsTaken: {
            $size: {
              $filter: {
                input: { $ifNull: ['$quizSubmissions', []] },
                as: 'sub',
                cond: { $eq: ['$$sub.studentId', studentOid] },
              },
            },
          },
        },
      },
    ];
  }

  private async loadQuizRowForStudent(contentId: string, studentId: string, session: ClientSession | null): Promise<QuizRowForStudent | null> {
    const pipeline = this.buildQuizRowPipeline(contentId, studentId);
    const agg = this.courseContentModel.aggregate<QuizRowForStudent>(pipeline);
    if (session) agg.session(session);
    const rows = await agg.exec();
    return rows[0] ?? null;
  }

  async getQuizAttemptsLeft(
    contentId: string,
    studentId: string
  ): Promise<{
    attemptsLeft: number;
    maxAttempts: number;
    attemptsTaken: number;
  }> {
    const row = await this.loadQuizRowForStudent(contentId, studentId, null);

    if (!row) {
      throw new NotFoundException('Quiz not found');
    }

    const maxAttempts = row.maxAttempts ?? 1;
    const attemptsTaken = row.attemptsTaken;
    const attemptsLeft = Math.max(0, maxAttempts - attemptsTaken);

    return {
      attemptsLeft,
      maxAttempts,
      attemptsTaken,
    };
  }

  async submitQuiz(submission: SubmitQuizDto) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { quizId: contentId, studentId, answers: rawAnswers, timeTakenInSeconds, integrityEvents, studentName } = submission;

      const row = await this.loadQuizRowForStudent(contentId, studentId!, session);

      if (!row) {
        throw new NotFoundException('Quiz not found');
      }

      if (!row.organizationId) {
        throw new BadRequestException('Quiz is missing organization metadata');
      }

      const quiz = row;

      if (!quiz.questions?.length) {
        throw new BadRequestException('Quiz has no questions');
      }

      const answers = normalizeQuizAnswers(rawAnswers ?? [], quiz.questions.length);

      const now = new Date();
      if (quiz.quizStartDate && now < new Date(quiz.quizStartDate)) {
        throw new BadRequestException('Quiz has not started yet');
      }
      if (quiz.quizEndDate && now > new Date(quiz.quizEndDate)) {
        throw new BadRequestException('Quiz has ended');
      }

      if (quiz.quizDurationInMinutes && timeTakenInSeconds !== undefined && timeTakenInSeconds !== null) {
        const maxAllowedSeconds = quiz.quizDurationInMinutes * 60;
        const bufferSeconds = 10;

        if (timeTakenInSeconds > maxAllowedSeconds + bufferSeconds) {
          throw new BadRequestException(`Time exceeded: Quiz must be completed within ${quiz.quizDurationInMinutes} minutes`);
        }
      }

      const maxAttempts = quiz.maxAttempts ?? 1;
      const attemptsTaken = quiz.attemptsTaken;

      if (attemptsTaken >= maxAttempts) {
        throw new BadRequestException(`Maximum attempts (${maxAttempts}) reached for this quiz`);
      }

      let correctAnswers = 0;
      const totalQuestions = quiz.questions.length;
      const detailedAnswers: SubmittedAnswer[] = [];

      quiz.questions.forEach((question: QuizQuestion, index: number) => {
        const submittedAnswer = answers.find((a) => a.questionIndex === index);

        if (!submittedAnswer) {
          throw new BadRequestException(`Missing normalized answer for question at index ${index}`);
        }

        if (
          submittedAnswer.selectedOption !== UNANSWERED_OPTION &&
          (!Number.isInteger(submittedAnswer.selectedOption) ||
            submittedAnswer.selectedOption < 0 ||
            submittedAnswer.selectedOption >= question.options.length)
        ) {
          throw new BadRequestException(`Invalid option for question at index ${index}`);
        }

        const isUnanswered = submittedAnswer.selectedOption === UNANSWERED_OPTION;
        const isCorrect = !isUnanswered && submittedAnswer.selectedOption === question.correctOption;

        if (isCorrect) {
          correctAnswers++;
        }

        detailedAnswers.push({
          questionIndex: index,
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          selectedOption: submittedAnswer.selectedOption,
          isCorrect,
        });
      });

      const score = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));
      const nextAttemptNumber = attemptsTaken + 1;

      let timeMessage = '';
      if (timeTakenInSeconds !== undefined && timeTakenInSeconds !== null) {
        const minutes = Math.floor(timeTakenInSeconds / 60);
        const seconds = timeTakenInSeconds % 60;
        timeMessage = ` Completed in ${minutes}m ${seconds}s.`;
      }

      const cleanedIntegrity = sanitizeIntegrityEvents(integrityEvents);

      const quizSubmission: QuizSubmissionRecord = {
        studentId: new mongoose.Types.ObjectId(studentId),
        organizationId: quiz.organizationId,
        score,
        submittedAt: now,
        attemptNumber: nextAttemptNumber,
        timeTakenInSeconds,
        answers: detailedAnswers,
        feedback: `You answered ${correctAnswers} out of ${totalQuestions} questions correctly.${timeMessage}`,
        studentName,
        ...(cleanedIntegrity?.length ? { integrityEvents: cleanedIntegrity } : {}),
      };

      const foundedContent = await this.courseContentModel.findOneAndUpdate(
        {
          _id: contentId,
          type: ContentType.QUIZ,
          quizSubmissions: {
            $not: {
              $elemMatch: {
                studentId: quizSubmission.studentId,
                attemptNumber: quizSubmission.attemptNumber,
              },
            },
          },
        },
        {
          $push: { quizSubmissions: quizSubmission },
        },
        { session, new: true }
      );

      if (!foundedContent) {
        throw new NotFoundException('Content not found or duplicate submission');
      }

      await this.enrollmentService.recordQuizSubmissionSnapshot(
        submission.enrollmentId,
        studentId!,
        contentId,
        {
          studentId: quizSubmission.studentId,
          studentName: quizSubmission.studentName,
          organizationId: quizSubmission.organizationId,
          score: quizSubmission.score,
          submittedAt: quizSubmission.submittedAt,
          attemptNumber: quizSubmission.attemptNumber,
          timeTakenInSeconds: quizSubmission.timeTakenInSeconds,
          feedback: quizSubmission.feedback,
          answers: quizSubmission.answers,
          integrityEvents: quizSubmission.integrityEvents,
        },
        session
      );

      await this.enrollmentService.toggleContentComplete(submission.enrollmentId, studentId!, contentId, true, session);

      await session.commitTransaction();

      return {
        score,
        correctAnswers,
        totalQuestions,
        attemptNumber: nextAttemptNumber,
        attemptsLeft: maxAttempts - nextAttemptNumber,
        feedback: quizSubmission.feedback,
        submittedAt: quizSubmission.submittedAt,
        timeTakenInSeconds,
        detailedAnswers,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }
}
