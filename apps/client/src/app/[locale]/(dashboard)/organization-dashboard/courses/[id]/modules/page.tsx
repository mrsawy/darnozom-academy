import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { getCourse } from '@/lib/actions/courses/getCourse.action';
import { ROUTE_ORG_COURSES, ROUTE_ORG_COURSE_DETAILS } from '@/lib/data/constants/routes.constants';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import ModulesDataTable from '../../__components/tables/module-data-table';

export default async function CourseModulesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const courseId = (await params).id;
  const tCrumb = await getTranslations('CourseBreadcrumb');
  const course = await getCourse(courseId);

  if (!course || isNatsErrResult(course)) {
    notFound();
  }

  return (
    <div className="p-4">
      <CourseBreadcrumb
        items={[
          { label: tCrumb('courses'), href: ROUTE_ORG_COURSES },
          { label: course.name, href: ROUTE_ORG_COURSE_DETAILS(courseId) },
          { label: tCrumb('modules') },
        ]}
      />
      <ModulesDataTable courseId={courseId} />
    </div>
  );
}
