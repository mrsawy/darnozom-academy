'use client';

import useUserStore from '@/lib/store/userStore';
import { useUpdateSelfUser } from '@/lib/hooks/user/use-user.hook';
import UserForm from '@/components/organs/user-form/user-form';
import type { CreateUserFormData } from '@/lib/schema/user.schema';

export default function AccountPage() {
  const user = useUserStore((s) => s.user);

  const { mutate: updateSelf, isPending } = useUpdateSelfUser();

  if (!user) return null;

  return (
    <UserForm
      mode="self"
      initialUser={user}
      onSubmit={(data) => updateSelf(data as Partial<CreateUserFormData>)}
      isPending={isPending}
    />
  );
}
