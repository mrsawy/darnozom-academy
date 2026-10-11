'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Resolver, SubmitErrorHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import moment from 'moment-timezone';
import { getCourseContentCreationSchemaDiscriminated } from '@/lib/schema/content.schema';
import type { CourseContentFormData } from '@/lib/schema/content.schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { toast } from 'react-toastify';
import { useTranslations, useLocale } from 'next-intl';
import useGeneralStore from '@/lib/store/generalStore';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import { VideoType } from '@/lib/types/course/enum/VideoType.enum';
import type { IContent } from '@/lib/types/course/content.interface';
import {
  useMultipartUpload,
  isMultipartUploadCancelled,
} from '@/lib/hooks/file/use-multipart-upload';
import { useCreateContent, useUpdateContent } from '@/lib/hooks/course/content/useContent';
import ArticleContentForm from './article-content-form';
import VideoContentForm from './video-content-form';
import QuizContentForm from './quiz-content-form';
import QuizSubmissions from './quiz/quiz-submissions';
import { ensurePrivateKey, buildUpdatePayload, buildVideoFileKey, buildFileKey } from './utils';
import { getContentFormDefaultValues } from './get-default-values';
import { getContentTypeIcon } from './content-type-helpers';
import FormHeader from './form-header';
import BasicInfoCard from './basic-info-card';
import AssignmentContentForm from './assignment-content-form';
import AssignmentSubmissionsPanel from '../assignment-submissions-panel';
import LiveSessionContentForm from './live-session-content-form';
import AttachmentContentForm from './attachment-content-form';
import ContentTipsCard from './content-tips-card';
import ContentStatusCard from './content-status-card';
import { getErrorMessage } from '@/lib/schema/utils/gerErrorMessage';
import { resolveOrgUploadPath } from '@/lib/utils/auth/getAuthUserWithCache';
import { MeetingProvider } from '@darnozom/shared-types';
import { ROUTE_ORG_LIVE_CALL } from '@/lib/data/constants/routes.constants';
import { Link } from '@/i18n/navigation';
import { Video } from 'lucide-react';

export interface CreateContentFormProps {
  courseId: string;
  moduleId: string;
  mode?: 'create' | 'edit';
  initialContent?: IContent | null;
}

export default function CreateContentForm({
  courseId,
  moduleId,
  mode = 'create',
  initialContent = null,
}: CreateContentFormProps) {
  const t = useTranslations('CreateContentForm');
  const locale = useLocale();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const [contentType, setContentType] = useState<CourseContentType>(
    initialContent?.type ?? CourseContentType.ARTICLE
  );
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [assignmentTemplateFile, setAssignmentTemplateFile] = useState<File | null>(null);
  /** When user removes the assignment template in edit mode, we delete this key from S3 on save. */
  // const [assignmentTemplateFileKeyToDelete, setAssignmentTemplateFileKeyToDelete] = useState<string | null>(null);

  const createContentsMutation = useCreateContent();
  const updateContentMutation = useUpdateContent();
  const {
    progress,
    status: uploadStatus,
    error: uploadError,
    upload: multipartUpload,
    abort,
  } = useMultipartUpload();
  const isUploading = uploadStatus === 'uploading';

  useEffect(() => {
    if (!isUploading) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  useEffect(() => {
    if (!isUploading) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href]');
      if (
        !anchor ||
        anchor.getAttribute('href')?.startsWith('#') ||
        anchor.getAttribute('target') === '_blank'
      )
        return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      if (!globalThis.confirm(t('upload.leaveConfirmMessage'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isUploading, t]);

  const validationSchema = useMemo(
    () => getCourseContentCreationSchemaDiscriminated((key, values) => t(key, values)),
    [t]
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<CourseContentFormData>({
    resolver: yupResolver(validationSchema) as unknown as Resolver<CourseContentFormData>,
    defaultValues: getContentFormDefaultValues(initialContent),
  });

  const handleAssignmentTemplateFileRemoved = useCallback(() => {
    // setAssignmentTemplateFileKeyToDelete(existingFileKey);
    setValue('content.fileKey', '');
    setValue('content.fileSizeBytes', undefined);
  }, [setValue]);

  const handleAttachmentFileRemoved = useCallback(() => {
    setValue('content.fileKey', '');
    setValue('content.fileSizeBytes', 0);
    setValue('content.mimeType', '');
  }, [setValue]);

  // Sync attachment form fields when user selects/clears file so validation passes before upload
  useEffect(() => {
    if (contentType !== CourseContentType.ATTACHMENT) return;
    if (attachmentFile instanceof File && attachmentFile.size > 0) {
      setValue('content.fileKey', '__pending__');
      setValue('content.fileSizeBytes', attachmentFile.size);
      setValue('content.mimeType', attachmentFile.type);
    } else {
      setValue('content.fileKey', '');
      setValue('content.fileSizeBytes', 0);
      setValue('content.mimeType', '');
    }
  }, [contentType, attachmentFile, setValue]);

  const onSubmit = async (values: CourseContentFormData) => {
    try {
      const contentData = { ...values, type: contentType };

      if (
        contentData.type === CourseContentType.ASSIGNMENT &&
        mode === 'create' &&
        (!assignmentTemplateFile ||
          !(assignmentTemplateFile instanceof File) ||
          assignmentTemplateFile.size === 0)
      ) {
        toast.error(t('errors.assignmentTemplateFileRequired'));
        return;
      }

      if (
        contentData.type === CourseContentType.VIDEO &&
        'videoType' in contentData.content &&
        contentData.content.videoType === VideoType.UPLOAD &&
        'videoFile' in contentData.content &&
        contentData.content.videoFile instanceof File &&
        contentData.content.videoFile.size > 0
      ) {
        const videoFile = contentData.content.videoFile;
        const orgPath = await resolveOrgUploadPath();
        if (!orgPath) {
          toast.error(t('errors.organizationNotFound'));
          return;
        }
        const customPath = `${orgPath}/courses/${courseId}/course-materials`;
        const key = buildVideoFileKey(videoFile, customPath);
        const uploadedKey = await multipartUpload(videoFile, key, { isPublic: false });
        if (!uploadedKey) {
          toast.error(uploadError ?? t('errors.videoUploadCancelledOrFailed'));
          return;
        }
        contentData.content.videoFile = undefined;
        contentData.content.fileKey = ensurePrivateKey(uploadedKey);
        contentData.content.fileSizeBytes = videoFile.size;
      }

      if (
        contentData.type === CourseContentType.VIDEO &&
        'fileKey' in contentData.content &&
        typeof contentData.content.fileKey === 'string' &&
        contentData.content.fileKey.length > 0
      ) {
        contentData.content.fileKey = ensurePrivateKey(contentData.content.fileKey);
      }

      if (
        contentData.type === CourseContentType.ATTACHMENT &&
        attachmentFile instanceof File &&
        attachmentFile.size > 0
      ) {
        const orgPath = await resolveOrgUploadPath();
        if (!orgPath) {
          toast.error(t('errors.organizationNotFound'));
          return;
        }
        const customPath = `${orgPath}/courses/${courseId}/attachments`;
        const key = buildFileKey(attachmentFile, customPath);
        const uploadedKey = await multipartUpload(attachmentFile, key, { isPublic: false });
        if (!uploadedKey) {
          toast.error(uploadError ?? t('errors.videoUploadCancelledOrFailed'));
          return;
        }
        const attachmentContent = contentData.content as {
          fileKey?: string;
          fileSizeBytes?: number;
          mimeType?: string;
        };
        attachmentContent.fileKey = ensurePrivateKey(uploadedKey);
        attachmentContent.fileSizeBytes = attachmentFile.size;
        attachmentContent.mimeType = attachmentFile.type;
      }

      if (
        contentData.type === CourseContentType.ASSIGNMENT &&
        assignmentTemplateFile instanceof File &&
        assignmentTemplateFile.size > 0
      ) {
        const orgPath = await resolveOrgUploadPath();
        if (!orgPath) {
          toast.error(t('errors.organizationNotFound'));
          return;
        }
        const customPath = `${orgPath}/courses/${courseId}/assignments`;
        const key = buildFileKey(assignmentTemplateFile, customPath);
        const uploadedKey = await multipartUpload(assignmentTemplateFile, key, { isPublic: false });
        if (!uploadedKey) {
          toast.error(uploadError ?? t('errors.videoUploadCancelledOrFailed'));
          return;
        }
        const assignmentContent = contentData.content as {
          fileKey?: string;
          fileSizeBytes?: number;
        };
        assignmentContent.fileKey = ensurePrivateKey(uploadedKey);
        assignmentContent.fileSizeBytes = assignmentTemplateFile.size;
      }

      const fileKey =
        (contentData.type === CourseContentType.VIDEO ||
          contentData.type === CourseContentType.ASSIGNMENT ||
          contentData.type === CourseContentType.ATTACHMENT) &&
        'fileKey' in contentData.content
          ? contentData.content.fileKey
          : undefined;

      // Normalize assignment due date to UTC (ISO string) for consistent storage worldwide
      if (
        contentData.type === CourseContentType.ASSIGNMENT &&
        contentData.content &&
        'dueDate' in contentData.content
      ) {
        const d = (contentData.content as { dueDate?: Date }).dueDate;
        if (d instanceof Date && !Number.isNaN(d.getTime())) {
          (contentData.content as unknown as { dueDate: string }).dueDate = moment(d)
            .utc()
            .toISOString();
        }
      }

      if (mode === 'edit' && initialContent?._id) {
        const updatePayload = buildUpdatePayload(contentData, initialContent);
        await updateContentMutation.mutateAsync({
          contentId: initialContent._id,
          updatedData: updatePayload,
          courseId,
          moduleId,
        });
        return;
      }

      return createContentsMutation.mutate({ moduleId, courseId, contentData, fileKey });
    } catch (error: unknown) {
      if (isMultipartUploadCancelled(error)) {
        return;
      }
      const errorMessage = error instanceof Error ? error.message : t('errors.somethingWentWrong');
      toast.error(errorMessage);
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };

  const onError: SubmitErrorHandler<CourseContentFormData> = (err) => {
    const { messages } = getErrorMessage(err);
    for (const message of messages) {
      toast.error(message);
    }
    if (messages.length === 0) {
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  return (
    <div className="min-h-screen" dir={direction}>
      <FormHeader
        isUploading={isUploading}
        progress={progress}
        uploadError={uploadError}
        onSave={() => void handleSubmit(onSubmit, onError)()}
        onCancelUpload={() => void abort()}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="mb-2 flex items-center space-x-3">
                {getContentTypeIcon(contentType)}
                <h1 className="text-3xl font-bold">
                  {mode === 'edit' ? t('edit') : t('create')}{' '}
                  {t(`contentTypes.${contentType}`) ||
                    contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                </h1>
              </div>
              <p>{t('addEngagingContent')}</p>
            </div>

            <Tabs defaultValue="content" className="w-full" dir={direction}>
              <TabsList className="flex w-full grid-cols-3 justify-center">
                <TabsTrigger value="content">{t('tabs.content')}</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-6">
                <BasicInfoCard
                  contentType={contentType}
                  onContentTypeChange={setContentType}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  mode={mode}
                />

                {contentType === CourseContentType.ARTICLE && (
                  <ArticleContentForm register={register} errors={errors} setValue={setValue} />
                )}
                {contentType === CourseContentType.VIDEO && (
                  <VideoContentForm
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    initialValues={
                      initialContent
                        ? {
                            videoType: initialContent.videoType,
                            videoUrl: initialContent.videoUrl,
                            fileKey: initialContent.fileKey,
                          }
                        : undefined
                    }
                    mode={mode}
                  />
                )}
                {contentType === CourseContentType.QUIZ && (
                  <QuizContentForm
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    watch={watch}
                    initialValues={
                      initialContent
                        ? {
                            questions: initialContent.questions,
                            quizStartDate: initialContent.quizStartDate,
                            quizEndDate: initialContent.quizEndDate,
                            quizDurationInMinutes: initialContent.quizDurationInMinutes,
                            maxAttempts: initialContent.maxAttempts,
                          }
                        : undefined
                    }
                  />
                )}
                {contentType === CourseContentType.QUIZ &&
                mode === 'edit' &&
                initialContent?._id ? (
                  <QuizSubmissions quizContentId={initialContent._id} />
                ) : null}
                {contentType === CourseContentType.ASSIGNMENT && (
                  <AssignmentContentForm
                    register={register}
                    control={control}
                    errors={errors}
                    setValue={setValue}
                    onTemplateFileChange={setAssignmentTemplateFile}
                    onTemplateFileRemoved={handleAssignmentTemplateFileRemoved}
                    initialFileKey={
                      initialContent?.type === CourseContentType.ASSIGNMENT
                        ? initialContent?.fileKey
                        : undefined
                    }
                    mode={mode}
                  />
                )}
                {contentType === CourseContentType.ASSIGNMENT &&
                mode === 'edit' &&
                initialContent?._id ? (
                  <AssignmentSubmissionsPanel assignmentId={initialContent._id} />
                ) : null}
                {contentType === CourseContentType.LIVE_SESSION && (
                  <>
                    {mode === 'edit' &&
                    initialContent?._id &&
                    initialContent?.provider === MeetingProvider.AGORA ? (
                      <div className="flex justify-end">
                        <Link href={ROUTE_ORG_LIVE_CALL(courseId, moduleId, initialContent._id)}>
                          <span className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium">
                            <Video className="h-4 w-4" />
                            {t('liveSessionContent.joinSession')}
                          </span>
                        </Link>
                      </div>
                    ) : null}
                    <LiveSessionContentForm
                      register={register}
                      control={control}
                      errors={errors}
                      mode={mode}
                      initialValues={{ ...getValues(), type: CourseContentType.LIVE_SESSION }}
                    />
                  </>
                )}
                {contentType === CourseContentType.ATTACHMENT && (
                  <AttachmentContentForm
                    attachmentFile={attachmentFile}
                    onFileChange={setAttachmentFile}
                    initialFileKey={
                      initialContent?.type === CourseContentType.ATTACHMENT
                        ? initialContent?.fileKey
                        : undefined
                    }
                    initialMimeType={
                      initialContent?.type === CourseContentType.ATTACHMENT
                        ? initialContent?.mimeType
                        : undefined
                    }
                    mode={mode}
                    onFileRemoved={handleAttachmentFileRemoved}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <ContentStatusCard
              contentType={contentType}
              contentId={mode === 'edit' ? initialContent?._id : undefined}
              publishStatus={initialContent?.publishStatus}
              approvalStatus={initialContent?.approvalStatus}
            />
            <ContentTipsCard contentType={contentType} />
          </div>
        </div>
      </div>
    </div>
  );
}
