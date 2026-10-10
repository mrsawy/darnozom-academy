'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';

import { Textarea } from '@/components/atoms/textarea';
import { CourseContentFormData } from '@/lib/schema/content.schema';
import { FileText } from 'lucide-react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import AiGenerateArticleDialog from './ai-generate-article/ai-generate-article';

interface ArticleContentFormProps {
  register: UseFormRegister<CourseContentFormData>;
  errors: FieldErrors<CourseContentFormData>;
  setValue: UseFormSetValue<CourseContentFormData>;
}

export default function ArticleContentForm({
  register,
  errors,
  setValue,
}: ArticleContentFormProps) {
  const t = useTranslations('CreateContentForm.articleContentForm');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Article Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {t('fields.articleContent.label')}
            </span>
            <AiGenerateArticleDialog onGenerated={(body) => setValue('content.body', body)} />
          </div>
          <Textarea
            {...register('content.body')}
            placeholder={t('fields.articleContent.placeholder')}
            rows={12}
            className="w-full font-mono text-sm"
          />
          {(errors.content as { body?: { message?: string } } | undefined)?.body?.message ? (
            <p className="text-sm text-red-600">
              {(errors.content as { body: { message: string } }).body.message}
            </p>
          ) : null}
          <p className="text-xs text-gray-500">{t('fields.articleContent.tip')}</p>
        </div>

        {/* Estimated Reading Time */}
        {/* <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">
            Estimated Reading Time
          </span>
          <Input
            {...register("estimatedReadingTime")}
            placeholder="e.g., 5 minutes"
            className="w-full"
          />
        </div> */}
      </CardContent>
    </Card>
  );
}
