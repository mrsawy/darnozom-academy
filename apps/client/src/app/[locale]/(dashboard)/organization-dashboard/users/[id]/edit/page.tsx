'use client';

import { useParams } from 'next/navigation';
import CreateUserForm from '../../__components/create-user-form';
import CreateUserFormSkeleton from '../../__components/create-user-form.skeleton';
import { useUserByOrganization } from '@/lib/hooks/user/use-user.hook';
import { AdditionalRolesCard } from '../__components/additional-roles-card';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading } = useUserByOrganization(id);

  if (isLoading) return <CreateUserFormSkeleton />;

  return (
    <div>
      <CreateUserForm initialUser={user} mode="edit" />
      {user ? (
        <AdditionalRolesCard
          userId={id}
          roleName={user.roleName}
          initial={user.additionalRoles ?? []}
        />
      ) : null}
    </div>
  );
}
