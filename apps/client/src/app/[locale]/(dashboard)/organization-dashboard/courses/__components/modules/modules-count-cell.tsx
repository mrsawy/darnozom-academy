'use client';

import { Link } from '@/i18n/navigation';
import { useModuleCount } from '@/lib/hooks/course/useModules';
import { ROUTES } from '@/lib/routes/route.config';
import { useTranslations } from 'next-intl';

interface ModulesCountCellProps {
  courseId: string;
}

export function ModulesCountCell({ courseId }: ModulesCountCellProps) {
  const t = useTranslations('ModulesCountCell');
  const moduleCount = useModuleCount(courseId);

  return (
    <Link
      href={ROUTES.organizationDashboard.courses.modules(courseId)}
      className="text-blue-800 underline underline-offset-2 dark:text-blue-400">
      {t('modules', { count: moduleCount })}
    </Link>
  );
}
