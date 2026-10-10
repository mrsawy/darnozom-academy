'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { FileText, Video, HelpCircle, FileCheck, Calendar, Paperclip } from 'lucide-react';
import type { UseFormRegister, UseFormSetValue, FieldErrors, UseFormWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import type { CourseContentFormData } from '@/lib/schema/content.schema';
import { Label } from '@/components/atoms/label';

interface BasicInfoCardProps {
  contentType: CourseContentType;
  onContentTypeChange: (value: CourseContentType) => void;
  register: UseFormRegister<CourseContentFormData>;
  setValue: UseFormSetValue<CourseContentFormData>;
  watch: UseFormWatch<CourseContentFormData>;
  errors: FieldErrors<CourseContentFormData>;
  mode: 'create' | 'edit';
}

export default function BasicInfoCard({
  contentType,
  onContentTypeChange,
  register,
  setValue,
  watch,
  errors,
  mode,
}: BasicInfoCardProps) {
  const t = useTranslations('CreateContentForm');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('basicInformation.title')}</CardTitle>
        <CardDescription>{t('basicInformation.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('fields.contentType.label')}</span>
          <Select
            value={contentType}
            onValueChange={(value: CourseContentType) => {
              if (mode === 'edit') return;
              onContentTypeChange(value);
              setValue('type', value);
            }}>
            <SelectTrigger className="w-full" disabled={mode === 'edit'}>
              <SelectValue placeholder={t('fields.contentType.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CourseContentType.ARTICLE}>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{t('contentTypes.ARTICLE')}</span>
                </div>
              </SelectItem>
              <SelectItem value={CourseContentType.VIDEO}>
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4" />
                  <span>{t('contentTypes.VIDEO')}</span>
                </div>
              </SelectItem>
              <SelectItem value={CourseContentType.QUIZ}>
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>{t('contentTypes.QUIZ')}</span>
                </div>
              </SelectItem>
              <SelectItem value={CourseContentType.ASSIGNMENT}>
                <div className="flex items-center space-x-2">
                  <FileCheck className="h-4 w-4" />
                  <span>{t('contentTypes.ASSIGNMENT')}</span>
                </div>
              </SelectItem>
              <SelectItem value={CourseContentType.LIVE_SESSION}>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{t('contentTypes.LIVE_SESSION')}</span>
                </div>
              </SelectItem>
              <SelectItem value={CourseContentType.ATTACHMENT}>
                <div className="flex items-center space-x-2">
                  <Paperclip className="h-4 w-4" />
                  <span>{t('contentTypes.ATTACHMENT')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{t('fields.contentTitle.label')}</span>
          <Input
            {...register('title')}
            placeholder={t('fields.contentTitle.placeholder')}
            className="w-full"
            aria-invalid={!!errors.title}
          />
          {errors.title ? <p className="text-sm text-red-600">{errors.title.message}</p> : null}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{t('fields.description.label')}</span>
          <Textarea
            {...register('description')}
            placeholder={t('fields.description.placeholder')}
            rows={3}
            className="w-full"
          />
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
