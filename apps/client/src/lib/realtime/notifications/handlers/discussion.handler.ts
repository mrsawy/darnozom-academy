import { toast } from 'react-toastify';
import type { NotificationTypeHandler } from '../notification-handler.types';
import { translateNotificationToastText } from '../translate-notification';

/** `discussion`: a reply on the user's discussion, or a new thread on the instructor's course. No click target yet. */
export const discussionNotificationHandler: NotificationTypeHandler = {
  showArrivalToast(notification, t) {
    toast.info(translateNotificationToastText(notification, t));
  },
  handleClick() {
    // No discussion detail page to deep-link to today.
  },
};
