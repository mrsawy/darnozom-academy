'use client';

import { Button } from '@/components/atoms/button';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { FieldError } from 'react-hook-form';
import { Video, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ICourseWithModules } from '@/lib/types/course/course.interface';
import { useState } from 'react';
import { CourseFormSection } from './course-form-section';

interface CourseTrailerSectionProps {
  isUpdateMode: boolean;
  course?: ICourseWithModules;
  removeTrailer: boolean;
  trailerPreview?: string;
  trailerFiles?: File[];
  onDrop: (droppedFiles: File[]) => void;
  onRemove: () => void;
  trailerError?: FieldError;
}

export function CourseTrailerSection({
  isUpdateMode,
  course,
  removeTrailer,
  trailerPreview,
  trailerFiles,
  onDrop,
  onRemove: onRemoveProp,
  trailerError,
}: CourseTrailerSectionProps) {
  const t = useTranslations('CourseForm');

  const [trailerUrl, setTrailerUrl] = useState<string | undefined>(course?.trailerUrl);

  const onRemove = () => {
    setTrailerUrl(undefined);
    onRemoveProp();
  };

  const hasTrailer =
    (isUpdateMode && !!course?.trailerKey && !removeTrailer) ||
    !!trailerUrl ||
    (trailerFiles?.length ?? 0) > 0;

  return (
    <CourseFormSection
      title={t('courseTrailerVideo')}
      description={t('courseTrailerVideoHelp')}
      icon={Video}
      className="h-full">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {isUpdateMode && trailerUrl ? (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                {t('currentTrailer')}
              </p>
              <video
                src={trailerUrl}
                controls
                className="aspect-video w-full max-w-sm rounded-lg object-cover"
                aria-label={t('trailerAria')}>
                <track kind="captions" />
              </video>
            </div>
          ) : null}
          {hasTrailer ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive w-fit">
              <X className="me-1 h-4 w-4" />
              {t('removeTrailer')}
            </Button>
          ) : null}
          {trailerError ? <p className="text-destructive text-sm">{trailerError.message}</p> : null}
        </div>

        <DropzoneWithPreview
          filePreview={trailerPreview}
          handleDrop={onDrop}
          files={trailerFiles}
          className="size-44 shrink-0 sm:size-52 md:h-56 md:w-72"
          accept={{ 'video/*': [] }}
          maxFiles={1}
        />
      </div>
    </CourseFormSection>
  );
}
