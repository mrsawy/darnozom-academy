import * as yup from 'yup';
import { aiAttachmentsSchema } from '../ai-generate-shared/ai-attachment.schema';

export const aiGenerateArticleSchema = yup.object({
  courseId: yup.string().optional(),
  moduleId: yup.string().optional(),
  contentId: yup.string().optional(),
  prompt: yup.string().max(1000).optional(),
  files: aiAttachmentsSchema,
});

export type AiGenerateArticleFormData = yup.InferType<typeof aiGenerateArticleSchema>;
