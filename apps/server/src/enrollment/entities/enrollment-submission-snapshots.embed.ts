import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

/** Mirrors `SubmittedAnswer` in quiz submission (embedded in enrollment progress). */
const QuizSubmittedAnswerItemSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctOption: { type: Number, required: true },
    selectedOption: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

/**
 * Full quiz attempt snapshot on the enrollment (denormalized), same data as content `quizSubmissions`
 * plus content / module / course titles for student-facing history.
 */
@Schema({ _id: false })
export class EnrollmentQuizSubmissionSnapshot {
  @Prop({ type: Types.ObjectId, required: true, ref: 'CourseContent' })
  contentId: Types.ObjectId;

  @Prop({ type: String, required: true })
  contentTitle: string;

  @Prop({ type: String, required: true })
  moduleTitle: string;

  @Prop({ type: String, required: true })
  courseTitle: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: String })
  studentName?: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Organization' })
  organizationId: Types.ObjectId;

  @Prop({ type: [QuizSubmittedAnswerItemSchema], required: true })
  answers: {
    questionIndex: number;
    questionText: string;
    options: string[];
    correctOption: number;
    selectedOption: number;
    isCorrect: boolean;
  }[];

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  score: number;

  @Prop({ type: String })
  feedback?: string;

  @Prop({ type: Number, required: true, min: 1 })
  attemptNumber: number;

  @Prop({ type: Number, min: 0 })
  timeTakenInSeconds?: number;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Prop({ type: [mongoose.Schema.Types.Mixed], required: false })
  integrityEvents?: { type: string; at: string; detail?: string }[];
}

export const EnrollmentQuizSubmissionSnapshotSchema = SchemaFactory.createForClass(EnrollmentQuizSubmissionSnapshot);

/**
 * Assignment submission snapshot on enrollment; mirrors embedded assignment submission on content
 * plus titles for history.
 */
@Schema({ _id: false })
export class EnrollmentAssignmentSubmissionSnapshot {
  @Prop({ type: Types.ObjectId, required: true, ref: 'CourseContent' })
  contentId: Types.ObjectId;

  @Prop({ type: String, required: true })
  contentTitle: string;

  @Prop({ type: String, required: true })
  moduleTitle: string;

  @Prop({ type: String, required: true })
  courseTitle: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: String, required: true })
  studentName: string;

  @Prop({ type: String })
  fileKey?: string;

  @Prop({ type: Number })
  fileSizeBytes?: number;

  @Prop({ type: String })
  mimeType?: string;

  @Prop({ type: String })
  content?: string;

  @Prop({ type: Number })
  score?: number;

  @Prop({ type: String })
  feedback?: string;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;
}

export const EnrollmentAssignmentSubmissionSnapshotSchema = SchemaFactory.createForClass(EnrollmentAssignmentSubmissionSnapshot);
