import { Badge } from '@/components/atoms/badge';
import { useTranslations } from 'next-intl';
import React from 'react';

const FreePricing = React.memo(() => {
  const t = useTranslations('Courses.singleCourse.enrollment.freePricing');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-green-600">{t('headline')}</span>
        <Badge variant="outline" className="bg-green-100 text-green-800">
          {t('noCost')}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
    </div>
  );
});

FreePricing.displayName = 'FreePricing';
export default FreePricing;
