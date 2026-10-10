import type { OnboardingProviderId } from './organization-onboarding.types';

export const ACTIVE_ONBOARDING_PROVIDER: OnboardingProviderId = 'joyride';

export const ONBOARDING_TARGETS = {
  usersNav: '[data-onboarding="org-nav-users"]',
  createUser: '[data-onboarding="org-create-user"]',
  coursesNav: '[data-onboarding="org-nav-courses"]',
  createCourse: '[data-onboarding="org-create-course"]',
} as const;
