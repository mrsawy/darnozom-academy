'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import useGeneralStore from '@/lib/store/generalStore';
import { IInstructor, IParent, IStudent, IUser } from '@/lib/types/user/user.interface';
import {
  useCreateUser,
  useUpdateUser,
  type CreateUserPayload,
} from '@/lib/hooks/user/use-user.hook';
import type { CreateUserFormData, EditUserFormData } from '@/lib/schema/user.schema';
import UserForm from '@/components/organs/user-form/user-form';

interface CreateUserFormProps {
  mode?: 'create' | 'edit';
  initialUser?: IUser | IInstructor | IParent | IStudent | null;
}

export default function CreateUserForm({
  mode = 'create',
  initialUser = null,
}: CreateUserFormProps) {
  const t = useTranslations('CreateUserForm');
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();

  const isPending = createUserMutation.isPending || updateUserMutation.isPending;

  const handleSubmit = async (values: CreateUserFormData) => {
    if (mode === 'edit' && initialUser?._id) {
      try {
        useGeneralStore.setState({ generalIsLoading: true });
        await updateUserMutation.mutateAsync({
          userId: initialUser._id,
          userData: { ...values, organizationId: undefined } as EditUserFormData,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : t('errorUpdatingUser');
        toast.error(message);
      } finally {
        useGeneralStore.setState({ generalIsLoading: false });
      }
    } else {
      createUserMutation.mutate(values as unknown as CreateUserPayload);
    }
  };

  return (
    <UserForm mode={mode} initialUser={initialUser} onSubmit={handleSubmit} isPending={isPending} />
  );
}
