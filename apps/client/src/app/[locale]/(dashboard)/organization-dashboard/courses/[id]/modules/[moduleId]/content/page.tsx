import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { getCourse } from '@/lib/actions/courses/getCourse.action';
import { getModule } from '@/lib/actions/courses/modules.action';
import {
  ROUTE_ORG_COURSES,
  ROUTE_ORG_COURSE_DETAILS,
  ROUTE_ORG_COURSE_MODULE,
  ROUTE_ORG_COURSE_MODULES,
} from '@/lib/data/constants/routes.constants';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import ContentDataTable from '../../../../__components/tables/content-data-table';

export default async function ModuleContentPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string; locale: string }>;
}) {
  const { id: courseId, moduleId } = await params;
  const [t, tCrumb] = await Promise.all([
    getTranslations('OrganizationDashboard.content'),
    getTranslations('CourseBreadcrumb'),
  ]);

  const [course, moduleEntity] = await Promise.all([getCourse(courseId), getModule(moduleId)]);

  if (isNatsErrResult(course) || isNatsErrResult(moduleEntity)) {
    notFound();
  }

  return (
    <div className="p-4">
      <CourseBreadcrumb
        items={[
          { label: tCrumb('courses'), href: ROUTE_ORG_COURSES },
          { label: course.name, href: ROUTE_ORG_COURSE_DETAILS(courseId) },
          { label: tCrumb('modules'), href: ROUTE_ORG_COURSE_MODULES(courseId) },
          { label: moduleEntity.title, href: ROUTE_ORG_COURSE_MODULE(courseId, moduleId) },
          { label: tCrumb('contents') },
        ]}
      />
      <h1 className="mb-4 text-2xl font-semibold">{t('title')}</h1>
      <ContentDataTable courseId={courseId} moduleId={moduleId} />
    </div>
  );
}
