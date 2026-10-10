'use client';

import { OrganizationOnboarding } from '@/components/organs/organization-onboarding/organization-onboarding';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import type { IUser } from '@/lib/types/user/user.interface';

/**
 * Prefers the live auth user (React Query) so completing/skipping the tour
 * dismisses immediately after the mutation updates the cache — layout SSR user alone stays stale.
 */
export function OrganizationDashboardOnboardingHost({ user }: { user?: IUser }) {
  const { data: liveUser } = useAuthUser();
  return <OrganizationOnboarding user={liveUser ?? user} />;
}
