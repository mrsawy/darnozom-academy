import { ROUTE_ORG_COURSES, ROUTE_ORG_USERS } from '@/lib/data/constants/routes.constants';
import { ONBOARDING_TARGETS } from './organization-onboarding.constants';
import type { OrgOnboardingStepDef } from './organization-onboarding.types';

/**
 * Ordered onboarding steps. Steps with `route` require navigation before the
 * provider shows the step; providers should `router.push(route)` and wait for
 * the step target element to exist in the DOM.
 */
export function getOrgOnboardingSteps(): OrgOnboardingStepDef[] {
  return [
    {
      id: 'welcome',
      target: 'body',
      titleKey: 'welcomeTitle',
      contentKey: 'welcomeContent',
      placement: 'center',
    },
    {
      id: 'usersNav',
      target: ONBOARDING_TARGETS.usersNav,
      titleKey: 'usersNavTitle',
      contentKey: 'usersNavContent',
      spotlightPadding: 8,
      spotlightRadius: 10,
    },
    {
      id: 'createUser',
      target: ONBOARDING_TARGETS.createUser,
      titleKey: 'createUserTitle',
      contentKey: 'createUserContent',
      route: ROUTE_ORG_USERS,
      // Exact list route only — /users/create has no CTA target.
      placement: 'auto',
      spotlightPadding: 22,
      spotlightRadius: 14,
    },
    {
      id: 'coursesNav',
      target: ONBOARDING_TARGETS.coursesNav,
      titleKey: 'coursesNavTitle',
      contentKey: 'coursesNavContent',
      spotlightPadding: 8,
      spotlightRadius: 10,
    },
    {
      id: 'createCourse',
      target: ONBOARDING_TARGETS.createCourse,
      titleKey: 'createCourseTitle',
      contentKey: 'createCourseContent',
      route: ROUTE_ORG_COURSES,
      placement: 'auto',
      spotlightPadding: 22,
      spotlightRadius: 14,
    },
  ];
}
