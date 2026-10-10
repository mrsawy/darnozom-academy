import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CourseContentType } from '@lms-organization/shared-types';
import { OrganizationContentListSection } from './__components/organization-content-list.client';

const ORG_CONTENT_TYPES = new Set<string>(Object.values(CourseContentType));

function isOrgContentTypeParam(value: string): value is CourseContentType {
  return ORG_CONTENT_TYPES.has(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}): Promise<Metadata> {
  const { locale, type } = await params;
  if (!isOrgContentTypeParam(type)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: 'OrgContentList' });
  const typeLabel = t(`typeTitles.${type}`);
  const meta = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: `${typeLabel} — ${meta('orgDashboardTitle')}` };
}

export default async function OrganizationContentByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!isOrgContentTypeParam(type)) {
    notFound();
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-6 md:gap-8 md:py-8 lg:px-6">
      <OrganizationContentListSection contentType={type} />
    </div>
  );
}
