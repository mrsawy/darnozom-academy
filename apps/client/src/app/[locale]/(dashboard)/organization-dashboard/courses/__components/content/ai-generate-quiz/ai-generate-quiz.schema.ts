import * as yup from 'yup';
import { AI_QUIZ_MAX_QUESTIONS, AI_QUIZ_MIN_QUESTIONS } from '@lms-organization/shared-types';
import { aiAttachmentsSchema } from '../ai-generate-shared/ai-attachment.schema';

export const aiGenerateQuizSchema = yup.object({
  questionCount: yup
    .number()
    .integer()
    .min(AI_QUIZ_MIN_QUESTIONS)
    .max(AI_QUIZ_MAX_QUESTIONS)
    .required(),
  courseId: yup.string().optional(),
  moduleId: yup.string().optional(),
  contentId: yup.string().optional(),
  prompt: yup.string().max(1000).optional(),
  files: aiAttachmentsSchema,
});

export type AiGenerateQuizFormData = yup.InferType<typeof aiGenerateQuizSchema>;
