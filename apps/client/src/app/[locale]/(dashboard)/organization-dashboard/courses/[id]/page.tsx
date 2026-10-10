import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCourseWithModules } from '@/lib/actions/courses/modules.action';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { ROUTE_ORG_COURSES } from '@/lib/data/constants/routes.constants';
import CourseForm from '../__components/course-form';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';

export default async function UpdateCoursePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const courseId = (await params).id;

  try {
    const course = await getCourseWithModules(courseId, false);

    if (!course || isNatsErrResult(course)) {
      notFound();
    }

    const tCrumb = await getTranslations('CourseBreadcrumb');

    return (
      <div className="mx-auto flex flex-1 flex-col p-5">
        <CourseBreadcrumb
          items={[{ label: tCrumb('courses'), href: ROUTE_ORG_COURSES }, { label: course.name }]}
        />
        <CourseForm mode="update" course={course} courseId={courseId} />
      </div>
    );
  } catch {
    notFound();
  }
}
