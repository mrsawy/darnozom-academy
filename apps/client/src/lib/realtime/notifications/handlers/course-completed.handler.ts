import { toast } from 'react-toastify';
import type { NotificationTypeHandler } from '../notification-handler.types';
import { translateNotificationToastText } from '../translate-notification';

/** `course_completed`: the student finished every item in a course. No click target yet. */
export const courseCompletedNotificationHandler: NotificationTypeHandler = {
  showArrivalToast(notification, t) {
    toast.success(translateNotificationToastText(notification, t));
  },
  handleClick() {
    // No dedicated "completed course" page to deep-link to today.
  },
};
