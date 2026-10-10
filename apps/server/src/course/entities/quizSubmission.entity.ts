// src/quiz-submissions/schemas/quiz-submission.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// Type for a quiz question
export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctOption: number;
}

// Type for submitted answer with full question context
export interface SubmittedAnswer {
  questionIndex: number;
  questionText: string;
  options: string[];
  correctOption: number;
  selectedOption: number;
  isCorrect: boolean;
}

@Schema({ timestamps: true, _id: false })
export class QuizSubmission extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: String })
  studentName: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Organization' })
  organizationId: Types.ObjectId;

  @Prop({
    type: [
      {
        questionIndex: { type: Number, required: true },
        questionText: { type: String, required: true },
        options: { type: [String], required: true },
        correctOption: { type: Number, required: true },
        selectedOption: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    required: true,
    _id: false,
  })
  answers: SubmittedAnswer[];

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

  /** Client-reported proctoring signals; keys use `type` (Mongo-safe via Mixed). */
  @Prop({ type: [mongoose.Schema.Types.Mixed], required: false })
  integrityEvents?: { type: string; at: string; detail?: string }[];
}

export const QuizSubmissionSchema = SchemaFactory.createForClass(QuizSubmission);

QuizSubmissionSchema.plugin(mongoosePaginate);

QuizSubmissionSchema.pre('validate', function (next) {
  if (!this.answers || this.answers.length === 0) {
    return next(new Error('At least one answer must be provided.'));
  }
  next();
});
