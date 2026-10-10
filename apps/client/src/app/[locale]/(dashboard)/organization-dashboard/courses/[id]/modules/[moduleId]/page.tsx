import { getModule } from '@/lib/actions/courses/modules.action';
import EditModuleForm from '../../../__components/modules/edit-module-form';
import { getCourse } from '@/lib/actions/courses/getCourse.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { getTranslations } from 'next-intl/server';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import {
  ROUTE_ORG_COURSES,
  ROUTE_ORG_COURSE_DETAILS,
  ROUTE_ORG_COURSE_MODULES,
} from '@/lib/data/constants/routes.constants';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
    moduleId: string;
  }>;
}

export default async function EditModulePage({ params }: PageProps) {
  const [t, tCrumb] = await Promise.all([
    getTranslations('OrgCourseModulePage'),
    getTranslations('CourseBreadcrumb'),
  ]);
  const { id: courseId, moduleId } = await params;

  const [moduleData, course] = await Promise.all([getModule(moduleId), getCourse(courseId)]);

  if (isNatsErrResult(course)) {
    return <div>{t('errorPrefix', { message: course.err.message })}</div>;
  }

  if (isNatsErrResult(moduleData)) {
    return <div>{t('errorPrefix', { message: moduleData.err.message })}</div>;
  }

  if (!course || !moduleData) {
    notFound();
  }

  return (
    <div className="container mx-auto space-y-8 py-6">
      <CourseBreadcrumb
        items={[
          { label: tCrumb('courses'), href: ROUTE_ORG_COURSES },
          { label: course.name, href: ROUTE_ORG_COURSE_DETAILS(courseId) },
          { label: tCrumb('modules'), href: ROUTE_ORG_COURSE_MODULES(courseId) },
          { label: moduleData.title },
        ]}
      />
      <EditModuleForm module={moduleData} courseId={courseId} moduleId={moduleId} />
    </div>
  );
}
