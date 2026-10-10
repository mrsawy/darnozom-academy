import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import CreateContentForm from '@/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/create-content-form';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { getContent } from '@/lib/actions/courses/content/content.action';
import { getModule } from '@/lib/actions/courses/modules.action';
import { getCourse } from '@/lib/actions/courses/getCourse.action';
import { ContentDiscussionPanel } from './content-discussion-panel';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import {
  ROUTE_ORG_COURSES,
  ROUTE_ORG_COURSE_DETAILS,
  ROUTE_ORG_COURSE_MODULE,
  ROUTE_ORG_COURSE_MODULES,
  ROUTE_ORG_COURSE_MODULE_CONTENTS,
} from '@/lib/data/constants/routes.constants';

interface PageParams {
  id: string;
  moduleId: string;
  contentId: string;
  locale: string;
}

export default async function EditContentPage({ params }: { params: Promise<PageParams> }) {
  const { id: courseId, moduleId, contentId } = await params;

  const [existingContent, course, moduleEntity] = await Promise.all([
    getContent(contentId),
    getCourse(courseId),
    getModule(moduleId),
  ]);

  if (
    isNatsErrResult(existingContent) ||
    isNatsErrResult(course) ||
    isNatsErrResult(moduleEntity)
  ) {
    notFound();
  }
  const showDiscussionPanel =
    course.settings?.discussionEnabled !== false &&
    moduleEntity?.settings?.discussionEnabled !== false &&
    existingContent.settings?.discussionEnabled !== false;

  const tCrumb = await getTranslations('CourseBreadcrumb');

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pt-6">
        <CourseBreadcrumb
          items={[
            { label: tCrumb('courses'), href: ROUTE_ORG_COURSES },
            { label: course.name, href: ROUTE_ORG_COURSE_DETAILS(courseId) },
            { label: tCrumb('modules'), href: ROUTE_ORG_COURSE_MODULES(courseId) },
            { label: moduleEntity.title, href: ROUTE_ORG_COURSE_MODULE(courseId, moduleId) },
            {
              label: tCrumb('contents'),
              href: ROUTE_ORG_COURSE_MODULE_CONTENTS(courseId, moduleId),
            },
            { label: existingContent.title },
          ]}
        />
      </div>
      <CreateContentForm
        courseId={courseId}
        moduleId={moduleId}
        mode="edit"
        initialContent={existingContent}
      />
      {showDiscussionPanel ? (
        <div className="container mx-auto px-4 pb-8">
          <ContentDiscussionPanel
            courseId={courseId}
            moduleId={moduleId}
            contentId={contentId}
            canDeleteAny
          />
        </div>
      ) : null}
    </div>
  );
}
