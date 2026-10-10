'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import useUserStore from '@/lib/store/userStore';
import useGeneralStore from '@/lib/store/generalStore';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { completeOrganizationOnboardingAction } from '@/lib/actions/user/complete-organization-onboarding.action';
import { userKeys } from '@/lib/hooks/user/use-user.hook';

/**
 * Marks the organization product tour as complete for the current SuperAdmin.
 * Invalidates the auth user cache and updates the persisted client user store.
 */
export function useCompleteOrganizationOnboarding() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async () => {
      const result = await completeOrganizationOnboardingAction();
      if ('err' in result) {
        throw new Error(result.err.message);
      }
      return result;
    },

    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },

    onSuccess: (result) => {
      const rawMessage =
        typeof result?.message === 'string' && result.message.length > 0
          ? result.message
          : 'organizationOnboardingCompleted';
      toast.success(translateApiMessage(rawMessage, tErrors));

      const currentUser = useUserStore.getState().user;
      const updatedUser =
        result.user ?? (currentUser ? { ...currentUser, organizationOnboarded: true } : undefined);
      if (updatedUser) {
        useUserStore.getState().setUser({ ...updatedUser, organizationOnboarded: true });
        queryClient.setQueryData(userKeys.me(), {
          ...updatedUser,
          organizationOnboarded: true,
        });
      }

      void queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },

    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('onboardingFailed'));
    },

    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
  });
}
