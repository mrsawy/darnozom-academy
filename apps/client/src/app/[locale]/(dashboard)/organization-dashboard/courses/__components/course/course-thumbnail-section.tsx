'use client';

import { Button } from '@/components/atoms/button';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { FileWithPreview, ImageCropper } from '@/components/molecules/images/image-cropper';
import { FieldError } from 'react-hook-form';
import Image from 'next/image';
import { ImageIcon, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ICourseWithModules } from '@/lib/types/course/course.interface';
import { useCallback, useState } from 'react';
import { CourseFormSection } from './course-form-section';

interface CourseThumbnailSectionProps {
  isUpdateMode: boolean;
  course?: ICourseWithModules;
  removeThumbnail: boolean;
  filePreview?: string;
  files?: File[];
  onDrop: (droppedFiles: File[]) => void;
  onRemove: () => void;
  thumbnailError?: FieldError;
}

export function CourseThumbnailSection({
  isUpdateMode,
  course,
  removeThumbnail,
  filePreview,
  files,
  onDrop,
  onRemove: onRemoveProp,
  thumbnailError,
}: CourseThumbnailSectionProps) {
  const t = useTranslations('CourseForm');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(course?.thumbnailUrl);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<FileWithPreview | null>(null);

  const setCropperOpenState = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setCropperOpen((prev) => {
      const next = typeof open === 'function' ? open(prev) : open;
      if (!next) {
        setCropperFile(null);
      }
      return next;
    });
  }, []);

  const handleDropForCrop = useCallback((droppedFiles: File[]) => {
    if (droppedFiles.length === 0) {
      return;
    }
    const file = droppedFiles[0];
    const reader = new FileReader();
    reader.addEventListener('load', (e) => {
      const preview = typeof e.target?.result === 'string' ? e.target.result : '';
      if (!preview) {
        return;
      }
      const withPreview = Object.assign(file, { preview }) as FileWithPreview;
      setCropperFile(withPreview);
      setCropperOpen(true);
    });
    reader.readAsDataURL(file);
  }, []);

  const onRemove = () => {
    setThumbnailUrl(undefined);
    onRemoveProp();
  };

  const hasThumbnail =
    (isUpdateMode && !!course?.thumbnailKey && !removeThumbnail) ||
    !!thumbnailUrl ||
    (files?.length ?? 0) > 0;

  return (
    <CourseFormSection
      title={t('thumbnailImage')}
      description={t('thumbnailImageHelp')}
      icon={ImageIcon}
      className="h-full">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {isUpdateMode && thumbnailUrl ? (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                {t('currentThumbnail')}
              </p>
              <Image
                src={thumbnailUrl}
                alt={t('thumbnailAlt')}
                width={300}
                height={150}
                className="aspect-video w-full max-w-sm rounded-lg object-cover"
              />
            </div>
          ) : null}
          {hasThumbnail ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive w-fit">
              <X className="me-1 h-4 w-4" />
              {t('removeThumbnail')}
            </Button>
          ) : null}
          {thumbnailError ? (
            <p className="text-destructive text-sm">{thumbnailError.message}</p>
          ) : null}
        </div>

        <DropzoneWithPreview
          filePreview={filePreview}
          handleDrop={handleDropForCrop}
          files={files}
          className="size-44 shrink-0 sm:size-52 md:h-56 md:w-72"
          accept={{ 'image/*': [] }}
          maxFiles={1}
        />

        <ImageCropper
          dialogOpen={cropperOpen}
          setDialogOpen={setCropperOpenState}
          selectedFile={cropperFile}
          setSelectedFile={setCropperFile}
          aspect={4 / 3}
          hideTrigger
          onCropped={(croppedFile) => {
            onDrop([croppedFile]);
          }}
        />
      </div>
    </CourseFormSection>
  );
}
