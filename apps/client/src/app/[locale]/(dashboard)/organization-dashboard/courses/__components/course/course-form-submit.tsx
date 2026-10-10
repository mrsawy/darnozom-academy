'use client';

import { Button } from '@/components/atoms/button';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CourseFormSubmitProps {
  isFormBusy: boolean;
  isUploadingMedia: boolean;
  isSavingCourse: boolean;
  uploadProgress: number;
  isUpdateMode: boolean;
}

export function CourseFormSubmit({
  isFormBusy,
  isUploadingMedia,
  isSavingCourse,
  uploadProgress,
  isUpdateMode,
}: CourseFormSubmitProps) {
  const t = useTranslations('CourseForm');

  return (
    <div className="flex w-full justify-center">
      <Button
        type="submit"
        effect="expandIcon"
        icon={ArrowRightIcon}
        iconPlacement="right"
        className="mt-6 w-full px-8 lg:w-1/2"
        disabled={isFormBusy}>
        {isUploadingMedia
          ? t('upload.uploadingWithPercent', { percent: uploadProgress })
          : isSavingCourse
            ? isUpdateMode
              ? t('updating')
              : t('creating')
            : isUpdateMode
              ? t('updateCourse')
              : t('createCourse')}
      </Button>
    </div>
  );
}
