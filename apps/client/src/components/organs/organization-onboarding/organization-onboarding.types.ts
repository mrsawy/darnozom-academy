export type OnboardingProviderId = 'joyride' | 'shepherd';

export type OrgOnboardingStepId =
  | 'welcome'
  | 'usersNav'
  | 'createUser'
  | 'coursesNav'
  | 'createCourse';

export type OrgOnboardingPlacement = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface OrgOnboardingStepDef {
  id: OrgOnboardingStepId;
  // Brief requires `string | 'body'` for Joyride body targeting.

  target: string | 'body';
  titleKey: string;
  contentKey: string;
  /** Route to navigate to before showing this step (optional). */
  route?: string;
  /** Prefer this placement; providers may still flip for viewport space. */
  placement?: OrgOnboardingPlacement;
  /** Extra space around the spotlight cutout (header CTAs need more than nav items). */
  spotlightPadding?: number;
  spotlightRadius?: number;
}

export interface OnboardingTourProps {
  run: boolean;
  setRun: (run: boolean) => void;
  onComplete: () => void;
  onSkip: () => void;
}
