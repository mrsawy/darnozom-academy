import { SetMetadata } from '@nestjs/common';

export const SKIP_ONBOARDING_CHECK_KEY = 'skipOnboardingCheck';

/** Apply to a controller or handler to bypass the OnboardingGuard check. */
export const SkipOnboardingCheck = () => SetMetadata(SKIP_ONBOARDING_CHECK_KEY, true);
