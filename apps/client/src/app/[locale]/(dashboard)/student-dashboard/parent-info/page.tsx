'use client';

import { useQuery } from '@/lib/utils';
import { getParentData } from '@/lib/actions/parent/parent-children.action';
import { ParentInfoCard } from './__components/parent-info-card';
import { CreateParentForm } from './__components/create-parent-form/create-parent-form';
import { Skeleton } from '@/components/atoms/skeleton';
import { useTranslations } from 'next-intl';

function ParentInfoPage() {
  const t = useTranslations('StudentDashboard.parentInfo');

  const { data: parent, isLoading } = useQuery({
    queryKey: ['student', 'parentData'],
    queryFn: () => getParentData(),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-40 w-full max-w-lg" />
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>
        <CreateParentForm />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>
      <ParentInfoCard parent={parent} />
    </div>
  );
}

export default ParentInfoPage;
