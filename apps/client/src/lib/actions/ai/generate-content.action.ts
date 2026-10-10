'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import type { FileAttachmentData } from '@/lib/utils/file-to-base64';

export interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctOption: number;
}

export interface GenerateQuizParams {
  questionCount: number;
  courseId?: string;
  moduleId?: string;
  contentId?: string;
  prompt?: string;
  files?: FileAttachmentData[];
}

export interface GenerateArticleParams {
  courseId?: string;
  moduleId?: string;
  contentId?: string;
  prompt?: string;
  files?: FileAttachmentData[];
}

export async function generateQuizWithAi(
  params: GenerateQuizParams
): Promise<GeneratedQuestion[] | NatsErr> {
  const { files, ...fields } = params;
  const payload = {
    ...fields,
    files: files && files.length > 0 ? files : undefined,
  };
  return createAuthorizedNatsRequest<GeneratedQuestion[]>('ai.generate.quiz', payload);
}

export async function generateArticleWithAi(
  params: GenerateArticleParams
): Promise<{ body: string } | NatsErr> {
  const { files, ...fields } = params;
  const payload = {
    ...fields,
    files: files && files.length > 0 ? files : undefined,
  };
  return createAuthorizedNatsRequest<{ body: string }>('ai.generate.article', payload);
}
