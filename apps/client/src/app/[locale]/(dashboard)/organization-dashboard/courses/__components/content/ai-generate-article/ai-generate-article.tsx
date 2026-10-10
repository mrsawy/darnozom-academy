'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Sparkles, Loader2 } from 'lucide-react';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { useCoursesByOrganization } from '@/lib/hooks/course/useCourses';
import { useModules } from '@/lib/hooks/course/useModules';
import { useContentByModule } from '@/lib/hooks/course/content/useContent';
import { generateArticleWithAi } from '@/lib/actions/ai/generate-content.action';
import { convertFilesToAttachments } from '@/lib/utils/file-to-base64';
import { AiAttachmentPicker } from '../ai-generate-shared/ai-attachment-picker';
import {
  extractApiMessage,
  orUndefined,
  toSelectValue,
} from '../ai-generate-shared/ai-attachment.utils';
import {
  aiGenerateArticleSchema,
  type AiGenerateArticleFormData,
} from './ai-generate-article.schema';

interface AiGenerateArticleDialogProps {
  onGenerated: (body: string) => void;
}

const DEFAULT_VALUES: AiGenerateArticleFormData = {
  courseId: '',
  moduleId: '',
  contentId: '',
  prompt: '',
  files: [],
};

export default function AiGenerateArticleDialog({ onGenerated }: AiGenerateArticleDialogProps) {
  const t = useTranslations('AiGenerateArticle');
  const tApiError = useTranslations('errors');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [attachmentsInvalid, setAttachmentsInvalid] = useState(false);

  const form = useForm<AiGenerateArticleFormData>({
    resolver: yupResolver(aiGenerateArticleSchema) as Resolver<AiGenerateArticleFormData>,
    defaultValues: DEFAULT_VALUES,
  });

  const { control, handleSubmit, watch, setValue, formState } = form;
  const selectedCourseId = watch('courseId') ?? '';
  const selectedModuleId = watch('moduleId') ?? '';

  const { data: coursesData } = useCoursesByOrganization({ page: 1, limit: 100 });
  const courses = coursesData?.docs ?? [];
  const { data: modules = [] } = useModules(selectedCourseId);
  const { data: moduleWithContents } = useContentByModule(selectedModuleId);
  const contents = moduleWithContents?.contents ?? [];

  const handleCourseChange = (val: string) => {
    setValue('courseId', val === 'none' ? '' : val);
    setValue('moduleId', '');
    setValue('contentId', '');
  };

  const handleModuleChange = (val: string) => {
    setValue('moduleId', val === 'none' ? '' : val);
    setValue('contentId', '');
  };

  const onSubmit = handleSubmit(async (data) => {
    setError('');
    const attachments = await convertFilesToAttachments(data.files);
    const result = await generateArticleWithAi({
      courseId: orUndefined(data.courseId),
      moduleId: orUndefined(data.moduleId),
      contentId: orUndefined(data.contentId),
      prompt: orUndefined(data.prompt?.trim()),
      files: attachments,
    });

    if ('err' in result) {
      setError(translateApiMessage(extractApiMessage(result.err.message), tApiError));
      return;
    }
    if (!result.body) {
      setError(t('noBodyReturned'));
      return;
    }
    onGenerated(result.body);
    setOpen(false);
    form.reset(DEFAULT_VALUES);
  });

  const loading = formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          {t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('fields.course.label')}</label>
            <Select value={toSelectValue(selectedCourseId)} onValueChange={handleCourseChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('fields.course.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('fields.course.none')}</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourseId ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('fields.module.label')}</label>
              <Select value={toSelectValue(selectedModuleId)} onValueChange={handleModuleChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.module.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('fields.module.none')}</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedModuleId ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('fields.content.label')}</label>
              <Controller
                control={control}
                name="contentId"
                render={({ field }) => (
                  <Select
                    value={toSelectValue(field.value ?? '')}
                    onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fields.content.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('fields.content.none')}</SelectItem>
                      {contents.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium">{t('fields.prompt.label')}</label>
            <Controller
              control={control}
              name="prompt"
              render={({ field }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={t('fields.prompt.placeholder')}
                  maxLength={1000}
                  rows={3}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="files"
            render={({ field }) => (
              <AiAttachmentPicker
                value={field.value ?? []}
                onChange={field.onChange}
                disabled={loading}
                onValidationChange={setAttachmentsInvalid}
              />
            )}
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" disabled={loading || attachmentsInvalid} className="w-full gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? t('generating') : t('generate')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
