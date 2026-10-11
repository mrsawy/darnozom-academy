import { redirect } from '@/i18n/navigation';
import { ROUTE_ORG_CONTENT_BY_TYPE } from '@/lib/data/constants/routes.constants';
import { CourseContentType } from '@darnozom/shared-types';

export default async function OrganizationContentIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({
    href: ROUTE_ORG_CONTENT_BY_TYPE(CourseContentType.ARTICLE),
    locale,
  });
}
