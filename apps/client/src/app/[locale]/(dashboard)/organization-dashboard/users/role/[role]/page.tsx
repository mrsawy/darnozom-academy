import { notFound } from 'next/navigation';
import { Roles } from '@darnozom/shared-types';
import UserDataTable from '../../__components/user-data-table';

export default async function UsersByRolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!Object.values(Roles).includes(role as Roles) || role === Roles.PLATFORM_ADMIN) notFound();

  return (
    <div>
      <UserDataTable role={role as Roles} />
    </div>
  );
}
