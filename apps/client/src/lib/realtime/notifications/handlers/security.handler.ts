import { toast } from 'react-toastify';
import type { NotificationTypeHandler } from '../notification-handler.types';
import { translateNotificationToastText } from '../translate-notification';

/** `security`: account-safety events such as being logged out from another device. Nothing to navigate to. */
export const securityNotificationHandler: NotificationTypeHandler = {
  showArrivalToast(notification, t) {
    toast.warning(translateNotificationToastText(notification, t));
  },
  handleClick() {
    // Informational only.
  },
};
