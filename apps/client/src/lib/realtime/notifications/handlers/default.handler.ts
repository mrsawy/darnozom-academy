import { toast } from 'react-toastify';
import type { NotificationTypeHandler } from '../notification-handler.types';
import { translateNotificationToastText } from '../translate-notification';

/** Fallback for any notification `type` without a dedicated handler: toast, no navigation on click. */
export const defaultNotificationHandler: NotificationTypeHandler = {
  showArrivalToast(notification, t) {
    toast.info(translateNotificationToastText(notification, t));
  },
  handleClick() {
    // No known destination for this type — the dropdown just marks it as read.
  },
};
