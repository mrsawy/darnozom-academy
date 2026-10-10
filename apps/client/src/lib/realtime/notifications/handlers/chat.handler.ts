import { toast } from 'react-toastify';
import type { NotificationTypeHandler } from '../notification-handler.types';
import { translateNotificationToastText } from '../translate-notification';

/** `chat`: a new direct message. No click target yet (chat has its own live socket + unread badge). */
export const chatNotificationHandler: NotificationTypeHandler = {
  showArrivalToast(notification, t) {
    toast.info(translateNotificationToastText(notification, t));
  },
  handleClick() {
    // The chat UI already has its own realtime feed; nothing extra to route to here.
  },
};
