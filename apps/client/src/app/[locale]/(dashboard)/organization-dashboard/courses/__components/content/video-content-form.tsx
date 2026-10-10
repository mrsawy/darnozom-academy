'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { Video, Upload } from 'lucide-react';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { VideoType } from '@/lib/types/course/enum/VideoType.enum';
import { UseFormSetValue, UseFormRegister, FieldErrors } from 'react-hook-form';
import { CourseContentFormData } from '@/lib/schema/content.schema';
import { useTranslations, useLocale } from 'next-intl';
import { getFileUrl } from '@/lib/actions/file/getPreSignedUrl';

// Type for video content errors
interface VideoContentErrors {
  videoUrl?: { message?: string };
  fileKey?: { message?: string };
  videoFile?: { message?: string };
  videoType?: { message?: string };
}

interface VideoContentFormProps {
  register: UseFormRegister<CourseContentFormData>;
  errors: FieldErrors<CourseContentFormData>;
  setValue: UseFormSetValue<CourseContentFormData>;
  initialValues?: { videoType?: VideoType; videoUrl?: string; fileKey?: string };
  mode?: 'create' | 'edit';
}

export default function VideoContentForm({
  register,
  errors,
  setValue,
  initialValues,
  mode = 'edit',
}: VideoContentFormProps) {
  const t = useTranslations('CreateContentForm.videoContentForm');
  const locale = useLocale();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const [videoFiles, setVideoFiles] = useState<File[] | undefined>();
  const [videoPreview, setVideoPreview] = useState<string | undefined>();
  const [preSignedVideoUrl, setPreSignedVideoUrl] = useState<string | undefined>();
  const objectUrlRef = useRef<string | null>(null);

  // Type-safe access to video content errors
  const videoContentErrors = (
    errors?.content && 'videoUrl' in errors.content ? errors.content : undefined
  ) as VideoContentErrors | undefined;

  useEffect(() => {
    if (initialValues?.fileKey?.length && initialValues?.fileKey?.length > 0) {
      void (async () => {
        const response = await getFileUrl({ fileKey: initialValues.fileKey ?? '' });
        setPreSignedVideoUrl(response as string);

        const file = new File([], initialValues.fileKey ?? 'placeholder.mp4', {
          type: 'video/mp4',
          lastModified: Date.now(),
        });

        setValue('content.videoFile', file);
      })();
    }
  }, [initialValues?.fileKey, setValue]);

  const handleVideoDrop = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setVideoFiles(files);
      setValue('content.videoType', VideoType.UPLOAD);
      setValue('content.fileKey', file.name);
      setValue('content.videoFile', file);
      setValue('content.fileSizeBytes', file.size);
      // Use object URL instead of readAsDataURL — avoids loading the entire file
      // into memory (which caused "Out of Memory" for large videos).
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setVideoPreview(objectUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Video className="mr-2 h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          defaultValue={initialValues?.videoType ?? VideoType.URL}
          className="w-full"
          dir={direction}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value={VideoType.URL}
              className="flex items-center space-x-2"
              onClick={() => {
                setValue('content.videoType', VideoType.URL);
              }}
              disabled={mode == 'edit'}>
              <Video className="h-4 w-4" />
              <span>{t('tabs.videoUrl')}</span>
            </TabsTrigger>
            <TabsTrigger
              value={VideoType.UPLOAD}
              className="flex items-center space-x-2"
              onClick={() => {
                setValue('content.videoType', VideoType.UPLOAD);
              }}>
              <Upload className="h-4 w-4" />
              <span>{t('tabs.uploadVideo')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={VideoType.URL} className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                {t('fields.videoUrl.label')}
              </span>
              <Input
                {...register('content.videoUrl')}
                placeholder={t('fields.videoUrl.placeholder')}
                className="w-full"
              />
              {videoContentErrors?.videoUrl ? (
                <p className="text-sm text-red-600">{videoContentErrors.videoUrl.message}</p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value={VideoType.UPLOAD} className="space-y-4">
            {preSignedVideoUrl ? (
              <video src={preSignedVideoUrl} controls className="mb-3 w-full rounded-lg">
                <track kind="captions" />
              </video>
            ) : null}

            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                {t('fields.uploadVideoFile.label')}
              </span>

              <DropzoneWithPreview
                files={videoFiles}
                handleDrop={handleVideoDrop}
                filePreview={videoPreview}
                className="min-h-[200px]"
                maxFiles={1}
                accept={{ 'video/*': [] }}
              />
              <p className="text-xs text-gray-500">{t('supportedFormats')}</p>
            </div>

            {videoContentErrors?.fileKey && !videoContentErrors?.videoFile ? (
              <p className="text-sm text-red-600">{videoContentErrors.fileKey.message}</p>
            ) : null}
            {videoContentErrors?.videoFile ? (
              <p className="text-sm text-red-600">{videoContentErrors.videoFile.message}</p>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
