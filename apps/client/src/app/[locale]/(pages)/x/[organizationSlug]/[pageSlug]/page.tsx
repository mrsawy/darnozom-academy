import { createNatsRequest } from '@/lib/utils/createNatsRequest';
import ClientRenderer from './__components/clientRenderer';
import { Organization } from '@/lib/types/organization/organization.interface';
import { IPage } from '@/lib/types/page/page.interface';
import { notFound } from 'next/navigation';

interface CustomPageProps {
  params: Promise<{ organizationSlug: string; pageSlug: string }>;
}

export default async function CustomPage({ params }: CustomPageProps) {
  const { organizationSlug, pageSlug } = await params;

  const organization = await createNatsRequest<Organization>('organization.findOne', {
    slug: organizationSlug,
  });
  if ('err' in organization) notFound();
  const page = await createNatsRequest<IPage>('pages.findPublishedPage', {
    organizationId: organization._id,
    slug: pageSlug,
  });
  if ('err' in page) notFound();

  return (
    <div>
      <ClientRenderer page={page} />
    </div>
  );
}
