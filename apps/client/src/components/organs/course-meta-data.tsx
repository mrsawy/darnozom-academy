import { Badge } from '@/components/atoms/badge';
import React from 'react';
import { useFormatter, useTranslations } from 'next-intl';

interface CourseMetadataProps {
  language?: string;
  updatedAt: string;
}

const CourseMetadata = React.memo<CourseMetadataProps>(
  ({ language, updatedAt }: CourseMetadataProps) => {
    const t = useTranslations('Courses.singleCourse');
    const format = useFormatter();

    const updatedDateLabel = (() => {
      if (!updatedAt) return '';
      const parsed = new Date(updatedAt);
      if (Number.isNaN(parsed.getTime())) {
        return String(updatedAt);
      }
      return format.dateTime(parsed, { dateStyle: 'medium' });
    })();

    return (
      <div className="border-outline-variant/10 space-y-4 border-t pt-4">
        {language ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs font-bold tracking-widest uppercase opacity-60">
              {t('enrollment.language')}
            </span>
            <span className="text-muted-foreground font-semibold">{language}</span>
          </div>
        ) : null}

        {updatedDateLabel ? (
          <div className="flex justify-start">
            <Badge variant="secondary" className="font-semibold tracking-wide">
              {t('updated', { date: updatedDateLabel })}
            </Badge>
          </div>
        ) : null}
      </div>
    );
  }
);

CourseMetadata.displayName = 'CourseMetadata';
export default CourseMetadata;
