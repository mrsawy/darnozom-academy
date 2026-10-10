import { Bell, CalendarClock, PlayCircle, Video } from 'lucide-react';

/**
 * Normalized device mockups. Every file in `trimmed/` was cropped to its alpha
 * bounding box and padded onto the same 532x1096 canvas, so the phones line up
 * pixel-for-pixel when stacked, fanned, or scrolled through.
 */
export const SCREEN_WIDTH = 532;
export const SCREEN_HEIGHT = 1096;

const MOCKUP_DIR = '/images/mobile-mockups/trimmed';

/** Index-aligned with the `StudentAppSection.screens` messages array. */
export const APP_SCREENS = [
  `${MOCKUP_DIR}/1c.png`,
  `${MOCKUP_DIR}/2c.png`,
  `${MOCKUP_DIR}/3c.png`,
  `${MOCKUP_DIR}/4c.png`,
  `${MOCKUP_DIR}/5c.png`,
  `${MOCKUP_DIR}/2.5c.png`,
] as const;

export const SCREEN_COUNT = APP_SCREENS.length;

/** Index-aligned with the `StudentAppSection.features` messages array. */
export const FEATURE_ICONS = [PlayCircle, Video, CalendarClock, Bell] as const;

export const NOTIFICATION_COUNT = 3;
