import { Bell, CalendarClock, PlayCircle, Video } from 'lucide-react';

/**
 * Bezeled device mockups of the organization dashboard, all on the same
 * 1086x1448 canvas so they line up when stacked or cross-faded.
 */
export const SCREEN_WIDTH = 1086;
export const SCREEN_HEIGHT = 1448;

const MOCKUP_DIR = '/images/org-mobile-showcase';

/** Index-aligned with the `StudentAppSection.screens` messages array. */
export const APP_SCREENS = [
  `${MOCKUP_DIR}/progress-scores.png`,
  `${MOCKUP_DIR}/activity-attendance.png`,
  `${MOCKUP_DIR}/users-management.png`,
] as const;

export const SCREEN_COUNT = APP_SCREENS.length;

/** Index-aligned with the `StudentAppSection.features` messages array. */
export const FEATURE_ICONS = [PlayCircle, Video, CalendarClock, Bell] as const;

export const NOTIFICATION_COUNT = 3;
