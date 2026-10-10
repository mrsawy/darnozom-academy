import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { getContent } from '@/lib/actions/courses/content/content.action';
import { getCourse } from '@/lib/actions/courses/getCourse.action';
import { getModule } from '@/lib/actions/courses/modules.action';
import {
  ROUTE_ORG_COURSE_DETAILS,
  ROUTE_ORG_COURSE_MODULE,
  ROUTE_ORG_COURSE_MODULES,
  ROUTE_ORG_COURSE_MODULE_CONTENTS,
  ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT,
  ROUTE_ORG_COURSES,
} from '@/lib/data/constants/routes.constants';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import OrgLiveCallView from './__components/org-live-call-view';

interface PageParams {
  id: string;
  moduleId: string;
  contentId: string;
}

export default async function OrgLiveCallPage({ params }: { params: Promise<PageParams> }) {
  const { id: courseId, moduleId, contentId } = await params;
  const tCrumb = await getTranslations('CourseBreadcrumb');

  const [course, moduleEntity, content] = await Promise.all([
    getCourse(courseId),
    getModule(moduleId),
    getContent(contentId),
  ]);

  if (isNatsErrResult(course) || isNatsErrResult(moduleEntity) || isNatsErrResult(content)) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-4">
        <CourseBreadcrumb
          className="bg-background/80 rounded-md px-3 py-2 backdrop-blur"
          items={[
            { label: tCrumb('courses'), href: ROUTE_ORG_COURSES },
            { label: course.name, href: ROUTE_ORG_COURSE_DETAILS(courseId) },
            { label: tCrumb('modules'), href: ROUTE_ORG_COURSE_MODULES(courseId) },
            { label: moduleEntity.title, href: ROUTE_ORG_COURSE_MODULE(courseId, moduleId) },
            {
              label: tCrumb('contents'),
              href: ROUTE_ORG_COURSE_MODULE_CONTENTS(courseId, moduleId),
            },
            {
              label: content.title,
              href: ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT(courseId, moduleId, contentId),
            },
            { label: tCrumb('liveCall') },
          ]}
        />
      </div>
      <OrgLiveCallView courseId={courseId} moduleId={moduleId} contentId={contentId} />
    </div>
  );
}
