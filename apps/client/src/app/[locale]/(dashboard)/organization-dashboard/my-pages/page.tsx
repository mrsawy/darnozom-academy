import PageDataTable from './__components/pages-data-table';
import { getAuthUser } from '@/lib/actions/user/user.action';

export default async function HomePage() {
  const user = await getAuthUser();
  const organization = user?.organization;
  if (!organization) {
    throw new Error('Organization is not defined');
  }
  return (
    <div>
      <PageDataTable organization={organization} />
    </div>
  );
}
