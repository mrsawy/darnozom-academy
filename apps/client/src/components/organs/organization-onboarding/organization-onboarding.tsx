'use client';

import type { IUser } from '@/lib/types/user/user.interface';
import { ACTIVE_ONBOARDING_PROVIDER } from './organization-onboarding.constants';
import { useOrganizationOnboarding } from './hooks/use-organization-onboarding';
import { JoyrideOnboardingTour } from './providers/joyride/joyride-onboarding-tour';
import { ShepherdOnboardingTour } from './providers/shepherd/shepherd-onboarding-tour';

export function OrganizationOnboarding({ user }: { user?: IUser }) {
  const { shouldShow, run, setRun, complete, skip } = useOrganizationOnboarding(user);

  if (!shouldShow) return null;

  if (ACTIVE_ONBOARDING_PROVIDER === 'joyride') {
    return <JoyrideOnboardingTour run={run} setRun={setRun} onComplete={complete} onSkip={skip} />;
  }

  return <ShepherdOnboardingTour run={run} setRun={setRun} onComplete={complete} onSkip={skip} />;
}
