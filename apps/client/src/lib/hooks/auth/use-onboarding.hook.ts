'use client';

import { useMutation, useQueryClient } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useRouter } from '@/i18n/navigation';
import useUserStore from '@/lib/store/userStore';
import useGeneralStore from '@/lib/store/generalStore';
import { Roles, type Currency } from '@darnozom/shared-types';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { completeOnboarding } from '@/lib/actions/auth/auth.action';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { ROUTE_ORGANIZATION_VERIFICATION } from '@/lib/data/constants/routes.constants';
import { userKeys } from '@/lib/hooks/user/use-user.hook';

export interface CompleteOnboardingInput {
  roleName: string;
  phone: string;
  preferredCurrency?: Currency;
  firstName?: string;
  lastName?: string;
  organizationDto?: { name: string; slug: string };
  acceptedTerms?: boolean;
}

/**
 * Mutation hook for the post-OAuth onboarding step.
 * On success it updates the Zustand user store and the `userKeys.me()` query
 * cache (read by public pages such as course checkout), then redirects to the
 * role-appropriate dashboard.
 */
export function useCompleteOnboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: (data: CompleteOnboardingInput) => completeOnboarding(data),

    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },

    onSuccess: (_result, variables) => {
      toast.success(tMutations('onboardingCompleted'));

      const currentUser = useUserStore.getState().user;
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          roleName: variables.roleName as Roles,
          phone: variables.phone,
          ...(variables.preferredCurrency
            ? { preferredCurrency: variables.preferredCurrency }
            : {}),
          onboardingComplete: true,
        };
        useUserStore.getState().setUser(updatedUser);
        // useAuthUser() has a 2m staleTime — without this, pages keep seeing the GUEST user.
        queryClient.setQueryData(userKeys.me(), updatedUser);
      }
      void queryClient.invalidateQueries({ queryKey: userKeys.me() });

      // Orgs go through the verification wizard + admin approval before the dashboard.
      if ((variables.roleName as Roles) === Roles.SUPER_ADMIN) {
        router.replace(ROUTE_ORGANIZATION_VERIFICATION);
      } else {
        router.replace(getDashboardUrl(variables.roleName as Roles));
      }
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
